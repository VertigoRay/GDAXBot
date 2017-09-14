'use_strict'

const events = require('events');
const fs = require('fs');
const Gdax = require('gdax');
const Log = require('log');
const settings = require('config');

var eventEmitter = new events.EventEmitter();

if (settings.get('general.log')) {
	var log = new Log(settings.get('general.log_level'), fs.createWriteStream('GDAX-websocket.log'));
} else {
	let dev_null = (process.platform === 'win32') ? 'nul' : '/dev/null'
	var log = new Log(settings.get('general.log_level'), fs.createWriteStream(dev_null));
}



class Websocket {
	constructor() {
		this.auth = {
			'key': settings.get('account.api.key'),
			'secret': settings.get('account.api.secret'),
			'passphrase': settings.get('account.api.passphrase'),
		};
		this.authenticated = false;
		this.isOpen = null;
		this.gdax = {};
		this.my_buy_ids = [];

		this.product_ids = settings.get('general.product_ids');
		this.last_match = {};
		this.trades = {};
		
		this.product_ids.forEach((product_id) => {
			this.last_match[product_id] = null;
			this.trades[product_id] = [];
		});


		this.historic_callback = (err, response, data) => {
			if (err) {
				log.error(process.pid, 'callbackHistoricRates error', err);
			}

			var try_again = false;
			if (response) {
				log.debug(process.pid, 'callbackHistoricRates response path: ' + response.request.path);

				var product_id;
				this.product_ids.some(function(search_id) {
					if (response.request.path.indexOf(search_id) !== -1) {
						product_id = search_id;
						return true;
					}
				});

				if (!product_id) {
					log.error(process.pid, 'callbackHistoricRates unable to parse product from path: ' + response.request.path);
					return;
				}

				try {
					data.forEach((i) => {
						this.trades[product_id].push(parseFloat(i[4]));
						this.trades[product_id].push(parseFloat(i[4]));
					});
				} catch (e) {
					log.error(process.pid, 'callbackHistoricRates exception', e);
					try_again = true;
				}

				if (try_again) {
					this.gdax.productID = product_id;
					this.gdax.getProductHistoricRates(this.historic_callback);
				}
			}
		};


		this.message = (data) => {
			// log.debug(process.pid, 'MESSAGE DATA RXd');
			if (data.type === 'match') {
				log.debug(process.pid, 'MESSAGE MATCH', data);

				// Some order was filled for someone
				// We can look at this to see price trends
				this.last_match[data.product_id] = data;
				this.addTrade(data.product_id, data.price);
			} else if (data.type === 'done') {
				// Order filled or canceled
				if (
					data.reason === 'filled'
					&& data.side === 'buy'
					&& data.product_id in settings.get('general.product_ids')
					&& this.my_buy_ids.indexOf(data.order_id)
				) {
					log.debug(process.pid, 'MESSAGE DONE', data);
					eventEmitter.emit('message_done', data);
				}
			}
		};



		this.open_conn = () => {
			this.websocket = null;

			let api_url = settings.get('general.url.api');
			log.info('api_url: ', api_url);
			let websocket_url = settings.get('general.url.websocket');
			log.info('websocket_url: ', websocket_url);

			if (!(this.auth.secret && this.auth.key && this.auth.passphrase)) {
				// UNAUTHENTICATED
				log.info('Websocket: Connecting UNAUTHENTICATED', this.product_ids);
				this.websocket = new Gdax.WebsocketClient(this.product_ids, websocket_url);
				this.gdax = new Gdax.PublicClient(api_url);
			} else {
				// AUTHENTICATED
				log.info('Websocket: Connecting AUTHENTICATED', this.product_ids);
				this.websocket = new Gdax.WebsocketClient(this.product_ids, websocket_url, this.auth);
				this.gdax = new Gdax.AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase, api_url=api_url);

				this.authenticated = true;
			}
		}



		this.open_conn();
		this.websocket.on('open', () => {
			// console.log(process.pid, 'Websocket: Open');
			this.isOpen = true;
		});
		this.websocket.on('message', this.message);
		this.websocket.on('error', (err) => {
			// console.log(process.pid, 'Websocket: Error');
			// console.error(err);
		});
		this.websocket.on('close', () => {
			// console.log(process.pid, 'Websocket: Close');
			this.isOpen = false;
		});

		this.historicPull();
	}



	addTrade(product_id, price) {
		if (product_id in this.trades)
			this.trades[product_id].push(parseFloat(price));
		if (
			this.trades[product_id]
			&& this.trades[product_id].length > settings.get(`${product_id}.strategies.${settings.get(`${product_id}.strategy`)}.trades_n`)
		)
		{
			// Remove first item in array.
			this.trades[product_id].shift();
		}
	}



	historicPull() {
		this.product_ids.forEach((product_id) => {
			this.gdax.productID = product_id;
			this.gdax.getProductHistoricRates(this.historic_callback);
		});
	};
}

var websocket = new Websocket();

module.exports = function (input, done, progress) {
	log.info(process.pid, input.action, input);



	if (!('message_done' in eventEmitter._events)) {
		eventEmitter.on('message_done', (message) => {
			progress({
				action: 'message_done',
				data: message,
				timestamp: timestamp = new Date,
			});
		});
	}



	let reply = {
		action: input.action,
	};

	switch (input.action)
	{
		case 'add_orders':
			log.info(process.pid, 'add_orders', input.data);

			input.data.forEach((order) => {
				if (order.side === 'buy') {
					websocket.my_buy_ids.push(order.id);
				}
			});

			break;
		case 'buy_confirmed':
			log.info(process.pid, 'buy_confirmed', input.data);

			websocket.my_buy_ids.push(input.data.id);

			break;
		case 'sell_confirmed':
			log.info(process.pid, 'sell_confirmed', input.data);

			break;
		case 'getAccounts':

			let product_ids = settings.get('general.product_ids');
			let accounts = undefined;

			if (websocket.gdax ) {
				// log.debug('websocket getAccounts: websocket.gdax: \n', websocket.gdax);
				accounts = websocket.gdax.getAccounts((err, response, data) => {
					if (err) {
						// log.debug('websocket getAccounts: callback err:', err);
						reply.error = 'gdax client not created.';
					}

					if (data) {
						// log.debug('websocket getAccounts: callback data:', data);
						reply.data = data;
					}

					reply.timestamp = new Date;

					log.info(process.pid, input.action, 'REPLY', reply);
					done(reply);
				});
			} else {
				reply.error = 'gdax client not created.';

				reply.timestamp = new Date;

				log.info(process.pid, input.action, 'REPLY', reply);
				done(reply);
			}

			break;
		case 'getBytesReceived':
			reply.data = undefined;
			if (websocket.websocket && websocket.websocket.socket)
				reply.data = websocket.websocket.socket.bytesReceived;

			reply.timestamp = new Date;

			log.info(process.pid, input.action, 'REPLY', reply);
			done(reply);

			break;
		case 'getLastMatch':
			// console.log(process.pid, 'getLastMatch RETURNING:', websocket.last_match);
			reply.data = websocket.last_match;
			reply.timestamp = new Date;

			log.info(process.pid, input.action, 'REPLY', reply);
			done(reply);

			break;
		case 'getOrders':
			if (websocket.gdax ) {
				let args = {};
				if (input.next_page) {
					args = { after: input.next_page }
				}

				// log.debug(process.pid, input.action, 'gdax.getOrders', args);
				websocket.gdax.getOrders(args, (err, response, data) => {
					let headers = response.headers;
					// log.debug(process.pid, input.action, 'getOrders callback headers:', headers);
					
					reply.next_page = headers['cb-after'];
					reply.prev_page = headers['cb-before'];

					// log.debug(process.pid, input.action, 'getOrders callback err:', err);
					if (err) {
						reply.error = err;
					}

					// log.debug(process.pid, input.action, 'getOrders callback data:', data);
					if (data) {
						reply.data = data;
					}

					reply.timestamp = new Date;

					log.info(process.pid, input.action, 'REPLY', reply);
					done(reply);
				});
			} else {
				reply.error = 'gdax client not created.';
				reply.timestamp = new Date;

				log.info(process.pid, input.action, 'REPLY', reply);
				done(reply);
			}

			break;
		case 'getTrades':
			reply.data = {};

			settings.get('general.product_ids').forEach((product_id) => {
				reply.data[product_id] = [];
				log.debug(process.pid, input.action, 'getTrades trades length', websocket.trades[product_id].length);

				while (websocket.trades[product_id].length > 0) {
					reply.data[product_id].push(websocket.trades[product_id].shift());
				}
			});

			reply.timestamp = new Date;

			log.info(process.pid, input.action, 'REPLY', reply);
			done(reply);

			break;
		case 'isOpen':
			reply.data = websocket.isOpen;
			reply.timestamp = new Date;

			log.info(process.pid, input.action, 'REPLY', reply);
			done(reply);

			break;
	}
}
const fs = require('fs');
const Gdax = require('gdax');
const Log = require('log');
const settings = require('config');

if (settings.get('general.log')) {
	var log = new Log('debug', fs.createWriteStream('GDAX-websocket.log'));
} else {
	let dev_null = (process.platform === 'win32') ? 'nul' : '/dev/null'
	var log = new Log('debug', fs.createWriteStream(dev_null));
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

		this.product_ids = settings.get('general.product_ids');
		this.last_match = {};
		this.trades = {};
		
		this.product_ids.forEach((product_id) => {
			this.last_match[product_id] = null;
			this.trades[product_id] = [];
		});


		this.historic_callback = (err, response, data) => {
			if (err) {
				// console.error(err);
			}

			var try_again = false;
			if (response) {
				// console.log(process.pid, 'callbackHistoricRates response: '+ response.request.path);
				if (response.request.path.includes('BTC-USD')) {
					var product_id = 'BTC-USD'
				} else if (response.request.path.includes('ETH-USD')) {
					var product_id = 'ETH-USD'
				} else if (response.request.path.includes('LTC-USD')) {
					var product_id = 'LTC-USD'
				}

				try {
					data.forEach((i) => {
						this.trades[product_id].push(parseFloat(i[4]));
						this.trades[product_id].push(parseFloat(i[4]));
					});
				} catch (e) {
					// console.log(e);
					try_again = true;
				}

				if (try_again) {
					this.gdax.productID = product_id;
					this.gdax.getProductHistoricRates(this.historic_callback);
				}
			}
		};


		this.message = (data) => {
			if (data.type === 'match') {
				// Some order was filled for someone
				// We can look at this to see price trends
				this.last_match[data.product_id] = data;
				this.addTrade(data.product_id, data.price);

				// console.log(process.pid, 'MATCH', this.last_match);
			} else if (data.type === 'done') {
				// Order filled or canceled
				if (data.reason === 'filled' && data.side === 'buy') {
					// should determine if it's ours and do something?
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
				log.info('Websocket: Connecting UNAUTHENTICATED');
				this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], websocket_url);
				this.gdax = new Gdax.PublicClient(api_url);
			} else {
				// AUTHENTICATED
				log.info('Websocket: Connecting AUTHENTICATED');
				this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], websocket_url, this.auth);
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
		this.trades[product_id].push(parseFloat(price));
		if (this.trades[product_id].length > settings[product_id].trend.number_of_trades)
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

module.exports = function (input, done) {
	log.info(process.pid, input.action, input);

	let reply = {
		action: input.action,
	};

	switch (input.action)
	{
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
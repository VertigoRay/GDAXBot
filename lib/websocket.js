const fs = require('fs');
const Gdax = require('gdax');
const Log = require('log');
const settings = require('config');

var log = new Log('debug', fs.createWriteStream('GDAX-websocket.log'));


class Websocket {
	constructor() {
		this.auth = {
			'key': settings.get('account.api.key'),
			'secret': settings.get('account.api.secret'),
			'passphrase': settings.get('account.api.passphrase'),
		};
		this.authenticated = false;
		this.isOpen = null;

		this.product_ids = settings.get('general.product_ids');
		this.last_match = {};
		this.gdax = {};
		this.trades = {};
		
		this.product_ids.forEach((i) => {
			this.last_match[i] = null;
			this.gdax[i] = null;
			this.trades[i] = [];
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
			this.gdax.getProductHistoricRates(this.historic_callback);
		});
	};
}

var websocket = new Websocket();

module.exports = function (input, done) {
	switch (input.action)
	{
		case 'getAccounts':
			log.debug('websocket getAccounts: ', input);

			let product_ids = settings.get('general.product_ids');
			let accounts = undefined;

			if (websocket.gdax ) {
				// log.debug('websocket getAccounts: websocket.gdax: \n', websocket.gdax);
				accounts = websocket.gdax.getAccounts((err, response, data) => {
					return_done = {
						getAccounts : {
							timestamp: new Date,
						}
					}

					if (err) {
						log.debug('websocket getAccounts: callback err:', err);
						return_done.getAccounts.error = err;
					}

					if (data) {
						log.debug('websocket getAccounts: callback data:', data);
						return_done.getAccounts.accounts = data;
					}

					done(return_done);
				});
			} else {
				done({
					getAccounts : {
						timestamp: new Date,
						error: 'gdax client not created.',
					},
				});
			}

			break;
		case 'getBytesReceived':
			let bytes_rxd = undefined;
			if (websocket.websocket && websocket.websocket.socket) {
				bytes_rxd = websocket.websocket.socket.bytesReceived;
			}
			done({ getBytesReceived : bytes_rxd });

			break;
		case 'getLastMatch':
			// console.log(process.pid, 'getLastMatch RETURNING:', websocket.last_match);
			done({ getLastMatch : websocket.last_match });

			break;
		case 'getTrades':
			// console.log(process.pid, 'getLastMatch RETURNING:', websocket.last_match);
			done({ getLastMatch : websocket.last_match });

			break;
		case 'getLastMatch':
			done({ getTrades : websocket.trades });

			break;
		case 'getOrders':
			if (websocket.gdax ) {
				let args = {};
				if (input.after) {
					args = { after: input.after }
				}

				websocket.gdax.getOrders(args, (err, response, data) => {
					return_done = {
						getOrders : {
							timestamp: new Date,
							after: input.after,
						}
					}

					log.debug('bot getOrders: callback headers:', response.headers);
					let headers = response.headers;
					log.debug('bot getOrders: callback headers:', headers);
					log.debug('bot getOrders: callback cb-after:', headers['cb-after']);
					log.debug('bot getOrders: callback cb-before:', headers['cb-before']);

					if (err) {
						// log.debug('bot getOrders: callback err:', err);
						return_done.getOrders.error = err;
					}

					if (data) {
						// log.debug('bot getOrders: callback data:', data);
						return_done.getOrders.orders = data;
					}

					done(return_done);
				});
			} else {
				done({
					getOrders : {
						timestamp: new Date,
						error: 'gdax client not created.',
					},
				});
			}
		case 'isOpen':
			done({ isOpen : websocket.isOpen });

			break;
	}
}
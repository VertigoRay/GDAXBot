class Websocket {
const Gdax = require('gdax');
const settings = require('config');

class Websocket {
	constructor() {
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
				console.error(err);
			}

			var try_again = false;
			if (response) {
				console.log(process.pid, 'callbackHistoricRates response: '+ response.request.path);
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
					console.log(e);
					try_again = true;
				}

				if (try_again) {
					this.gdax[product_id].getProductHistoricRates(this.historic_callback);
				}
			}
		};


		this.message = (data) => {
			if (data.type === 'match') {
				// Some order was filled for someone
				// We can look at this to see price trends
				this.last_match[data.product_id] = data;
				this.addTrade(data.product_id, data.price);

				console.log(process.pid, 'MATCH', this.last_match);
			} else if (data.type === 'done') {
				// Order filled or canceled
				if (data.reason === 'filled' && data.side === 'buy') {
					// should determine if it's ours and do something?
				}
			}
		};



		this.open_conn = () => {
			this.websocket = new Gdax.WebsocketClient(this.product_ids, settings.get('general.url.websocket'));

			this.product_ids.forEach((i) => {
				this.gdax[i] = new Gdax.PublicClient(i, settings.get('general.url.api'));
			});
		}



		this.open_conn();
		this.websocket.on('open', () => {
			console.log(process.pid, 'Websocket: Open');
			this.isOpen = true;
		});
		this.websocket.on('message', this.message);
		this.websocket.on('error', (err) => {
			console.log(process.pid, 'Websocket: Error');
			console.error(err);
		});
		this.websocket.on('close', () => {
			console.log(process.pid, 'Websocket: Close');
			this.isOpen = false;
		});

		this.historicPull();
	}



	addTrade(product_id, price) {
		this.trades[product_id].push(price);
		if (this.trades[product_id].length > settings[product_id].trend.number_of_trades)
		{
			// Remove first item in array.
			this.trades[product_id].shift();
		}
	}



	historicPull() {
		this.product_ids.forEach((i) => {
			this.gdax[i].getProductHistoricRates(this.historic_callback);
		});
	};
}

var websocket = new Websocket();

module.exports = function (input, done) {
	if (input === 'getBytesReceived')
	{
		done({ getBytesReceived : websocket.websocket.socket.bytesReceived });
	}
	else if (input === 'getLastMatch')
	{
		// console.log(process.pid, 'getLastMatch RETURNING:', websocket.last_match);
		done({ getLastMatch : websocket.last_match });
	}
	else if (input === 'getTrades')
	{
		done({ getTrades : websocket.trades });
	}
	else if (input === 'isOpen')
	{
		done({ isOpen : websocket.isOpen });
	}
}
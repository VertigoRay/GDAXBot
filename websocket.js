const Gdax = require('gdax');

class Websocket {
	constructor() {
		this.open_conn = () => {
			this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD']);
		}

		this.message = (data) => {
			if (data.type === 'match') {
				// Some order was filled for someone
				// We can look at this to see price trends
				console.log(data);
			} else if (data.type === 'done') {
				// Order filled or canceled
				if (data.reason === 'filled' && data.side === 'buy') {
					// should determine if it's ours and do something?
				}
			}
		};

		this.open_conn();
		this.websocket.on('open', function () {
			console.log('Websocket: Open');
		});
		this.websocket.on('message', this.message);
		this.websocket.on('error', function(err) {
			console.log('Websocket: Error');
			console.error(err);
		});
		this.websocket.on('close', () => {
			console.log('Websocket: Close');
			this.open_conn();
		});
	}
}

var websocket = new Websocket();
module.exports = {
	gdaxsocket: websocket,
}
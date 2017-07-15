'use strict';

String.prototype.format = function(){
	var a = this, b;
	for(b in arguments){
		a = a.replace(/%[a-z]/,arguments[b]);
	}
	return a; // Make chainable
};

const Gdax = require('gdax');
const TradingBot = require('trading_bot');


class GDAXBot extends TradingBot {
	constructor(options) {
		options.auth = {
			key: '5a6c552179eaac07fd6078e4d86986f5',
			secret: 'LIzNBiXCXYsKRu2biIwVnWkeO5v38ryChMcB01eBthYXCwVQTKtjdG3F5hRO6IlX/oN0aeWLJd5n+YyNIqyFqA==',
			passphrase: 'c5lvxf1vhes',
			apiURI: 'https://api.gdax.com'
		};
		super(options);

		this.color = {
			Reset: "\x1b[0m",
			Bright: "\x1b[1m",
			Dim: "\x1b[2m",
			Underscore: "\x1b[4m",
			Blink: "\x1b[5m",
			Reverse: "\x1b[7m",
			Hidden: "\x1b[8m",

			FgBlack: "\x1b[30m",
			FgRed: "\x1b[31m",
			FgGreen: "\x1b[32m",
			FgYellow: "\x1b[33m",
			FgBlue: "\x1b[34m",
			FgMagenta: "\x1b[35m",
			FgCyan: "\x1b[36m",
			FgWhite: "\x1b[37m",

			BgBlack: "\x1b[40m",
			BgRed: "\x1b[41m",
			BgGreen: "\x1b[42m",
			BgYellow: "\x1b[43m",
			BgBlue: "\x1b[44m",
			BgMagenta: "\x1b[45m",
			BgCyan: "\x1b[46m",
			BgWhite: "\x1b[47m",
		}
	}

	_execute_trading_strategy() {
		return new Promise((resolve, reject) => {
			const self = this;

			if (self.midmarket_price === null) {
				return reject('Too soon for trading.');
			}

			let msg_product_id = `${self.color.Bright}${self.product}${self.color.Reset}`;
			let msg_price_color = self.last_midmarket_price > self.midmarket_price ? self.color.FgRed : self.color.FgGreen;
			let msg_price = `${msg_price_color}${parseFloat(self.midmarket_price).toFixed(2)}${self.color.Reset}`;

			console.log(`${msg_product_id} ${msg_price}`);

			// API BUy!
			// self.client[side](order, (err, res, body) => {
			// 	if (err) {
			// 		console.log('Error placing trade');
			// 		return reject(err);
			// 	}
			// 	console.log(body);
			// 	resolve();
			// });

			// Final / Cleanup
			this.last_midmarket_price = self.midmarket_price
		});
	}
}





// const botBTC = new VBot({ product: 'BTC-USD' });
// console.log('VBot (BTC) is starting ...');
// botBTC.start_trading({ time: 1000 });

// const botETH = new VBot({ product: 'ETH-USD' });
// console.log('VBot (ETH) is starting ...');
// botETH.start_trading({ time: 1000 });


 
const thread = spawn(function(input, done) {
	const botLTC = new VBot({ product: 'LTC-USD' });
	console.log('VBot (LTC) is starting ...');
	botLTC.start_trading({ time: 1000 });
});

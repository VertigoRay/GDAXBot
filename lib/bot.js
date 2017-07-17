'use strict';

const fs = require('fs');
const Gdax = require('gdax');
const Log = require('log');
const settings = require('config');

var log = new Log('debug', fs.createWriteStream(`GDAX-bot-${process.pid}.log`));


class GDAXBot extends TradingBot {
	constructor(options) {
		options.auth = {
			'key': settings.get('account.api.key'),
			'secret': settings.get('account.api.secret'),
			'passphrase': settings.get('account.api.passphrase'),
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

			log.info(`${msg_product_id} ${msg_price}`);

			// API BUy!
			// self.client[side](order, (err, res, body) => {
			// 	if (err) {
			// 		log.info('Error placing trade');
			// 		return reject(err);
			// 	}
			// 	log.info(body);
			// 	resolve();
			// });

			// Final / Cleanup
			this.last_midmarket_price = self.midmarket_price
		});
	}
}



var bot = undefined;

module.exports = function (input, done) {
	if (input.action === 'initialize') {
		// log = new Log('debug', fs.createWriteStream(`GDAX-bot-${input.product_id}.log`));

		log.info(`GDAXBot (${input.product_id}) is starting ...`);
		bot = new GDAXBot({
			product: input.product_id,
		});
	}
}
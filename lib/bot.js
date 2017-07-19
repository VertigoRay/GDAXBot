'use strict';

const fs = require('fs');
const Gdax = require('gdax');
const Log = require('log');
const settings = require('config');
const TradingBot = require('trading_bot');

var log = undefined;


class GDAXBot extends TradingBot {
	constructor(options) {
		options.auth = {
			'key': settings.get('account.api.key'),
			'secret': settings.get('account.api.secret'),
			'passphrase': settings.get('account.api.passphrase'),
		};

		this.product_id = options.product;
		this.trades = [];
		this.latest_strategy_results = {};

		super(options);
	}

	_execute_trading_strategy() {
		return new Promise((resolve, reject) => {
			if (this.strategy === undefined || this.strategy.constructor.name !== settings.get(`${this.product_id}.strategy`)) {
				if (this.strategy !== undefined && this.strategy.trades) {

				}
				let strategy = require(`../strategies/${settings.get(`${this.product_id}.strategy`).toLowerCase()}.js`);
				this.strategy = new strategy();
			}

			if (this.midmarket_price === null) {
				return reject('Too soon for trading.');
			}

			this.latest_strategy_results = this.strategy.get();

			log.info(this.latest_strategy_results);

			// API BUy!
			// this.client[side](order, (err, res, body) => {
			// 	if (err) {
			// 		log.info('Error placing trade');
			// 		return reject(err);
			// 	}
			// 	log.info(body);
			// 	resolve();
			// });

			// Final / Cleanup
			// this.last_midmarket_price = this.midmarket_price
		});
	}

	_add_trades(trades) {
		trades.forEach((trade) => {
			this.trades.push(trade);
		});

		if (this.strategy !== undefined) {
			this.strategy.add({
				trades: trades,
			});
		}
	}
}



var bot = undefined;

module.exports = function (input, done) {
	switch (input.action) {
		case 'initialize':
			log = new Log('debug', fs.createWriteStream(`GDAX-bot-${input.product_id}.log`));

			log.info(`GDAXBot (${input.product_id}) is starting ...`);
			bot = new GDAXBot({
				product: input.product_id,
			});

			break;
		case 'add_trades':
			bot._add_trades(input.trades);
		case 'get':
			done({
				product_id: bot.product_id,
				latest_strategy_results: bot.latest_strategy_results,
				ticker: bot.ticker,
				myorders: bot.myorders,
				last_price: bot.last_price,
				midmarket_price: bot.midmarket_price,
				orderbook: bot.orderbook,
				synced_book: bot.synced_book,
			});
		case 'start':
			bot.start_trading();
		case 'stop':
			bot.stop_trading();
		case 'cancel_order':
			bot.cancel_order(input.id);
		case 'cancel_all_orders':
			bot.cancel_all_orders();
	}
}
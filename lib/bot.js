'use strict';

const fs = require('fs');
const Gdax = require('gdax');
const Log = require('log');
const settings = require('config');
const TradingBot = require('trading_bot');

var log = undefined;


class GDAXBot extends TradingBot {
	constructor(options) {
		let auth = {
			key: settings.get('account.api.key'),
			secret: settings.get('account.api.secret'),
			passphrase: settings.get('account.api.passphrase'),
			apiURI: settings.get('general.url.api'),
		};

		super({
			auth: auth,
			product: options.product,
		});

		this.product_id = this.product;
		this.trades = [];
		this.latest_strategy_results = {};
	}



	_execute_trading_strategy() {
		const _this = this;
		// console.log('_this:', _this);

		if (_this.strategy === undefined || _this.strategy.constructor.name !== settings.get(`${_this.product_id}.strategy`)) {
			// if (_this.strategy !== undefined && _this.strategy.trades) {

			// }
			let strategy = require(`../strategies/${settings.get(`${_this.product_id}.strategy`).toLowerCase()}.js`);
			_this.strategy = new strategy();
			_this.strategy.set({
				product_id: _this.product_id,
			});
		}

		_this.latest_strategy_results = _this.strategy.get();

		return new Promise((resolve, reject) => {

			if (_this.midmarket_price === null) {
				return reject('Too soon for trading.');
			}

			log.info(_this.latest_strategy_results);

			// API BUy!
			// _this.client[side](order, (err, res, body) => {
			// 	if (err) {
			// 		log.info('Error placing trade');
			// 		return reject(err);
			// 	}
			// 	log.info(body);
			// 	resolve();
			// });

			// Final / Cleanup
			_this.last_midmarket_price = _this.midmarket_price
		});
	}



	_listen_to_messages() {
		let feed = this._orderbookSync;
		if (!feed) {
			return;
		}
		if (!this.strategy) {
			return;
		}
		feed.on('message', msg => {
			switch (msg.type) {
				case 'match':
					this.strategy.add({
						trades: trades,
					});
					break;
			}
		});
	}



	_add_trades(trades) {
		log.info(process.pid, this.product_id, '_add_trades', trades);
		if (this.strategy !== undefined && trades !== undefined) {
			log.info(process.pid, this.product_id, '_add_trades', 'adding ...');
			// let new_trades = [];

			// for (let trade in trades) {
			// 	if (this.trades.indexOf(trade) === -1) {
			// 		this.trades.push(trade);
			// 		new_trades.push(trades[trade]);
			// 	}
			// }

			this.strategy.add({
				trades: trades,
			});
		}
	}
}



var bot = undefined;

module.exports = function (input, done) {
	if (log)
		log.info(process.pid, bot.product_id, input);

	let reply = {
		action: input.action,
		product_id: (bot && bot.product_id ? bot.product_id : (input && input.product_id ? input.product_id : undefined)),
		data: null,
	};

	switch (input.action) {
		case 'initialize':
			if (settings.get('general.log')) {
				log = new Log('debug', fs.createWriteStream(`GDAX-bot-${input.product_id}.log`));
			} else {
				let dev_null = (process.platform === 'win32') ? 'nul' : '/dev/null'
				log = new Log('debug', fs.createWriteStream(dev_null));
			}

			log.info(`GDAXBot (${input.product_id}) is starting ...`);
			bot = new GDAXBot({
				product: input.product_id,
			});

			bot._listen_to_messages();

			break;
		case 'add_trades':
			bot._add_trades(input.data);

			break;
		case 'get':
			reply.data = {
				product_id: bot.product_id,
				latest_strategy_results: bot.latest_strategy_results,
				ticker: bot.ticker,
				myorders: bot.myorders,
				last_price: bot.last_price,
				midmarket_price: bot.midmarket_price,
				orderbook: bot.orderbook,
				synced_book: bot.synced_book,
			};
			log.info(`${bot.product_id} get:`, reply);

			reply.timestamp = new Date;
			done(reply);

			break;
		case 'start':
			bot.start_trading();

			break;
		case 'stop':
			bot.stop_trading();

			break;
		case 'cancel_order':
			bot.cancel_order(input.id);

			break;
		case 'cancel_all_orders':
			bot.cancel_all_orders();

			break;
	}
}
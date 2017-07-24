'use strict';

const events = require('events');
const fs = require('fs');
const Gdax = require('gdax');
const Log = require('log');
const settings = require('config');
const TradingBot = require('trading_bot');

var eventEmitter = new events.EventEmitter();
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

		this.my_buy_data_by_id = {};
		this.latest_strategy_results = {};
		this.product_id = this.product;
		this.trades = [];
	}



	_execute_trading_strategy() {
		log.info(process.pid, '_execute_trading_strategy');
		const self = this;
		// log.debug('self:', self);

		if (self.strategy === undefined || self.strategy.constructor.name !== settings.get(`${self.product_id}.strategy`)) {
			let strategy = require(`../strategies/${settings.get(`${self.product_id}.strategy`).toLowerCase()}.js`);
			self.strategy = new strategy();
			self.strategy.set({
				product_id: self.product_id,
			});
		}

		self.latest_strategy_results = self.strategy.get();

		log.info(process.pid, '_execute_trading_strategy Promise ...');
		return new Promise((resolve, reject) => {
			log.info(process.pid, '_execute_trading_strategy Promise');

			if (self.midmarket_price === null) {
				log.warning(process.pid, 'Too soon for trading; midmarket price unknown.');
				return resolve('Too soon for trading; midmarket price unknown.');
			}

			if (
				settings.get(`${self.product_id}.buy.only_when_trend_is_full`)
				&& this.latest_strategy_results.trades_n !== settings.get(`${self.product_id}.strategies.${settings.get(`${self.product_id}.strategy`)}.trades_n`)
			) {
				log.warning(process.pid, 'Too soon for trading; trend not full and needs to be.');
				return resolve('Too soon for trading; trend not full and needs to be.');
			}


			log.info(process.pid, '_execute_trading_strategy latest_strategy_results', self.latest_strategy_results);


			if (self.latest_strategy_results && self.latest_strategy_results.should_buy === true) {
				// API Buy!.01
				log.info(process.pid, `_execute_trading_strategy should_buy: ${self.latest_strategy_results.should_buy} Should buy!`);
				try{
					self._place_buy();
				} catch (err) {
					log.error('Error placing buy order as part of strategy', err);
					return reject(err);
				}
			} else {
				log.info(process.pid, `_execute_trading_strategy should_buy: ${self.latest_strategy_results.should_buy} Should NOT buy!`);
				self._cancel_all_buy();
			}

			for (let id in self.my_buy_data_by_id) {
				if (!(id in self.synced_book._ordersByID)) {
					log.info(process.pid, `_execute_trading_strategy id ${id} no longer in order book: Should sell!`);
					let should_sell = true;
					
					if ('expire_time' in self.my_buy_data_by_id[id]) {
						log.info(process.pid, `_execute_trading_strategy sell expire_time:`, self.my_buy_data_by_id[id].expire_time);
						if (new Date(self.my_buy_data_by_id[id].expire_time) < new Date) {
							log.info(process.pid, `_execute_trading_strategy sell shouldn't sell; order expired.`);
							delete self.my_buy_data_by_id[id];
							should_sell = false;
						}
					}

					if (should_sell) {
						// API Sell!
						try{
							self._place_sell(self.my_buy_data_by_id[id]);
						} catch (err) {
							log.error('Error placing sell order as part of strategy', err);
							return reject(err);
						}
					}
				} else {
					log.info(process.pid, `_execute_trading_strategy id ${id} still in order book: Should NOT sell!`);
				}
			}


			// Final / Cleanup
			self.last_midmarket_price = self.midmarket_price
			resolve();
		});
	}



	_add_trades(trades) {
		log.info(process.pid, '_add_trades', trades);

		if (this.strategy !== undefined && trades !== undefined) {
			log.info(process.pid, '_add_trades', 'adding ...');
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



	_cancel_all_buy() {
		log.info(process.pid, '_cancel_all_buy');

		for (let id in this.my_buy_data_by_id) {
			log.info(process.pid, '_cancel_all_buy cancel:', this.my_buy_data_by_id[id]);
			this.cancel_order(id);
		}
	}



	_place_buy() {
		log.info(process.pid, '_place_buy');
		const self = this;

		if (settings.get(`${self.product_id}.trade_enabled`)) {
			let order = {
				product_id: self.product_id,
				type: 'limit',
				post_only: settings.get(`${self.product_id}.buy.post_only`),
				price: Math.floor((self.midmarket_price - settings.get(`${self.product_id}.buy.below_midmarket`)) * 100) / 100, //Round down; two decimals
				size: settings.get(`${self.product_id}.buy.amount`),
			};

			if (settings.get(`${self.product_id}.buy.cancel_after`))
				order.cancel_after = settings.get(`${self.product_id}.buy.cancel_after`);

			for (let i=0; i<settings.get(`${self.product_id}.buy.spread_n`); i++) {
				if (i > 0)
					order.price = Math.floor((order.price - settings.get(`${self.product_id}.buy.spread_v`)) * 100) / 100; //Round down; two decimals

				log.info(process.pid, 'BUY', order);
				self.client['buy'](order, (err, res, data) => {
					if (err) {
						log.error('Error placing buy order', err);
						throw new Error(err);
					}

					if (data.message) {
						log.error('Error placing buy order; message:', data.message);
						throw new Error(err);
					} else {
						self.my_buy_data_by_id[data.id] = data;
						eventEmitter.emit('buy_confirmed', data);
						log.info(process.pid, 'BUY CONFIRMED', data);

					}
				});
			}
		} else {
			log.warning(process.pid, '_place_buy TRADING DISABLED!');
		}
	}



	_place_sell(from_buy) {
		log.info(process.pid, '_place_sell', from_buy);
		const self = this;

		if (settings.get(`${self.product_id}.trade_enabled`)) {
			log.debug(process.pid, '_place_sell TRADE ENABLED');

			let buy_id = 'order_id' in from_buy ? from_buy.order_id : from_buy.id;
			
			log.debug(process.pid, '_place_sell buy_id:', buy_id);
			if (buy_id in this.my_buy_data_by_id) {
				let sell_price = (from_buy.price + settings.get(`${self.product_id}.sell.above_buy`) > self.midmarket_price) ? (from_buy.price + settings.get(`${self.product_id}.sell.above_buy`)) : (self.midmarket_price + 0.01);

				let order = {
					product_id: self.product_id,
					type: 'limit',
					post_only: settings.get(`${self.product_id}.sell.post_only`),
					price: Math.ceil(sell_price * 100) / 100, //Round up; two decimals
					size: from_buy.size,
				};

				log.debug(process.pid, 'SELL', order);
				self.client['sell'](order, (err, res, data) => {
					if (err) {
						log.error('Error placing sell order'. err);
						throw new Error(err);
					}

					if (data.message) {
						log.error('Error placing sell order; message:', data.message);
						throw new Error(err);
					} else {
						delete self.my_buy_data_by_id[buy_id];
						eventEmitter.emit('sell_confirmed', data);
						log.info(process.pid, 'SELL CONFIRMED', data);
					}
				});
			} else {
				let keys = [];
				for (let key in self.my_buy_data_by_id) {
					if (self.my_buy_data_by_id.hasOwnProperty(key)) {
						keys.push(key);
					}
				}
				log.debug(process.pid, '_place_sell buy_id not in my_buy_data_by_id:', keys);
			}
		} else {
			log.warning(process.pid, '_place_sell TRADING DISABLED!');
		}
	}
}



var bot = undefined;

module.exports = function (input, done, progress) {
	if (log)
		log.info(process.pid, bot.product_id, input);


	if (!('buy_confirmed' in eventEmitter._events)) {
		eventEmitter.on('buy_confirmed', (message) => {
			progress({
				action: 'buy_confirmed',
				data: message,
				timestamp: new Date,
			});
		});
	}

	if (!('sell_confirmed' in eventEmitter._events)) {
		eventEmitter.on('sell_confirmed', (message) => {
			progress({
				action: 'sell_confirmed',
				data: message,
				timestamp: new Date,
			});
		});
	}


	let reply = {
		action: input.action,
		product_id: (bot && bot.product_id ? bot.product_id : (input && input.product_id ? input.product_id : undefined)),
		data: null,
	};

	switch (input.action) {
		case 'initialize':
			if (settings.get('general.log')) {
				log = new Log(settings.get('general.log_level'), fs.createWriteStream(`GDAX-bot-${input.product_id}.log`));
			} else {
				let dev_null = (process.platform === 'win32') ? 'nul' : '/dev/null'
				log = new Log(settings.get('general.log_level'), fs.createWriteStream(dev_null));
			}

			log.info(`GDAXBot (${input.product_id}) is starting ...`);
			bot = new GDAXBot({
				product: input.product_id,
			});

			break;
		case 'add_orders':
			log.info(process.pid, 'add_orders', input.data);

			input.data.forEach((order) => {
				if (order.product_id === input.product_id && order.side === 'buy') {
					bot.my_buy_data_by_id[order.id] = order;
				}
			});

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
		case 'sell':
			bot._place_sell(input.data);

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
'use strict';

const _ = require('lodash');
const fs = require('fs');
const Log = require('log');
const settings = require('config');
const spawn = require('threads').spawn;
const stats = require('stats-lite');
const sprintf = require('sprintf-js').sprintf;
const terminal = spawn('./lib/terminal.js');
const threads = require('threads');

if (settings.get('general.log') === "on") {
	var log = new Log(settings.get('general.log_level'), fs.createWriteStream('GDAX.log'));
} else {
	let dev_null = (process.platform === 'win32') ? 'nul' : '/dev/null';
	var log = new Log(settings.get('general.log_level'), fs.createWriteStream(dev_null));
}

var fiat = settings.get("general.fiat");

var terminal_data = {
	account: {
	// 	timestamp: new Date,
	// 	profile_id: 'e316cb9a-TEMP-FAKE-DATA-97829c1925de',
	// 	id: '343bb963-TEMP-FAKE-DATA-8b562d2f7a4e',
	// 	account: {
	// 		id: "a1b2c3d4",
	// 		balance: "1.100",
	// 		holds: "0.100",
	// 		available: "1.00",
	// 		currency: "USD"
	// 	},
	// 	calculations: {
	// 		sell_now: '12345.67890123',
	// 		wait_fill: '23456.78901234',
	// 		fees: '23.67890123',
	// 	},
	},
	coins: {
        'BTC-EUR': {
            trending_up: undefined,
            should_buy: undefined
        },
        'ETH-EUR': {
            trending_up: undefined,
            should_buy: undefined
        },
        'LTC-EUR': {
            trending_up: undefined,
            should_buy: undefined
        },

		'BTC-USD': {
			trending_up: undefined,
			should_buy: undefined,
			// account: {
			// 	id: "a1b2c3d4",
			// 	balance: "1.100",
			// 	hold: "0.100",
			// 	available: "1.00",
			// 	currency: "BTC"
			// },
			// calculations: {
			// 	sell_now: '12345.67890123',
			// 	wait_fill: '23456.78901234',
			// 	fees: '23.67890123',
			// },
		},
		'ETH-USD': {
			trending_up: undefined,
			should_buy: undefined,
			// account: {
			// 	id: "a1b2c3d4",
			// 	balance: "1.100",
			// 	hold: "0.100",
			// 	available: "1.00",
			// 	currency: "ETH"
			// },
			// calculations: {
			// 	sell_now: '12345.67890123',
			// 	wait_fill: '23456.78901234',
			// 	fees: '23.67890123',
			// },
		},
		'LTC-USD': {
			trending_up: undefined,
			should_buy: undefined,
			// account: {
			// 	id: "a1b2c3d4",
			// 	balance: "1.100",
			// 	hold: "0.100",
			// 	available: "1.00",
			// 	currency: "LTC"
			// },
			// calculations: {
			// 	sell_now: '12345.67890123',
			// 	wait_fill: '23456.78901234',
			// 	fees: '23.67890123',
			// },
		},
	},
};
var bot = {};
var getting_orders = false;
var orders_cache = [];
var websocket = null;
var websocket_is_open = null;


var account_ids = {};
var calculations = {};
var last_match = {};
var trades = {};
// terminal_data.coins = {};
var trend_direction_up = {};

settings.get('general.product_ids').forEach((product_id) => {
	account_ids[product_id] = {};
	bot[product_id] = null;
	calculations[product_id] = {};
	last_match[product_id] = {};
	// terminal_data.coins[product_id] = {};
	trades[product_id] = [];
	trend_direction_up[product_id] = null;

	launch_bot(product_id);
});



function launch_bot(product_id) {
	bot[product_id] = spawn('./lib/bot.js');

	bot[product_id]
		.on('message', (message) => {
			log.info(process.pid, 'bot message', message.action, message);

			switch (message.action) {
				case 'get':
					let data = message.data;
					let product_id = message.product_id;

					// {
					// 	product_id: bot.product_id,
					// 	latest_strategy_results: {
					// 		stddev: 0.5871246980838061,
					// 		mean: 54.746669999999966,
					// 		last_trade_price: '55.32',
					// 		trades_n: 1000,
					// 		diff_price_and_mean: 0.5733300000000341,
					// 		is_trending_up: true,
					// 		should_buy: false
					// 	},
					// 	ticker: bot.ticker,
					// 	myorders: bot.myorders,
					// 	last_price: bot.last_price,
					// 	midmarket_price: bot.midmarket_price,
					// 	orderbook: bot.orderbook,
					// 	synced_book: bot.synced_book,
					// }

					terminal_data.coins[product_id].bot = data;
					terminal_data.coins[product_id].should_buy = data.latest_strategy_results.should_buy;
					terminal_data.coins[product_id].trending_up = data.latest_strategy_results.is_trending_up;

					break;
			}
		})
		.on('progress', (progress) => {
			log.info(process.pid, 'bot progress', progress.action, progress);

			switch (progress.action) {
				case 'buy_confirmed':
					websocket.send({
						action: 'buy_confirmed',
						data: progress.data,
						timestamp: new Date,
					});

					break;
				case 'sell_confirmed':
					websocket.send({
						action: 'sell_confirmed',
						data: progress.data,
						timestamp: new Date,
					});

					break;
			}
		})
		.on('error', function(error) {
			log.error(process.pid, `Bot [${product_id}] Error:`, error);
		})
		.on('exit', function() {
			log.info(process.pid, `Bot [${product_id}]  has been terminated.`);
		})
		.send({
			action: 'initialize',
			product_id: product_id,
		})
		.send({
			action: 'start',
			product_id: product_id,
		});
}



function open_websocket() {
	websocket = spawn('./lib/websocket.js');

	websocket
		.on('message', function (message) {
			log.info(process.pid, 'websocket message', message.action, message);

			switch (message.action) {
				case 'getAccounts':
					if (message.data && message.data.message) {
						log.error(process.pid, message.action, message.data.message);
					} else if (message.data)
					{
						if (terminal_data.account === undefined)
						{
							terminal_data.account = {};
						}
						terminal_data.account.timestamp = message.timestamp;
						terminal_data.account.profile_id = message.data[0].profile_id;


						message.data.forEach((account) => {
							if (account.currency === fiat)
							{
								terminal_data.account.account = account;
							}
							else if (terminal_data.coins[`${account.currency}-${fiat}`])
							{
								terminal_data.coins[`${account.currency}-${fiat}`].account = account;
							}

							account_ids[account.currency] = account.id;
						});
					}

					break;
				case 'getBytesReceived':
					// log.info(process.pid, 'bytesReceived:', message.getBytesReceived);
					terminal_data.bytesReceived = message.data;

					break;
				case 'isOpen':
					// log.info(process.pid, 'isOpen:', websocket_is_open);

					if (message.isOpen !== undefined)
						websocket_is_open = message.data;

					break;
				case 'getLastMatch':
					// log.debug(process.pid, 'LastMatch:', message.getLastMatch);
					settings.get('general.product_ids').forEach((product_id) => {
						terminal_data.coins[product_id].last_match = message.data[product_id];
						last_match[product_id] = message.data[product_id];
					});

					break;
				case 'getOrders':
					if (message.data && typeof message.data === 'object') {
						// log.debug(process.pid, `getOrders orders:`, message.getOrders.orders);
						// log.debug(process.pid, `getOrders orders length:`, message.getOrders.orders.length);

						// cache all the orders that we've received.
						// Will possibly multiple pages.
						_.forEach(message.data, (order) => {
							orders_cache.push(order);
						});

						log.debug(process.pid, 'websocket message', message.action, `orders_cache (${orders_cache.length}):`, orders_cache[orders_cache.length - 1]);


						if (message.data.message) {
							log.error(process.pid, message.action, message.data.message);
						} else if (message.data.length === 100) {
							log.debug(process.pid, 'websocket message', message.action, `Max Orders Received; get next page.`);

							setTimeout(() => {
								websocket.send({
									action: 'getOrders',
									next_page: message.next_page,
								});
							}, 500);

						} else {
							log.debug(process.pid, 'websocket message', message.action, `Processing all received orders ...`);

							websocket.send({
								action: 'add_orders',
								data: orders_cache,
								timestamp: new Date,
							});

							settings.get('general.product_ids').forEach((product_id) => {
								let add_orders = {
									action: 'add_orders',
									product_id: product_id,
									data: orders_cache,
									timestamp: new Date,
								};

								log.info(process.pid, `${product_id} bot send`, add_orders);

								bot[product_id]
									.send(add_orders);
							});

							let orders = orders_cache;
							let sell_now = {};
							let wait_fill = {};

							settings.get('general.product_ids').forEach((product_id) => {
								sell_now[product_id] = [];
								wait_fill[product_id] = [];
							});

							sell_now['total'] = [];
							wait_fill['total'] = [];

							_.forEach(orders, (order) => {
								// log.debug(process.pid, `getOrders order:`, order);
								let product_id = order.product_id;

								log.debug(process.pid, `getOrders last_match:`, last_match[order.product_id]);

								let sn = order.size * (last_match[order.product_id] ? last_match[order.product_id].price : 0);
								sell_now['total'].push(sn);
								if (order.product_id in sell_now)
									sell_now[order.product_id].push(sn);

								let wf = order.size * order.price;
								wait_fill['total'].push(wf);
								if (order.product_id in wait_fill)
									wait_fill[order.product_id].push(wf);
							});

							settings.get('general.product_ids').forEach((product_id) => {
								let sell_now_sum = stats.sum(sell_now[product_id]);
								let wait_fill_sum = stats.sum(wait_fill[product_id]);

								terminal_data.coins[product_id].calculations = {
									sell_now: sell_now_sum,
									wait_fill: wait_fill_sum,
									fees: sell_now_sum * .003,
								}
							});

							let sell_now_sum = stats.sum(sell_now['total']);
							let wait_fill_sum = stats.sum(wait_fill['total']);

							terminal_data.account = terminal_data.account || {};
							terminal_data.account.calculations = {
								sell_now: sell_now_sum,
								wait_fill: wait_fill_sum,
								fees: sell_now_sum * .003,
							}

							orders_cache = [];
							getting_orders = false;
						}
					} else {
						log.debug(process.pid, 'websocket message', message.action, `No orders received.`);
						getting_orders = false;
					}

					break;
				case 'getTrades':
					log.debug(process.pid, 'websocket message', message.action, message.data);
					settings.get('general.product_ids').forEach((product_id) => {
						trades[product_id] = [];

						while (message.data[product_id].length > 0) {
							trades[product_id].push(message.data[product_id].shift());
						}
					});

					log.debug(process.pid, 'websocket message', message.action, trades);
					break;
			}
		})
		.on('progress', (progress) => {
			log.info(process.pid, 'websocket progress', progress.action, progress);

			switch (progress.action) {
				case 'message_done':
					bot[progress.data.product_id].send({
						action: 'sell',
						data: progress.data,
						timestamp: new Date,
					});

					break;
			}
		})
		.on('error', function(error) {
			log.error(process.pid, 'Websocket Error:', error);
		})
		.on('exit', function() {
			log.info(process.pid, 'Websocket has been terminated.');
		});
}
open_websocket();



setInterval(() => {
	let isOpen = {
		action: 'isOpen',
		timestamp: new Date,
	};
	let getBytesReceived = {
		action: 'getBytesReceived',
		timestamp: new Date,
	};
	let getLastMatch = {
		action: 'getLastMatch',
		timestamp: new Date,
	};
	let getTrades = {
		action: 'getTrades',
		timestamp: new Date,
	};

	log.info(process.pid, 'websocket send', isOpen);
	log.info(process.pid, 'websocket send', getBytesReceived);
	log.info(process.pid, 'websocket send', getLastMatch);
	log.info(process.pid, 'websocket send', getTrades);

	websocket
		.send(isOpen)
		.send(getBytesReceived)
		.send(getLastMatch)
		.send(getTrades);


	log.info(process.pid, 'bots send PREP', trades);

	let send_trades = {};
	settings.get('general.product_ids').forEach((product_id) => {
		send_trades[product_id] = []

		while (trades[product_id].length > 0) {
			send_trades[product_id].push(trades[product_id].shift());
		};
	});


	settings.get('general.product_ids').forEach((product_id) => {
		let add_trades = {
			action: 'add_trades',
			data: send_trades[product_id],
			timestamp: new Date,
		};
		let get = {
			action: 'get',
			timestamp: new Date,
		};

		log.info(process.pid, `${product_id} bot send`, add_trades);
		log.info(process.pid, `${product_id} bot send`, get);

		bot[product_id]
			.send(add_trades)
			.send(get);
	});


	log.info(process.pid, 'terminal send', terminal_data);
	terminal.send(terminal_data);

	if (websocket_is_open === false) {
		log.info(process.pid, 'Re-opening Websocket ...');
		open_websocket();
	}
}, 1000);



setInterval(() => {
	let getAccounts = {
		action: 'getAccounts',
		timestamp: new Date,
	};

	log.info(process.pid, 'websocket send', getAccounts);

	websocket
		.send(getAccounts)

	if (!getting_orders)
	{
		let getOrders = {
			action: 'getOrders',
			timestamp: new Date,
		};

		log.info(process.pid, 'websocket send', getOrders);

		getting_orders = true;
		websocket
			.send(getOrders);
	}

	// settings.get('general.product_ids').forEach((product_id) => {
	// 	bot[product_id]
	// });
}, 10*1000);




// if (websocket.websocket && websocket.websocket.socket) {
// 	log.info('Bytes: ', websocket.websocket.socket.bytesReceived);
// }
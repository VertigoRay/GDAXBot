'use strict';

const fs = require('fs');
const Log = require('log');
const settings = require('config');
const spawn = require('threads').spawn;
const stats = require('stats-lite')
const sprintf = require('sprintf-js').sprintf;
const terminal = spawn('./lib/terminal.js');
const threads = require('threads');

var log = new Log('debug', fs.createWriteStream('GDAX.log'));

var terminal_data = {
	// account: {
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
	// },
	coins: {
		'BTC-USD': {
			trending_up: (Math.floor(Math.random() * 2) ? true : false),
			should_buy: (Math.floor(Math.random() * 2) ? true : false),
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
			trending_up: (Math.floor(Math.random() * 2) ? true : false),
			should_buy: (Math.floor(Math.random() * 2) ? true : false),
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
			trending_up: (Math.floor(Math.random() * 2) ? true : false),
			should_buy: (Math.floor(Math.random() * 2) ? true : false),
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
var websocket = null;
var websocket_is_open = null;


var product_ids = settings.get('general.product_ids');
var account_ids = {};
var last_match = {};
// terminal_data.coins = {};
var trend_direction_up = {};

product_ids.forEach((product_id) => {
	bot[product_id] = null;
	account_ids[product_id] = {};
	last_match[product_id] = {};
	// terminal_data.coins[product_id] = {};
	trend_direction_up[product_id] = null;

	launch_bot(product_id);
});



function response_trades(message) {
	terminal_data.stream = [];

	product_ids.forEach((product_id) => {
		let price = null;
		let price_outside_stdev = false;
		let price_above_mean = false;

		if (last_match && last_match[product_id]) {
			price = parseFloat(last_match[product_id].price);
		}

		if (price) {
			let stdev = stats.stdev(message.getTrades[product_id]);
			let mean = stats.mean(message.getTrades[product_id]);

			let difference = mean - price;
			let absolute_value_of_difference = Math.abs(difference);

			if (difference == absolute_value_of_difference) {
				// Our price is below the mean
				price_above_mean = false;
			} else {
				// Our price is above the mean
				price_above_mean = true;
			}

			if (absolute_value_of_difference > stdev) {
				// Trend has changed directions.
				price_outside_stdev = true;
			}

			if (price_above_mean && price_outside_stdev) {
				// Price is significantly high to consider us trending up
				trend_direction_up[product_id] = true;
			} else if (!price_above_mean && price_outside_stdev) {
				// Price is significantly low to consider us trending down
				trend_direction_up[product_id] = false;
			}


			let stream = {
				product_id: product_id,
				num_trades: parseFloat(message.getTrades[product_id].length),
				stdev: parseFloat(stdev),
				mean: parseFloat(mean),
				price: parseFloat(price),
				difference: parseFloat(difference),
				absolute_value_of_difference: parseFloat(absolute_value_of_difference),
				price_up: undefined,
				price_above_mean: price_above_mean,
				price_outside_stdev: price_outside_stdev,
				trend_direction_up: trend_direction_up[product_id],
			};
			terminal_data.stream.push(stream);
		}
	});
}



function launch_bot(product_id) {
	bot[product_id] = spawn('./lib/websocket.js');

	bot[product_id].send({
		action: 'initialize',
		product_id: product_id,
	});
}



function open_websocket() {
	websocket = spawn('./lib/websocket.js');

	websocket
		.on('message', function (message) {
			if (message.getAccounts)
			{
				log.info(process.pid, '(websocket message) getAccounts:', message);
				if (message.getAccounts.accounts)
				{
					if (terminal_data.account === undefined)
					{
						terminal_data.account = {};
					}
					terminal_data.account.timestamp = message.getAccounts.timestamp;
					terminal_data.account.profile_id = message.getAccounts.accounts[0].profile_id;

					message.getAccounts.accounts.forEach((account) => {
						if (account.currency === 'USD')
						{
							terminal_data.account.account = account;
						}
						else if (terminal_data.coins[`${account.currency}-USD`])
						{
							terminal_data.coins[`${account.currency}-USD`].account = account;
						}

						account_ids[account.currency] = account.id;
					});
				}
			}
			else if (message.getBytesReceived)
			{
				// log.info(process.pid, '(websocket message) bytesReceived:', message.getBytesReceived);
				terminal_data.bytesReceived = message.getBytesReceived;
			}
			else if (message.isOpen !== undefined)
			{
				websocket_is_open = message.isOpen;
				// log.info(process.pid, '(websocket message) isOpen:', websocket_is_open);
			}
			else if (message.getLastMatch)
			{
				// log.info(process.pid, '(websocket message) LastMatch:', message.getLastMatch);
				product_ids.forEach((product_id) => {
					terminal_data.coins[product_id].last_match = message.getLastMatch[product_id];
				});
			}
			else if (message.ProductIds)
			{
				product_ids = message.ProductIds
				log.info(process.pid, '(websocket message) ProductIds:', product_ids);
			}
			else if (message.getTrades)
			{
				// log.info(process.pid, '(websocket message) Trades:', message.Trades);
				response_trades(message);
			}
		})
		.on('error', function(error) {
			log.error(process.pid, 'Websocket Error:', error);
		})
		.on('exit', function() {
			log.info(process.pid, 'Websocket has been terminated.');
		})
}
open_websocket();



setInterval(() => {
	websocket
		.send('isOpen')
		.send('getBytesReceived')
		.send('getLastMatch')
		.send('getTrades');


	terminal.send(terminal_data);

	if (websocket_is_open === false) {
		log.info(process.pid, 'Re-opening Websocket ...');
		open_websocket();
	}
}, 1000);


setInterval(() => {
	websocket
		.send('getAccounts')
	
	// product_ids.forEach((product_id) => {
	// 	bot[product_id]
	// 		.send({
	// 			action: 'getAccountHolds',
	// 			account_id: accounts[product_id.split('-')[0]],
	// 		});
	// });
}, 5000);


// if (websocket.websocket && websocket.websocket.socket) {
// 	log.info('Bytes: ', websocket.websocket.socket.bytesReceived);
// }
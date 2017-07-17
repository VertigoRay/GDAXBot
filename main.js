'use strict';

const settings = require('config');
const spawn = require('threads').spawn;
const stats = require('stats-lite')
const sprintf = require('sprintf-js').sprintf;
const terminal = spawn('./lib/terminal.js');
const threads = require('threads');

var terminal_data = {};
var websocket = null;
var websocket_is_open = null;


var product_ids = settings.get('general.product_ids');
var last_match = {};
terminal_data.coins = {};
var trend_direction_up = {};

product_ids.forEach((product_id) => {
	terminal_data.coins[product_id] = {};
	last_match[product_id] = {};
	trend_direction_up[product_id] = null;
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



function open_websocket() {
	websocket = spawn('./lib/websocket.js');

	websocket
		.on('message', function (message) {
			if (message.getBytesReceived)
			{
				// console.log(process.pid, '(websocket message) bytesReceived:', message.getBytesReceived);
				terminal_data.bytesReceived = message.getBytesReceived;
			}
			else if (message.isOpen !== undefined)
			{
				websocket_is_open = message.isOpen;
				// console.log(process.pid, '(websocket message) isOpen:', websocket_is_open);
			}
			else if (message.getLastMatch)
			{
				// console.log(process.pid, '(websocket message) LastMatch:', message.getLastMatch);
				product_ids.forEach((product_id) => {
					terminal_data.coins[product_id].last_match = message.getLastMatch;
				});
			}
			else if (message.ProductIds)
			{
				product_ids = message.ProductIds
				console.log(process.pid, '(websocket message) ProductIds:', product_ids);
			}
			else if (message.getTrades)
			{
				// console.log(process.pid, '(websocket message) Trades:', message.Trades);
				response_trades(message);
			}
		})
		.on('error', function(error) {
			console.error(process.pid, 'Websocket Error:', error);
		})
		.on('exit', function() {
			console.log(process.pid, 'Websocket has been terminated.');
		})
}
open_websocket();



setInterval(() => {
	websocket
		.send('isOpen')
		.send('getBytesReceived')
		.send('getLastMatch')
		.send('getTrades');



	let fake_account_data = Object.assign({
		account: {
			timestamp: new Date,
			profile_id: 'e316cb9a-TEMP-FAKE-DATA-97829c1925de',
			id: '343bb963-TEMP-FAKE-DATA-8b562d2f7a4e',
			account: {
				id: "a1b2c3d4",
				balance: "1.100",
				holds: "0.100",
				available: "1.00",
				currency: "USD"
			},
			calculations: {
				sell_now: '12345.67890123',
				wait_fill: '23456.78901234',
				fees: '23.67890123',
			},
		},
		coins: {
			'BTC-USD': {
				trade_enabled: false,
				trending_up: (Math.floor(Math.random() * 2) ? true : false),
				should_buy: (Math.floor(Math.random() * 2) ? true : false),
				last_match: {
					type: "match",
					trade_id: parseInt(Math.random() * 100),
					sequence: 50,
					maker_order_id: "ac928c66-TEMP-FAKE-DATA-a110027a60e8",
					taker_order_id: "132fb6ae-TEMP-FAKE-DATA-d681ac05cea1",
					time: "2014-11-07T08:19:27.028459Z",
					product_id: "BTC-USD",
					size: (Math.random() * 100).toFixed(8),
					price: (Math.random() * 10000).toFixed(8),
					side: Math.floor(Math.random() * 2) ? 'buy' : 'sell',
				},
				account: {
					id: "a1b2c3d4",
					balance: "1.100",
					holds: "0.100",
					available: "1.00",
					currency: "BTC"
				},
				calculations: {
					sell_now: '12345.67890123',
					wait_fill: '23456.78901234',
					fees: '23.67890123',
				},
			},
			'ETH-USD': {
				trade_enabled: true,
				trending_up: (Math.floor(Math.random() * 2) ? true : false),
				should_buy: (Math.floor(Math.random() * 2) ? true : false),
				last_match: {
					type: "match",
					trade_id: parseInt(Math.random() * 100),
					sequence: 50,
					maker_order_id: "ac928c66-TEMP-FAKE-DATA-a110027a60e8",
					taker_order_id: "132fb6ae-TEMP-FAKE-DATA-d681ac05cea1",
					time: "2014-11-07T08:19:27.028459Z",
					product_id: "ETH-USD",
					size: (Math.random() * 100).toFixed(8),
					price: (Math.random() * 1000).toFixed(8),
					side: Math.floor(Math.random() * 2) ? 'buy' : 'sell',
				},
				account: {
					id: "a1b2c3d4",
					balance: "1.100",
					holds: "0.100",
					available: "1.00",
					currency: "ETH"
				},
				calculations: {
					sell_now: '12345.67890123',
					wait_fill: '23456.78901234',
					fees: '23.67890123',
				},
			},
			'LTC-USD': {
				trade_enabled: true,
				trending_up: (Math.floor(Math.random() * 2) ? true : false),
				should_buy: (Math.floor(Math.random() * 2) ? true : false),
				last_match: {
					type: "match",
					trade_id: parseInt(Math.random() * 100),
					sequence: 50,
					maker_order_id: "ac928c66-TEMP-FAKE-DATA-a110027a60e8",
					taker_order_id: "132fb6ae-TEMP-FAKE-DATA-d681ac05cea1",
					time: "2014-11-07T08:19:27.028459Z",
					product_id: "LTC-USD",
					size: (Math.random() * 100).toFixed(8),
					price: (Math.random() * 100).toFixed(8),
					side: Math.floor(Math.random() * 2) ? 'buy' : 'sell',
				},
				account: {
					id: "a1b2c3d4",
					balance: "1.100",
					holds: "0.100",
					available: "1.00",
					currency: "LTC"
				},
				calculations: {
					sell_now: '12345.67890123',
					wait_fill: '23456.78901234',
					fees: '23.67890123',
				},
			},
		},
	}), terminal_data;

	terminal.send(fake_account_data);

	if (websocket_is_open === false) {
		console.log(process.pid, 'Re-opening Websocket ...');
		open_websocket();
	}
}, 1000);


// if (websocket.websocket && websocket.websocket.socket) {
// 	console.log('Bytes: ', websocket.websocket.socket.bytesReceived);
// }
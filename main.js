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
var trend_direction_up = {};

product_ids.forEach((product_id) => {
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
				last_match = message.getLastMatch;
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
	product_ids = settings.get('general.product_ids');
	// console.log(process.pid, '(loop) LastMatch:', last_match);

	websocket
		.send('isOpen')
		.send('getBytesReceived')
		.send('getLastMatch')
		.send('getTrades');

	terminal.send(terminal_data);

	if (websocket_is_open === false) {
		console.log(process.pid, 'Re-opening Websocket ...');
		open_websocket();
	}
}, 1000);


// if (websocket.websocket && websocket.websocket.socket) {
// 	console.log('Bytes: ', websocket.websocket.socket.bytesReceived);
// }
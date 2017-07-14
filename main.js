'use strict';

const settings = require('config');
const spawn = require('threads').spawn;
const stats = require("stats-lite")
const term = require( 'terminal-kit' ).terminal ;
const threads = require('threads');

var websocket = null;

var websocket_is_open = null;

var product_ids = settings.get('general.product_ids');
var last_match = null;

// product_ids.forEach((i) => {
// 	last_match[i] = {};
// });



function open_websocket() {
	websocket = spawn('./lib/websocket.js');

	websocket
		.on('message', function (message) {
			if (message.getBytesReceived)
			{
				console.log(process.pid, '(websocket message) bytesReceived:', message.getBytesReceived);
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
				product_ids.forEach((i) => {
					let price = null;
					let trend_changed = false;
					let trending_up = false;

					if (last_match && last_match[i]) {
						price = parseFloat(last_match[i].price);
					}

					if (price) {
						let stdev = stats.stdev(message.getTrades[i]);
						let mean = stats.mean(message.getTrades[i]);

						let difference = mean - price;
						let absolute_value_of_difference = Math.abs(difference);

						if (difference == absolute_value_of_difference) {
							// Our price is below the mean
							trending_up = true;
						} else {
							// Our price is above the mean
							trending_up = false;
						}

						if (absolute_value_of_difference > stdev) {
							// Trend has changed directions.
							trend_changed = true;
						}

						console.log(
							process.pid,
							i,
							message.getTrades[i].length,
							stdev,
							mean,
							price,
							difference,
							absolute_value_of_difference,
							trending_up,
							trending_changed
						);
					}
				});
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

	if (websocket_is_open === false) {
		console.log(process.pid, 'Re-opening Websocket ...');
		open_websocket();
	}
}, 1000);


// if (websocket.websocket && websocket.websocket.socket) {
// 	console.log('Bytes: ', websocket.websocket.socket.bytesReceived);
// }
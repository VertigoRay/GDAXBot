'use strict';

const settings = require('config');
const spawn = threads.spawn;
const stats = require("stats-lite")
const term = require( 'terminal-kit' ).terminal ;
const threads = require('threads');

var websocket = null;

var websocket_is_open = null;

var product_ids = settings.get('general.product_ids');
var last_match = {};

product_ids.forEach((i) => {
	last_match[i] = null;
});



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
				console.log(process.pid, '(websocket message) LastMatch:', message.getLastMatch);
				if (message.Lastmatch !== undefined) {
					last_match = message.Lastmatch;
				}
			}
			else if (message.ProductIds)
			{
				product_ids = message.ProductIds
				console.log(process.pid, '(websocket message) ProductIds:', product_ids);

				product_ids.forEach((i) => {
					last_match[i] = [];
				});
			}
			else if (message.getTrades)
			{
				// console.log(process.pid, '(websocket message) Trades:', message.Trades);
				product_ids.forEach((i) => {
					console.log(process.pid, i, message.getTrades[i].length, stats.stdev(message.getTrades[i]), last_match[i]);
				});
				
			}
		})
		.on('error', function(error) {
			console.error(process.pid, 'Websocket Error:', error);
		})
		.on('exit', function() {
			console.log(process.pid, 'Websocket has been terminated.');
		})
		.send('getProductIds');
}
open_websocket();


setInterval(() => {
	product_ids = settings.get('general.product_ids');

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
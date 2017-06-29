// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.


var Gdax = require('gdax');

var pubBTCUSDClient = new Gdax.PublicClient('BTC-USD', 'https://api.gdax.com');

var callback = function(err, response, data) {
	if (err) {
		console.log("err: "+ err);
		console.log(err);
	}

	if (response) {
		console.log("response: "+ response);
		console.log(response);
	}

	if (data) {
		console.log("data: "+ data);
		console.log(data);
	}
};
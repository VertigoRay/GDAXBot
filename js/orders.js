'use strict'

const settings = require('electron-settings');

var Gdax = require('gdax');
var kue = require('kue')
  , queue = kue.createQueue();



var auth = {
	'key': settings.get('account_sandbox_api_key'),
	'secret': settings.get('account_sandbox_api_secret'),
	'passphrase': settings.get('account_sandbox_api_passphrase'),
};

var gdax = {
	'BTC-USD': null,
	'ETH-USD': null,
	'LTC-USD': null,
}

var orders = {};



if (settings.get('account_sandbox')){
	// Running in Sandbox
	if (!(auth.secret && auth.key && auth.passphrase)) {
		// UNAUTHENTICATED
		gdax['BTC-USD'] = new Gdax.PublicClient('BTC-USD', 'https://api-public.sandbox.gdax.com');
		gdax['ETH-USD'] = new Gdax.PublicClient('ETH-USD', 'https://api-public.sandbox.gdax.com');
		gdax['LTC-USD'] = new Gdax.PublicClient('LTC-USD', 'https://api-public.sandbox.gdax.com');
	} else {
		// AUTHENTICATED
		gdax['BTC-USD'] = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase, product_id='BTC-USD', api_url='https://api-public.sandbox.gdax.com');
		gdax['ETH-USD'] = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase, product_id='ETH-USD', api_url='https://api-public.sandbox.gdax.com');
		gdax['LTC-USD'] = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase, product_id='LTC-USD', api_url='https://api-public.sandbox.gdax.com');
	}
} else {
	// Running in Production
	if (!(auth.secret && auth.key && auth.passphrase)) {
		// UNAUTHENTICATED
		gdax['BTC-USD'] = new Gdax.PublicClient('BTC-USD', 'https://api.gdax.com');
		gdax['ETH-USD'] = new Gdax.PublicClient('ETH-USD', 'https://api.gdax.com');
		gdax['LTC-USD'] = new Gdax.PublicClient('LTC-USD', 'https://api.gdax.com');
	} else {
		// AUTHENTICATED
		gdax['BTC-USD'] = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase);
		gdax['ETH-USD'] = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase);
		gdax['ETH-USD'].productID = 'ETH-USD';
		gdax['LTC-USD'] = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase);
		gdax['LTC-USD'].productID = 'LTC-USD';
	}
}



function cancel_all_buy_orders() {

}



exports.isOrderMine = order_id => {
	return orders[order_id] ? true : false;
}



exports.getOrder = order_id => {
	return orders[order_id];
}



exports.getOrders = () => {
	return orders;
}



queue.process('buy', function(job, done) {
	const uuid = require('uuid');

	var buy = {
		'product_id': job.data.product_id,
		'size': (parseFloat(settings.get(job.data.product_id +'_buy_amount')) / job.data.price).toFixed(8),
		'price': null,
	}

	if (buy.size < 0.01) {
		buy.size = 0.01; //Minimum Size
	}

	console.info(buy);

	for (var i=0; i < parseInt(settings.get(job.data.product_id +'_spread_n')); i++) {
		buy.price = parseFloat(job.data.price - (parseFloat(settings.get(job.data.product_id +'_spread_v')) * (i + 1))).toFixed(2);
		
		console.info('BUY: '+ buy.price);
		if (settings.get(job.data.product_id +'_trade_enabled')) {
			console.info('Placing a Real Buy Order');
			gdax[job.data.product_id].buy(buy, function(err, response, data) {
				if (err) {
					console.error(err);
					done(err);
				} else {
					console.info('Order Placed: '+ data.id);
					orders[data.id] = data;
					done();
				}
			});
		} else {
			console.info('Placing a FAKE Buy Order');
			let data = {
				id: 'FAKE-'+ uuid.v1(),
				price: buy.price,
				size: buy.size,
				product_id: buy.product_id,
				side: 'buy',
				stp: 'dc',
				type: 'limit',
				time_in_force: 'GTC',
				post_only: false,
				created_at: Date.now(),
				fill_fees: "0.0000000000000000",
				filled_size: "0.00000000",
				executed_value: "0.0000000000000000",
				status: "pending",
				settled: false
			}
			console.info('Order Placed: '+ data.order_id);
			orders[data.order_id] = data;
			done();
		}
	}
});



queue.process('sell', function(job, done) {
	const uuid = require('uuid');

	console.info('SELLING ...');
	var sell = {
		'product_id': job.data.product_id,
		'size': (parseFloat(settings.get(job.data.product_id +'_sell_amount')) / job.data.price).toFixed(8),
		'price': null,
	}
	console.info(sell);

	if (sell.size < 0.01) {
		sell.size = 0.01; //Minimum Size
	}

	for (var i=0; i < parseInt(settings.get(job.data.product_id +'_spread_n')); i++) {
		sell.price = parseFloat(job.data.price + (parseFloat(settings.get(job.data.product_id +'_spread_v')) * (i + 1))).toFixed(2);
		
		console.info('SELL: '+ sell.price);
		if (settings.get(job.data.product_id +'_trade_enabled')) {
			console.info('Placing a Real Sell Order');
			gdax[job.data.product_id].sell(sell, function(err, response, data) {
				if (err) {
					console.error(err);
					done(err);
				} else {
					console.info('Order Placed: '+ data.id);
					orders[data.id] = data;
					done();
				}
			});
		} else {
			console.info('Placing a FAKE Sell Order');
			let data = {
				id: 'FAKE-'+ uuid.v1(),
				price: sell.price,
				size: sell.size,
				product_id: sell.product_id,
				side: 'sell',
				stp: 'dc',
				type: 'limit',
				time_in_force: 'GTC',
				post_only: false,
				created_at: Date.now(),
				fill_fees: "0.0000000000000000",
				filled_size: "0.00000000",
				executed_value: "0.0000000000000000",
				status: "pending",
				settled: false
			}
			console.info('Order Placed: '+ data.order_id);
			orders[data.order_id] = data;
			done();
		}
	}
	done();
});

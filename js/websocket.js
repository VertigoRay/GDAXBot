'use strict'

// const {ipcMain} = require('electron');
const settings = require('electron-settings');
const Gdax = require('gdax');
const kue = require('kue')
  , queue = kue.createQueue();



class Websocket {
	constructor() {
		this.websocket = false;
		this.authenticated = false;

		this.auth = {
			'key': settings.get('account_api_key'),
			'secret': settings.get('account_api_secret'),
			'passphrase': settings.get('account_api_passphrase'),
		};

		this.trigger = {
			'BTC-USD': [],
			'ETH-USD': [],
			'LTC-USD': [],
		};

		this.priority = {
			'BTC-USD': 'high',
			'ETH-USD': 'medium',
			'LTC-USD': 'normal',
		}

		this.averages = {
			'long': {
				'BTC-USD': [],
				'ETH-USD': [],
				'LTC-USD': [],
			},
			'short': {
				'BTC-USD': [],
				'ETH-USD': [],
				'LTC-USD': [],
			},
		};

		this.var_is_trending_up = {
			'long': {
				'BTC-USD': null,
				'ETH-USD': null,
				'LTC-USD': null,
			},
			'short': {
				'BTC-USD': null,
				'ETH-USD': null,
				'LTC-USD': null,
			},
		};

		this.var_should_buy = {
			'BTC-USD': null,
			'ETH-USD': null,
			'LTC-USD': null,
		};

		this.gdax = {
			'BTC-USD': null,
			'ETH-USD': null,
			'LTC-USD': null,
		}

		this.orders = {};



		this.open_conn = () => {
			////////////////////////////////////
			// Sandbox stream is currently down. Not sure why ...
			////////////////////////////////////
			if (settings.get('account_sandbox')){
				// Running in Sandbox
				this.auth = {
					'key': settings.get('account_sandbox_api_key'),
					'secret': settings.get('account_sandbox_api_secret'),
					'passphrase': settings.get('account_sandbox_api_passphrase'),
				};
				if (!(this.auth.secret && this.auth.key && this.auth.passphrase)) {
					// UNAUTHENTICATED
					this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed-public.sandbox.gdax.com');
					this.gdax['BTC-USD'] = new Gdax.PublicClient('BTC-USD', 'https://api-public.sandbox.gdax.com');
					this.gdax['ETH-USD'] = new Gdax.PublicClient('ETH-USD', 'https://api-public.sandbox.gdax.com');
					this.gdax['LTC-USD'] = new Gdax.PublicClient('LTC-USD', 'https://api-public.sandbox.gdax.com');
				} else {
					// AUTHENTICATED
					this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed-public.sandbox.gdax.com', this.auth);
					this.gdax['BTC-USD'] = new Gdax.AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase, product_id='BTC-USD', api_url='https://api-public.sandbox.gdax.com');
					this.gdax['ETH-USD'] = new Gdax.AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase, product_id='ETH-USD', api_url='https://api-public.sandbox.gdax.com');
					this.gdax['LTC-USD'] = new Gdax.AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase, product_id='LTC-USD', api_url='https://api-public.sandbox.gdax.com');
					authenticated = true;
				}
			} else {
				// Running in Production
				if (!(this.auth.secret && this.auth.key && this.auth.passphrase)) {
					// UNAUTHENTICATED
					console.log('Websocket: Connecting UNAUTHENTICATED');
					this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD']);
					this.gdax['BTC-USD'] = new Gdax.PublicClient('BTC-USD', 'https://api.gdax.com');
					this.gdax['ETH-USD'] = new Gdax.PublicClient('ETH-USD', 'https://api.gdax.com');
					this.gdax['LTC-USD'] = new Gdax.PublicClient('LTC-USD', 'https://api.gdax.com');
				} else {
					// AUTHENTICATED
					console.log('Websocket: Connecting AUTHENTICATED');
					this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed.gdax.com', this.auth);
					this.gdax['BTC-USD'] = new Gdax.AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase);
					this.gdax['ETH-USD'] = new Gdax.AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase);
					this.gdax['ETH-USD'].productID = 'ETH-USD';
					this.gdax['LTC-USD'] = new Gdax.AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase);
					this.gdax['LTC-USD'].productID = 'LTC-USD';
					this.authenticated = true;
				}
			}
		}



		this.message = (data) => {
			if (data.type === 'match') {
				console.info('WEBSOCKET: MATCH '+ data.product_id +' ('+ data.price +') '+ data.time);
				queue.create('websocket_match', {
					data: data,
					title: 'WEBSOCKET: MATCH '+ data.product_id +' ('+ data.price +') '+ data.time,
				}).priority('low').removeOnComplete(true).save();

				//if price is at the next Trigger price.
				if (this.is_triggered(data.product_id, data.price)) {
					console.info('\tTriggered ...');
					if (this.should_buy(data.product_id)) {
						console.info('\t\tShould buy!');
						
						queue.create('buy', {
							data: data,
							enabled: settings.get(data.product_id +'_trade_enabled'),
							price: data.price,
							product_id: data.product_id,
							title: 'Buy: '+ data.product_id +' '+ data.price,
						}).priority(this.priority[data.product_id]).removeOnComplete(true).save();
					} else {
						console.info('\t\tShould NOT buy; cancelling all current buy orders!');
						this.cancel_all_buy_orders(data.product_id);
					};
				}
			} else if (data.type === 'done') {
				// Order filled or canceled
				if (data.reason === 'filled' && data.side === 'buy' && this.is_order_mine(data.order_id)) {
					queue.create('websocket_done_filled_buy_ours', {
						data: data,
						title: 'WEBSOCKET: DONE '+ data.reason +' '+ data.side +' Ours: '+ data.order_id,
					}).priority('low').removeOnComplete(true).save();
					////////////////////////////
					// We need to see if this is one of our orders
					// if so, we need to place a sell order.
					////////////////////////////
					queue.create('sell', {
						data: data,
						order_id: data.order_id,
						price: data.price,
						product_id: data.product_id,
						title: 'Buy Order Filled: '+ data.product_id +' '+ data.price,
					}).priority(this.priority[data.product_id]).removeOnComplete(true).save();
				}
			}
		};



		////////////////////////////////////
		// Open Web Socket
		////////////////////////////////////
		this.open_conn();
		this.websocket.on('open', function () {
			console.log('Websocket: Open');
		});
		this.websocket.on('message', this.message);
		this.websocket.on('error', function(err) {
			console.error(err);
		});
		this.websocket.on('close', this.open_conn);



		this.historic_callback = (err, response, data) => {
			if (err) {
				console.error(err);
			}

			var try_again = false;
			if (response) {
				console.log('callbackHistoricRates response: '+ response.request.path);
				if (response.request.path.includes('BTC-USD')) {
					var product_id = 'BTC-USD'
				} else if (response.request.path.includes('ETH-USD')) {
					var product_id = 'ETH-USD'
				} else if (response.request.path.includes('LTC-USD')) {
					var product_id = 'LTC-USD'
				}

				try {
					data.forEach((i) => {
						this.averages['short'][product_id].push(parseFloat(i[4]));
						this.averages['long'][product_id].push(parseFloat(i[4]));
					});
				} catch (e) {
					console.log(e);
					try_again = true;
				}

				if (try_again) {
					this.gdax[product_id].getProductHistoricRates({'granularity': 10}, this.historic_callback);
				}
			}
		};



		this.historicPull();
	}




	///////////////////////////////
	// Determine when the next high and low buy trigger is. Could be as low as .01.
	///////////////////////////////
	is_triggered(product_id, price) {
		if (this.trigger[product_id].length > 0) {
			if (price < this.trigger[product_id][0] || price > this.trigger[product_id][1]) {
				// load new vars.
				this.trigger[product_id][0] = parseFloat(price) - parseFloat(settings.get(product_id +'_buy_trigger'));
				this.trigger[product_id][1] = parseFloat(price) + parseFloat(settings.get(product_id +'_buy_trigger'));
				return true;
			} else {
				return false;
			}
		} else {
			// Likely first time this is called; just load the vars.
			this.trigger[product_id][0] = parseFloat(price) - parseFloat(settings.get(product_id +'_buy_trigger'));
			this.trigger[product_id][1] = parseFloat(price) + parseFloat(settings.get(product_id +'_buy_trigger'));
			return false;
		}
	}



	is_trending_up(s_or_l, product_id, price) {
		// console.log('isTrendingUp('+ s_or_l +' '+ product_id +' '+ price +')');
		// console.log('isTrendingUp('+ s_or_l +' '+ product_id +' '+ price +') averages length: '+ this.averages[s_or_l][product_id].length);
		// console.log('isTrendingUp(product_id) averages:'+ this.averages[s_or_l][product_id]);

		var sum = 0;
		// console.log('isTrendingUp sum: '+ sum);
		this.averages[s_or_l][product_id].forEach(function (i) { sum += i });
		// console.log('isTrendingUp sum: '+ sum);
		var prev_avg = sum/this.averages[s_or_l][product_id].length;
		// console.log('isTrendingUp prev_avg: '+ prev_avg);

		this.averages[s_or_l][product_id].push(parseFloat(price));
		var sum = 0;
		// console.log('isTrendingUp sum: '+ sum);
		this.averages[s_or_l][product_id].forEach(function (i) { sum += i });
		// console.log('isTrendingUp sum: '+ sum);
		var avg = sum/this.averages[s_or_l][product_id].length;
		// console.log('isTrendingUp avg: '+ avg);

		var setting = product_id +'_trend_trade_'+ s_or_l +'_ct';
		if (this.averages[s_or_l][product_id].length > settings.get(setting)) {
			// console.warn('More trades than needed.\n\tHave ('+ product_id +' '+ s_or_l +'):'+ this.averages[s_or_l][product_id].length +'\n\tNeed ('+ setting +'):'+ settings.get(setting));
			while (this.averages[s_or_l][product_id].length > settings.get(setting)) {
				this.averages[s_or_l][product_id].shift();
			}
		} else {
			// console.info('Historical Trades looks good.\n\tHave ('+ product_id +' '+ s_or_l +'):'+ this.averages[s_or_l][product_id].length +'\n\tNeed ('+ setting +'):'+ settings.get(setting));
		}

		this.var_is_trending_up[s_or_l][product_id] = (avg > prev_avg ? true : false);
		return (avg > prev_avg ? true : false);
	}



	should_buy(product_id) {
		if (settings.get(product_id +'_buy_on_trend_long_up') && settings.get(product_id +'_buy_on_trend_short_up')) {
			// Buy only on trend up, BOTH
			let should_buy = (this.var_is_trending_up['long'][product_id] && this.var_is_trending_up['short'][product_id]) ? true : false;
			// console.log('Should_Buy: BOTH: '+ this.var_is_trending_up['long'][product_id] +' && '+ this.var_is_trending_up['short'][product_id] +': '+ should_buy)
			this.var_should_buy[product_id] = should_buy;
			return should_buy;
		} else if (settings.get(product_id +'_buy_on_trend_long_up')) {
			// Buy only on trend up, LONG
			let should_buy = (this.var_is_trending_up['long'][product_id]) ? true : false;
			// console.log('Should_Buy: LONG: '+ this.var_is_trending_up['long'][product_id] +': '+ should_buy)
			this.var_should_buy[product_id] = should_buy;
			return should_buy;
		} else if (settings.get(product_id +'_buy_on_trend_short_up')) {
			// Buy only on trend up, SHORT
			let should_buy = (this.var_is_trending_up['short'][product_id]) ? true : false;
			// console.log('Should_Buy: SHORT: '+ this.var_is_trending_up['short'][product_id] +': '+ should_buy)
			this.var_should_buy[product_id] = should_buy;
			return should_buy;
		} else {
			// Always buy
			let should_buy = true;
			// console.log('Should_Buy: NEITHER: '+ should_buy)
			this.var_should_buy[product_id] = should_buy;
			return should_buy;
		}
	}


	cancel_all_buy_orders(product_id, loop=false) {
		for (var order in this.orders) {
			if (order.status === 'open' && order.side === 'buy') {
				this.gdax[order.product_id].cancelOrder(order.id, function(err, response, data){
					if (err) {
						this.refresh_orders(after=1000);
						if (!loop) {
							this.cancel_all_buy_orders(product_id, loop=true);
						} else {
							console.error(err);
						}
					}
				});
			}
		}
	}



	change_order_status(order_id, data) {
		this.orders[order_id] = data;
		queue.create('websocket_match', {
			data: data,
			title: 'WEBSOCKET: MATCH '+ data.product_id +' ('+ data.price +') '+ data.time,
		}).priority('low').removeOnComplete(true).save();
	}



	is_order_mine(order_id) {
		if (this.orders === undefined) {
			return false
		} else {
			return order_id in this.orders ? true : false;
		}
	}



	get_order(order_id) {
		return this.gdax[order.product_id].getOrder(order_id, function(err, response, data){
			if (err) {
				console.error(err);
			}
			return data;
		});
	}



	refresh_orders(after=3000) {
		this.gdax[order.product_id].getOrders({'after':after}, function(err, response, data){
			if (err) {
				console.error(err);
			}
		});
	}



	historicPull() {
		['BTC-USD','ETH-USD','LTC-USD'].forEach((i) => {
			this.gdax[i].getProductHistoricRates({'granularity': 10}, this.historic_callback);
		});
	};
}



var websocket = new Websocket();

let buy_concurrency = 5;
queue.process('buy', buy_concurrency, function(job, done) {
	const uuid = require('uuid');

	var buy = {
		'product_id': job.data.product_id,
		'size': (parseFloat(settings.get(job.data.product_id +'_buy_amount')) / job.data.price).toFixed(8),
		'price': null,
	}

	if (buy.size < 0.01) {
		buy.size = 0.01; //Minimum Size
	}

	job.log(buy);

	for (var i=0; i < parseInt(settings.get(job.data.product_id +'_spread_n')); i++) {
		buy.price = parseFloat(job.data.price - (parseFloat(settings.get(job.data.product_id +'_spread_v')) * (i + 1))).toFixed(2);
		
		job.log('BUY: '+ buy.price);
		if (settings.get(job.data.product_id +'_trade_enabled')) {
			job.log('Placing a Real Buy Order');
			console.log('Placing a Real Buy Order');
			websocket.gdax[job.data.product_id].buy(buy, (err, response, data) => {
				if (err) {
					job.log(err);
					done(err);
				} else {
					job.log('Order Placed: '+ data.id);
					websocket.orders[data.id] = data;
				}
			});
		} else {
			job.log('Placing a FAKE Buy Order');
			console.log('Placing a FAKE Buy Order');
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
			job.log('Order Placed: '+ data.id);
			websocket.orders[data.id] = data;
		}
	}

	done();
});



let sell_concurrency = 5;
queue.process('sell', sell_concurrency, function(job, done) {
	const uuid = require('uuid');

	job.log('SELLING ...');
	var sell = {
		'product_id': job.data.product_id,
		'size': (parseFloat(settings.get(job.data.product_id +'_sell_amount')) / job.data.price).toFixed(8),
		'price': null,
	}
	job.log(sell);

	if (sell.size < 0.01) {
		sell.size = 0.01; //Minimum Size
	}

	for (var i=0; i < parseInt(settings.get(job.data.product_id +'_spread_n')); i++) {
		sell.price = parseFloat(job.data.price + (parseFloat(settings.get(job.data.product_id +'_spread_v')) * (i + 1))).toFixed(2);
		
		job.log('SELL: '+ sell.price);
		if (settings.get(job.data.product_id +'_trade_enabled')) {
			job.log('Placing a Real Sell Order');
			console.log('Placing a Real Sell Order');
			websocket.gdax[job.data.product_id].sell(sell, function(err, response, data) {
				if (err) {
					job.log(err);
					done(err);
				} else {
					job.log('Order Placed: '+ data.id);
					websocket.orders[data.id] = data;
				}
			});
		} else {
			job.log('Placing a FAKE Sell Order');
			console.log('Placing a FAKE Sell Order');
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
			job.log('Order Placed: '+ data.id);
			websocket.orders[data.id] = data;
		}
	}
	done();
});

module.exports = {
	gdaxsocket: websocket,
}
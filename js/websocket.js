'use strict'

// const {ipcMain} = require('electron');
const {orders} = require('./orders.js');
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
				} else {
					// AUTHENTICATED
					this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed-public.sandbox.gdax.com', this.auth);
					authenticated = true;
				}
			} else {
				// Running in Production
				if (!(this.auth.secret && this.auth.key && this.auth.passphrase)) {
					// UNAUTHENTICATED
					console.log('Websocket: Connecting UNAUTHENTICATED');
					this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD']);
				} else {
					// AUTHENTICATED
					console.log('Websocket: Connecting AUTHENTICATED');
					this.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed.gdax.com', this.auth);
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
						console.info('\t\tShould NOT buy!');
					};
				}
			} else if (data.type === 'done') {
				// Order filled or canceled
				if (data.reason === 'filled' && data.side === 'buy' && orders.is_order_mine(data.order_id)) {
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
		console.log('isTrendingUp('+ s_or_l +' '+ product_id +' '+ price +')');
		console.log('isTrendingUp('+ s_or_l +' '+ product_id +' '+ price +') averages length: '+ this.averages[s_or_l][product_id].length);
		console.log('isTrendingUp(product_id) averages:'+ this.averages[s_or_l][product_id]);

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
			this.var_should_buy[product_id] = should_buy;
			return should_buy;
		} else if (settings.get(product_id +'_buy_on_trend_long_up')) {
			// Buy only on trend up, LONG
			let should_buy = (this.var_is_trending_up['long'][product_id]) ? true : false;
			this.var_should_buy[product_id] = should_buy;
			return should_buy;
		} else if (settings.get(product_id +'_buy_on_trend_short_up')) {
			// Buy only on trend up, SHORT
			let should_buy = (this.var_is_trending_up['short'][product_id]) ? true : false;
			this.var_should_buy[product_id] = should_buy;
			return should_buy;
		} else {
			// Always buy
			let should_buy = true;
			this.var_should_buy[product_id] = should_buy;
			return should_buy;
		}
	}
}



let websocket = new Websocket();

module.exports = {
	gdaxsocket: websocket,
}
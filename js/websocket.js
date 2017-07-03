'use strict'

// const {ipcMain} = require('electron');
const orders = require('./orders.js');
const settings = require('electron-settings');
const Gdax = require('gdax');
const kue = require('kue')
  , queue = kue.createQueue();


exports.websocket = false;
var authenticated = false;

var auth = {
	'key': settings.get('account_api_key'),
	'secret': settings.get('account_api_secret'),
	'passphrase': settings.get('account_api_passphrase'),
};

var trigger = {
	'BTC-USD': [],
	'ETH-USD': [],
	'LTC-USD': [],
};

var priority = {
	'BTC-USD': 'high',
	'ETH-USD': 'medium',
	'LTC-USD': 'low',
}

var averages = {
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

var varIsTrendingUp = {
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

var varShouldBuy = {
	'BTC-USD': null,
	'ETH-USD': null,
	'LTC-USD': null,
};


///////////////////////////////
// Determine when the next high and low buy trigger is. Could be as low as .01.
///////////////////////////////
function isTriggered(product_id, price) {
	if (trigger[product_id].length > 0) {
		if (price < trigger[product_id][0] || price > trigger[product_id][1]) {
			// load new vars.
			trigger[product_id][0] = parseFloat(price) - parseFloat(settings.get(product_id +'_buy_trigger'));
			trigger[product_id][1] = parseFloat(price) + parseFloat(settings.get(product_id +'_buy_trigger'));
			return true;
		} else {
			return false;
		}
	} else {
		// Likely first time this is called; just load the vars.
		trigger[product_id][0] = parseFloat(price) - parseFloat(settings.get(product_id +'_buy_trigger'));
		trigger[product_id][1] = parseFloat(price) + parseFloat(settings.get(product_id +'_buy_trigger'));
		return false;
	}
}



function isTrendingUp(s_or_l, product_id, price) {
	// console.log('isTrendingUp('+ product_id +') averages length: '+ averages[s_or_l][product_id].length);
	// console.log('isTrendingUp(product_id) averages:'+ averages[s_or_l][product_id]);

	var sum = 0;
	// console.log('isTrendingUp sum: '+ sum);
	averages[s_or_l][product_id].forEach(function (i) { sum += i });
	// console.log('isTrendingUp sum: '+ sum);
	var prev_avg = sum/averages[s_or_l][product_id].length;
	// console.log('isTrendingUp prev_avg: '+ prev_avg);

	averages[s_or_l][product_id].push(parseFloat(price));
	var sum = 0;
	// console.log('isTrendingUp sum: '+ sum);
	averages[s_or_l][product_id].forEach(function (i) { sum += i });
	// console.log('isTrendingUp sum: '+ sum);
	var avg = sum/averages[s_or_l][product_id].length;
	// console.log('isTrendingUp avg: '+ avg);

	var setting = product_id +'_trend_trade_'+ s_or_l +'_ct';
	if (averages[s_or_l][product_id].length > settings.get(setting)) {
		// console.warn('More trades than needed.\n\tHave ('+ product_id +' '+ s_or_l +'):'+ averages[s_or_l][product_id].length +'\n\tNeed ('+ setting +'):'+ settings.get(setting));
		while (averages[s_or_l][product_id].length > settings.get(setting)) {
			averages[s_or_l][product_id].shift();
		}
	} else {
		// console.info('Historical Trades looks good.\n\tHave ('+ product_id +' '+ s_or_l +'):'+ averages[s_or_l][product_id].length +'\n\tNeed ('+ setting +'):'+ settings.get(setting));
	}

	varIsTrendingUp[s_or_l][product_id] = (avg > prev_avg ? true : false);
	return (avg > prev_avg ? true : false);
}



function shouldBuy(product_id) {
	if (settings.get(product_id +'_buy_on_trend_long_up') && settings.get(product_id +'_buy_on_trend_short_up')) {
		// Buy only on trend up, BOTH
		return (varIsTrendingUp['long'][product_id] && varIsTrendingUp['short'][product_id]) ? true : false
	} else if (settings.get(product_id +'_buy_on_trend_long_up')) {
		// Buy only on trend up, LONG
		return (varIsTrendingUp['long'][product_id]) ? true : false
	} else if (settings.get(product_id +'_buy_on_trend_short_up')) {
		// Buy only on trend up, SHORT
		return (varIsTrendingUp['short'][product_id]) ? true : false
	} else {
		// Always buy
		return true
	}
}



var message = (data) => {
	if (data.type === 'match') {
		console.info('WEBSOCKET: MATCH '+ data.product_id +' ('+ data.price +') '+ data.time);
		global.mainWindow.webContents.send('websocket_match', data);

		//if price is at the next Trigger price.
		if (isTriggered(data.product_id, data.price)) {
			
			console.info('\tTriggered ...');
			if (shouldBuy(data.product_id)) {
				console.info('\t\tShould buy!');
				
				queue.create('buy', {
					data: data,
					enabled: settings.get(data.product_id +'_trade_enabled'),
					price: data.price,
					product_id: data.product_id,
					title: 'Buy: '+ data.product_id +' '+ data.price,
				}).priority(priority[data.product_id]).removeOnComplete(true).save();
			} else {
				console.info('\t\tShould NOT buy!');
			};
		}
	} else if (data.type === 'done') {
		// Order filled or canceled
		if (data.reason === 'filled' && data.side === 'buy' && orders.isOrderMine(data.order_id)) {
			global.mainWindow.webContents.send('websocket_done_filled_buy_ours', data);
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
			}).priority(priority[data.product_id]).removeOnComplete(true).save();
		}
	}
};



var open_conn = () => {
	////////////////////////////////////
	// Sandbox stream is currently down. Not sure why ...
	////////////////////////////////////
	// if (settings.get('account_sandbox')){
	//     // Running in Sandbox
	//     auth = {
	//         'key': settings.get('account_sandbox_api_key'),
	//         'secret': settings.get('account_sandbox_api_secret'),
	//         'passphrase': settings.get('account_sandbox_api_passphrase'),
	//     };
	//     if (!(auth.secret && auth.key && auth.passphrase)) {
	//         // UNAUTHENTICATED
	//         var websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed-public.sandbox.gdax.com');
	//     } else {
	//         // AUTHENTICATED
	//         var websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed-public.sandbox.gdax.com', auth);
	//         authenticated = true;
	//     }
	// } else {
	////////////////////////////////////

	// Running in Production
	if (!(auth.secret && auth.key && auth.passphrase)) {
		// UNAUTHENTICATED
		console.log('Websocket: Connecting UNAUTHENTICATED');
		exports.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD']);
	} else {
		// AUTHENTICATED
		console.log('Websocket: Connecting AUTHENTICATED');
		exports.websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed.gdax.com', auth);
		authenticated = true;
	}
	// }
}

open_conn();

////////////////////////////////////
// Open Web Socket
////////////////////////////////////
exports.websocket.on('open', function () {
	console.log('Websocket: Open');
});
exports.websocket.on('message', message);
exports.websocket.on('error', function(err) {
	console.log(exports.websocket);
	console.error(err);
});
exports.websocket.on('close', open_conn);

const settings = require('config');
const stats = require('stats-lite');

class StdDev {
	constructor() {
		this.trade_prices = [];
	}

	add(add) {
		if (typeof add !== 'object')
			throw new Error(`The parameter 'add' should be an object; not a ${typeof add}.`);

		if (add.trades)
			this.addTrades(add.trades);
	}

	addTrades(trades) {
		trades.forEach((trade) => {
			this.trade_prices.push(trade.price);

			while (this.trade_prices.length > settings.get(`${this.product_id}.strategies.StdDev.trades_n`)) {
				this.trade_prices.shift();
			}
		});
	}

	generateDummyData(product_id, count) {
		const uuidv4 = require('uuid/v4');

		this.set({
			product_id: product_id
		});

		count = count || settings.get(`${this.product_id}.strategies.StdDev.trades_n`);

		let dummy_data = [];
		let starting_id = Math.ceil(Math.random() * 100);
		let starting_price = 0;

		switch (this.product_id) {
			case 'BTC-USD':
				starting_price = Math.random() * 10000;
			case 'ETH-USD':
				starting_price = Math.random() * 1000;
			case 'LTC-USD':
				starting_price = Math.random() * 100;
		}

		for (let i = 0; i < count; i++) {
			dummy_data.push({
				type: 'match',
				trade_id: starting_id + i,
				sequence: (starting_id * starting_id) + i,
				maker_order_id: uuidv4(),
				taker_order_id: uuidv4(),
				time: new Date,
				product_id: this.product_id,
				size: String(Math.random() * 10),
				price: parseFloat((Math.floor(Math.random() * 2) ? starting_price + Math.random() * 2 : starting_price + Math.random() * 2)).toFixed(2),
				side: (Math.floor(Math.random() * 2) ? 'buy' : 'sell'),
			});
		}

		this.add({
			trades: dummy_data
		});
	}

	get() {
		let strategy = {
			stddev: stats.stdev(this.trade_prices),
			mean: stats.mean(this.trade_prices),
			last_trade_price: this.trade_prices[this.trade_prices.length - 1],
			trades_n: this.trade_prices.length,
		}

		strategy.diff_price_and_mean = strategy.last_trade_price - strategy.mean;
		strategy.is_trending_up = (Math.abs(strategy.diff_price_and_mean) === strategy.diff_price_and_mean) ? true : false;

		strategy.should_buy = (strategy.diff_price_and_mean > strategy.stddev) ? true : false;

		return strategy;
	}

	set(set) {
		if (typeof set !== 'object')
			throw new Error(`The parameter 'set' should be an object; not a ${typeof set}.`);

		if ('product_id' in set)
		{
			if (typeof set.product_id !== 'string')
				throw new Error(`The parameter 'set.product_id' should be a string; not a ${typeof set.product_id}.`);

			if (settings.get('general.product_ids').indexOf(set.product_id) === -1)
				throw new Error(`The parameter 'set.product_id' is not valid (${set.product_id}); should be one of: ${settings.get('general.product_ids')}.`);


			this.product_id = set.product_id
		}
	}
}

module.exports = StdDev;

// const stddev = require('./strategies/stddev.js')
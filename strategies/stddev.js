'use strict';

const settings = require('config');
const stats = require('stats-lite');



class StdDev {
	constructor() {
		this.trade_prices = [];
		this.direction_up = undefined;
	}

	add(add) {
		if (typeof add !== 'object')
			throw new Error(`The parameter 'add' should be an object; not a ${typeof add}.`);

		if (add.trades)
			this.addTrades(add.trades);
	}

	addTrades(trades) {
		for (let trade in trades) {
			// console.log('add trade price:', parseFloat(trades[trade].price.toString()))
			this.trade_prices.push(parseFloat(trades[trade].toString()));

			while (this.trade_prices.length > settings.get(`${this.product_id}.strategies.StdDev.trades_n`)) {
				this.trade_prices.shift();
			}
		}
	}

	generateDummyData(product_id, count) {
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
			dummy_data.push(parseFloat((Math.floor(Math.random() * 2) ? starting_price + Math.random() * 2 : starting_price + Math.random() * 2)).toFixed(2));
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
		strategy.direction = (Math.abs(strategy.diff_price_and_mean) === strategy.diff_price_and_mean) ? 'Up' : 'Down';

		// Only change directions if we exceed the stddev; positive or negative.
		if (
			strategy.diff_price_and_mean > strategy.stddev
			&& (Math.abs(strategy.diff_price_and_mean) === strategy.diff_price_and_mean)
		) {
			this.trending_up = true;
		} else if (
			strategy.diff_price_and_mean < strategy.stddev
			&& (Math.abs(strategy.diff_price_and_mean) !== strategy.diff_price_and_mean)
		) {
			this.trending_up = false; //literally: direction down
		}

		strategy.is_trending_up = this.trending_up;

		// Buy as long as the overall direction is up.
		strategy.should_buy = this.trending_up;

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

'use strict';

const settings = require('config');
const stats = require('stats-lite');


class TrendLines {
	constructor() {
		this.trend_lines = [];
		this.buy_on_up = [];
		this.trades_n = [];
	}

	add(add) {
		if (typeof add !== 'object' && Object.prototype.toString.call(add) === '[object Object]')
			throw new Error(`The parameter 'add' should be an object; not a ${typeof add}.`);

		if (add.trade)
			this.addTrades([add.trade]);

		if (add.trades)
			this.addTrades(add.trades);
	}

	addTrades(trades) {
		for (let trade in trades) {
			for (let i=0; i < this.trend_lines.length; i++) {
				this.trend_lines[i].push(parseFloat(trades[trade].toString()));

				settings.get(`${this.product_id}.strategies.TrendLines.trendlines_n`);

				while (this.trend_lines[i].length > this.trades_n[i] + 1)
					this.trend_lines[i].shift();
			}
		}
	}

	generateDummyData(product_id, count) {
		product_id = product_id || settings.get('general.product_ids')[Math.floor(Math.random() * settings.get('general.product_ids').length)];

		this.set({
			product_id: product_id
		});

		count = count || Math.max.apply(null, this.trades_n) + 1;

		let dummy_data = [];
		let starting_id = Math.ceil(Math.random() * 100);
		let starting_price = 0;

		switch (this.product_id) {
			case 'BTC-USD':
				starting_price = Math.random() * 10000;
				break;
			case 'ETH-USD':
				starting_price = Math.random() * 1000;
				break;
			case 'LTC-USD':
				starting_price = Math.random() * 100;
				break;
            case 'BTC-EUR':
                starting_price = Math.random() * 10000;
                break;
            case 'ETH-EUR':
                starting_price = Math.random() * 1000;
                break;
            case 'LTC-EUR':
                starting_price = Math.random() * 100;
                break;
            case 'ETH-BTC':
                starting_price = Math.random() * 100;
                break;
		}

		for (let i = 0; i < count; i++)
			dummy_data.push(parseFloat((Math.floor(Math.random() * 2) ? starting_price + Math.random() * 2 : starting_price + Math.random() * 2)).toFixed(2));

		this.add({
			trades: dummy_data
		});
	}

	get() {
		let strategy = {
			trendlines_n: settings.get(`${this.product_id}.strategies.TrendLines.trendlines_n`),
			last_trade_price: this.trend_lines[0][this.trend_lines[0].length - 1],
		};

		var is_trending_up = [];
		var should_buy = [];

		for (let i=0; i < this.trend_lines.length; i++) {
			let trend_line_id = i + 1;

			strategy[`trend_${trend_line_id}_buy_on_up`] = this.buy_on_up[i];
			strategy[`trend_${trend_line_id}_trades_n`] = this.trend_lines[i].length - 1;

			let real_prev_trend_line = this.trend_lines[i].slice(0);
			real_prev_trend_line = real_prev_trend_line.slice(0, this.trend_lines[i].length - 1);
			strategy[`trend_${trend_line_id}_prev_mean`] = stats.mean(real_prev_trend_line);

			let real_trend_line = this.trend_lines[i].slice(0);
			real_trend_line.shift();
			strategy[`trend_${trend_line_id}_mean`] = stats.mean(real_trend_line);

			let trending_up = strategy[`trend_${trend_line_id}_mean`] > strategy[`trend_${trend_line_id}_prev_mean`] ? true : false;
			strategy[`trend_${trend_line_id}_trending_up`] = trending_up;
			is_trending_up.push(trending_up);

			should_buy.push(settings.get(`${this.product_id}.strategies.TrendLines.trend_${trend_line_id}_buy_on_up`) ? trending_up : true);
		}

		strategy.is_trending_up = is_trending_up.reduce((a, b) => { return a && b; });
		strategy.should_buy = should_buy.reduce((a, b) => { return a && b; });

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


			this.product_id = set.product_id;

			for (let i=0; i < settings.get(`${this.product_id}.strategies.TrendLines.trendlines_n`); i++) {
				this.trend_lines[i] = [];

				let trend_line_id = i + 1;
				
				this.buy_on_up[i] = settings.get(`${this.product_id}.strategies.TrendLines.trend_${trend_line_id}_buy_on_up`);
				this.trades_n[i] = settings.get(`${this.product_id}.strategies.TrendLines.trend_${trend_line_id}_trades_n`);
			}
		}
	}
}

module.exports = TrendLines;

// const TrendLines = require('./strategies/trendlines.js');
// const trendlines = new TrendLines();
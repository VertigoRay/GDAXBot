const fs = require('fs');
const Log = require('log');
const os = require('os');
const pjson = require('../package.json');
const prettyBytes = require('pretty-bytes');
const settings = require('config');
const sprintf = require('sprintf-js').sprintf;
const term = require('terminal-kit').terminal;
const tkit = require('terminal-kit');
const VERSION = require('../package.json').version;



if (settings.get('general.log') === "on") {
	var log = new Log(settings.get('general.log_level'), fs.createWriteStream('GDAX-terminal.log'));
} else {
	let dev_null = (process.platform === 'win32') ? 'nul' : '/dev/null'
	var log = new Log(settings.get('general.log_level'), fs.createWriteStream(dev_null));
}

var theme = require(`../themes/${settings.get('general.terminal.theme')}.json`);
var product_ids = settings.get('general.product_ids');
var trades = {};
var initial_profit_sn = undefined;
var initial_profit_wf = undefined;
var fiat = settings.get("general.fiat");

product_ids.forEach((product_id) => {
	trades[product_id] = [];
});

const get_title = () => {
	return 'GDAX Trader';
}

const justify_c = (container, text) => {
	return Math.ceil((container.width / 2) - (`${text}`.length / 2));
}

const justify_r = (container, text) => {
	return container.width - (`${text}`.length);
}



function account (data) {
	log.info(process.pid, 'function account', data);

	let options = {
		x: 1,
		y: 0,
		wrap: false,
		attr: theme.account.title,
	};

	b_account.fill({
		attr: theme.account.container
	});


	// Header
	b_account.put(options, 'Account');


	if (data && !data.error)
	{
		let x_cell_width = b_account.width / 3;


		// Profile ID & Last Updated
		options.attr = theme.account.standard;
		let updated_label = 'Updated: ';
		let updated = sprintf(
			'%d:%s:%s',
			(new Date(data.timestamp)).getHours(),
			String('0' + (new Date(data.timestamp)).getMinutes()).slice(-2),
			String('0' + (new Date(data.timestamp)).getSeconds()).slice(-2)
		);
		let profile_id_label = 'ID: ';
		let profile_id = data.profile_id;

		let all = updated_label + updated + theme.account.seperator.char + profile_id_label + profile_id;

		options.x = justify_r(b_account, all) - 1;
		options.attr = theme.account.label;
		b_account.put(options, updated_label);

		options.x = options.x + updated_label.length;
		options.attr = theme.account.standard;
		b_account.put(options, updated);

		options.x = options.x + updated.length;
		options.attr = theme.account.seperator.theme;
		b_account.put(options, theme.account.seperator.char);

		options.x = options.x + theme.account.seperator.char.length;
		options.attr = theme.account.label;
		b_account.put(options, profile_id_label);

		options.x = options.x + profile_id_label.length;
		options.attr = theme.account.standard;
		b_account.put(options, `${profile_id}`);


		let calc_x = x_cell_width;

        // Fiat Currency Avail/Total
        if ( data.account !== undefined) {
            renderFiat(data.account);
        }

		// Account Calculations
		if ( data.calculations !== undefined)
		{
			options.x = calc_x;
			options.y = 1;
			let calc = 'Calculate: ';
			options.attr = theme.account.title;
			b_account.put(options, calc);

			options.x = x_cell_width + calc.length;
			let calc_wait_fill = 'Wait Fill: ';
			options.attr = theme.account.label;
			b_account.put(options, calc_wait_fill);

			options.x = options.x + calc_wait_fill.length;
			options.attr = theme.account.standard;
			b_account.put(options, data.calculations.wait_fill);

			let calc_wait_fill_length = calc_wait_fill.length + String(data.calculations.wait_fill).length;


			let calc_sell_now_label = ' Sell Now: ';
			options.x = x_cell_width + calc.length;
			options.y = 2;
			options.attr = theme.account.label;
			b_account.put(options, calc_sell_now_label);

			options.x = options.x + calc_sell_now_label.length;
			options.attr = theme.account.standard;
			b_account.put(options, data.calculations.sell_now);

			let calc_sell_now_length = calc_sell_now_label.length + String(data.calculations.sell_now).length;


			let calc_fees_label = 'Sell Now Fees (0.3%): ';
			options.x = x_cell_width;
			options.y = 3;
			options.attr = theme.account.label;
			b_account.put(options, calc_fees_label);

			options.x = options.x + calc_fees_label.length;
			options.attr = theme.account.standard;
			b_account.put(options, String(data.calculations.fees));

			let calc_fees_length = calc_fees_label.length + String(data.calculations.fees).length;


			let misc_x = x_cell_width * 2;
			if (calc_x + Math.max(calc_sell_now_length, calc_wait_fill_length, calc_fees_length) > misc_x )
			{
				misc_x = calc_x + Math.max(calc_sell_now_length, calc_wait_fill_length, calc_fees_length);
			}


			// Account Profits
			options.x = misc_x;
			options.y = 1;
			let profits = `Profits (${settings.get('account.initial_investment')}): `;
			options.attr = theme.account.title;
			b_account.put(options, profits);

			options.x = misc_x + profits.length;
			let profit_wait_fill_label = 'Wait Fill: ';
			options.attr = theme.account.label;
			b_account.put(options, profit_wait_fill_label);

			let profit_wait_fill = parseFloat(parseFloat(parseFloat(data.account.balance) + parseFloat(data.calculations.wait_fill) - parseFloat(settings.get('account.initial_investment'))).toFixed(2));
			if (initial_profit_wf === undefined)
				initial_profit_wf = profit_wait_fill;
			profit_wait_fill_percentage = (((profit_wait_fill / initial_profit_wf) - 1) * 100).toFixed(4);

			options.x = options.x + profit_wait_fill_label.length;
			options.attr = theme.account.standard;
			b_account.put(options, `${profit_wait_fill} (${profit_wait_fill_percentage} %; this run)`);
		}

		// Account Misc
		// Later will add some MISC ...
		// Such as % change in Sell Now and Wait over last Hour, 6H, 12H, Day, Week ...
	}
	else if (data && data.error)
	{
		options.x = justify_c(b_account, data.error);
		options.y = 1;
		b_account.put(options, data.error);
	}
	else
	{
		let api = settings.get('account.api');
		let message = null;
		let message2 = null;
		if (api.key && api.secret && api.passphrase) {
			message = 'Loading ...';
		} else {
			message = 'Account API not configured.';
			message2 = 'https://gitlab.com/VertigoRay/GDAX#bot-configuration';
		}

		options.x = justify_c(b_account, message);
		options.y = 1;
		b_account.put(options, message);

		if (message2) {
			options.x = justify_c(b_account, message2);
			options.y = 2;
			b_account.put(options, message2);
		}
	}

	b_account.draw({ delta: settings.get('general.terminal.delta') })
}

function renderFiat(data) {

	let curr_indent = 4

    options.x = curr_indent;
	options.y = 1;
	let curr = fiat+': ';
	options.attr = theme.account.title;
	b_account.put(options, curr);


	let curr_avail_label = 'Avail: ';
	options.x = options.x + curr.length;
	options.attr = theme.account.label;
	b_account.put(options, curr_avail_label);

	options.x = options.x + curr_avail_label.length;
	options.attr = theme.account.standard;
	b_account.put(options, data.account.available);

	let curr_avail_length = curr.length + curr.length + String(data.account.available).length;


	options.x = curr_indent + curr.length;
	options.y = 2;
	let curr_hold_label = ' Hold: ';
	options.attr = theme.account.label;
	b_account.put(options, curr_hold_label);

	options.x = options.x + curr_hold_label.length;
	options.attr = theme.account.standard;
	b_account.put(options, data.account.hold);

	let curr_hold_length = curr.length + curr_hold_label.length + String(data.account.holds).length;


	options.x = curr_indent + curr.length;
	options.y = 3;
	let curr_total_label = 'Total: ';
	options.attr = theme.account.label;
	b_account.put(options, curr_total_label);

	options.x = options.x + curr_total_label.length;
	options.attr = theme.account.standard;
	b_account.put(options, String(data.account.balance));

	let curr_total_length = curr.length + curr_total_label.length + String(data.account.balance).length;

	if (curr_indent + Math.max(curr_avail_length, curr_hold_length, curr_total_length) > calc_x) {
		calc_x = curr_indent + Math.max(curr_avail_length, curr_hold_length, curr_total_length);
	}

}


function coin (product_id, data) {
	log.info(process.pid, 'function coin', product_id, data);

	const b_coin_pid = b_coin[product_id];

	let x_cell_width = b_coin_pid.width / 4;

	let options = {
		x: 1,
		y: 0,
		wrap: false,
		attr: theme.coins.title,
	};

	b_coin_pid.fill({
		attr: theme.coins.container
	});


	// Title
	b_coin_pid.put(options, product_id);


	// Header Row
	let buy_symbol = (data.should_buy ? 'Yes' : 'No');
	let buy_theme = (settings.get(`${product_id}.trade_enabled`) ? (data.should_buy ? theme.coins.buying.yes : theme.coins.buying.no) : theme.coins.buying.cant)

	let buying_label = 'Buy: ';
	options.x = x_cell_width;
	options.attr = theme.coins.label;
	b_coin_pid.put(options, buying_label);

	options.x = options.x + buying_label.length;
	options.attr = buy_theme;
	b_coin_pid.put(options, buy_symbol);


	let trend_symbol = (data.trending_up ? 'Up' : 'Down');
	let trend_theme = (data.trending_up ? theme.coins.trending.up : theme.coins.trending.down)

	let trending_label = 'Trending: ';
	options.x = x_cell_width * 2;
	options.attr = theme.coins.label;
	b_coin_pid.put(options, trending_label);

	options.x = options.x + trending_label.length;
	options.attr = trend_theme;
	b_coin_pid.put(options, trend_symbol);


	let trade_size_label = 'Trade Size   ';
	let trade_price_label = 'Price          ';
	let trade_time_label = 'Time    ';
	let trade_all_label = trade_size_label + trade_price_label + trade_time_label;
	let trade_x_start = justify_r(b_coin_pid, trade_all_label);

	options.x = trade_x_start;
	options.attr = theme.coins.label;
	b_coin_pid.put(options, trade_size_label);

	options.x = trade_x_start + trade_size_label.length;
	options.attr = theme.coins.label;
	b_coin_pid.put(options, trade_price_label);

	options.x = trade_x_start + trade_size_label.length + trade_price_label.length;
	options.attr = theme.coins.label;
	b_coin_pid.put(options, trade_time_label);


	// Trades
	// console.log('data.last_match: ', data.last_match);
	if (
		data.last_match &&
		// trades[product_id] &&
		// trades[product_id][trades[product_id].length - 1] &&
		(
			trades[product_id][trades[product_id].length - 1] === undefined ||
			data.last_match.trade_id != trades[product_id][trades[product_id].length - 1].trade_id
		)
	)
	{
		trades[product_id].push(data.last_match);

		if (trades[product_id].length > b_coin_pid.height - 1)
		{
			trades[product_id].shift();
		}
	}

	if (trades[product_id].length > 0) {
		// console.log('trades[product_id]: ', trades[product_id]);

		let row = 1;
		for (let i = trades[product_id].length - 1; i>=0; i--)
		{
			options.x = trade_x_start;
			options.y = row;
			options.attr = theme.coins.standard;
			b_coin_pid.put(options, trades[product_id][i].size);

			options.x = trade_x_start + trade_size_label.length;
			options.y = row;
			options.attr = (trades[product_id][i].side === 'buy' ? theme.coins.price.buy : theme.coins.price.sell);
			b_coin_pid.put(options, trades[product_id][i].price);

			let time = new Date(trades[product_id][i].time);
			options.x = trade_x_start + trade_size_label.length + trade_price_label.length;
			options.y = row;
			options.attr = theme.coins.standard;
			b_coin_pid.put(
				options,
				'%d:%s:%s',
				time.getHours(),
				String('0' + time.getMinutes()).slice(-2),
				String('0' + time.getSeconds()).slice(-2)
			);

			row++;
		}
	}


	let calc_x = x_cell_width;

	// Totals
	// Coin Avail/Total
	if (data.account !== undefined) {
		let indent = 2

		let avail_label = 'Avail: ';
		options.x = indent;
		options.y = 1;
		options.attr = theme.coins.label;
		b_coin_pid.put(options, avail_label);

		options.x = options.x + avail_label.length;
		options.attr = theme.coins.standard;
		b_coin_pid.put(options, data.account.available);

		let avail_length = avail_label.length + String(data.account.available).length;


		options.x = indent;
		options.y = 2;
		let hold_label = ' Hold: ';
		options.attr = theme.coins.label;
		b_coin_pid.put(options, hold_label);

		options.x = options.x + hold_label.length;
		options.attr = theme.coins.standard;
		b_coin_pid.put(options, data.account.hold);

		let hold_length = hold_label.length + String(data.account.hold).length;


		options.x = indent;
		options.y = 3;
		let total_label = 'Total: ';
		options.attr = theme.coins.label;
		b_coin_pid.put(options, total_label);

		options.x = options.x + total_label.length;
		options.attr = theme.coins.standard;
		b_coin_pid.put(options, String(data.account.balance));

		let total_length = total_label.length + String(data.account.balance).length;


		// Account Calculations
		if (indent + Math.max(avail_length, hold_length, total_length) > calc_x)
		{
			calc_x = indent + Math.max(avail_length, hold_length, total_length);
		}
	}

	if ( data.calculations !== undefined)
	{

		let calc = 'Calculate: ';
		options.x = calc_x;
		options.y = 1;
		options.attr = theme.coins.title;
		b_coin_pid.put(options, calc);


		let calc_wait_fill = 'Wait Fill: ';
		options.x = x_cell_width + calc.length;
		options.attr = theme.coins.label;
		b_coin_pid.put(options, calc_wait_fill);

		options.x = options.x + calc_wait_fill.length;
		options.attr = theme.coins.standard;
		b_coin_pid.put(options, data.calculations.wait_fill);

		let calc_wait_fill_length = calc_wait_fill.length + String(data.calculations.wait_fill).length;


		let calc_sell_now_label = ' Sell Now: ';
		options.x = x_cell_width + calc.length;
		options.y = 2;
		options.attr = theme.coins.label;
		b_coin_pid.put(options, calc_sell_now_label);

		options.x = options.x + calc_sell_now_label.length;
		options.attr = theme.coins.standard;
		b_coin_pid.put(options, data.calculations.sell_now);

		let calc_sell_now_length = calc_sell_now_label.length + String(data.calculations.sell_now).length;


		let calc_fees_label = 'Sell Now Fees (0.3%): ';
		options.x = x_cell_width;
		options.y = 3;
		options.attr = theme.coins.label;
		b_coin_pid.put(options, calc_fees_label);

		options.x = options.x + calc_fees_label.length;
		options.attr = theme.coins.standard;
		b_coin_pid.put(options, String(data.calculations.fees));

		let calc_fees_length = calc_fees_label.length + String(data.calculations.fees).length;
	}


	if (data.bot) {
		options.x = 1;
		options.y = 4;
		options.attr = theme.coins.title;

		// Bot Title
		b_coin_pid.put(options, `Stategy: ${settings.get(product_id +'.strategy')}`);



		let midmarket_price_label = 'MidMarket ($): ';
		options.x = 1;
		options.y = 5;
		options.attr = theme.coins.label;
		b_coin_pid.put(options, midmarket_price_label);

		if (data.bot.midmarket_price) {
			options.x = options.x + midmarket_price_label.length;
			options.attr = theme.coins.standard;
			b_coin_pid.put(options, String(data.bot.midmarket_price));
		}

		let result_y = 6;
		for (let result in data.bot.latest_strategy_results) {
			if (result === 'is_trending_up' || result === 'should_buy')
				continue;

			let result_label = `${result}: `;
			options.x = 1;
			options.y = result_y;
			options.attr = theme.coins.label;
			b_coin_pid.put(options, result_label);

			if (data.bot.latest_strategy_results[result]) {
				options.x = options.x + result_label.length;
				options.attr = theme.coins.standard;
				b_coin_pid.put(options, String(data.bot.latest_strategy_results[result]));
			}

			result_y++;
		}


		// let ticker_label = `Bot Info (${typeof data.bot}): `;
		// options.x = 1;
		// options.y = 6;
		// options.attr = theme.coins.label;
		// b_coin_pid.put(options, ticker_label);

		// if (data.bot) {
		// 	options.x = options.x + ticker_label.length;
		// 	options.attr = theme.coins.standard;
		// 	b_coin_pid.put(options, String(data.bot.length));
		// }


		// let myorders_label = `Bot Strat Info (${typeof data.bot.last_strategy_results }): `;
		// options.x = 1;
		// options.y = 7;
		// options.attr = theme.coins.label;
		// b_coin_pid.put(options, myorders_label);

		// if (data.bot.myorders) {
		// 	options.x = options.x + myorders_label.length;
		// 	options.attr = theme.coins.standard;
		// 	b_coin_pid.put(options, String(data.bot.myorders.length));
		// }


		// let last_price_label = `Last Price (${typeof data.bot.last_price}): `;
		// options.x = 1;
		// options.y = 8;
		// options.attr = theme.coins.label;
		// b_coin_pid.put(options, last_price_label);

		// if (data.bot.last_price) {
		// 	options.x = options.x + last_price_label.length;
		// 	options.attr = theme.coins.standard;
		// 	b_coin_pid.put(options, String(data.bot.last_price));
		// }


		// let orderbook_label = `OrderBook length (${typeof data.bot.orderbook}): `;
		// options.x = 1;
		// options.y = 9;
		// options.attr = theme.coins.label;
		// b_coin_pid.put(options, orderbook_label);

		// if (data.bot.orderbook) {
		// 	options.x = options.x + orderbook_label.length;
		// 	options.attr = theme.coins.standard;
		// 	b_coin_pid.put(options, String(data.bot.orderbook.length));
		// }


		// let synced_book_label = `SyncedBook length (${typeof data.bot.synced_book}): `;
		// options.x = 1;
		// options.y = 10;
		// options.attr = theme.coins.label;
		// b_coin_pid.put(options, synced_book_label);

		// if (data.bot.synced_book) {
		// 	options.x = options.x + synced_book_label.length;
		// 	options.attr = theme.coins.standard;
		// 	b_coin_pid.put(options, String(data.bot.synced_book.length));
		// }
	}


	b_coin_pid.draw({ delta: settings.get('general.terminal.delta') });
}



function footer (bytesReceived) {
	let cores_label = 'CPU Cores: ';
	let cores = String(os.cpus().length);
	let mem_label = 'Free Memory: ';
	let mem = String(prettyBytes(os.freemem()));
	let bytes_rxd_label = 'WebSocket Bytes Received: ';
	let bytes_rxd = String(bytesReceived);

	let all = cores_label + cores + theme.footer.seperator.char + mem_label + mem + theme.footer.seperator.char + bytes_rxd_label + bytes_rxd;

	let options = {
		x: justify_c(term, all),
		y: 0,
		wrap: false,
		attr: theme.footer.container,
	};

	b_footer.fill({
		attr: theme.footer.container,
	});

	options.attr = theme.footer.label;
	b_footer.put(options, cores_label);

	options.x = options.x + cores_label.length;
	options.attr = theme.footer.standard;
	b_footer.put(options, cores);

	options.x = options.x + cores.length;
	options.attr = theme.footer.seperator.theme;
	b_footer.put(options, theme.footer.seperator.char);

	options.x = options.x + theme.footer.seperator.char.length;
	options.attr = theme.footer.label;
	b_footer.put(options, mem_label);

	options.x = options.x + mem_label.length;
	options.attr = theme.footer.standard;
	b_footer.put(options, mem);

	options.x = options.x + mem.length;
	options.attr = theme.footer.seperator.theme;
	b_footer.put(options, theme.footer.seperator.char);

	options.x = options.x + theme.footer.seperator.char.length;
	options.attr = theme.footer.label;
	b_footer.put(options, bytes_rxd_label);

	options.x = options.x + bytes_rxd_label.length;
	options.attr = theme.footer.standard;
	b_footer.put(options, bytes_rxd);

	b_footer.draw({ delta: settings.get('general.terminal.delta') });
}



function header () {
	let options = {
		x: 1,
		y: 0,
		wrap: false,
		attr: theme.header.title,
	};

	let title = get_title();
	b_header.put(options, title);

	options.x = options.x + title.length;
	options.attr = theme.header.standard;
	b_header.put(options, ' v%s', VERSION);


	let w_label = 'W:';
	let w = String(term.width);
	let h_label = ' H:';
	let h = String(term.height);
	let node_env_label = 'NODE_ENV: ';
	let node_env = String(process.env.NODE_ENV);

	let all = w_label + w + h_label + h + theme.header.seperator.char + node_env_label + node_env;

	options.x = justify_r(term, all) - 1;
	options.attr = theme.header.label;
	b_header.put(options, w_label);

	options.x = options.x + w_label.length;
	options.attr = theme.header.standard;
	b_header.put(options, w);

	options.x = options.x + w.length;
	options.attr = theme.header.label;
	b_header.put(options, h_label);

	options.x = options.x + h_label.length;
	options.attr = theme.header.standard;
	b_header.put(options, h);

	options.x = options.x + h.length;
	options.attr = theme.header.seperator.theme;
	b_header.put(options, theme.header.seperator.char);

	options.x = options.x + theme.header.seperator.char.length;
	options.attr = theme.header.label;
	b_header.put(options, node_env_label);

	options.x = options.x + node_env_label.length;
	options.attr = theme.header.standard;
	b_header.put(options, node_env);

	b_header.draw({ delta: settings.get('general.terminal.delta') });
}


var b_header = undefined;
var b_account = undefined;
var b_coin = {};
var b_footer = undefined;
function load_layout(delta=settings.get('general.terminal.delta')) {
	b_main.fill({
		attr: theme.main,
	});

	b_main.draw({ delta: delta });

	b_header = tkit.ScreenBuffer.create({
		dst: term,
		x: 1,
		y: 1,
		width: term.width,
		height: 1,
	});

	b_header.fill({
		attr: theme.header.container,
	});

	b_header.draw({ delta: delta });


	b_account = tkit.ScreenBuffer.create({
		dst: term,
		x: 2,
		y: 3,
		width: term.width-2,
		height: 4,
		// blending: true,
		// noFill: true,
	});


	b_account.fill({
		attr: theme.account.container,
	});

	b_account.draw({ delta: delta });


	let header_and_account_height = 8;
	let coin_height = parseInt((term.height - header_and_account_height - product_ids.length) / product_ids.length);
	let i = 0;

	product_ids.forEach((product_id) => {
		let coin_y = header_and_account_height + (coin_height * i) + i;
		
		b_coin[product_id] = tkit.ScreenBuffer.create({
			dst: term,
			x: 2,
			y: coin_y,
			width: term.width-2,
			height: coin_height,
			// blending: true,
			// noFill: true,
		});

		b_coin[product_id].fill({
			attr: theme.coins.container,
		});

		b_coin[product_id].draw({ delta: delta });

		i++;
	});


	b_footer = tkit.ScreenBuffer.create({
		dst: term,
		x: 1,
		y: term.height,
		width: term.width,
		height: 1,
		// blending: true,
		// noFill: true,
	});

	b_footer.fill({
		attr: theme.footer.container,
	});

	b_footer.draw({ delta: delta });
}



term.windowTitle(get_title());



// Clear Screen
term.clear();
b_main = tkit.ScreenBuffer.create({
	dst: term,
	x: 0,
	y: 0,
	width: term.width,
	height: term.height,
});

b_main.fill({
	attr: theme.main,
});

b_main.draw();



// Events
term.on('resize', (width, height) => {
	// console.log('TERM RESIZED:', width, height);
	load_layout(delta=false);
});



load_layout();
header();
account();
footer();



module.exports = function (input, done) {
	log.debug('module.exports: input:', input);

	header();


	log.debug('module.exports: account:', input.account);
	if (input.account !== undefined)
	{
		account(input.account);
	}

	product_ids.forEach((product_id) => {
		log.debug('module.exports: coin:', input.coins[product_id]);
		coin([product_id], input.coins[product_id]);
	});

	
	log.debug('module.exports: bytesReceived:', input.bytesReceived);
	footer(input.bytesReceived);
};
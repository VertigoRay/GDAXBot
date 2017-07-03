'use strict'

const {ipcRenderer} = require('electron');
const os = require('os');
const prettyBytes = require('pretty-bytes');
const settings = require('electron-settings');



function loadConfig() {
	['Account', 'BTC-USD', 'ETH-USD', 'LTC-USD'].forEach(function(product_id) {
		$($('form#'+ product_id).prop('elements')).each(function () {
			if (this.type === 'checkbox') {
				if (settings.has(this.id)) {
					this.checked = settings.get(this.id);
				} else {
					settings.set(this.id, this.checked);
				}
			} else {
				// text box
				if (settings.has(this.id)) {
					this.value = settings.get(this.id);
				} else {
					settings.set(this.id, this.value);
				}
			}
		});
	});
}



function updateTicker (data) {
	var div = $(`<table><tr>
			<th>Trend Long</th>
			<th>Trend Short</th>
			<th>Buy</th>
			<th>Trade Size</th>
			<th>Price (USD)</th>
			<th>Time</th>
		</tr><tr>
			<td><span id="trend_l" class="trend_l"></span></td>
			<td><span id="trend_s" class="trend_s"></span></td>
			<td><span id="buys_enabled" class="buys_enabled"></span></td>
			<td><span id="trade_size" class="trade_size"></span></td>
			<td><span id="price" class="price"></span></td>
			<td><span id="time" class="time"></span></td>
		</tr></table>`);

	// div.find('h1').text('BAR');

	div.find('span#trade_size')
		.text(data.size)
		.css('color', 'gray');


	div.find('span#price')
		.text(parseFloat(data.price).toFixed(2))
		.css('color', (data.side === 'sell' ? 'green' : 'red'))
		.css('font-weight', 'bold');


	var date = new Date(data.time);
	div.find('span#time')
		.text(('0'+ date.getHours()).slice(-2) +':'+ ('0'+ date.getMinutes()).slice(-2) +':'+ ('0'+ date.getSeconds()).slice(-2))
		.css('color', 'gray');


	var trending_s = isTrendingUp('short', data.product_id, data.price);
	div.find('span#trend_s')
		.html((trending_s ? '&uarr;' : '&darr;') +' ('+ averages['short'][data.product_id].length +' Trades)')
		.css('color', (trending_s ? 'green' : 'red'));


	var trending_l = isTrendingUp('long', data.product_id, data.price);
	div.find('span#trend_l')
		.html((trending_l ? '&uarr;' : '&darr;') +' ('+ averages['long'][data.product_id].length +' Trades)')
		.css('color', (trending_l ? 'green' : 'red'));

	varShouldBuy[data.product_id] = shouldBuy(data.product_id);
	div.find('span#buys_enabled')
		.html(varShouldBuy[data.product_id] ? '&#10004;' : '&#10008;')
		.css('color', (settings.get(data.product_id +'_trade_enabled') ? (varShouldBuy[data.product_id] ? 'green' : 'red') : 'yellow'));


	$('#'+ data.product_id +'_last_trade').html(div);
}



function os_info(){
    $('.status').html('GDAX Stream: <span>' + prettyBytes(ipcRenderer.sendSync('getWebsocketBytesReceived'))+ '</span>');

    $('.stats').html('Number of cpu cores: <span>' + os.cpus().length + '</span>');
    $('.stats').append('Free memory: <span>' + prettyBytes(os.freemem())+ '</span>');

    // var product_ticker = pubBTCUSDClient.getProductTicker(callback);
};



////////////////////////////////////
// Initialize
////////////////////////////////////
$('div#settings div#form').hide();
loadConfig();
var t_os_info = setInterval(os_info, 1000);



////////////////////////////////////
// Button Configs
////////////////////////////////////
$('span#settings').click(function() {
	$(this).nextAll('#form:first')
		.toggle('slow');
});

$('form .setting').change(function() {
	if ((this.id === 'account_sandbox') && (this.checked === true) && !(settings.get('account_sandbox_api_key') && settings.get('account_sandbox_api_secret') && settings.get('account_sandbox_api_passphrase'))) {
		alert('Cannot enter sandbox mode without entering a Sandbox Key, Sandbox Secret, and Sandbox Passphrase!');
		this.checked = false;
	}
	if (this.type === 'checkbox') {
		settings.set(this.id, this.checked);
	} else {
		settings.set(this.id, this.value);
	}
});



////////////////////////////////////
// Listeners
////////////////////////////////////
ipcRenderer.on('websocket_done_filled_buy_ours', (event, data) => {
	console.info(data);
});

ipcRenderer.on('websocket_match', (event, data) => {
	updateTicker(data);
});
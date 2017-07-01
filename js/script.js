// Mixing jQuery and Node.js code in the same file? Yes please!


var Gdax = require('gdax');
var os = require('os');
var prettyBytes = require('pretty-bytes');
const settings = require('electron-settings');

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

var trigger = {
    'BTC-USD': [],
    'ETH-USD': [],
    'LTC-USD': [],
};

var orders = [];
var lastFill = null;


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



function updateCard (data) {
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



function isTriggered(product_id, price) {
    if (trigger[product_id].length > 0) {
        if (price < trigger[product_id][0] || price > trigger[product_id][1]) {
            trigger[product_id][0] = parseFloat(price) - parseFloat(settings.get(product_id +'_buy_trigger'));
            trigger[product_id][1] = parseFloat(price) + parseFloat(settings.get(product_id +'_buy_trigger'));
            return true;
        } else {
            return false;
        }
    } else {
        // Likely first trigger; just load the vars.
        trigger[product_id][0] = parseFloat(price) - parseFloat(settings.get(product_id +'_buy_trigger'));
        trigger[product_id][1] = parseFloat(price) + parseFloat(settings.get(product_id +'_buy_trigger'));
        return false;
    }
}



function buySpread(product_id, price) {
    console.info('BUYING ...');
    buy = {
        'product_id': product_id,
        'size': (parseFloat(settings.get(product_id +'_buy_amount')) / price).toFixed(8),
        'price': null,
    }

    if (buy.size < 0.01) {
        buy.size = 0.01; //Minimum Size
    }

    console.info(buy);

    for (i=0; i < parseInt(settings.get(product_id +'_spread_n')); i++) {
        buy.price = parseFloat(price - (parseFloat(settings.get(product_id +'_spread_v')) * (i + 1))).toFixed(2);
        
        console.info('BUY: '+ buy.price);
        pubBTCUSDClient.buy(buy, function(err, response, data) {
            // console.info(response);
            console.info(data);
        });
    }
}


function sellSpread(product_id, price) {
    console.info('SELLING ...');
    sell = {
        'product_id': product_id,
        'size': (parseFloat(settings.get(product_id +'_sell_amount')) / price).toFixed(8),
        'price': null,
    }
    console.info(sell);

    if (sell.size < 0.01) {
        sell.size = 0.01; //Minimum Size
    }

    for (i=0; i < parseInt(settings.get(product_id +'_spread_n')); i++) {
        sell.price = parseFloat(price + (parseFloat(settings.get(product_id +'_spread_v')) * (i + 1))).toFixed(2);
        
        console.info('SELL: '+ sell.price);
        pubBTCUSDClient.sell(sell, function(err, response, data) {
            // console.info(response);
            console.info(data);
        });
    }
}



var websocket_message = function(data) {
    if (data.type === 'match') {
        // console.info(data);
        updateCard(data);

        if (settings.get(data.product_id +'_trade_enabled')) {
            console.info('Evaluating '+ data.product_id +' at '+ data.price +'...');
            if (isTriggered(data.product_id, data.price)) {
                console.info('\tTriggered ...');

                if (varShouldBuy[data.product_id]) {
                    console.info('\t\tShould buy!');
                    buySpread(data.product_id, data.price);
                    sellSpread(data.product_id, data.price);
                } else {
                    console.info('\t\tShould NOT buy!');
                }
            } else {
                var t_get_orders = setInterval(pubBTCUSDClient.getOrders(function(err,response,data){
                    // console.info('Updating Orders.');
                    orders = data;
                }), 5000);
                var t_get_fills = setInterval(pubBTCUSDClient.getOrders(function(err,response,data){
                    // console.info('Checking for fills.');
                    if (data[0].order_id != lastFill) {
                        lastFill = data[0].order_id;
                        if (data[0].side === 'buy') {
                            sellSpread(data.product_id, data.price);
                        }

                        // Update Balance
                        pubBTCUSDClient.getAccounts(function(err,response,data){$('#USD_balance').text(parseFloat(data[0].balance).toFixed(2))})

                    }
                }), 1000);
            }
        }
    } else if (data.type === 'done') {
        // Order filled or canceled
        if (data.reason === 'filled' && data.side === 'buy') {
            orders.forEach(function(i) {
                if (i.id === data.order_id) {
                    console.info('BOUGHT: '+ data.price +' '+ data.product_id);
                    sellSpread(data.profile_id, data.price);
                }
            });
        }
    }

};



var callback = function(err, response, data) {
    if (err) {
        $('.error').text(err);
    }

    if (response) {
        console.log('response '+ response.request.path);
        // $('.status').html('response '+ response.request.path);
        
    }

    if (data) {
        console.log('data: '+ data);
        console.log(data);
    }
};



var callbackHistoricRates = function(err, response, data) {
    if (err) {
        console.error(err);
    }

    if (response) {
        console.log('callbackHistoricRates response: '+ response.request.path);
        if (response.request.path.includes('BTC-USD')) {
            product_id = 'BTC-USD'
        } else if (response.request.path.includes('ETH-USD')) {
            product_id = 'ETH-USD'
        } else if (response.request.path.includes('LTC-USD')) {
            product_id = 'LTC-USD'
        }

        try {
            data.forEach(function (i) {
                averages['short'][product_id].push(parseFloat(i[4]));
                averages['long'][product_id].push(parseFloat(i[4]));
            });
        } catch (e) {
            console.warn(e);
            if (product_id === 'BTC-USD') {
                pubBTCUSDClient.getProductHistoricRates({'granularity': 10}, callbackHistoricRates);
            } else if (product_id === 'ETH-USD') {
                pubETHUSDClient.getProductHistoricRates({'granularity': 10}, callbackHistoricRates);
            } else if (product_id === 'LTC-USD') {
                pubLTCUSDClient.getProductHistoricRates({'granularity': 10}, callbackHistoricRates);
            }
        }
    }
};


function historicPull(){
    pubBTCUSDClient.getProductHistoricRates({'granularity': 10}, callbackHistoricRates);
    pubETHUSDClient.getProductHistoricRates({'granularity': 10}, callbackHistoricRates);
    pubLTCUSDClient.getProductHistoricRates({'granularity': 10}, callbackHistoricRates);
};



function main(){
    $('.status').html('GDAX Stream: <span>' + prettyBytes(websocket.socket.bytesReceived)+ '</span>');

    $('.stats').html('Number of cpu cores: <span>' + os.cpus().length + '</span>');
    $('.stats').append('Free memory: <span>' + prettyBytes(os.freemem())+ '</span>');

    // var product_ticker = pubBTCUSDClient.getProductTicker(callback);
};


////////////////////////////////////
// Intial Settings
////////////////////////////////////
$('div#settings div#form').hide();
loadConfig();


var authenticated = false;

if (settings.get('account_sandbox')){
    // Running in Sandbox
    auth = {
        'key': settings.get('account_sandbox_api_key'),
        'secret': settings.get('account_sandbox_api_secret'),
        'passphrase': settings.get('account_sandbox_api_passphrase'),
    };
    if (!(auth.secret && auth.key && auth.passphrase)) {
        // UNAUTHENTICATED
        var websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed-public.sandbox.gdax.com');
        var pubBTCUSDClient = new Gdax.PublicClient('BTC-USD', 'https://api-public.sandbox.gdax.com');
        var pubETHUSDClient = new Gdax.PublicClient('ETH-USD', 'https://api-public.sandbox.gdax.com');
        var pubLTCUSDClient = new Gdax.PublicClient('LTC-USD', 'https://api-public.sandbox.gdax.com');
    } else {
        // AUTHENTICATED
        var websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed-public.sandbox.gdax.com', auth);
        var pubBTCUSDClient = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase, product_id='BTC-USD', api_url='https://api-public.sandbox.gdax.com');
        var pubETHUSDClient = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase, product_id='ETH-USD', api_url='https://api-public.sandbox.gdax.com');
        var pubLTCUSDClient = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase, product_id='LTC-USD', api_url='https://api-public.sandbox.gdax.com');
        authenticated = true;
    }
} else {
    // Running in Production
    auth = {
        'key': settings.get('account_api_key'),
        'secret': settings.get('account_api_secret'),
        'passphrase': settings.get('account_api_passphrase'),
    };
    if (!(auth.secret && auth.key && auth.passphrase)) {
        // UNAUTHENTICATED
        var websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD']);
        var pubBTCUSDClient = new Gdax.PublicClient('BTC-USD', 'https://api.gdax.com');
        var pubETHUSDClient = new Gdax.PublicClient('ETH-USD', 'https://api.gdax.com');
        var pubLTCUSDClient = new Gdax.PublicClient('LTC-USD', 'https://api.gdax.com');
    } else {
        // AUTHENTICATED
        var websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD'], 'wss://ws-feed.gdax.com', auth);
        var pubBTCUSDClient = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase);
        var pubETHUSDClient = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase);
        pubETHUSDClient.productID = 'ETH-USD';
        var pubLTCUSDClient = new Gdax.AuthenticatedClient(auth.key, auth.secret, auth.passphrase);
        pubLTCUSDClient.productID = 'LTC-USD';
        authenticated = true;
    }
}

if (authenticated) {
    pubBTCUSDClient.getAccounts(function(err,response,data) {
        $('span#profile_id').text(data[0].profile_id);

        // data.forEach(function() {
        //     if (this.currency === 'USD') {
        //         $('span#USD_balance')
        //             .text('$'+ parsefloat(this.balance).toFixed(2))
        //             .css('color', 'green');
        //     }
        // });
    });
}


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
// Open Web Socket
////////////////////////////////////
websocket.on('message', websocket_message);
websocket.on('error', function() {
    if (settings.get('account_sandbox')) {
        
    }
    location.reload();
});
websocket.on('close', function() {
    location.reload();
});



////////////////////////////////////
// Launch processes
////////////////////////////////////
historicPull();
var t_main = setInterval(main, 1000);

// var t_historicReset = setInterval(historicReset, 15*60*1000);

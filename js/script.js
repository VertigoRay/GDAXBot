// Mixing jQuery and Node.js code in the same file? Yes please!


var Gdax = require('gdax');

var websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD']);
var pubBTCUSDClient = new Gdax.PublicClient('BTC-USD', 'https://api.gdax.com');



function updateCard (data) {
    var div = $('<table><tr><th>Trade Size</th><th>Price (USD)</th><th>Time</th></tr><tr><td><span id="trade_size" class="trade_size"></span></td><td><span id="price" class="price"></span></td><td><span id="time" class="time"></span></td></tr></table>');

    // div.find('h1').text('BAR');

    div.find('span#trade_size').text(data.size);

    div.find('span#price')
        .text(parseFloat(data.price).toFixed(2))
        .css('color', (data.side === 'sell' ? 'green' : 'red'))
        .css('font-weight', 'bold');

    var date = new Date(data.time);
    div.find('span#time')
        .text(('0'+ date.getHours()).slice(-2) +':'+ ('0'+ date.getMinutes()).slice(-2) +':'+ ('0'+ date.getSeconds()).slice(-2))
        .css('color', 'gray');

    $('#'+ data.product_id +'last_trade').html(div);
}



var websocket_message = function(data) {
    $('.status').html('websocket: '+ data.product_id +' - '+ data.type);
    if (data.type === 'match') {
        updateCard(data);
    }
};



var callback = function(err, response, data) {
    if (err) {
        $('.error').text(err);
    }

    if (response) {
        $('.status').html('response '+ response.request.path);
        if (response.request.path.match(/^\/products\/[^\/]+\/ticker/)) {
            updateBTCUSD(data);
        }
    }

    if (data) {
        console.log("data: "+ data);
        console.log(data);
    }
};


function historic(){
    ge
}



function main(){

    // Display some statistics about this computer, using node's os module.

    var os = require('os');
    var prettyBytes = require('pretty-bytes');

    $('.stats').html('Number of cpu cores: <span>' + os.cpus().length + '</span>');
    $('.stats').append('Free memory: <span>' + prettyBytes(os.freemem())+ '</span>');

    // var product_ticker = pubBTCUSDClient.getProductTicker(callback);
};



websocket.on('message', websocket_message);
var t = setInterval(main, 500);

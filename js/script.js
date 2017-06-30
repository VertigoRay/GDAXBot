// Mixing jQuery and Node.js code in the same file? Yes please!


var Gdax = require('gdax');

var websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD', 'LTC-USD']);
var pubBTCUSDClient = new Gdax.PublicClient('BTC-USD', 'https://api.gdax.com');



function updateCard (data) {
    var div = $('<h1>'+ data.product_id +'</h1>');

    div.append('<p>Last Trade Price: '+ data.price +'</p>');
    div.append('<p>Last Trade Size:  '+ data.size +'</p>');

    $('.'+ data.product_id).html(div);
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
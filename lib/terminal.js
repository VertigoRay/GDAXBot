const os = require('os');
const prettyBytes = require('pretty-bytes');
const settings = require('config');
const sprintf = require('sprintf-js').sprintf;
const term = require('terminal-kit').terminal;
const tkit = require('terminal-kit');

term.windowTitle('GDAX Trader');


// Clear Screen
term.moveTo(1, 1).bgBlack.black.eraseLine();
term.eraseDisplayBelow() ;



// Set some key handling
// term.grabInput({mouse: 'button'});

term.on('key', function(key, matches, data ) {
    switch ( key )
    {
        case 'UP' : term.up( 1 ); break;
        case 'DOWN' : term.down( 1 ); break;
        case 'LEFT' : term.left( 1 ); break;
        case 'RIGHT' : term.right( 1 ); break;
        case 'CTRL_C' : process.exit(); break;
        default:   
            // Echo anything else
            term.noFormat(
                Buffer.isBuffer( data.code ) ?
                    data.code :
                    String.fromCharCode( data.code )
            );
            break;
    }
} );



// // Set some mouse handling
// term.on( 'mouse' , function( name , data ) {  
//     term.moveTo( data.x , data.y );
// });



function footer (stream, bytesReceived) {
	term.saveCursor();

	// stream length is expected to be three; anything extra will be ignored.
	if (Array.isArray(stream)) {
		for (var i=0; i<3; i++) {
			term.moveTo(1, (term.height-(3-i))).bgWhite.black.eraseLine();
			if (stream[i]) {
				term('%s: %f [STDEV:%f; MEAN:%f; PRICE:%f; DIFF:%f, ABS:%f] Price Up: %s; Price Outside StDev: %s; Trending Up: %s',
					stream[i].product_id,
					stream[i].num_trades,
					stream[i].stdev,
					stream[i].mean,
					stream[i].price,
					stream[i].difference,
					stream[i].absolute_value_of_difference,
					stream[i].price_above_mean,
					stream[i].price_outside_stdev,
					stream[i].trend_direction_up
				);
			} else {
				term(strem[i]);
			}
		}
	} else {
		term.moveTo(1, (term.height-3)).bgWhite.black.eraseLine();
		term(stream);
		term.moveTo(1, (term.height-2)).bgWhite.black.eraseLine();
		term.moveTo(1, (term.height-1)).bgWhite.black.eraseLine();
	}

	term.moveTo.bgWhite.black(1, term.height).eraseLine();
	term('Number of cpu cores: %d; Free memory: %s; Bytes received: %d', os.cpus().length, prettyBytes(os.freemem()), parseInt(bytesReceived));

	term.white.bgBlack();
	term.restoreCursor();
}



function header (message) {
	term.saveCursor();
	term.moveTo.bgWhite.black(1, 1).eraseLine();

	if (Array.isArray(message)) {
		term(1, 3, 'GDAX Trader');
	} else {
		term(1, 3, 'GDAX Trader');
	}

	var items = ['General', 'Account'];
	settings.get('general.product_ids').forEach((product_id) => {
		items.push(product_id);
	});
	var options = {
		y: 2,	// the menu will be on the top of the terminal
		style: term.inverse,
		selectedStyle: term.dim.blue.bgGreen
	};

	term.clear() ;

	term.singleLineMenu( items , options , function( error , response ) {
		term( '\n' ).eraseLineAfter.green(
			"#%s selected: %s (%s,%s)\n" ,
			response.selectedIndex ,
			response.selectedText ,
			response.x ,
			response.y
		) ;
		process.exit() ;
	} ) ;

	term.white.bgBlack();
	term.restoreCursor();
}




// tkit.ScreenBuffer.create({ dst: term, noFill: true});
// screen.fill({attr: {
// 	// Both foreground and background must have the same color
// 	color: 0 ,
// 	bgColor: 0
// }});






term.clear() ;

var bufferBTC = tkit.ScreenBuffer.create({ dst: term , width: term.width , height: 8 } ) ; //.clear() ;

accountBuffer.put({
	x: 3,
	y: 2,
	wrap: true,
	attr: {color: 'green', bgColor: 'brightBlack'}
	},
	'Account'
) ;

buffer.draw() ;

term( '\n' ) ;







module.exports = function (input, done) {
	header(input.account_id);
	footer(input.stream, input.bytesReceived);
}
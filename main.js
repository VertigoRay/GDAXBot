'use strict';

const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
global.mainWindow = null

function createWindow () {
	// Create the browser window.
	global.mainWindow = new BrowserWindow({width: 800, height: 600})

	// and load the index.html of the app.
	global.mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}));

	// Open the DevTools.
	// global.mainWindow.webContents.openDevTools()

	// Emitted when the window is closed.
	global.mainWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		global.mainWindow = null
	});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		////////////////////////////////////////////////////////////////////////////////
		// Should remove all buy orders before exiting.
		////////////////////////////////////////////////////////////////////////////////

		app.quit()
	}
});

app.on('activate', function () {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (global.mainWindow === null) {
		createWindow()
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// Get redis up, for queue system.
////////////////////////////////////////////////////////////////////////////////
// const RedisServer = require('redis-server')
//     , server = new RedisServer(6379);
 
// server.open((err) => {
//   if (err === null) {
//     // You may now connect a client to the Redis
//     // server bound to `server.port` (e.g. 6379).
//   } else {
//     console.log('RedisServer `Open` error')
//     console.log(err)
//   }
// });

global.minimum_trade = 0.01;
global.coins = ['BTC-USD', 'ETH-USD', 'LTC-USD'];

global.color = {
	Reset: "\x1b[0m",
	Bright: "\x1b[1m",
	Dim: "\x1b[2m",
	Underscore: "\x1b[4m",
	Blink: "\x1b[5m",
	Reverse: "\x1b[7m",
	Hidden: "\x1b[8m",

	FgBlack: "\x1b[30m",
	FgRed: "\x1b[31m",
	FgGreen: "\x1b[32m",
	FgYellow: "\x1b[33m",
	FgBlue: "\x1b[34m",
	FgMagenta: "\x1b[35m",
	FgCyan: "\x1b[36m",
	FgWhite: "\x1b[37m",

	BgBlack: "\x1b[40m",
	BgRed: "\x1b[41m",
	BgGreen: "\x1b[42m",
	BgYellow: "\x1b[43m",
	BgBlue: "\x1b[44m",
	BgMagenta: "\x1b[45m",
	BgCyan: "\x1b[46m",
	BgWhite: "\x1b[47m",
}

global.websocket_closed = false;
var   {gdaxsocket} = require('./js/websocket.js');
const {ipcMain} = require('electron');
const settings = require('electron-settings');

// let mainValue = ipcRenderer.sendSync('isWebSocketAuthenticated');

ipcMain.on('getAveragesLength', (event, s_or_l, product_id) => {
	event.returnValue = gdaxsocket.averages[s_or_l][product_id].length;
});

ipcMain.on('getFills', function(event, product_id) {
	gdaxsocket.gdax[product_id].getFills({'after': 1000}, (err, response, data) => {
		if (err) {
			console.error(err);
		} else {
			console.info(data);
		}

		event.returnValue = data;
	});
});

ipcMain.on('getOrder', function(event, product_id, order_id) {
	event.returnValue = gdaxsocket.get_order(product_id, order_id);
});

ipcMain.on('getOrders', function(event, product_id) {
	event.returnValue = gdaxsocket.get_orders(product_id);
});

ipcMain.on('getWebsocketBytesReceived', function(event) {
	let bytesReceived = gdaxsocket.websocket !== undefined ? gdaxsocket.websocket.socket.bytesReceived : 0;
	event.returnValue = bytesReceived;
});

ipcMain.on('isOrderMine', (event, order_id) => {
	event.returnValue = gdaxsocket.is_order_mine(order_id);
});

ipcMain.on('isTrendingUp', (event, s_or_l, product_id, price) => {
	event.returnValue = gdaxsocket.is_trending_up(s_or_l, product_id, price);
});

ipcMain.on('isWebSocketAuthenticated', function(event) {
	event.returnValue = gdaxsocket.authenticated;
});

ipcMain.on('shouldBuy', (event, product_id) => {
	event.returnValue = gdaxsocket.should_buy(product_id);
});



setInterval(function(){
	// Keep an eye on websocket, and re-open it if it's closed
	if (global.websocket_closed) {
		console.log('/////////////////////////////////////////////////');
		console.log('// Re-creating Websocket');
		console.log('/////////////////////////////////////////////////');
		gdaxsocket = require('./js/websocket.js');
		global.websocket_closed = false;
	}
}, 1000);



for (var c in global.coins) {
	setInterval(function(){
		gdaxsocket.get_orders(global.coins[c]);
	}, settings.get(global.coins[c] +'_sell_round_up_s', 3600));
}



var kue = require('kue');
kue.createQueue();
kue.app.set('title', 'GDAX Trader Queue');
kue.app.listen(3000);
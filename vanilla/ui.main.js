'use strict';
window.deckimport = document.getElementById('deckimport');
window.foename = document.getElementById('foename');

var chatinput = document.getElementById('chatinput');
var username = document.getElementById('username');
var guestname,
	muteset = {},
	muteall;
var ui = require('./ui');
var etg = require('./etg');
var chat = require('./chat');
var Cards = require('./Cards');
var Effect = require('./Effect');
var etgutil = require('../etgutil');
var Actives = require('./Actives');
const App = require('./views/App'),
	{ Provider } = require('react-redux'),
	reactDOM = require('react-dom'),
	React = require('react');
var lastError = 0;
window.onerror = function() {
	var now = Date.now();
	if (lastError + 999 < now) {
		chat(Array.apply(null, arguments).join(', '));
		lastError = now;
	}
};
reactDOM.render(
	<Provider store={store.store}>
		<App />
	</Provider>,
	document.getElementById("leftpane"),
);
function chatmute() {
	chat(
		(muteall ? 'You have chat muted. ' : '') +
			'Muted: ' +
			Object.keys(muteset).join(', '),
	);
}
function maybeSendChat(e) {
	e.cancelBubble = true;
	if (e.keyCode == 13 && chatinput.value) {
		e.preventDefault();
		var msg = chatinput.value;
		chatinput.value = '';
		if (msg == '/clear') {
			chat.clear();
		} else if (msg == '/who') {
			sock.emit('who');
		} else if (msg.match(/^\/roll( |$)\d*d?\d*$/)) {
			var data = { u: '' };
			var ndn = msg.slice(6).split('d');
			if (!ndn[1]) {
				data.X = parseInt(ndn[0] || 0x100000000);
			} else {
				data.A = parseInt(ndn[0]);
				data.X = parseInt(ndn[1]);
			}
			sock.emit('roll', data);
		} else if (msg == '/mute') {
			muteall = true;
			chatmute();
		} else if (msg == '/unmute') {
			muteall = false;
			chatmute();
		} else if (msg.match(/^\/mute /)) {
			muteset[msg.substring(6)] = true;
			chatmute();
		} else if (msg.match(/^\/unmute /)) {
			delete muteset[msg.substring(8)];
			chatmute();
		} else if (!msg.match(/^\/[^/]/)) {
			var name =
				username.value ||
				guestname ||
				(guestname =
					10000 + Math.floor(Math.random() * 89999) + location.pathname[1]);
			sock.emit('guestchat', { msg: msg, u: name });
		} else chat('Not a command: ' + msg);
	}
}
function unaryParseInt(x) {
	return parseInt(x, 10);
}
function maybeChallenge(e) {
	e.cancelBubble = true;
	if (e.keyCode != 13) return;
	if (foename.value) {
		challengeClick();
	}
}
function parseInput(data, key, value) {
	var value = parseInt(value);
	if (value === 0 || value > 0) data[key] = value;
}
function challengeClick() {
	var deck = sock.getDeck();
	if (deck.length < 31) {
		return;
	}
	var gameData = {};
	parseInput(gameData, 'p1hp', pvphp.value);
	parseInput(gameData, 'p1draw', pvpdraw.value);
	parseInput(gameData, 'p1mark', pvpmark.value);
	parseInput(gameData, 'p1deck', pvpdeck.value);
	gameData.deck = deck;
	gameData.room = foename.value;
	sock.emit('pvpwant', gameData);
}
var expofuncs = [maybeChallenge, maybeSendChat, challengeClick];
for (var i = 0; i < expofuncs.length; i++) {
	window[expofuncs[i].name] = expofuncs[i];
}

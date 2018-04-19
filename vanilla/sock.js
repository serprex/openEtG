var chat = require('../chat');
var etgutil = require('../etgutil');
var socket = new WebSocket('wss://' + location.hostname + ':13602');
var buffer = [];
var attempts = 0,
	attemptTimeout = 0;
socket.onopen = function() {
	attempts = 0;
	if (attemptTimeout) {
		clearTimeout(attemptTimeout);
		attemptTimeout = 0;
	}
	buffer.forEach(this.send, this);
	buffer.length = 0;
	chat('Connected');
};
socket.onclose = function reconnect() {
	if (attemptTimeout) return;
	if (attempts < 8) attempts++;
	var timeout = 99 + Math.floor(99 * Math.random()) * attempts;
	attemptTimeout = setTimeout(function() {
		attemptTimeout = 0;
		var oldsock = socket;
		exports.et = socket = new WebSocket(
			'wss://' + location.hostname + ':13602',
		);
		socket.onopen = oldsock.onopen;
		socket.onclose = oldsock.onclose;
		socket.onmessage = oldsock.onmessage;
	}, timeout);
	chat('Reconnecting in ' + timeout + 'ms');
};
exports.et = socket;
exports.emit = function(x, data) {
	if (!data) data = {};
	data.x = x;
	var msg = JSON.stringify(data);
	if (socket && socket.readyState == 1) {
		socket.send(msg);
	} else {
		buffer.push(msg);
	}
};
exports.getDeck = function(limit) {
	var deck = ~deckimport.value.indexOf(' ')
		? deckimport.value.split(' ').map(function(x) {
				return parseInt(x, 32);
			})
		: etgutil.decodedeck(deckimport.value);
	if (limit && deck.length > 60) {
		deck.length = 60;
	}
	return deck;
};

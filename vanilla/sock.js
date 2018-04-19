const chat = require('./chat'),
	etgutil = require('../etgutil'),
	mkGame = require('./mkGame');
var socket = new WebSocket('wss://' + location.hostname + ':13602');
const buffer = [];
let attempts = 0,
	attemptTimeout = 0,
	guestname;
var sockEvents = {
	pvpgive: (data) => {
		if (exports.pvp) {
			delete exports.pvp;
			store.store.dispatch(store.doNav(require('./views/Match'), mkGame(data)));
		}
	},
	roll: function(data) {
		var span = document.createElement('div');
		span.style.color = '#090';
		if (data.u) {
			var b = document.createElement('b');
			b.appendChild(document.createTextNode(data.u + ' '));
			span.appendChild(b);
		}
		span.appendChild(
			document.createTextNode((data.A || 1) + 'd' + data.X + ' '),
		);
		var a = document.createElement('a');
		a.target = '_blank';
		a.href = '../speed/' + data.sum;
		a.appendChild(document.createTextNode(data.sum));
		span.appendChild(a);
		chat.addSpan(span);
	},
	chat: function(data) {
		if ((muteall && !data.mode) || data.u in muteset) return;
		var now = new Date(),
			h = now.getHours(),
			m = now.getMinutes(),
			hs = h < 10 ? '0' + h : h.toString(),
			ms = m < 10 ? '0' + m : m.toString();
		var span = document.createElement('div');
		if (data.mode != 1) span.style.color = data.mode == 2 ? '#69f' : '#ddd';
		if (data.guest) span.style.fontStyle = 'italic';
		span.appendChild(document.createTextNode(hs + ms + ' '));
		if (data.u) {
			var belly = document.createElement('b');
			belly.appendChild(document.createTextNode(data.u + ' '));
			span.appendChild(belly);
		}
		var decklink = /\b(([01][0-9a-v]{4})+)\b/g,
			reres,
			lastindex = 0;
		while ((reres = decklink.exec(data.msg))) {
			if (reres.index != lastindex)
				span.appendChild(
					document.createTextNode(data.msg.slice(lastindex, reres.index)),
				);
			var notlink = false;
			for (var i = 2; i < reres[0].length; i += 5) {
				var code = reres[0].substr(i, 3);
				if (!(code in Cards.Codes) && etgutil.fromTrueMark(code) == -1) {
					notlink = true;
					break;
				}
			}
			if (notlink) {
				lastindex = reres.index;
				continue;
			}
			var link = document.createElement('a');
			link.href = '../deck/' + reres[0];
			link.target = '_blank';
			link.appendChild(document.createTextNode(reres[0]));
			span.appendChild(link);
			lastindex = reres.index + reres[0].length;
		}
		if (lastindex != data.msg.length)
			span.appendChild(document.createTextNode(data.msg.slice(lastindex)));
		chat.addSpan(span);
	},
};
var sock = require('./sock');
sock.et.onmessage = function(msg) {
	var data = JSON.parse(msg.data);
	var func = sockEvents[data.x] || px.getCmd(data.x);
	if (func) {
		func.call(this, data);
	}
};
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

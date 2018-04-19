'use strict';
window.deckimport = document.getElementById('deckimport');
window.foename = document.getElementById('foename');

var chatinput = document.getElementById('chatinput');
var username = document.getElementById('username');
var guestname,
	muteset = {},
	muteall;
var px = require('./px');
var ui = require('./ui');
var etg = require('./etg');
var chat = require('../chat');
var Cards = require('./Cards');
var Effect = require('./Effect');
var etgutil = require('../etgutil');
var Actives = require('./Actives');
var lastError = 0;
window.onerror = function() {
	var now = Date.now();
	if (lastError + 999 < now) {
		chat(Array.apply(null, arguments).join(', '));
		lastError = now;
	}
};
var sockEvents = {
	pvpgive: require('./views/Match'),
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
require('./views/Login')();
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

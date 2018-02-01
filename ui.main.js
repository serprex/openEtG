'use strict';
require('@babel/polyfill');
const muteset = {},
	px = require('./px'),
	chat = require('./chat'),
	Cards = require('./Cards'),
	etgutil = require('./etgutil'),
	RngMock = require('./RngMock'),
	options = require('./options'),
	userutil = require('./userutil'),
	mkGame = require('./mkGame');
var guestname,
	muteall,
	lastError = 0;
window.onerror = function() {
	var now = Date.now();
	if (lastError + 999 < now) {
		chat(Array.apply(null, arguments).join(', '), 'System');
		lastError = now;
	}
};
var lastmove = 0;
document.addEventListener('mousemove', function(e) {
	if (e.timeStamp - lastmove < 16) {
		e.stopPropagation();
	} else {
		lastmove = e.timeStamp;
	}
});
if (options.hideRightpane) {
	document.getElementById('rightpane').style.display = 'none';
}
const sockEvents = {
	clear: chat.clear.bind(null, 'Main'),
	passchange: function(data) {
		sock.user.auth = data.auth;
		chat('Password updated', 'System');
	},
	mute: function(data) {
		muteset[data.m] = true;
		chat(data.m + ' has been muted', 'System');
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
		a.href = 'speed/' + data.sum;
		a.appendChild(document.createTextNode(data.sum));
		span.appendChild(a);
		chat.addSpan(span, 'Main');
	},
	chat: function(data) {
		if (muteall && !data.mode) return;
		if (
			typeof Notification !== 'undefined' &&
			sock.user &&
			~data.msg.indexOf(sock.user.name) &&
			!document.hasFocus()
		) {
			Notification.requestPermission();
			new Notification(data.u, { body: data.msg });
		}
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
				var code = parseInt(reres[0].substr(i, 3), 32);
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
			link.href = 'deck/' + reres[0];
			link.target = '_blank';
			link.appendChild(document.createTextNode(reres[0]));
			span.appendChild(link);
			lastindex = reres.index + reres[0].length;
		}
		if (lastindex != data.msg.length)
			span.appendChild(document.createTextNode(data.msg.slice(lastindex)));
		chat.addSpan(span, data.mode == 1 ? null : 'Main');
	},
	foearena: function(data) {
		const gamedata = mkGame({
			deck: data.deck,
			urdeck: sock.getDeck(),
			seed: data.seed,
			rank: data.rank,
			p2hp: data.hp,
			foename: data.name,
			p2drawpower: data.draw,
			p2markpower: data.mark,
			arena: data.name,
			level: 4 + data.lv,
			ai: true,
		});
		gamedata.game.cost = userutil.arenaCost(data.lv);
		sock.user.gold -= gamedata.game.cost;
		px.doNav(require('./views/Match'), gamedata);
	},
	tradegive: function(data) {
		if (sock.trade) {
			delete sock.trade;
			px.doNav(require('./views/Trade'));
		}
	},
	pvpgive: function(data) {
		if (sock.pvp) {
			delete sock.pvp;
			px.doNav(require('./views/Match'), mkGame(data));
		}
	},
	spectategive: function(data) {
		if (sock.spectate) {
			delete sock.spectate;
			data.spectate = true;
			px.doNav(require('./views/Match'), mkGame(data));
		}
	},
	challenge: function(data) {
		var span = document.createElement('div');
		span.style.cursor = 'pointer';
		span.style.color = '#69f';
		span.addEventListener('click', function() {
			if (data.pvp) {
				require('./views/Challenge').sendChallenge((sock.pvp = data.f));
			} else {
				sock.userEmit('tradewant', { f: (sock.trade = data.f) });
			}
		});
		span.appendChild(
			document.createTextNode(
				data.f +
					(data.pvp
						? ' challenges you to a duel!'
						: ' wants to trade with you!'),
			),
		);
		chat.addSpan(span);
		sock.emit('challrecv', { f: data.f, pvp: data.pvp });
	},
};
const sock = require('./sock');
sock.et.onmessage = function(msg) {
	var data = JSON.parse(msg.data);
	if (data.u && data.u in muteset) return;
	var func = sockEvents[data.x] || px.getCmd(data.x);
	if (func) func.call(this, data);
};
preact.render(
	preact.h(require('./views/App'), { view: require('./views/Login') }),
	document.body,
);
if (options.preart) sock.emit('cardart');
function chatmute() {
	chat(
		(muteall ? 'You have chat muted. ' : '') +
			'Muted: ' +
			Object.keys(muteset).join(', '),
		'System',
	);
}
function maybeSendChat(e) {
	e.cancelBubble = true;
	var kc = e.which || e.keyCode;
	if (kc == 13) {
		e.preventDefault();
		var chatinput = document.getElementById('chatinput'),
			msg = chatinput.value.trim();
		chatinput.value = '';
		if (msg == '/help') {
			var cmds = {
				clear: 'Clear chat. Accepts a regex filter',
				who: 'List users online',
				roll: 'Server rolls XdY publicly',
				decks: 'List all decks. Accepts a regex filter',
				mod: 'List mods',
				mute: 'If no user specified, mute chat entirely',
				unmute: 'If no user specified, unmute chat entirely',
				w: 'Whisper',
			};
			for (var cmd in cmds) {
				chat(cmd + ' ' + cmds[cmd]);
			}
		} else if (msg == '/clear') {
			chat.clear();
		} else if (msg.match(/^\/clear /)) {
			var rx = new RegExp(msg.slice(7));
			var chatBox = document.getElementById('chatBox');
			for (var i = chatBox.children.length - 1; i >= 0; i--) {
				if (chatBox.children[i].textContent.match(rx))
					chatBox.removeChild(chatBox.children[i]);
			}
		} else if (msg == '/who') {
			sock.emit('who');
		} else if (msg.match(/^\/roll( |$)\d*d?\d*$/)) {
			var data = { u: sock.user ? sock.user.name : '' };
			var ndn = msg.slice(6).split('d');
			if (!ndn[1]) {
				data.X = parseInt(ndn[0] || 0x100000000);
			} else {
				data.A = parseInt(ndn[0]);
				data.X = parseInt(ndn[1]);
			}
			sock.emit('roll', data);
		} else if (msg.match(/^\/decks/) && sock.user) {
			var rx = msg.length > 7 && new RegExp(msg.slice(7));
			var names = Object.keys(sock.user.decks);
			if (rx) names = names.filter(name => name.match(rx));
			names.sort();
			names.forEach(name => {
				var deck = sock.user.decks[name];
				var span = document.createElement('div');
				var link = document.createElement('a');
				link.href = 'deck/' + deck;
				link.target = '_blank';
				link.className =
					'ico ce' + etgutil.fromTrueMark(parseInt(deck.slice(-3), 32));
				span.appendChild(link);
				span.appendChild(document.createTextNode(name + ' '));
				span.addEventListener('click', function(e) {
					if (e.target != this) return;
					const deckname = document.getElementById('deckname'),
						deckimport = document.getElementById('deckimport');
					if (deckname && deckimport) {
						deckname.value = name;
						deckimport.value = deck;
						deckname.dispatchEvent(new Event('change'));
						deckimport.dispatchEvent(new Event('change'));
						const e = new Event('keypress');
						e.keyCode = 13;
						deckname.dispatchEvent(e);
						deckimport.dispatchEvent(e);
					}
				});
				chat.addSpan(span);
			});
		} else if (msg == '/mute') {
			muteall = true;
			chatmute();
		} else if (msg == '/unmute') {
			muteall = false;
			chatmute();
		} else if (msg.match(/^\/mute /)) {
			muteset[msg.slice(6)] = true;
			chatmute();
		} else if (msg.match(/^\/unmute /)) {
			delete muteset[msg.slice(8)];
			chatmute();
		} else if (msg == '/mod') {
			sock.emit('mod');
		} else if (sock.user && msg == '/modclear') {
			sock.userEmit('modclear');
		} else if (sock.user && msg.match(/^\/mod(guest|mute|add|rm) /)) {
			var sp = msg.indexOf(' ');
			sock.userEmit(msg.slice(1, sp), { m: msg.slice(sp + 1) });
		} else if (msg.match(/^\/code /)) {
			sock.userEmit('codecreate', { t: msg.slice(6) });
		} else if (!msg.match(/^\/[^/]/) || (sock.user && msg.match(/^\/w( |")/))) {
			msg = msg.replace(/^\/\//, '/');
			if (sock.user) {
				var data = { msg: msg };
				if (msg.match(/^\/w( |")/)) {
					var match = msg.match(/^\/w"([^"]*)"/);
					var to = (match && match[1]) || msg.slice(3, msg.indexOf(' ', 4));
					if (!to) return;
					chatinput.value = msg.slice(0, 4 + to.length);
					data.msg = msg.slice(4 + to.length);
					data.to = to;
				}
				if (!data.msg.match(/^\s*$/)) sock.userEmit('chat', data);
			} else {
				var name =
					options.username ||
					guestname ||
					(guestname = 10000 + RngMock.upto(89999) + '');
				if (!msg.match(/^\s*$/)) sock.emit('guestchat', { msg: msg, u: name });
			}
		} else chat('Not a command: ' + msg);
	}
}
function offlineChange() {
	sock.emit('chatus', { hide: !!options.offline || !!options.hideRightpane });
}
function afkChange() {
	sock.emit('chatus', { afk: !!options.afk });
}
function wantpvpChange() {
	sock.emit('chatus', { want: !!options.wantpvp });
}
options.register('wantpvp', document.getElementById('wantpvp'));
options.register('offline', document.getElementById('offline'));
options.register('afk', document.getElementById('afk'), true);
(callbacks => {
	for (const id in callbacks) {
		for (const event in callbacks[id]) {
			document.getElementById(id).addEventListener(event, callbacks[id][event]);
		}
	}
})({
	chatinput: { keypress: maybeSendChat },
	offline: { change: offlineChange },
	afk: { change: afkChange },
	wantpvp: { change: wantpvpChange },
});

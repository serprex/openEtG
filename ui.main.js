'use strict';
require('@babel/polyfill');
const chat = require('./chat'),
	Cards = require('./Cards'),
	etgutil = require('./etgutil'),
	RngMock = require('./RngMock'),
	options = require('./options'),
	userutil = require('./userutil'),
	mkGame = require('./mkGame'),
	App = require('./views/App'),
	store = require('./store'),
	{ Provider } = require('react-redux'),
	reactDOM = require('react-dom'),
	React = require('react');
let guestname,
	lastError = 0;
window.onerror = function(...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		chat(args.join(', '), 'System');
		lastError = now;
	}
};
const sockEvents = {
	clear: () => chat.clear('Main'),
	passchange: (data) => {
		sock.user.auth = data.auth;
		chat('Password updated', 'System');
	},
	mute: (data) => {
		store.store.dispatch(store.mute(data.m));
		chat(data.m + ' has been muted', 'System');
	},
	roll: (data) => {
		const span = document.createElement('div');
		span.style.color = '#090';
		if (data.u) {
			const b = document.createElement('b');
			b.appendChild(document.createTextNode(data.u + ' '));
			span.appendChild(b);
		}
		span.appendChild(
			document.createTextNode((data.A || 1) + 'd' + data.X + ' '),
		);
		const a = document.createElement('a');
		a.target = '_blank';
		a.href = 'speed/' + data.sum;
		a.appendChild(document.createTextNode(data.sum));
		span.appendChild(a);
		chat.addSpan(span, 'Main');
	},
	chat: (data) => {
		if (store.store.getState().opts.muteall && !data.mode) return;
		if (
			typeof Notification !== 'undefined' &&
			sock.user &&
			~data.msg.indexOf(sock.user.name) &&
			!document.hasFocus()
		) {
			Notification.requestPermission();
			new Notification(data.u, { body: data.msg });
		}
		const now = new Date(),
			h = now.getHours(),
			m = now.getMinutes(),
			hs = h < 10 ? '0' + h : h.toString(),
			ms = m < 10 ? '0' + m : m.toString();
		const span = document.createElement('div');
		if (data.mode != 1) span.style.color = data.mode == 2 ? '#69f' : '#ddd';
		if (data.guest) span.style.fontStyle = 'italic';
		span.appendChild(document.createTextNode(hs + ms + ' '));
		if (data.u) {
			const belly = document.createElement('b');
			belly.appendChild(document.createTextNode(data.u + ' '));
			span.appendChild(belly);
		}
		let decklink = /\b(([01][0-9a-v]{4})+)\b/g,
			reres,
			lastindex = 0;
		while ((reres = decklink.exec(data.msg))) {
			if (reres.index != lastindex)
				span.appendChild(
					document.createTextNode(data.msg.slice(lastindex, reres.index)),
				);
			let notlink = false;
			for (let i = 2; i < reres[0].length; i += 5) {
				const code = parseInt(reres[0].substr(i, 3), 32);
				if (!(code in Cards.Codes) && etgutil.fromTrueMark(code) == -1) {
					notlink = true;
					break;
				}
			}
			if (notlink) {
				lastindex = reres.index;
				continue;
			}
			const link = document.createElement('a');
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
	foearena: (data) => {
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
		store.store.dispatch(store.doNav(require('./views/Match'), gamedata));
	},
	tradegive: (data) => {
		if (sock.trade) {
			delete sock.trade;
			store.store.dispatch(store.doNav(require('./views/Trade')));
		}
	},
	pvpgive: (data) => {
		if (sock.pvp) {
			delete sock.pvp;
			store.store.dispatch(store.doNav(require('./views/Match'), mkGame(data)));
		}
	},
	spectategive: (data) => {
		if (sock.spectate) {
			delete sock.spectate;
			data.spectate = true;
			store.store.dispatch(store.doNav(require('./views/Match'), mkGame(data)));
		}
	},
	challenge: (data) => {
		const span = document.createElement('div');
		span.style.cursor = 'pointer';
		span.style.color = '#69f';
		span.addEventListener('click', () => {
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
	const state = store.store.getState();
	const data = JSON.parse(msg.data);
	if (data.u && state.muted.has(data.u)) return;
	const func = sockEvents[data.x] || state.cmds[data.x];
	if (func) func.call(this, data);
};
reactDOM.render(
	<Provider store={store.store}>
		<App />
	</Provider>,
	document.getElementById("leftpane"),
);
function chatmute() {
	const state = store.store.getState();
	chat(
		(state.opts.muteall ? 'You have chat muted. ' : '') +
			'Muted: ' +
			Array.from(state.muted).join(', '),
		'System',
	);
}
function maybeSendChat(e) {
	e.cancelBubble = true;
	const kc = e.which || e.keyCode;
	if (kc == 13) {
		e.preventDefault();
		let chatinput = document.getElementById('chatinput'),
			msg = chatinput.value.trim();
		chatinput.value = '';
		if (msg == '/help') {
			const cmds = {
				clear: 'Clear chat. Accepts a regex filter',
				who: 'List users online',
				roll: 'Server rolls XdY publicly',
				decks: 'List all decks. Accepts a regex filter',
				mod: 'List mods',
				mute: 'If no user specified, mute chat entirely',
				unmute: 'If no user specified, unmute chat entirely',
				w: 'Whisper',
			};
			for (const cmd in cmds) {
				chat(cmd + ' ' + cmds[cmd]);
			}
		} else if (msg == '/clear') {
			chat.clear();
		} else if (msg.match(/^\/clear /)) {
			const rx = new RegExp(msg.slice(7));
			const chatBox = document.getElementById('chatBox');
			for (let i = chatBox.children.length - 1; i >= 0; i--) {
				if (chatBox.children[i].textContent.match(rx))
					chatBox.removeChild(chatBox.children[i]);
			}
		} else if (msg == '/who') {
			sock.emit('who');
		} else if (msg.match(/^\/roll( |$)\d*d?\d*$/)) {
			const data = { u: sock.user ? sock.user.name : '' };
			const ndn = msg.slice(6).split('d');
			if (!ndn[1]) {
				data.X = parseInt(ndn[0] || 0x100000000);
			} else {
				data.A = parseInt(ndn[0]);
				data.X = parseInt(ndn[1]);
			}
			sock.emit('roll', data);
		} else if (msg.match(/^\/decks/) && sock.user) {
			const rx = msg.length > 7 && new RegExp(msg.slice(7));
			let names = Object.keys(sock.user.decks);
			if (rx) names = names.filter(name => name.match(rx));
			names.sort();
			names.forEach(name => {
				const deck = sock.user.decks[name];
				const span = document.createElement('div');
				const link = document.createElement('a');
				link.href = 'deck/' + deck;
				link.target = '_blank';
				link.className =
					'ico ce' + etgutil.fromTrueMark(parseInt(deck.slice(-3), 32));
				span.appendChild(link);
				span.appendChild(document.createTextNode(name + ' '));
				span.addEventListener('click', function(e) {
					if (e.target != this) return;
					store.store.dispatch(store.setOptTemp('selectedDeck', name));
					store.store.dispatch(store.setOptTemp('deckname', name));
					store.store.dispatch(store.setOpt('deck', deck));
				});
				chat.addSpan(span);
			});
		} else if (msg == '/mute') {
			store.store.dispatch(store.setOptTemp('muteall', true));
			chatmute();
		} else if (msg == '/unmute') {
			store.store.dispatch(store.setOptTemp('muteall', false));
			chatmute();
		} else if (msg.match(/^\/mute /)) {
			store.store.dispatch(store.mute(msg.slice(6)));
			chatmute();
		} else if (msg.match(/^\/unmute /)) {
			store.store.dispatch(store.unmute(msg.slice(8)));
			chatmute();
		} else if (msg == '/mod') {
			sock.emit('mod');
		} else if (sock.user && msg == '/modclear') {
			sock.userEmit('modclear');
		} else if (sock.user && msg.match(/^\/mod(guest|mute|add|rm) /)) {
			const sp = msg.indexOf(' ');
			sock.userEmit(msg.slice(1, sp), { m: msg.slice(sp + 1) });
		} else if (msg.match(/^\/code /)) {
			sock.userEmit('codecreate', { t: msg.slice(6) });
		} else if (!msg.match(/^\/[^/]/) || (sock.user && msg.match(/^\/w( |")/))) {
			msg = msg.replace(/^\/\//, '/');
			if (sock.user) {
				const data = { msg: msg };
				if (msg.match(/^\/w( |")/)) {
					const match = msg.match(/^\/w"([^"]*)"/);
					const to = (match && match[1]) || msg.slice(3, msg.indexOf(' ', 4));
					if (!to) return;
					chatinput.value = msg.slice(0, 4 + to.length);
					data.msg = msg.slice(4 + to.length);
					data.to = to;
				}
				if (!data.msg.match(/^\s*$/)) sock.userEmit('chat', data);
			} else {
				const name =
					store.store.getState().opts.username ||
					guestname ||
					(guestname = 10000 + RngMock.upto(89999) + '');
				if (!msg.match(/^\s*$/)) sock.emit('guestchat', { msg: msg, u: name });
			}
		} else chat('Not a command: ' + msg);
	}
}
function offlineChange() {
	const {opts} = store.store.getState();
	sock.emit('chatus', { hide: !!opts.offline || !!opts.hideRightpane });
}
function afkChange() {
	sock.emit('chatus', { afk: !!store.store.getState().opts.afk });
}
function wantpvpChange() {
	sock.emit('chatus', { want: !!store.store.getState().opts.wantpvp });
}
if (store.store.getState().opts.hideRightpane) {
	document.getElementById('rightpane').style.display = 'none';
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

const Cards = require('./Cards'),
	chat = require('./chat'),
	etgutil = require('./etgutil'),
	mkGame = require('./mkGame'),
	store = require('./store'),
	usercmd = require('./usercmd'),
	userutil = require('./userutil'),
	React = require('react');
const endpoint =
	(/^\d+\.\d+\.\d+\.\d+$/.test(location.hostname) ? 'ws://' : 'wss://') +
	location.hostname +
	':13602';
const buffer = [];
let socket = new WebSocket(endpoint),
	attempts = 0,
	attemptTimeout = 0,
	guestname;
const sockEvents = {
	clear: () => store.store.dispatch(store.clearChat('Main')),
	passchange: (data) => {
		exports.user.auth = data.auth;
		chat('Password updated', 'System');
	},
	mute: (data) => {
		store.store.dispatch(store.mute(data.m));
		chat(data.m + ' has been muted', 'System');
	},
	roll: (data) => {
		chat.addSpan(<div style={{color: '#090'}}>
			{data.u && <b>{data.u} </b>}
			{(data.A || 1)}d{data.X} <a href={`speed/${data.sum}`} target='_blank'>{data.sum}</a>
		</div>, 'Main');
	},
	chat: (data) => {
		if (store.store.getState().opts.muteall && !data.mode) return;
		if (
			typeof Notification !== 'undefined' &&
			Notification.permission !== 'denied' &&
			exports.user &&
			~data.msg.indexOf(exports.user.name) &&
			!document.hasFocus()
		) {
			Notification.requestPermission().then(result => {
				if (result == 'granted') new Notification(data.u, { body: data.msg });
			});
		}
		const now = new Date(),
			h = now.getHours(),
			m = now.getMinutes(),
			hs = h < 10 ? '0' + h : h.toString(),
			ms = m < 10 ? '0' + m : m.toString(),
			style = {},
			text = [];
		if (data.mode != 1) style.color = data.mode == 2 ? '#69f' : '#ddd';
		if (data.guest) style.fontStyle = 'italic';
		let decklink = /\b(([01][0-9a-v]{4})+)\b/g,
			reres,
			lastindex = 0;
		while ((reres = decklink.exec(data.msg))) {
			if (reres.index != lastindex)
				text.push(data.msg.slice(lastindex, reres.index));
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
			text.appendChild(<a href={`deck/${reres[0]}`} target='_blank'>{reres[0]}</a>);
			lastindex = reres.index + reres[0].length;
		}
		if (lastindex != data.msg.length)
			text.push(data.msg.slice(lastindex));
		chat.addSpan(<div style={style}>
			{hs}{ms} {data.u && <b>{data.u} </b>}
			{text}
		</div>, data.mode == 1 ? null : 'Main');
	},
	foearena: (data) => {
		const gamedata = mkGame({
			deck: data.deck,
			urdeck: exports.getDeck(),
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
		exports.user.gold -= gamedata.game.cost;
		store.store.dispatch(store.doNav(require('./views/Match'), gamedata));
	},
	tradegive: (data) => {
		if (exports.trade) {
			delete exports.trade;
			store.store.dispatch(store.doNav(require('./views/Trade')));
		}
	},
	pvpgive: (data) => {
		if (exports.pvp) {
			delete exports.pvp;
			store.store.dispatch(store.doNav(require('./views/Match'), mkGame(data)));
		}
	},
	spectategive: (data) => {
		if (exports.spectate) {
			delete exports.spectate;
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
				require('./views/Challenge').sendChallenge((exports.pvp = data.f));
			} else {
				exports.userEmit('tradewant', { f: (exports.trade = data.f) });
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
		exports.emit('challrecv', { f: data.f, pvp: data.pvp });
	},
};
socket.onmessage = function(msg) {
	const state = store.store.getState();
	const data = JSON.parse(msg.data);
	if (data.u && state.muted.has(data.u)) return;
	const func = sockEvents[data.x] || state.cmds[data.x];
	if (func) func.call(this, data);
};
socket.onopen = function() {
	attempts = 0;
	if (attemptTimeout) {
		clearTimeout(attemptTimeout);
		attemptTimeout = 0;
	}
	const {opts} = store.store.getState();
	if (opts.offline || opts.wantpvp || opts.afk)
		exports.emit('chatus', {
			hide: !!opts.offline,
			wantpvp: !!opts.wantpvp,
			afk: !!opts.afk,
		});
	buffer.forEach(this.send, this);
	buffer.length = 0;
	chat('Connected', 'System');
};
socket.onclose = function() {
	if (attemptTimeout) return;
	if (attempts < 8) attempts++;
	const timeout = 99 + Math.floor(99 * Math.random()) * attempts;
	attemptTimeout = setTimeout(() => {
		attemptTimeout = 0;
		const oldsock = socket;
		socket = new WebSocket(endpoint);
		socket.onopen = oldsock.onopen;
		socket.onclose = oldsock.onclose;
		socket.onmessage = oldsock.onmessage;
	}, timeout);
	chat('Reconnecting in ' + timeout + 'ms', 'System');
};
exports.user = undefined;
exports.userEmit = function(x, data) {
	if (!data) data = {};
	data.u = exports.user.name;
	data.a = exports.user.auth;
	exports.emit(x, data);
};
exports.emit = function(x, data) {
	if (!data) data = {};
	data.x = x;
	const msg = JSON.stringify(data);
	if (socket && socket.readyState == 1) {
		socket.send(msg);
	} else {
		buffer.push(msg);
	}
};
exports.userExec = function(x, data) {
	if (!data) data = {};
	exports.userEmit(x, data);
	usercmd[x](data, exports.user);
};
exports.getDeck = function() {
	if (exports.user) return exports.user.decks[exports.user.selectedDeck] || '';
	const deck = (store.store.getState().opts.deck || '').trim();
	return ~deck.indexOf(' ') ? etgutil.encodedeck(deck.split(' ')) : deck;
};

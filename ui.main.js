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
	sock = require('./sock'),
	store = require('./store'),
	{ Provider } = require('react-redux'),
	reactDOM = require('react-dom'),
	React = require('react');
let lastError = 0;
window.onerror = function(...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		chat(args.join(', '), 'System');
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

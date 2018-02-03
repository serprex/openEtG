const chat = require('./chat'),
	etgutil = require('./etgutil'),
	{store} = require('./store'),
	usercmd = require('./usercmd');
const endpoint =
	(/^\d+\.\d+\.\d+\.\d+$/.test(location.hostname) ? 'ws://' : 'wss://') +
	location.hostname +
	':13602';
const buffer = [];
let socket = new WebSocket(endpoint),
	attempts = 0,
	attemptTimeout = 0;
socket.onopen = function() {
	attempts = 0;
	if (attemptTimeout) {
		clearTimeout(attemptTimeout);
		attemptTimeout = 0;
	}
	const {opts} = store.getState();
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
		exports.et = socket = new WebSocket(endpoint);
		socket.onopen = oldsock.onopen;
		socket.onclose = oldsock.onclose;
		socket.onmessage = oldsock.onmessage;
	}, timeout);
	chat('Reconnecting in ' + timeout + 'ms', 'System');
};
exports.et = socket;
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
	const deck = (store.getState().opts.deck || '').trim();
	return ~deck.indexOf(' ') ? etgutil.encodedeck(deck.split(' ')) : deck;
};

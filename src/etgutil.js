'use strict';
function encodeCount(count) {
	return count <= 0
		? '00'
		: count >= 1023
		? 'vv'
		: (count < 32 ? '0' : '') + count.toString(32);
}
exports.encodeCount = encodeCount;
exports.asUpped = function(code, upped) {
	const isUpped = (code & 0x3fff) > 6999;
	return isUpped == upped ? code : code + (isUpped ? -2000 : 2000);
};
exports.asShiny = function(code, shiny) {
	return shiny ? code | 0x4000 : code & 0x3fff;
};
exports.fromTrueMark = function(code) {
	return code >= 9010 && code <= 9022 ? code - 9010 : -1;
};
exports.toTrueMark = function(n) {
	return n + 9010;
};
exports.toTrueMarkSuffix = function(n) {
	return '01' + (n + 9010).toString(32);
};
exports.iterdeck = function(deck, func) {
	let len = 0;
	for (let i = 0; i < deck.length; i += 5) {
		const count = parseInt(deck.substr(i, 2), 32),
			code = parseInt(deck.substr(i + 2, 3), 32);
		for (let j = 0; j < count; j++) func(code, len++);
	}
};
exports.iterraw = function(deck, func) {
	for (let i = 0; i < deck.length; i += 5) {
		const count = parseInt(deck.substr(i, 2), 32),
			code = parseInt(deck.substr(i + 2, 3), 32);
		func(code, count);
	}
};
exports.count = function(deck, code) {
	const key = code.toString(32);
	for (let i = 0; i < deck.length; i += 5) {
		if (key == deck.substr(i + 2, 3)) {
			return parseInt(deck.substr(i, 2), 32);
		}
	}
	return 0;
};
exports.decklength = function(deck) {
	let r = 0;
	for (let i = 0; i < deck.length; i += 5) {
		r += parseInt(deck.substr(i, 2), 32);
	}
	return r;
};
exports.encodedeck = function(deck) {
	let out = '',
		i = 0;
	while (i < deck.length) {
		let j = i++;
		const dj = deck[j];
		while (i < deck.length && deck[i] == dj) i++;
		out += encodeCount(i - j) + dj.toString(32);
	}
	return out;
};
exports.decodedeck = function(deck) {
	if (!deck) return [];
	const out = [];
	exports.iterdeck(deck, code => out.push(code));
	return out;
};
exports.deck2pool = function(deck, pool) {
	if (!deck) return [];
	pool = pool || [];
	exports.iterraw(deck, (code, count) => {
		pool[code] = (pool[code] || 0) + count;
	});
	return pool;
};
exports.addcard = function(deck, card, x = 1) {
	if (deck === undefined) deck = '';
	for (let i = 0; i < deck.length; i += 5) {
		const code = parseInt(deck.substr(i + 2, 3), 32);
		if (code == card) {
			const count = parseInt(deck.substr(i, 2), 32) + x;
			return count <= 0
				? deck.slice(0, i) + deck.slice(i + 5)
				: deck.slice(0, i) + encodeCount(count) + deck.slice(i + 2);
		}
	}
	return x <= 0 ? deck : deck + encodeCount(x) + card.toString(32);
};
exports.mergedecks = function(deck, ...args) {
	for (const arg of args) {
		exports.iterraw(arg, (code, count) => {
			deck = exports.addcard(deck, code, count);
		});
	}
	return deck;
};
exports.removedecks = function(deck, ...args) {
	for (const arg of args) {
		exports.iterraw(arg, (code, count) => {
			deck = exports.addcard(deck, code, -count);
		});
	}
	return deck;
};

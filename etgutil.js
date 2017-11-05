'use strict';
function encodeCount(count) {
	return count <= 0
		? '00'
		: count >= 1023 ? 'vv' : (count < 32 ? '0' : '') + count.toString(32);
}
exports.encodeCount = encodeCount;
exports.asUpped = function(code, upped) {
	var isUpped = (code & 0x3fff) > 6999;
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
	var len = 0;
	for (var i = 0; i < deck.length; i += 5) {
		var count = parseInt(deck.substr(i, 2), 32),
			code = parseInt(deck.substr(i + 2, 3), 32);
		for (var j = 0; j < count; j++) func(code, len++);
	}
};
exports.iterraw = function(deck, func) {
	for (var i = 0; i < deck.length; i += 5) {
		var count = parseInt(deck.substr(i, 2), 32),
			code = parseInt(deck.substr(i + 2, 3), 32);
		func(code, count);
	}
};
exports.count = function(deck, code) {
	const key = code.toString(32);
	for (var i = 0; i < deck.length; i += 5) {
		if (key == deck.substr(i + 2, 3)) {
			return parseInt(deck.substr(i, 2), 32);
		}
	}
	return 0;
};
exports.decklength = function(deck) {
	var r = 0;
	for (var i = 0; i < deck.length; i += 5) {
		r += parseInt(deck.substr(i, 2), 32);
	}
	return r;
};
exports.encodedeck = function(deck) {
	var pool = [],
		out = '';
	deck.forEach((code) => {
		if (code in pool) {
			pool[code]++;
		} else {
			pool[code] = 1;
		}
	});
	pool.forEach((count, code) => {
		out += encodeCount(count) + code.toString(32);
	});
	return out;
};
exports.encoderaw = function(deck) {
	var out = '',
		i = 0;
	while (i < deck.length) {
		var j = i++,
			dj = deck[j];
		while (i < deck.length && deck[i] == dj) i++;
		out += encodeCount(i - j) + dj.toString(32);
	}
	return out;
};
exports.decodedeck = function(deck) {
	if (!deck) return [];
	var out = [];
	exports.iterdeck(deck, function(code) {
		out.push(code);
	});
	return out;
};
exports.deck2pool = function(deck, pool) {
	if (!deck) return [];
	pool = pool || [];
	exports.iterraw(deck, function(code, count) {
		if (code in pool) {
			pool[code] += count;
		} else {
			pool[code] = count;
		}
	});
	return pool;
};
exports.addcard = function(deck, card, x) {
	if (deck === undefined) deck = '';
	if (x === undefined) x = 1;
	for (var i = 0; i < deck.length; i += 5) {
		var code = parseInt(deck.substr(i + 2, 3), 32);
		if (code == card) {
			var count = parseInt(deck.substr(i, 2), 32) + x;
			return count <= 0
				? deck.slice(0, i) + deck.slice(i + 5)
				: deck.slice(0, i) + encodeCount(count) + deck.slice(i + 2);
		}
	}
	return x <= 0 ? deck : deck + encodeCount(x) + card.toString(32);
};
exports.mergedecks = function(deck) {
	for (var i = 1; i < arguments.length; i++) {
		exports.iterraw(arguments[i], function(code, count) {
			deck = exports.addcard(deck, code, count);
		});
	}
	return deck;
};
exports.removedecks = function(deck) {
	for (var i = 1; i < arguments.length; i++) {
		exports.iterraw(arguments[i], function(code, count) {
			deck = exports.addcard(deck, code, -count);
		});
	}
	return deck;
};

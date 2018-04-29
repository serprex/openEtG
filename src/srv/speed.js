'use strict';
const deck = require('./deck'),
	Cards = require('../Cards'),
	mt = require('../MersenneTwister');
module.exports = function(url, stime) {
	let hash = 0;
	for (let i = 0; i < url.length; i++) {
		hash = (hash * 31 + url.charCodeAt(i)) & 0x7fffffff;
	}
	const rng = new mt(hash),
		eles = new Uint8Array(12),
		cards = new Uint16Array(42);
	for (let i = 0; i < 6; i++) {
		// Select a random set of unique elements through partial shuffling
		const ei = i + (((12 - i) * rng.rnd()) | 0),
			ele = eles[ei] || ei + 1;
		eles[ei] = eles[i] || i + 1;
		for (let j = 0; j < 7; j++) {
			const codes = Cards.filter(
				false,
				x => x.element == ele && x.type && cards.indexOf(x.code) == -1,
			);
			cards[i * 7 + j] = codes[(codes.length * rng.rnd()) | 0];
		}
	}
	cards.sort(Cards.codeCmp);
	let code = '';
	for (let i = 0; i < cards.length; i++) {
		code += '01' + cards[i].toString(32);
	}
	return deck(code, stime);
};

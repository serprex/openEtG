'use strict';
const gzip = require('./gzip'),
	svg = require('../svg');
module.exports = async function(url, stime) {
	const deck = url.replace(/\.svg$/, '');
	if (deck.length % 5) {
		throw 'Unaligned deck';
	}
	return {
		buf: await gzip(svg.deck(deck), { level: 9 }),
		head: { 'Content-Encoding': 'gzip', 'Content-Type': 'image/svg+xml' },
		date: stime,
	};
};

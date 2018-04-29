'use strict';
const gzip = require('./gzip'),
	Cards = require('../Cards'),
	svg = require('../svg');
module.exports = async function(url, stime) {
	const code = parseInt(url.slice(0, 3), 32);
	if (!(code in Cards.Codes)) {
		throw `${code} undefined`;
	}
	return {
		buf: await gzip(svg.card(code), { level: 9 }),
		head: { 'Content-Encoding': 'gzip', 'Content-Type': 'image/svg+xml' },
		date: stime,
	};
};

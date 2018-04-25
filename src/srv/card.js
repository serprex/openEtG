'use strict';
const zlib = require('zlib'),
	Cards = require('../Cards'),
	svg = require('../svg');
module.exports = function(url, resolve, reject, stime) {
	const code = parseInt(url.slice(0, 3), 32);
	if (!(code in Cards.Codes)) {
		reject(code + ' undefined');
	}
	zlib.gzip(svg.card(code), { level: 9 }, (err, buf) =>
		resolve({
			head: { 'Content-Encoding': 'gzip', 'Content-Type': 'image/svg+xml' },
			date: stime,
			buf: buf,
		}),
	);
};

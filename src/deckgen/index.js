'use strict';
const duo = require('./duo'),
	bow = require('./bow');

module.exports = function(uprate, markpower, maxRarity) {
	const r = Math.random() * 13,
		f = r < 12 ? duo : bow;
	return f(uprate, markpower, maxRarity);
};

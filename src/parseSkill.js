'use strict';
const cache = new Map(),
	imm = require('immutable'),
	Skill = require('./Skill');
module.exports = function(name) {
	if (name in Skills) {
		return Skills[name];
	} else if (cache.has(name)) {
		return cache.get(name);
	}
	const spidx = name.indexOf(' ');
	if (spidx === -1) {
		return console.log('Unknown active', name);
	}
	const s = new Skill(
		new imm.List().push(name),
		Skills[name.slice(0, spidx)].func(name.slice(spidx + 1)),
		false,
	);
	cache.set(name, s);
	return s;
};
var Skills = require('./Skills');

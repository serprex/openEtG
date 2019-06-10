'use strict';
module.exports = function(name) {
	if (name in Skills) {
		return Skills[name];
	} else {
		const spidx = name.indexOf(' ');
		if (~spidx) {
			return (Skills[name] = {
				func: Skills[name.slice(0, spidx)].func(name.slice(spidx + 1)),
				name: [name],
			});
		}
		console.log('Unknown active', name);
	}
};
var Skills = require('./Skills');

'use strict';
function parseInput(data, key, value, limit) {
	const val = parseInt(value, 10);
	if (val === 0 || val > 0) data[key] = limit ? Math.min(val, limit) : val;
}
exports.parseInput = parseInput;

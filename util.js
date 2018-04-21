'use strict';
exports.iterSplit = function*(src, str) {
	let i = 0;
	while (true) {
		const j = src.indexOf(str, i);
		yield src.slice(i, ~j ? j : src.length);
		if (j == -1) return;
		i = j + str.length;
	}
};
exports.place = function(array, item) {
	for (let i = 0; i < array.length; i++)
		if (!array[i]) return (array[i] = item);
};
exports.clone = function(obj) {
	const result = {};
	for (const key in obj) result[key] = obj[key];
	return result;
};
exports.hashString = function(str) {
	let hash = 5381;
	for (let i = 0; i < str.length; i++)
		hash = (hash * 33 + str.charCodeAt(i)) & 0x7fffffff;
	return hash;
};
exports.randint = function() {
	return Math.random() * 0x100000000;
};

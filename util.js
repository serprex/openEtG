'use strict';
exports.iterSplit = function(src, str, func, thisObj) {
	for (var i = 0; ; i = j + str.length) {
		var j = src.indexOf(str, i);
		func.call(thisObj, src.slice(i, ~j ? j : src.length));
		if (j == -1) return;
	}
};
exports.place = function(array, item) {
	for (var i = 0; i < array.length; i++)
		if (!array[i]) return (array[i] = item);
};
exports.clone = function(obj) {
	var result = {};
	for (var key in obj) result[key] = obj[key];
	return result;
};
exports.hashString = function(str) {
	var hash = 5381;
	for (var i = 0; i < str.length; i++)
		hash = (hash * 33 + str.charCodeAt(i)) & 0x7fffffff;
	return hash;
};
exports.randint = function() {
	return Math.random() * 0x100000000;
};

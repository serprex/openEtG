"use strict";
exports.iterSplit = function(src, str, func, thisObj){
	for(var i=0;;i=j+str.length){
		var j=src.indexOf(str, i);
		func.call(thisObj, src.slice(i, (~j?j:src.length)));
		if (j == -1) return;
	}
}
exports.typedIndexOf = function(array, inst){
	for(var i=0; i<array.length; i++)
		if (array[i] == inst) return i;
	return -1;
}
exports.typedSome = function(array, func){
	for(var i=0; i<array.length; i++)
		if (func(array[i])) return true;
	return false;
}
exports.place = function(array, item){
	for (var i=0; i<array.length; i++)
		if (!array[i]) return array[i] = item;
}
exports.clone = function(obj){
	var result = {};
	for(var key in obj) result[key] = obj[key];
	return result;
}
exports.isEmpty = function(obj){
	for(var key in obj)
		if (obj[key] !== undefined) return false;
	return true;
}
exports.hashString = function(str){
	var hash = 5381;
	for (var i=0; i<str.length; i++) hash = hash*33 + str.charCodeAt(i) & 0x7FFFFFFF;
	return hash;
}
exports.randint = function(){
	return Math.random()*0x100000000;
}

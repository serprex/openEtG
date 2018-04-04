'use strict';
const util = require('./util');

function Status() {
	this.map = new Map();
}
module.exports = Status;

Status.prototype.clone = function() {
	const obj = Object.create(Status.prototype);
	obj.map = new Map(this.map);
	return obj;
};
Status.prototype.get = function(key) {
	return this.map.get(key) || 0;
};
Status.prototype.set = function(key, val) {
	this.map.set(key, val|0);
};
Status.prototype.incr = function(key, val) {
	this.map.set(key, (this.map.get(key)|0)+val);
};
Status.prototype.maybeDecr = function(key) {
	const val = this.map.get(key);
	if (val > 0) this.map.set(key, val-1);
};
Status.prototype.clear = function() {
	this.map.clear();
};
Status.prototype.hash = function() {
	let ret = 0xdeadbeef;
	for (const [k, v] of this.map) {
		if (v) ret ^= util.hashString(k) ^ (v * 0x04004004);
	}
	return ret;
};

'use strict';
var util = require('./util');

function Status() {
	this.keys = [];
	this.vals = [];
}
module.exports = Status;

Status.prototype.clone = function() {
	var obj = Object.create(Status.prototype);
	obj.keys = this.keys.slice();
	obj.vals = this.vals.slice();
	return obj;
};
Status.prototype.get = function(key) {
	var idx = this.keys.indexOf(key);
	return ~idx ? this.vals[idx] : 0;
};
Status.prototype.set = function(key, val) {
	var idx = this.keys.indexOf(key);
	val |= 0;
	if (~idx) this.vals[idx] = val;
	else {
		this.keys.push(key);
		this.vals.push(val);
	}
};
Status.prototype.incr = function(key, val) {
	var idx = this.keys.indexOf(key);
	val |= 0;
	if (~idx) return (this.vals[idx] += val);
	else {
		this.keys.push(key);
		this.vals.push(val);
		return val;
	}
};
Status.prototype.maybeDecr = function(key) {
	var idx = this.keys.indexOf(key);
	return ~idx && this.vals[idx] > 0 ? this.vals[idx]-- : 0;
};
Status.prototype.clear = function() {
	this.keys.length = 0;
	this.vals.length = 0;
};
Status.prototype.hash = function() {
	var ret = 0xdeadbeef;
	for (var i = 0; i < this.keys.length; i++) {
		if (this.vals[i]) {
			ret ^= util.hashString(this.keys[i]) ^ (this.vals[i] * 0x04004004);
		}
	}
	return ret;
};

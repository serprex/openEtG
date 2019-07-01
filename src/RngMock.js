'use strict';
const RngMock = Object.create(require('./Thing').prototype);
RngMock.rng = Math.random;
RngMock.upto = function(x) {
	return Math.floor(Math.random() * x);
};
module.exports = RngMock;

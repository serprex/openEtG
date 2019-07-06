import Thing from './Thing.js';
const RngMock = Object.create(Thing.prototype);
RngMock.rng = Math.random;
RngMock.upto = function(x) {
	return Math.floor(Math.random() * x);
};
export default RngMock;

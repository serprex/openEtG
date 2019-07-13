import Game from './Game.js';
const RngMock = Object.create(Game.prototype);
RngMock.rng = Math.random;
export default RngMock;

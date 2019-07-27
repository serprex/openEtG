import Game from './Game.js';
import Cards from './Cards.js';
const RngMock = Object.create(Game.prototype);
RngMock.props = new Map().set(1, new Map().set('Cards', Cards));
RngMock.rng = Math.random;
export default RngMock;

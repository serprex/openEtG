import Player from './Player';
const PlayerRng = Object.create(Player.prototype);
PlayerRng.rng = Math.random;
PlayerRng.upto = function(x) {
	return Math.floor(Math.random() * x);
};
export default PlayerRng;

var Player = require('./Player');
var PlayerRng = (module.exports = Object.create(Player.prototype));
PlayerRng.rng = Math.random;
PlayerRng.upto = function(x) {
	return Math.floor(Math.random() * x);
};

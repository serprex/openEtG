'use strict';
module.exports = Game;
var etg = require('./etg');
var Cards = require('./Cards');
var Effect = require('./Effect');
var Player = require('./Player');
const Rng = require('rng.js');
function Game(seed, flip) {
	this.rng = new Rng(seed, ~seed);
	this.phase = etg.PlayPhase;
	this.ply = 0;
	this.player1 = new Player(this);
	this.player2 = new Player(this);
	this.player1.foe = this.player2;
	this.player2.foe = this.player1;
	this.turn = (seed & 1) ^ !flip ? this.player1 : this.player2;
	this.expectedDamage = [0, 0];
	this.time = Date.now();
}
Game.prototype.clone = function() {
	var obj = Object.create(Game.prototype);
	obj.rng = this.rng.clone();
	obj.phase = this.phase;
	obj.ply = this.ply;
	obj.player1 = this.player1.clone(obj);
	obj.player2 = this.player2.clone(obj);
	obj.player1.foe = obj.player2;
	obj.player2.foe = obj.player1;
	obj.turn = this.turn == this.player1 ? obj.player1 : obj.player2;
	obj.targeting = this.targeting;
	return obj;
};
Game.prototype.players = function(n) {
	return n ? this.player2 : this.player1;
};
Game.prototype.setWinner = function(play) {
	if (!this.winner) {
		this.winner = play;
		this.phase = etg.EndPhase;
		if (this.time) this.time = Date.now() - this.time;
	}
};
function removeSoPa(p) {
	if (p) delete p.status.patience;
}
Game.prototype.updateExpectedDamage = function() {
	if (this.expectedDamage && !this.winner) {
		Effect.disable = true;
		this.expectedDamage[0] = this.expectedDamage[1] = 0;
		for (var i = 0; i < 3; i++) {
			var gclone = this.clone();
			gclone.player1.permanents.forEach(removeSoPa);
			gclone.player2.permanents.forEach(removeSoPa);
			gclone.rng.seed(gclone.rng.mt[0] ^ (i * 997));
			gclone.turn.endturn();
			if (!gclone.winner) gclone.turn.endturn();
			this.expectedDamage[0] += this.player1.hp - gclone.player1.hp;
			this.expectedDamage[1] += this.player2.hp - gclone.player2.hp;
		}
		this.expectedDamage[0] = Math.round(this.expectedDamage[0] / 3);
		this.expectedDamage[1] = Math.round(this.expectedDamage[1] / 3);
		Effect.disable = false;
	}
};
Game.prototype.tgtToBits = function(x) {
	var bits;
	if (x == undefined) {
		return 0;
	} else if (x.type == etg.Player) {
		bits = 1;
	} else if (x instanceof etg.Weapon) {
		bits = 17;
	} else if (x instanceof etg.Shield) {
		bits = 33;
	} else {
		bits =
			(x instanceof etg.Creature ? 2 : x instanceof etg.Permanent ? 4 : 5) |
			(x.getIndex() << 4);
	}
	if (x.owner == this.player2) {
		bits |= 8;
	}
	return bits;
};
Game.prototype.bitsToTgt = function(x) {
	var tgtop = x & 7,
		player = this.players(!(x & 8));
	if (tgtop == 0) {
		return undefined;
	} else if (tgtop == 1) {
		return player[['owner', 'weapon', 'shield'][x >> 4]];
	} else if (tgtop == 2) {
		return player.creatures[x >> 4];
	} else if (tgtop == 4) {
		return player.permanents[x >> 4];
	} else if (tgtop == 5) {
		return player.hand[x >> 4];
	} else console.log('Unknown tgtop: ' + tgtop + ', ' + x);
};
Game.prototype.getTarget = function(src, active, cb) {
	var targetingFilter = Cards.Targeting[active.name[0]];
	if (targetingFilter) {
		var game = this;
		this.targeting = {
			filter: function(t) {
				return (
					(t.type == etg.Player ||
						t instanceof etg.CardInstance ||
						t.owner == game.turn ||
						t.status.cloak ||
						!t.owner.isCloaked()) &&
					targetingFilter(src, t)
				);
			},
			cb: function() {
				cb.apply(null, arguments);
				game.targeting = null;
			},
			text: active.name[0],
			src: src,
		};
	} else {
		cb();
	}
};

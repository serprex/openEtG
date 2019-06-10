'use strict';
const Rng = require('rng.js');
function Game(seed, flip) {
	this.rng = new Rng(seed, ~seed);
	this.phase = 0;
	this.player1 = new Player(this);
	this.player2 = new Player(this);
	this.player1.foe = this.player2;
	this.player2.foe = this.player1;
	this.first = this.turn = (seed & 1) ^ !flip ? this.player1 : this.player2;
	this.ply = 0;
	this.targeting = null;
	this.expectedDamage = new Int16Array(2);
	this.time = Date.now();
	this.bonusstats = {
		cardsplayed: new Int32Array(6),
		creaturesplaced: 0,
		creatureskilled: 0,
	};
}
module.exports = Game;

Game.prototype.clone = function() {
	const obj = Object.create(Game.prototype);
	obj.rng = new Rng(this.rng.lowSeed, this.rng.highSeed);
	obj.rng.lowConstant = this.rng.lowConstant;
	obj.rng.highConstant = this.rng.highConstant;
	obj.rng.lowStateCount = this.rng.lowStateCount;
	obj.rng.highStateCount = this.rng.highStateCount;
	obj.phase = this.phase;
	obj.player1 = this.player1.clone(obj);
	obj.player2 = this.player2.clone(obj);
	obj.player1.foe = obj.player2;
	obj.player2.foe = obj.player1;
	obj.turn = this.turn == this.player1 ? obj.player1 : obj.player2;
	obj.first = this.first == this.player1 ? obj.player1 : obj.player2;
	obj.ply = this.ply;
	obj.targeting = null;
	obj.expectedDamage = null;
	obj.time = 0;
	obj.bonusstats = null;
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
Game.prototype.progressMulligan = function() {
	if (this.phase === etg.MulliganPhase) {
		this.turn = this.turn.foe;
		if (this.turn === this.first) {
			this.phase = etg.PlayPhase;
		}
	}
};
const blacklist = new Set([
	'spectate',
	'flip',
	'seed',
	'p1deckpower',
	'p2deckpower',
	'deck',
	'urdeck',
]);
Game.prototype.addData = function(data) {
	for (const key in data) {
		if (!blacklist.has(key)) {
			const p1or2 = key.match(/^p(1|2)/);
			if (p1or2) {
				this['player' + p1or2[1]][key.slice(2)] = data[key];
			} else this[key] = data[key];
		}
	}
};
function removeSoPa(p) {
	if (p) p.setStatus('patience', 0);
}
Game.prototype.updateExpectedDamage = function() {
	if (this.expectedDamage) {
		this.expectedDamage[0] = this.expectedDamage[1] = 0;
		if (!this.winner) {
			Effect.disable = true;
			for (let i = 0; i < 3; i++) {
				const gclone = this.clone();
				gclone.player1.permanents.forEach(removeSoPa);
				gclone.player2.permanents.forEach(removeSoPa);
				gclone.rng.setSeed(
					gclone.rng.highState ^ (i * 997),
					gclone.rng.lowState ^ (i * 650),
				);
				gclone.turn.endturn();
				if (!gclone.winner) gclone.turn.endturn();
				this.expectedDamage[0] += this.player1.hp - gclone.player1.hp;
				this.expectedDamage[1] += this.player2.hp - gclone.player2.hp;
			}
			Effect.disable = false;
			this.expectedDamage[0] = (this.expectedDamage[0] / 3) | 0;
			this.expectedDamage[1] = (this.expectedDamage[1] / 3) | 0;
		}
	}
};
Game.prototype.tgtToBits = function(x) {
	if (x === undefined) return 0;
	const bits =
		x.type == etg.Player
			? 1
			: x.type == etg.Weapon
			? 17
			: x.type == etg.Shield
			? 33
			: (x.type == etg.Creature ? 2 : x.type == etg.Permanent ? 4 : 5) |
			  (x.getIndex() << 4);
	return x.owner == this.player2 ? bits | 8 : bits;
};
Game.prototype.bitsToTgt = function(x) {
	const tgtop = x & 7,
		x4 = x >> 4,
		player = this.players(!(x & 8));
	return tgtop == 0
		? undefined
		: tgtop == 1
		? player[['owner', 'weapon', 'shield'][x4]]
		: tgtop == 2
		? player.creatures[x4]
		: tgtop == 4
		? player.permanents[x4]
		: tgtop == 5
		? player.hand[x4]
		: console.log(`Unknown tgtop: ${tgtop}, ${x4}`);
};
Game.prototype.getTarget = function(src, active, cb) {
	const targetingFilter = Cards.Targeting[active.name[0]];
	if (targetingFilter) {
		this.targeting = {
			filter: t => {
				return (
					(t.type == etg.Player ||
						t.type == etg.Spell ||
						t.owner == this.turn ||
						t.getStatus('cloak') ||
						!t.owner.isCloaked()) &&
					targetingFilter(src, t)
				);
			},
			cb: (...args) => {
				cb(...args);
				this.targeting = null;
			},
			text: active.name[0],
			src: src,
		};
	} else cb();
};

var etg = require('./etg');
var Cards = require('./Cards');
var Effect = require('./Effect');
var Player = require('./Player');

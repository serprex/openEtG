'use strict';
const Rng = require('rng.js'),
	imm = require('immutable');
function Game(seed, flip) {
	const first = (seed & 1) + 2,
		second = first ^ 1,
		rng = new Rng(seed, ~seed);
	this.props = new imm.Map()
		.set(
			1,
			new imm.Map({
				id: 4,
				phase: 0,
				first: first,
				turn: first,
				player1: flip ? second : first,
				player2: flip ? first : second,
				seed: seed,
				bonusstats: new imm.Map({
					ply: 0,
					cardsplayed: new Int32Array(6),
					creaturesplaced: 0,
					creatureskilled: 0,
					time: Date.now(),
				}),
				rng: new imm.Map({
					lowConstant: rng.lowConstant,
					highConstant: rng.highConstant,
					lowStateCount: rng.lowStateCount,
					highStateCount: rng.highStateCount,
				}),
			}),
		)
		.set(first, new imm.Map({ foe: second }))
		.set(second, new imm.Map({ foe: first }));
	this.player1.init();
	this.player2.init();
	this.targeting = null;
	this.expectedDamage = new Int16Array(2);
}
Game.prototype.id = 1;
module.exports = Game;

Object.defineProperty(Game.prototype, 'player1Id', {
	get: function() {
		return this.get(this.id, 'player1');
	},
});
Object.defineProperty(Game.prototype, 'player2Id', {
	get: function() {
		return this.get(this.id, 'player2');
	},
});

Object.defineProperty(Game.prototype, 'player1', {
	get: function() {
		return new Player(this, this.get(this.id, 'player1'));
	},
});
Object.defineProperty(Game.prototype, 'player2', {
	get: function() {
		return new Player(this, this.get(this.id, 'player2'));
	},
});

function defineProp(key) {
	Object.defineProperty(Game.prototype, key, {
		get: function() {
			return this.get(this.id, key);
		},
		set: function(val) {
			this.set(this.id, key, val);
		},
	});
}
defineProp('phase');
defineProp('bonusstats');
defineProp('turn');
defineProp('first');
defineProp('ai');

Game.prototype.clone = function() {
	const obj = Object.create(Game.prototype);
	obj.targeting = null;
	obj.expectedDamage = null;
	obj.props = this.props;
	return obj;
};
Game.prototype.rng = function() {
	const seed = this.props.getIn([this.id, 'seed']);
	let val;
	this.props = this.props.updateIn([this.id, 'rng'], rng => {
		const rngInst = new Rng(seed, ~seed);
		rngInst.lowConstant = rng.get('lowConstant');
		rngInst.highConstant = rng.get('highConstant');
		rngInst.lowStateCount = rng.get('lowStateCount');
		rngInst.highStateCount = rng.get('highStateCount');
		val = rngInst.nextNumber();
		return new imm.Map({
			lowConstant: rng.get('lowConstant'),
			highConstant: rng.get('highConstant'),
			lowStateCount: rng.get('lowStateCount'),
			highStateCount: rng.get('highStateCount'),
		});
	});
	return val;
};
Game.prototype.upto = function(x) {
	return (this.rng() * x) | 0;
};
Game.prototype.players = function(n) {
	return n ? this.player2 : this.player1;
};
Game.prototype.playerIds = function(n) {
	return n ? this.player2Id : this.player1Id;
};
Game.prototype.byId = function(id) {
	if (!id) return id;
	if (id === this.id) return this;
	if (id === this.player1Id || id === this.player2Id)
		return new Player(this, id);
	return new Thing(this, id);
};
Game.prototype.newId = function() {
	const newId = this.get(this.id, 'id') + 1;
	this.set(this.id, 'id', newId);
	return newId;
};
Game.prototype.newThing = function(card) {
	return new Thing(this, this.newId()).init(card);
};
Game.prototype.get = function(id, key) {
	const ent = this.props.get(id);
	return ent && ent.get(key);
};
Game.prototype.set = function(id, key, val) {
	const ent = this.props.get(id) || new imm.Map();
	return (this.props = this.props.set(id, ent.set(key, val)));
};
Game.prototype.update = function(id, func) {
	this.props = this.props.update(id, func);
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
		this.turn = this.get(this.turn, 'foe');
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
	if (this.expectedDamage && !this.winner) {
		const expectedDamage = new Int16Array(2),
			disable = Effect.disable;
		Effect.disable = true;
		for (let i = 0; i < 3; i++) {
			const gclone = this.clone();
			gclone.player1.permanents.forEach(removeSoPa);
			gclone.player2.permanents.forEach(removeSoPa);
			gclone.update(gclone.id, game =>
				game
					.updateIn(['rng', 'highState'], state => state ^ (i * 997))
					.updateIn(['rng', 'lowState'], state => state ^ (i * 650)),
			);
			this.byId(gclone.turn).endturn();
			if (!gclone.winner) this.byId(gclone.turn).endturn();
			expectedDamage[0] += this.player1.hp - gclone.player1.hp;
			expectedDamage[1] += this.player2.hp - gclone.player2.hp;
		}
		Effect.disable = disable;
		expectedDamage[0] = (expectedDamage[0] / 3) | 0;
		expectedDamage[1] = (expectedDamage[1] / 3) | 0;
		this.expectedDamage = expectedDamage;
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
	return x.ownerId == this.player2Id ? bits | 8 : bits;
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
						t.ownerId == this.turn ||
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
var Thing = require('./Thing');

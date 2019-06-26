'use strict';
const Rng = require('rng.js'),
	imm = require('immutable');
function Game(seed, flip) {
	const first = (seed & 1) + 2,
		second = first ^ 1,
		rng = new Rng(seed, ~seed),
		player1 = flip ? second : first,
		player2 = flip ? first : second;
	this.props = new imm.Map()
		.set(
			1,
			new imm.Map({
				id: 4,
				phase: 0,
				first: first,
				turn: first,
				player1: player1,
				player2: player2,
				seed: seed,
				bonusstats: new imm.Map({
					ply: 0,
					cardsplayed: new Int32Array(6),
					creaturesplaced: 0,
					creatureskilled: 0,
					time: Date.now(),
				}),
				data: new imm.Map(),
				rng: rng.getStateCount(),
			}),
		)
		.set(first, new imm.Map({ owner: first, foe: second }))
		.set(second, new imm.Map({ owner: second, foe: first }));
	this.cache = new Map([
		[this.id, this],
		[first, new Player(this, first).init()],
		[second, new Player(this, second).init()],
	]);
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
Object.defineProperty(Game.prototype, 'ai', {
	get: function() {
		return this.props.getIn([this.id, 'data', 'ai']);
	},
	set: function(val) {
		this.props = this.props.setIn([this.id, 'data', 'ai'], val);
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
defineProp('data');
defineProp('turn');
defineProp('first');
defineProp('winner');

Game.prototype.clone = function() {
	const obj = Object.create(Game.prototype);
	obj.props = this.props;
	obj.cache = new Map([
		[this.id, obj],
		[this.player1Id, new Player(obj, this.player1Id)],
		[this.player2Id, new Player(obj, this.player2Id)],
	]);
	return obj;
};
Game.prototype.rng = function() {
	const seed = this.props.getIn([this.id, 'seed']);
	let val;
	this.props = this.props.updateIn([this.id, 'rng'], rng => {
		const rngInst = new Rng(seed, ~seed);
		rngInst.setStateCount(...rng);
		val = rngInst.nextNumber();
		return rngInst.getStateCount();
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
	if (!id) return null;
	let inst = this.cache.get(id);
	if (!inst) {
		inst = new Thing(this, id);
		this.cache.set(id, inst);
	}
	return inst;
};
Game.prototype.newId = function() {
	let newId;
	this.update(this.id, game =>
		game.update('id', id => {
			newId = id;
			return id + 1;
		}),
	);
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
		this.update(this.id, game =>
			game.updateIn(['bonusstats', 'time'], time => Date.now() - time),
		);
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
	'urdeck',
]);
Game.prototype.addData = function(data) {
	for (const key in data) {
		if (!blacklist.has(key)) {
			const p1or2 = key.match(/^p(1|2)/);
			if (p1or2) {
				this.set(this[`player${p1or2[1]}Id`], key.slice(2), data[key]);
			} else {
				this.props = this.props.setIn([this.id, 'data', key], data[key]);
			}
		}
	}
};
function removeSoPa(p) {
	if (p) p.setStatus('patience', 0);
}
Game.prototype.expectedDamage = function() {
	const expectedDamage = new Int16Array(2);
	if (!this.winner) {
		const disable = Effect.disable;
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
			gclone.byId(gclone.turn).endturn();
			if (!gclone.winner) gclone.byId(gclone.turn).endturn();
			expectedDamage[0] += this.player1.hp - gclone.player1.hp;
			expectedDamage[1] += this.player2.hp - gclone.player2.hp;
		}
		Effect.disable = disable;
		expectedDamage[0] = (expectedDamage[0] / 3) | 0;
		expectedDamage[1] = (expectedDamage[1] / 3) | 0;
	}
	return expectedDamage;
};
Game.prototype.targetFilter = function(src, active) {
	const targetingFilter = Cards.Targeting[active.name[0]];
	return (
		targetingFilter &&
		(t =>
			(t.type === etg.Player ||
				t.type === etg.Spell ||
				t.ownerId === this.turn ||
				t.getStatus('cloak') ||
				!t.owner.isCloaked()) &&
			targetingFilter(src, t))
	);
};

var etg = require('./etg');
var Cards = require('./Cards');
var Effect = require('./Effect');
var Player = require('./Player');
var Thing = require('./Thing');

import Rng from 'rng.js';
import * as imm from './immutable.js';

import * as etg from './etg.js';
import Effect from './Effect.js';
import * as Cards from './Cards.js';
import Player from './Player.js';
import Thing from './Thing.js';

export default function Game(data) {
	const { seed } = data,
		rng = new Rng(seed, ~seed);
	this.props = new imm.Map().set(
		1,
		new imm.Map({
			id: 2,
			phase: 0,
			turn: 2,
			players: new imm.List(),
			bonusstats: new imm.Map({
				ply: 0,
				cardsplayed: new imm.Map(),
				creaturesplaced: new imm.Map(),
				creatureskilled: new imm.Map(),
				time: Date.now(),
				replay: new imm.List(),
			}),
			data: new imm.Map(data),
			rng: rng.getStateCount(),
		}),
	);
	this.cache = new Map([[this.id, this]]);
	this.effects = [];
	for (let i = 0; i < data.players.length; i++) {
		const id = this.newId();
		this.cache.set(id, new Player(this, id));
		this.players = this.players.push(id);
	}
	for (let i = 0; i < data.players.length; i++) {
		const id = this.players.get(i);
		this.byId(id).init(
			this.players.get((i + 1) % data.players.length),
			data.players[i],
		);
	}
}
Game.prototype.id = 1;

function defineProp(key) {
	Object.defineProperty(Game.prototype, key, {
		get() {
			return this.get(this.id, key);
		},
		set(val) {
			this.set(this.id, key, val);
		},
	});
}
defineProp('players');
defineProp('phase');
defineProp('bonusstats');
defineProp('data');
defineProp('turn');
defineProp('winner');

Game.prototype.clone = function() {
	const obj = Object.create(Game.prototype);
	obj.props = this.props.delete('bonusstats');
	obj.cache = new Map([[this.id, obj]]);
	obj.effects = null;
	for (const id of this.players) {
		obj.cache.set(id, new Player(obj, id));
	}
	return obj;
};
Game.prototype.rng = function() {
	const seed = this.data.get('seed');
	let val;
	this.updateIn([this.id, 'rng'], rng => {
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
Game.prototype.byId = function(id) {
	if (!id) return null;
	let inst = this.cache.get(id);
	if (!inst) {
		inst = new Thing(this, id);
		this.cache.set(id, inst);
	}
	return inst;
};
Game.prototype.byUser = function(name) {
	const pldata = this.data.get('players');
	for (let i = 0; i < pldata.length; i++) {
		if (pldata[i].user === name) {
			return this.byId(this.players.get(i));
		}
	}
	return null;
};
Game.prototype.newId = function() {
	const newId = this.props.get(this.id).get('id');
	this.set(this.id, 'id', newId + 1);
	return newId;
};
Game.prototype.newThing = function(card, owner) {
	return new Thing(this, this.newId()).init(card, owner);
};
Game.prototype.get = function(...args) {
	return this.props.getIn(args);
};
Game.prototype.set = function(id, key, val) {
	const ent = this.props.get(id) || new imm.Map();
	this.props = this.props.set(id, ent.set(key, val));
};
Game.prototype.setIn = function(path, val) {
	this.props = this.props.setIn(path, val);
};
Game.prototype.getStatus = function(id, key) {
	return this.props
		.get(id)
		.get('status')
		.get(key, 0);
};
Game.prototype.setStatus = function(id, key, val) {
	this.props = this.props.setIn([id, 'status', key], val | 0);
};
Game.prototype.update = function(id, func) {
	this.props = this.props.update(id, func);
};
Game.prototype.updateIn = function(path, func) {
	this.props = this.props.updateIn(path, func);
};
Game.prototype.cloneInstance = function(inst, ownerId) {
	const newId = this.newId();
	this.props = this.props.set(
		newId,
		this.props.get(inst.id).set('owner', ownerId),
	);
	return this.byId(newId);
};
Game.prototype.nextPlayer = function(id) {
	let next = false;
	for (const pl of this.players) {
		if (next) return pl;
		if (pl === id) next = true;
	}
	return this.players.get(0);
};
Game.prototype.setWinner = function(id) {
	if (!this.winner) {
		this.winner = id;
		this.phase = etg.EndPhase;
		this.updateIn([this.id, 'bonusstats', 'time'], time => Date.now() - time);
	}
};
const nextHandler = {
	end({ t }) {
		this.byId(this.turn).endturn(t);
	},
	cast({ c, t }) {
		this.byId(c).useactive(t && this.byId(t));
	},
	accept(_data) {
		if (this.phase === etg.MulliganPhase) {
			this.turn = this.get(this.turn, 'foe');
			if (this.turn === 2) {
				this.phase = etg.PlayPhase;
			}
		}
	},
	mulligan(_data) {
		const pl = this.byId(this.turn);
		pl.drawhand(pl.handIds.length - 1);
	},
	resign(data) {
		this.setWinner(this.get(data.c, 'foe'));
	},
};
Game.prototype.next = function(event) {
	if (this.bonusstats) {
		this.updateIn([this.id, 'bonusstats', 'replay'], replay =>
			replay.push(event),
		);
	}
	return nextHandler[event.x].call(this, event);
};
function removeSoPa(id) {
	if (id && this.get(id, 'status', 'patience')) {
		this.setIn([id, 'status', 'patience'], 0);
	}
}
Game.prototype.expectedDamage = function() {
	const expectedDamage = new Int16Array(this.players.size);
	if (!this.winner) {
		const disable = Effect.disable;
		Effect.disable = true;
		for (let i = 0; i < 5; i++) {
			const gclone = this.clone();
			gclone.players.forEach(pid =>
				gclone.get(pid, 'permanents').forEach(removeSoPa, gclone),
			);
			gclone.updateIn([gclone.id, 'rng'], rng => rng.map(ri => ri ^ (i * 997)));
			gclone.byId(gclone.turn).endturn();
			if (!gclone.winner) gclone.byId(gclone.turn).endturn();
			this.players.forEach((id, i) => {
				expectedDamage[i] += this.get(id, 'hp') - gclone.get(id, 'hp');
			});
		}
		Effect.disable = disable;
		for (let i = 0; i < expectedDamage.length; i++) {
			expectedDamage[i] /= 5;
		}
	}
	return expectedDamage;
};
Game.prototype.targetFilter = function(src, active) {
	const targetingFilter = Cards.Targeting[active.castName];
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
Game.prototype.effect = function(effect) {
	if (!Effect.disable && this.effects) this.effects.push(effect);
};

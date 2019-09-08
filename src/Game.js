import RngModule from './rng.js';
const Rng = RngModule.exports;
import * as imm from './immutable.js';

import * as etg from './etg.js';
import Effect from './Effect.js';
import OriginalCards from './vanilla/Cards.js';
import StandardCards from './Cards.js';
import Player from './Player.js';
import Thing from './Thing.js';

export default function Game(data) {
	const { seed } = data;
	Rng.initState(seed);
	this.props = new imm.Map().set(
		1,
		new imm.Map({
			id: 2,
			Cards: data.set === 'Original' ? OriginalCards : StandardCards,
			phase: data.set === 'Original' ? etg.PlayPhase : etg.MulliganPhase,
			turn: 2,
			players: [],
			bonusstats: new imm.Map({
				ply: 0,
				cardsplayed: new Map(),
				creaturesplaced: new Map(),
				creatureskilled: new Map(),
				time: Date.now(),
				replay: [],
			}),
			data: data,
			rng: [
				Rng.getStateLoLo(),
				Rng.getStateLoHi(),
				Rng.getStateHiLo(),
				Rng.getStateHiHi(),
			],
		}),
	);
	this.cache = new Map([[this.id, this]]);
	this.effects = [];
	const players = [];
	const playersByIdx = new Map();
	for (let i = 0; i < data.players.length; i++) {
		const id = this.newId(),
			pdata = data.players[i];
		players.push(id);
		playersByIdx.set(pdata.idx, id);
		this.cache.set(id, new Player(this, id));
	}
	for (let i = 0; i < players.length; i++) {
		const pdata = data.players[i];
		this.set(
			players[i],
			'leader',
			playersByIdx.get(pdata.leader === undefined ? pdata.idx : pdata.leader),
		);
	}
	this.players = players;
	for (let i = 0; i < players.length; i++) {
		this.byId(players[i]).init(data.players[i]);
	}
}
Game.prototype.id = 1;

function defineProp(key) {
	Object.defineProperty(Game.prototype, key, {
		get() {
			return this.get(this.id).get(key);
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
defineProp('Cards');

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
	let val;
	this.updateIn([this.id, 'rng'], rng => {
		Rng.setState(...rng);
		val = Rng.next();
		return [
			Rng.getStateLoLo(),
			Rng.getStateLoHi(),
			Rng.getStateHiLo(),
			Rng.getStateHiHi(),
		];
	});
	return val;
};
Game.prototype.upto = function(x) {
	return (this.rng() * x) | 0;
};
Game.prototype.choose = function(x) {
	return x[this.upto(x.length)];
};
Game.prototype.randomcard = function(upped, filter) {
	const keys = this.Cards.filter(upped, filter);
	return keys && keys.length && this.choose(keys);
};
Game.prototype.shuffle = function(array) {
	let counter = array.length;
	while (counter) {
		const index = this.upto(counter--),
			temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}
	return array;
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
	const pldata = this.data.players;
	for (let i = 0; i < pldata.length; i++) {
		if (pldata[i].user === name) {
			return this.byId(this.players[i]);
		}
	}
	return null;
};
Game.prototype.playerDataByIdx = function(idx) {
	const pldata = this.data.players;
	for (let i = 0; i < pldata.length; i++) {
		if (pldata[i].idx === idx) {
			return pldata;
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
	const id = this.newId(),
		inst = new Thing(this, id);
	this.cache.set(id, inst);
	return inst.init(card, owner);
};
Game.prototype.get = function(key) {
	return this.props.get(key);
};
Game.prototype.set = function(id, key, val) {
	const ent = this.props.get(id) || new imm.Map();
	this.props = this.props.set(id, ent.set(key, val));
};
Game.prototype.setIn = function(path, val) {
	this.props = this.props.setIn(path, val);
};
Game.prototype.getStatus = function(id, key) {
	return (
		this.props
			.get(id)
			.get('status')
			.get(key) | 0
	);
};
Game.prototype.setStatus = function(id, key, val) {
	this.props = this.props.setIn([id, 'status', key], val | 0);
};
Game.prototype.trigger = function(id, name, t, param) {
	const a = this.props
		.get(id)
		.get('active')
		.get(name);
	return a ? a.func(this, this.byId(id), t, param) : 0;
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
	const { players } = this,
		idx = players.indexOf(id);
	for (let i = 1; i < players.length; i++) {
		const pidx = (idx + i) % players.length;
		if (!this.get(players[pidx]).get('out')) {
			return players[pidx];
		}
	}
	return id;
};
Game.prototype.nextTurn = function() {
	for (;;) {
		const { turn } = this,
			next = this.byId(this.nextPlayer(turn));
		if (next.id !== turn) {
			const poison = next.getStatus('poison');
			if (poison) next.dmg(poison);
			next.maybeDecrStatus('sosa');
			next.setStatus('nova', 0);
			next.setStatus('sanctuary', 0);
			next.setStatus('precognition', 0);
			for (let i = next.drawpower; i > 0; i--) {
				next.drawcard(true);
			}
			this.set(this.id, 'turn', next.id);
			next.proc('turnstart');
			if (this.get(next.id).get('resigned')) {
				next.die();
				continue;
			}
		} else {
			this.setIn([this.id, 'bonusstats', 'nomidturn'], true);
		}
		return;
	}
};
Game.prototype.setWinner = function() {
	if (!this.winner) {
		const pldata = this.data.players,
			{ players } = this;
		const winners = new Set();
		for (let i = 0; i < players.length; i++) {
			if (!this.get(players[i]).get('out')) {
				winners.add(this.get(players[i]).get('leader'));
			}
		}
		if (winners.size === 1) {
			for (const id of winners) {
				this.winner = id;
			}
			this.phase = etg.EndPhase;
			this.updateIn([this.id, 'bonusstats', 'time'], time => Date.now() - time);
		}
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
			this.turn = this.get(this.turn).get('foe');
			if (this.turn === 2) {
				this.phase = etg.PlayPhase;
			}
		}
	},
	mulligan(_data) {
		const pl = this.byId(this.turn);
		pl.drawhand(pl.handIds.length - 1);
	},
	foe(data) {
		this.set(this.turn, 'foe', data.t);
	},
	resign(data) {
		if (this.turn === data.c) {
			this.byId(data.c).die();
			this.nextTurn();
		}
		const { players } = this;
		let left = new Set();
		for (let i = 0; i < players.length; i++) {
			if (players[i] !== data.c && !this.get(players[i]).get('out')) {
				left.add(players[i].leader || i);
			}
		}
		if (left.size === 1) {
			this.byId(data.c).die();
		} else {
			this.set(data.c, 'resigned', true);
		}
	},
};
Game.prototype.next = function(event) {
	if (this.bonusstats) {
		this.updateIn([this.id, 'bonusstats', 'replay'], replay =>
			replay.concat([event]),
		);
	}
	return nextHandler[event.x].call(this, event);
};
Game.prototype.expectedDamage = function() {
	const expectedDamage = new Int16Array(this.players.length);
	if (!this.winner) {
		const disable = Effect.disable;
		Effect.disable = true;
		for (let i = 0; i < 5; i++) {
			const gclone = this.clone();
			for (const pid of gclone.players) {
				for (const id of gclone.get(pid).get('permanents')) {
					if (id && gclone.getStatus(id, 'patience')) {
						gclone.byId(id).remove();
					}
				}
			}
			gclone.updateIn([gclone.id, 'rng'], rng => rng.map(ri => ri ^ (i * 997)));
			gclone.byId(gclone.turn).endturn();
			if (!gclone.winner) gclone.byId(gclone.turn).endturn();
			this.players.forEach((id, i) => {
				expectedDamage[i] += this.get(id).get('hp') - gclone.get(id).get('hp');
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
	const targetingFilter = this.Cards.Targeting[active.castName];
	return (
		targetingFilter &&
		(t =>
			((t.type === etg.Player && !t.out) ||
				(~t.getIndex() &&
					(t.ownerId === this.turn ||
						(t.type !== etg.Spell && t.getStatus('cloak')) ||
						!t.owner.isCloaked()))) &&
			targetingFilter(src, t))
	);
};
Game.prototype.effect = function(effect) {
	if (!Effect.disable && this.effects) this.effects.push(effect);
};

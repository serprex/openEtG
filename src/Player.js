import * as imm from './immutable.js';
import Thing from './Thing.js';
import * as etg from './etg.js';
import * as etgutil from './etgutil.js';

export default function Player(game, id) {
	if (!id || typeof id !== 'number') throw new Error(`Invalid id: ${id}`);
	this.game = game;
	this.id = id;
	this.cache = new WeakMap();
}

Player.prototype = Object.create(Thing.prototype);

function assertIds(val) {
	for (let i = 0; i < val.length; i++) {
		if (val[i] && typeof val[i] !== 'number') {
			throw new Error('Invalid id');
		}
	}
}

Object.defineProperty(Player.prototype, 'ownerId', {
	get() {
		return this.id;
	},
});
Object.defineProperty(Player.prototype, 'owner', {
	get() {
		return this;
	},
});
Object.defineProperty(Player.prototype, 'foeId', {
	get() {
		return this.game.get(this.id).get('foe');
	},
	set(val) {
		this.game.set(this.id, 'foe', val);
	},
});
Object.defineProperty(Player.prototype, 'foe', {
	get() {
		return this.game.byId(this.foeId);
	},
});
Object.defineProperty(Player.prototype, 'leader', {
	get() {
		return this.game.get(this.id).get('leader');
	},
});
Object.defineProperty(Player.prototype, 'type', {
	get() {
		return etg.Player;
	},
});
Object.defineProperty(Player.prototype, 'weaponId', {
	get() {
		return this.game.get(this.id).get('weapon');
	},
	set(val) {
		this.game.set(this.id, 'weapon', val);
	},
});
Object.defineProperty(Player.prototype, 'shieldId', {
	get() {
		return this.game.get(this.id).get('shield');
	},
	set(val) {
		this.game.set(this.id, 'shield', val);
	},
});
Object.defineProperty(Player.prototype, 'weapon', {
	get() {
		return this.game.byId(this.game.get(this.id).get('weapon'));
	},
});
Object.defineProperty(Player.prototype, 'shield', {
	get() {
		return this.game.byId(this.game.get(this.id).get('shield'));
	},
});
Object.defineProperty(Player.prototype, 'creatureIds', {
	get() {
		return this.game.get(this.id).get('creatures');
	},
	set(val) {
		assertIds(val);
		this.game.set(this.id, 'creatures', val);
	},
});
Object.defineProperty(Player.prototype, 'permanentIds', {
	get() {
		return this.game.get(this.id).get('permanents');
	},
	set(val) {
		assertIds(val);
		this.game.set(this.id, 'permanents', val);
	},
});
Object.defineProperty(Player.prototype, 'handIds', {
	get() {
		return this.game.get(this.id).get('hand');
	},
	set(val) {
		assertIds(val);
		this.game.set(this.id, 'hand', val);
	},
});
Object.defineProperty(Player.prototype, 'deckIds', {
	get() {
		return this.game.get(this.id).get('deck');
	},
	set(val) {
		assertIds(val);
		this.game.set(this.id, 'deck', val);
	},
});
Object.defineProperty(Player.prototype, 'data', {
	get() {
		return this.game.data.players[this.getIndex()];
	},
});

function defineInstArray(key) {
	Object.defineProperty(Player.prototype, key, {
		get() {
			const ids = this.game.get(this.id).get(key),
				cache = this.cache.get(ids);
			if (cache) return cache;
			const a = Array.from(ids, this.game.byId, this.game);
			this.cache.set(ids, a);
			return a;
		},
	});
}
defineInstArray('creatures');
defineInstArray('permanents');
defineInstArray('hand');
defineInstArray('deck');

function defineProp(key) {
	Object.defineProperty(Player.prototype, key, {
		get() {
			return this.game.get(this.id).get(key);
		},
		set(val) {
			this.game.set(this.id, key, val);
		},
	});
}
defineProp('status');
defineProp('maxhp');
defineProp('hp');
defineProp('atk');
defineProp('active');
defineProp('gpull');
defineProp('quanta');
defineProp('deckpower');
defineProp('drawpower');
defineProp('markpower');
defineProp('mark');
defineProp('shardgolem');
defineProp('out');
defineProp('resigning');

Player.prototype.init = function(data) {
	this.game.set(this.id, 'type', etg.Player);
	this.game.set(this.id, 'owner', this.id);
	const lead = this.game.get(this.id).get('leader');
	const idx = this.getIndex();
	for (let i = 1; i < this.game.players.length; i++) {
		const pidx = (idx + i) % this.game.players.length,
			pid = this.game.players[pidx],
			plead = this.game.get(pid).get('leader');
		if (plead !== lead) {
			this.game.set(this.id, 'foe', pid);
			break;
		}
	}
	this.hp = data.hp || 100;
	this.maxhp = data.maxhp || this.hp;
	this.atk = 0;
	this.status = new imm.Map();
	this.active = new imm.Map();
	this.creatureIds = new Uint32Array(23);
	this.permanentIds = new Uint32Array(16);
	this.handIds = [];
	this.quanta = new Int8Array(13);
	this.drawpower = data.drawpower === undefined ? 1 : data.drawpower;
	this.deckpower = data.deckpower || (this.drawpower > 1 ? 2 : 1);
	this.markpower = data.markpower === undefined ? 1 : data.markpower;
	this.mark = 0;
	this.shardgolem = null;
	this.out = false;
	const deck = [];
	for (const code of etgutil.iterdeck(data.deck)) {
		let idx;
		if (code in this.game.Cards.Codes) {
			deck.push(this.game.Cards.Codes[code]);
		} else if (~(idx = etgutil.fromTrueMark(code))) {
			this.mark = idx;
		}
	}
	this.deckIds = this.instantiateDeck(deck);
	this.drawhand(7);
	if (this.game.Cards.Names.Relic && !this.hand.some(c => !c.cost)) {
		const deckIds = this.deckIds.concat(this.handIds);
		const toHand2 = deckIds.splice(0, x);
		this.deckIds = deckIds;
		for (let i = 0; i < 7; i++) {
			this.addCard(toHand2[i]);
		}
	}
	return this;
};
Player.prototype.instantiateDeck = function(deck) {
	const res = [],
		{ deckpower } = this;
	for (let i = 0; i < deckpower; i++) {
		for (let j = 0; j < deck.length; j++) {
			res.push(this.newThing(deck[j]).id);
		}
	}
	return res;
};
Player.prototype.isCloaked = function() {
	return this.permanentIds.some(pr => pr && this.game.getStatus(pr, 'cloak'));
};
Player.prototype.place = function(prop, item) {
	let a = this.game.get(this.id).get(prop);
	for (let i = 0; i < a.length; i++) {
		if (!a[i]) {
			a = new Uint32Array(a);
			a[i] = item;
			this.game.set(this.id, prop, a);
			return i;
		}
	}
	return -1;
};
Player.prototype.newThing = function(card) {
	return this.game.newThing(card, this.id);
};
Player.prototype.addCrea = function(x, fromhand) {
	if (typeof x === 'number') x = this.game.byId(x);
	if (~this.place('creatures', x.id)) {
		if (fromhand && this.game.bonusstats) {
			this.game.updateIn(
				[this.game.id, 'bonusstats', 'creaturesplaced'],
				creaturesplaced =>
					new Map(creaturesplaced).set(
						this.id,
						(creaturesplaced.get(this.id) | 0) + 1,
					),
			);
		}
		x.place(this, etg.Creature, fromhand);
	}
};
Player.prototype.setCrea = function(idx, id) {
	const creatures = new Uint32Array(this.game.get(this.id).get('creatures'));
	creatures[idx] = id;
	this.game.set(this.id, 'creatures', creatures);
	this.game.byId(id).place(this, etg.Creature, false);
};
Player.prototype.addPerm = function(x, fromhand) {
	if (typeof x === 'number') x = this.game.byId(x);
	if (x.getStatus('additive')) {
		const dullcode = etgutil.asShiny(x.card.code, false),
			perms = this.permanents;
		for (let i = 0; i < 16; i++) {
			const pr = perms[i];
			if (pr && etgutil.asShiny(pr.card.code, false) === dullcode) {
				pr.incrStatus('charges', x.getStatus('charges'));
				pr.place(this, etg.Permanent, fromhand);
				this.game.effect({ x: 'EndPos', id: x.id, tgt: pr.id });
				return;
			}
		}
	}
	if (~this.place('permanents', x.id)) {
		x.place(this, etg.Permanent, fromhand);
	}
};
Player.prototype.setWeapon = function(x, fromhand) {
	if (typeof x === 'number') x = this.game.byId(x);
	this.weaponId = x.id;
	x.place(this, etg.Weapon, fromhand);
};
Player.prototype.setShield = function(x, fromhand) {
	if (typeof x === 'number') x = this.game.byId(x);
	if (
		x.getStatus('additive') &&
		this.shield &&
		x.card.as(this.shield.card) === x.card
	) {
		this.shield.incrStatus('charges', x.getStatus('charges'));
	} else this.shieldId = x.id;
	x.place(this, etg.Shield, fromhand);
};
Player.prototype.addCard = function(x) {
	if (this.handIds.length < 8) {
		if (typeof x === 'number') x = this.game.byId(x);
		x.ownerId = this.id;
		x.type = etg.Spell;
		const hand = Array.from(this.game.get(this.id).get('hand'));
		hand.push(x.id);
		this.game.set(this.id, 'hand', hand);
		return hand.length - 1;
	}
	return -1;
};
Player.prototype.forEach = function(func, dohand) {
	func(this.weapon);
	func(this.shield);
	this.creatures.forEach(func);
	this.permanents.forEach(func);
	if (dohand) this.hand.forEach(func);
};
function plinfocore(info, key, val) {
	if (val === true) info.push(key);
	else if (val) info.push(val + key);
}
Player.prototype.info = function() {
	const info = [`${this.hp}/${this.maxhp} ${this.deckIds.length}cards`];
	for (const [k, v] of this.status) {
		plinfocore(info, k, v);
	}
	plinfocore(info, 'usedactive', this.usedactive);
	if (this.gpull) info.push('gpull');
	return info.join('\n');
};
function randomquanta(ctx, quanta) {
	if (ctx.Cards.Names.Relic) {
		const q = [];
		for (let i = 1; i < 13; i++) {
			if (quanta[i]) q.push(i);
		}
		return q.length ? ctx.choose(q) : -1;
	}
	let nonzero = 0;
	for (let i = 1; i < 13; i++) {
		nonzero += quanta[i];
	}
	if (nonzero === 0) {
		return -1;
	}
	nonzero = ctx.upto(nonzero) + 1;
	for (let i = 1; i < 13; i++) {
		if ((nonzero -= quanta[i]) <= 0) {
			return i;
		}
	}
}
Player.prototype.canspend = function(qtype, x) {
	if (x <= 0) return true;
	if (qtype) return this.quanta[qtype] >= x;
	for (let i = 1; i < 13; i++) x -= this.quanta[i];
	return x <= 0;
};
Player.prototype.spend = function(qtype, x, scramble) {
	if (x === 0 || (!scramble && x < 0 && this.getStatus('flatline')))
		return true;
	if (!this.canspend(qtype, x)) return false;
	const quanta = new Int8Array(this.game.get(this.id).get('quanta'));
	if (!qtype) {
		const b = x < 0 ? -1 : 1;
		for (let i = x * b; i > 0; i--) {
			const q =
				b === -1 ? 1 + this.game.upto(12) : randomquanta(this.game, quanta);
			quanta[q] = Math.min(quanta[q] - b, 99);
		}
	} else quanta[qtype] = Math.min(quanta[qtype] - x, 99);
	this.game.set(this.id, 'quanta', quanta);
	return true;
};
Player.prototype.setQuanta = function(qtype, val = 0) {
	const quanta = new Int8Array(this.game.get(this.id).get('quanta'));
	quanta[qtype] = val;
	this.game.set(this.id, 'quanta', quanta);
};
Player.prototype.countcreatures = function() {
	return this.creatureIds.reduce((count, cr) => count + !!cr, 0);
};
Player.prototype.countpermanents = function() {
	return this.permanentIds.reduce((count, pr) => count + !!pr, 0);
};
Player.prototype.endturn = function(discard) {
	if (this.game.bonusstats) {
		this.game.updateIn([this.game.id, 'bonusstats', 'ply'], (x = 0) => x + 1);
	}
	if (discard) {
		this.game.byId(discard).die();
	}
	if (this.game.Cards.Names.Relic) {
		this.v_endturn(discard);
	} else {
		this.o_endturn(discard);
	}
	this.game.nextTurn();
};
Player.prototype.o_endturn = function(discard) {
	this.spend(this.mark, this.markpower * (this.mark > 0 ? -1 : -3));
	let patienceFlag = false,
		floodingFlag = false,
		floodingPaidFlag = false,
		permanents = this.permanents,
		foepermanentIds = this.foe.permanentIds;
	for (let i = 0; i < 16; i++) {
		const p = permanents[i];
		if (p) {
			p.trigger('ownattack');
			if (~p.getIndex()) {
				p.usedactive = false;
				if (p.getStatus('flooding') && !floodingPaidFlag) {
					floodingPaidFlag = true;
					floodingFlag = true;
					if (!this.spend(etg.Water, 1)) {
						p.die();
					}
				}
				if (p.getStatus('patience')) {
					patienceFlag = true;
				}
				p.maybeDecrStatus('frozen');
			}
		}
		const fp = foepermanentIds[i];
		if (fp && this.game.getStatus(fp, 'flooding')) {
			floodingFlag = true;
		}
	}
	this.creatures.forEach((cr, i) => {
		if (cr) {
			if (patienceFlag) {
				const floodbuff = floodingFlag && i > 4;
				cr.incrAtk(floodbuff ? 5 : cr.getStatus('burrowed') ? 4 : 2);
				cr.buffhp(floodbuff ? 2 : 1);
			}
			cr.attack(undefined, true);
			if (
				floodingFlag &&
				!cr.getStatus('aquatic') &&
				cr.isMaterial() &&
				cr.getIndex() > 4
			) {
				cr.die();
			}
		}
	});
	if (this.shieldId) {
		this.game.set(this.shieldId, 'usedactive', false);
		this.game.trigger(this.shieldId, 'ownattack');
	}
	if (this.weaponId) this.weapon.attack(undefined, true);
	this.usedactive = false;
	this.setStatus('flatline', 0);
};
Player.prototype.v_endturn = function(discard) {
	this.spend(this.mark, this.markpower * (this.mark > 0 ? -1 : -3));
	const poison = this.foe.getStatus('poison');
	if (poison) this.foe.dmg(poison);
	var patienceFlag = false,
		floodingFlag = false,
		stasisFlag = false,
		freedomChance = 0;
	for (var i = 0; i < 16; i++) {
		var p;
		if ((p = this.permanents[i])) {
			if (~p.getIndex()) {
				p.casts = 1;
				if (p.status.get('stasis') && p.status.get('charges') > 0) {
					stasisFlag = true;
				} else if (p.status.get('flooding')) {
					floodingFlag = true;
				} else if (p.status.get('patience')) {
					patienceFlag = true;
				} else if (p.status.get('freedom')) {
					freedomChance += p.status.get('charges') * 0.25;
				}
			}
		}
		if ((p = this.foe.permanents[i])) {
			if (p.status.get('stasis')) {
				stasisFlag = true;
			} else if (p.status.get('flooding')) {
				floodingFlag = true;
			}
		}
	}
	this.creatures.forEach((cr, i) => {
		if (cr) {
			if (patienceFlag) {
				const floodbuff =
					floodingFlag && i > 4 && cr.card.element == etg.Water ? 5 : 2;
				cr.atk += floodbuff;
				cr.buffhp(floodbuff);
				if (!cr.getStatus('delayed')) cr.delay(1);
			}
			cr.v_attack(stasisFlag, Math.min(freedomChance, 1));
			if (
				i > 4 &&
				floodingFlag &&
				cr.card.element != etg.Water &&
				cr.card.element &&
				!cr.status.get('immaterial') &&
				!cr.status.get('burrowed') &&
				~cr.getIndex()
			) {
				cr.die();
			}
		}
	});
	this.foe.creatures.forEach((cr, i) => {
		if (cr) {
			if (cr.getStatus('salvaged')) {
				cr.setStatus('salvaged', 0);
			}
			if (
				cr.active.get('cast') &&
				cr.active.get('cast').castName === 'v_dshield'
			) {
				cr.setStatus('immaterial', 0);
				cr.setStatus('psion', 0);
			}
		}
	});
	for (const p of this.permanents) {
		if (p) p.trigger('ownattack');
	}
	if (this.shieldId) {
		this.shield.casts = 1;
		this.game.trigger(this.shieldId, 'ownattack');
	}
	if (this.weaponId) this.weapon.attack();
	if (this.foe.sosa > 0) {
		this.foe.sosa--;
	}
	this.nova = this.nova2 = 0;
	for (
		var i = this.foe.drawpower !== undefined ? this.foe.drawpower : 1;
		i > 0;
		i--
	) {
		this.foe.drawcard();
	}

	this.silence = false;
	this.foe.precognition = this.foe.sanctuary = false;
};
Player.prototype.die = function() {
	this.out = true;
	this.game.setWinner();
};
Player.prototype.deckpush = function(...args) {
	this.game.updateIn([this.id, 'deck'], deck => deck.concat(args));
};
Player.prototype._draw = function() {
	const { deckIds } = this;
	if (deckIds.length === 0) {
		this.die();
		return 0;
	} else if (deckIds.length === 1) {
		this.game.effect({ x: 'LastCard', id: this.id });
	}
	const id = deckIds[deckIds.length - 1];
	this.deckIds = deckIds.slice(0, -1);
	return id;
};
Player.prototype.drawcard = function(drawstep) {
	if (this.handIds.length < 8) {
		const id = this._draw();
		if (id && ~this.addCard(id)) {
			this.game.effect({ x: 'StartPos', id, src: -1 });
			this.proc('draw', drawstep);
		}
	}
};
Player.prototype.drawhand = function(x) {
	for (const id of this.handIds) {
		this.game.effect({ x: 'EndPos', id, tgt: -1 });
	}
	const deckIds = this.game.shuffle(this.deckIds.concat(this.handIds));
	this.handIds = [];
	const toHand = deckIds.splice(0, x);
	this.deckIds = deckIds;
	for (let i = 0; i < toHand.length; i++) {
		this.game.effect({ x: 'StartPos', id: toHand[i], src: -1 });
		this.addCard(toHand[i]);
	}
};
function destroyCloak(id) {
	if (id && this.getStatus(id, 'cloak')) {
		this.byId(id).die();
	}
}
Player.prototype.masscc = function(caster, func, massmass) {
	this.permanentIds.forEach(destroyCloak, this.game);
	if (massmass) this.foe.permanentIds.forEach(destroyCloak, this.game);
	const crs = this.creatures,
		crsfoe = massmass && this.foe.creatures;
	for (let i = 0; i < 23; i++) {
		if (crs[i] && crs[i].isMaterial()) {
			func(this.game, caster, crs[i]);
		}
		if (crsfoe && crsfoe[i] && crsfoe[i].isMaterial()) {
			func(this.game, caster, crsfoe[i]);
		}
	}
};
Player.prototype.delay = function(x) {
	if (this.weaponId) this.weapon.delay(x);
};
Player.prototype.freeze = function(x) {
	if (this.weaponId) this.weapon.freeze(x);
};
Player.prototype.dmg = function(x) {
	if (!x) return 0;
	const sosa = this.getStatus('sosa');
	if (sosa) {
		x *= -1;
	}
	if (x < 0) {
		const heal = Math.max(this.hp - this.maxhp, x);
		this.hp -= heal;
		return sosa ? -x : heal;
	} else {
		this.hp -= x;
		if (this.hp <= 0) {
			this.die();
		}
		return sosa ? -x : x;
	}
};
Player.prototype.spelldmg = function(x) {
	return (this.shieldId && this.game.getStatus(this.shieldId, 'reflective')
		? this.foe
		: this
	).dmg(x);
};

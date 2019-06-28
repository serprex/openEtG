'use strict';
const imm = require('immutable');
function Player(game, id) {
	if (!id || typeof id !== 'number') throw new Error(`Invalid id: ${id}`);
	this.game = game;
	this.id = id;
	this.cache = new WeakMap();
}

module.exports = Player;
const Thing = require('./Thing');
Player.prototype = Object.create(Thing.prototype);

function assertIds(val) {
	for (let i = 0; i < val.length; i++) {
		if (val[i] && typeof val[i] !== 'number') {
			throw new Error('Invalid id');
		}
	}
}

Object.defineProperty(Player.prototype, 'ownerId', {
	get: function() {
		return this.id;
	},
});
Object.defineProperty(Player.prototype, 'owner', {
	get: function() {
		return this;
	},
});
Object.defineProperty(Player.prototype, 'foeId', {
	get: function() {
		return this.game.get(this.id, 'foe');
	},
	set: function(val) {
		this.game.set(this.id, 'foe', val);
	},
});
Object.defineProperty(Player.prototype, 'foe', {
	get: function() {
		return new Player(this.game, this.game.get(this.id, 'foe'));
	},
});
Object.defineProperty(Player.prototype, 'type', {
	get: function() {
		return etg.Player;
	},
});
Object.defineProperty(Player.prototype, 'weaponId', {
	get: function() {
		return this.game.get(this.id, 'weapon');
	},
	set: function(val) {
		this.game.set(this.id, 'weapon', val);
	},
});
Object.defineProperty(Player.prototype, 'shieldId', {
	get: function() {
		return this.game.get(this.id, 'shield');
	},
	set: function(val) {
		this.game.set(this.id, 'shield', val);
	},
});
Object.defineProperty(Player.prototype, 'weapon', {
	get: function() {
		return this.game.byId(this.game.get(this.id, 'weapon'));
	},
});
Object.defineProperty(Player.prototype, 'shield', {
	get: function() {
		return this.game.byId(this.game.get(this.id, 'shield'));
	},
});
Object.defineProperty(Player.prototype, 'creatureIds', {
	get: function() {
		return this.game.get(this.id, 'creatures');
	},
	set: function(val) {
		assertIds(val);
		this.game.set(this.id, 'creatures', val);
	},
});
Object.defineProperty(Player.prototype, 'permanentIds', {
	get: function() {
		return this.game.get(this.id, 'permanents');
	},
	set: function(val) {
		assertIds(val);
		this.game.set(this.id, 'permanents', val);
	},
});
Object.defineProperty(Player.prototype, 'handIds', {
	get: function() {
		return this.game.get(this.id, 'hand');
	},
	set: function(val) {
		assertIds(val);
		this.game.set(this.id, 'hand', val);
	},
});
Object.defineProperty(Player.prototype, 'deckIds', {
	get: function() {
		return this.game.get(this.id, 'deck');
	},
	set: function(val) {
		assertIds(val);
		this.game.set(this.id, 'deck', val);
	},
});

function defineInstArray(key) {
	Object.defineProperty(Player.prototype, key, {
		get: function() {
			const ids = this.game.get(this.id, key),
				cache = this.cache.get(ids);
			if (cache) return cache;
			const a = Object.freeze(Array.from(ids, this.game.byId, this.game));
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
		get: function() {
			return this.game.get(this.id, key);
		},
		set: function(val) {
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

Player.prototype.init = function() {
	this.game.set(this.id, 'type', etg.Player);
	this.maxhp = this.hp = 100;
	this.atk = 0;
	this.status = new imm.Map();
	this.active = new imm.Map();
	this.creatureIds = new Uint32Array(23);
	this.permanentIds = new Uint32Array(16);
	this.handIds = [];
	this.deckIds = [];
	this.quanta = new Int8Array(13);
	this.deckpower = 1;
	this.drawpower = 1;
	this.markpower = 1;
	this.mark = 0;
	this.shardgolem = null;
	return this;
};
Player.prototype.toString = function() {
	return this.id === this.game.player1Id ? 'p1' : 'p2';
};
Player.prototype.isCloaked = function() {
	return this.permanents.some(pr => pr && pr.getStatus('cloak'));
};
Player.prototype.place = function(prop, item) {
	let a = this.game.get(this.id, prop);
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
	const inst = this.game.newThing(card);
	inst.ownerId = this.id;
	return inst;
};
Player.prototype.addCrea = function(x, fromhand) {
	if (typeof x === 'number') x = this.game.byId(x);
	if (~this.place('creatures', x.id)) {
		if (fromhand && this.game.bonusstats && this.id === this.game.player1Id) {
			this.game.updateIn(
				[this.game.id, 'bonusstats', 'creaturesplaced'],
				(x = 0) => x + 1,
			);
		}
		x.place(this, etg.Creature, fromhand);
	}
};
Player.prototype.setCrea = function(idx, id) {
	const creatures = new Uint32Array(this.game.get(this.id, 'creatures'));
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
Player.prototype.addCardInstance = function(x) {
	if (this.handIds.length < 8) {
		if (typeof x === 'number') x = this.game.byId(x);
		x.ownerId = this.id;
		x.type = etg.Spell;
		const hand = Array.from(this.game.get(this.id, 'hand'));
		hand.push(x.id);
		this.game.set(this.id, 'hand', hand);
	}
};
Player.prototype.addCard = function(card) {
	this.addCardInstance(this.newThing(card));
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
	const quanta = new Int8Array(this.game.get(this.id, 'quanta'));
	if (!qtype) {
		const b = x < 0 ? -1 : 1;
		for (let i = x * b; i > 0; i--) {
			const q = b === -1 ? 1 + this.upto(12) : randomquanta(this.game, quanta);
			quanta[q] = Math.min(quanta[q] - b, 99);
		}
	} else quanta[qtype] = Math.min(quanta[qtype] - x, 99);
	this.game.set(this.id, 'quanta', quanta);
	return true;
};
Player.prototype.setQuanta = function(qtype, val = 0) {
	const quanta = new Int8Array(this.game.get(this.id, 'quanta'));
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
	this.spend(this.mark, this.markpower * (this.mark > 0 ? -1 : -3));
	const poison = this.foe.getStatus('poison');
	if (poison) this.foe.dmg(poison);
	let patienceFlag = false,
		floodingFlag = false,
		floodingPaidFlag = false;
	for (let i = 0; i < 16; i++) {
		let p;
		if ((p = this.permanents[i])) {
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
		if ((p = this.foe.permanents[i])) {
			if (p.getStatus('flooding')) {
				floodingFlag = true;
			}
		}
	}
	this.creatures.forEach((cr, i) => {
		if (cr) {
			if (patienceFlag) {
				const floodbuff = floodingFlag && i > 4;
				cr.atk += floodbuff ? 5 : cr.getStatus('burrowed') ? 4 : 2;
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
	if (this.shield) {
		this.shield.usedactive = false;
		this.shield.trigger('ownattack');
	}
	if (this.weapon) this.weapon.attack(undefined, true);
	this.usedactive = false;
	this.foe.maybeDecrStatus('sosa');
	this.foe.setStatus('nova', 0);
	this.foe.setStatus('sanctuary', 0);
	this.foe.setStatus('flatline', 0);
	this.foe.setStatus('precognition', 0);
	for (let i = this.foe.drawpower; i > 0; i--) {
		this.foe.drawcard(true);
	}
	this.game.set(this.game.id, 'turn', this.foe.id);
	this.foe.proc('turnstart');
};
Player.prototype.deckpush = function(...args) {
	this.game.updateIn([this.id, 'deck'], deck => deck.concat(args));
};
Player.prototype._draw = function() {
	const deckIds = this.deckIds;
	const id = deckIds[deckIds.length - 1];
	this.deckIds = deckIds.slice(0, -1);
	return id;
};
Player.prototype.drawcard = function(drawstep) {
	if (this.handIds.length < 8) {
		if (this.deckIds.length > 0) {
			if (~this.addCardInstance(this._draw())) {
				this.proc('draw', drawstep);
				if (
					this.deckIds.length === 0 &&
					this.game.player1Id === this.id &&
					!Effect.disable
				)
					Effect.mkSpriteFadeText('Last card!', { x: 450, y: 300 });
			}
		} else this.game.setWinner(this.foeId);
	}
};
Player.prototype.drawhand = function(x) {
	const deckIds = this.shuffle(this.deckIds.concat(this.handIds));
	this.handIds = [];
	if (x > deckIds.length) x = deckIds.length;
	const toHand = deckIds.splice(0, x);
	this.deckIds = deckIds;
	for (let i = 0; i < toHand.length; i++) {
		this.addCardInstance(toHand[i]);
	}
};
function destroyCloak(id) {
	if (id && this.props.getIn([id, 'status', 'cloak'], 0)) {
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
Player.prototype.dmg = function(x, ignoresosa) {
	if (!x) return 0;
	const sosa = this.getStatus('sosa') && !ignoresosa;
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
			this.game.setWinner(this.foeId);
		}
		return sosa ? -x : x;
	}
};
Player.prototype.spelldmg = function(x) {
	return (this.shield && this.shield.getStatus('reflective')
		? this.foe
		: this
	).dmg(x);
};

var etg = require('./etg');
var util = require('./util');
var etgutil = require('./etgutil');
var Effect = require('./Effect');

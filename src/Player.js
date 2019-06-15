'use strict';
const imm = require('immutable');
function Player(game, id) {
	if (!id) throw new Error("id cannot be 0");
	this.game = game;
	this.id = id;
}

module.exports = Player;
const Thing = require('./Thing');
Player.prototype = Object.create(Thing.prototype);

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
	}
});
Object.defineProperty(Player.prototype, 'foe', {
	get: function() {
		return new Player(this.game, this.game.get(this.id, 'foe'));
	}
});
Object.defineProperty(Player.prototype, 'type', {
	get: function() {
		return etg.Player;
	}
});
Object.defineProperty(Player.prototype, 'weaponId', {
	get: function() {
		return this.game.get(this.id, 'weapon');
	},
	set: function(val) {
		this.game.set(this.id, 'weapon', val);
	}
});
Object.defineProperty(Player.prototype, 'shieldId', {
	get: function() {
		return this.game.get(this.id, 'shield');
	},
	set: function(val) {
		this.game.set(this.id, 'shield', val);
	}
});
Object.defineProperty(Player.prototype, 'weapon', {
	get: function() {
		return new Thing(this.game, this.game.get(this.id, 'weapon'));
	}
});
Object.defineProperty(Player.prototype, 'shield', {
	get: function() {
		return new Thing(this.game, this.game.get(this.id, 'shield'));
	}
});
Object.defineProperty(Player.prototype, 'creatureIds', {
	get: function() {
		return this.game.get(this.id, 'creatures');
	},
	set: function(val){
		this.game.set(this.id, 'creatures', val);
	}
});
Object.defineProperty(Player.prototype, 'creatures', {
	get: function() {
		return Object.freeze(Array.from(this.creatureIds, id => new Thing(this.game, id)));
	}
});
Object.defineProperty(Player.prototype, 'permanentIds', {
	get: function() {
		return this.game.get(this.id, 'permanents');
	},
	set: function(val){
		this.game.set(this.id, 'permanents', val);
	}
});
Object.defineProperty(Player.prototype, 'permanents', {
	get: function() {
		return Object.freeze(Array.from(this.permanentIds, id => new Thing(this.game, id)));
	}
});
Object.defineProperty(Player.prototype, 'handIds', {
	get: function() {
		return this.game.get(this.id, 'hand');
	},
	set: function(val){
		this.game.set(this.id, 'hand', val);
	}
});
Object.defineProperty(Player.prototype, 'hand', {
	get: function() {
		return Object.freeze(Array.from(this.handIds, id => new Thing(this.game, id)));
	}
});

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
defineProp('sosa');
defineProp('sanctuary');
defineProp('precognition');
defineProp('nova');
defineProp('deckpower');
defineProp('drawpower');
defineProp('markpower');
defineProp('mark');
defineProp('shardgolem');

Player.prototype.init = function() {
	this.maxhp = this.hp = 100;
	this.atk = 0;
	this.status = new imm.Map();
	this.active = new imm.Map();
	this.creatures = new Array(23);
	this.permanents = new Array(16);
	this.hand = [];
	this.deck = [];
	this.quanta = new Int8Array(13);
	this.sosa = 0;
	this.sanctuary = false;
	this.precognition = false;
	this.nova = 0;
	this.deckpower = 1;
	this.drawpower = 1;
	this.markpower = 1;
	this.mark = 0;
	this.shardgolem = null;
	return this;
};
Player.prototype.toString = function() {
	return this == this.game.player1 ? 'p1' : 'p2';
};
Player.prototype.isCloaked = function() {
	return this.permanents.some(pr => pr && pr.getStatus('cloak'));
};
Player.prototype.place = function(prop, item) {
	let a = this.game.get(this.id, prop);
	for (let i=0; i<a.length; i++) {
		if (!a[i]) {
			a = Array.from(a);
			a[i] = item;
			this.game.set(this.id, prop, a);
			return i;
		}
	}
	return -1;
}
Player.prototype.addCrea = function(x, fromhand) {
	if (~this.place('creatures', x.id)) {
		if (fromhand && this.game.bonusstats != null && this == this.game.player1){
			this.game.update(this.game.id, game => game.updateIn(['bonusstats', 'creaturesplaced'], x => (x|0)+1));
		}
		x.place(this, etg.Creature, fromhand);
	}
};
Player.prototype.setCrea = function(idx, x) {
	const creatures = Array.from(this.game.get(this.id, 'creatures'));
	creatures[idx] = c;
	this.game.set(this.id, 'creatures', creatures);
	x.place(this, etg.Creature, false);
};
Player.prototype.addPerm = function(x, fromhand) {
	if (x.getStatus('additive')) {
		const dullcode = etgutil.asShiny(x.card.code, false);
		for (let i = 0; i < 16; i++) {
			if (
				this.permanents[i] &&
				etgutil.asShiny(this.permanents[i].card.code, false) == dullcode
			) {
				this.permanents[i].incrStatus('charges', x.getStatus('charges'));
				this.permanents[i].place(this, etg.Permanent, fromhand);
				return;
			}
		}
	}
	if (this.place('permanents', x.id)) {
		x.place(this, etg.Permanent, fromhand);
	}
};
Player.prototype.setWeapon = function(x, fromhand) {
	this.weapon = x;
	x.place(this, etg.Weapon, fromhand);
};
Player.prototype.setShield = function(x, fromhand) {
	if (
		x.getStatus('additive') &&
		this.shield &&
		x.card.as(this.shield.card) == x.card
	) {
		this.shield.incrStatus('charges', x.getStatus('charges'));
	} else this.shield = x;
	x.place(this, etg.Shield, fromhand);
};
Player.prototype.addCardInstance = function(x) {
	if (this.hand.length < 8) {
		x.owner = this;
		x.type = etg.Spell;
		const hand = Array.from(this.game.get(this.id, 'hand'));
		hand.push(x);
		this.game.set(this.id, 'hand', hand);
	}
};
Player.prototype.addCard = function(card) {
	this.addCardInstance(this.game.newThing(card));
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
	const info = [`${this.hp}/${this.maxhp} ${this.deck.length}cards`];
	for (const [k, v] of this.status) {
		plinfocore(info, k, v);
	}
	[
		'nova',
		'neuro',
		'sosa',
		'usedactive',
		'sanctuary',
		'flatline',
		'precognition',
	].forEach(key => {
		plinfocore(info, key, this[key]);
	});
	if (this.gpull) info.push('gpull');
	return info.join('\n');
};
Player.prototype.randomquanta = function() {
	let nonzero = 0;
	for (let i = 1; i < 13; i++) {
		nonzero += this.quanta[i];
	}
	if (nonzero == 0) {
		return -1;
	}
	nonzero = 1 + this.upto(nonzero);
	for (let i = 1; i < 13; i++) {
		if ((nonzero -= this.quanta[i]) <= 0) {
			return i;
		}
	}
};
Player.prototype.canspend = function(qtype, x) {
	if (x <= 0) return true;
	if (qtype) return this.quanta[qtype] >= x;
	for (let i = 1; i < 13; i++) x -= this.quanta[i];
	return x <= 0;
};
Player.prototype.spend = function(qtype, x, scramble) {
	if (x == 0 || (!scramble && x < 0 && this.getStatus('flatline'))) return true;
	if (!this.canspend(qtype, x)) return false;
	const quanta = new Int8Array(this.game.get(this.id, 'quanta'));
	if (!qtype) {
		const b = x < 0 ? -1 : 1;
		for (let i = x * b; i > 0; i--) {
			const q = b == -1 ? 1 + this.upto(12) : this.randomquanta();
			quanta[q] = Math.min(quanta[q] - b, 99);
		}
	} else quanta[qtype] = Math.min(quanta[qtype] - x, 99);
	this.game.set(this.id, 'quanta', quanta);
	return true;
};
Player.prototype.zeroQuanta = function(qtype) {
	const quanta = new Int8Array(this.game.get(this.id, 'quanta'));
	quanta[qtype] = 0;
	this.game.set(this.id, 'quanta', quanta);
}
Player.prototype.countcreatures = function() {
	return this.creatures.reduce((count, cr) => count + !!cr, 0);
};
Player.prototype.countpermanents = function() {
	return this.permanents.reduce((count, pr) => count + !!pr, 0);
};
Player.prototype.endturn = function(discard) {
	this.game.update(this.game.id, game => game.updateIn(['bonusstats', 'ply'], x => (x|0)+1));
	if (discard != undefined) {
		this.hand[discard].die();
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
						this.permanents[i].die();
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
	this.creatures.slice().forEach((cr, i) => {
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
	if (this.foe.sosa > 0) {
		this.foe.sosa--;
	}
	this.nova = 0;
	this.flatline = this.usedactive = false;
	this.foe.precognition = this.foe.sanctuary = false;
	for (let i = this.foe.drawpower; i > 0; i--) {
		this.foe.drawcard(true);
	}
	this.game.set(this.game.id, 'turn', this.foe.id);
	this.foe.proc('turnstart');
	this.game.updateExpectedDamage();
};
Player.prototype.drawcard = function(drawstep) {
	if (this.hand.length < 8) {
		if (this.deck.length > 0) {
			if (~this.addCardInstance(this.deck.pop())) {
				this.proc('draw', drawstep);
				if (
					this.deck.length == 0 &&
					this.game.player1 == this &&
					!Effect.disable
				)
					Effect.mkSpriteFadeText('Last card!', { x: 450, y: 300 });
			}
		} else this.game.setWinner(this.foe);
	}
};
Player.prototype.drawhand = function(x) {
	this.deck.push(...this.hand);
	this.hand.length = 0;
	this.shuffle(this.deck);
	if (x > this.deck.length) x = deck.length;
	for (let i = 0; i < x; i++) {
		this.addCardInstance(this.deck.pop());
	}
};
function destroyCloak(pr) {
	if (pr && pr.getStatus('cloak')) pr.die();
}
Player.prototype.masscc = function(caster, func, massmass) {
	this.permanents.forEach(destroyCloak);
	if (massmass) this.foe.permanents.forEach(destroyCloak);
	const crs = this.creatures.slice(),
		crsfoe = massmass && this.foe.creatures.slice();
	for (let i = 0; i < 23; i++) {
		if (crs[i] && crs[i].isMaterial()) {
			func(caster, crs[i]);
		}
		if (crsfoe && crsfoe[i] && crsfoe[i].isMaterial()) {
			func(caster, crsfoe[i]);
		}
	}
};
Player.prototype.delay = function(x) {
	if (this.weapon) this.weapon.delay(x);
};
Player.prototype.freeze = function(x) {
	if (this.weapon) this.weapon.freeze(x);
};
Player.prototype.dmg = function(x, ignoresosa) {
	if (!x) return 0;
	const sosa = this.sosa && !ignoresosa;
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
			this.game.setWinner(this.foe);
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

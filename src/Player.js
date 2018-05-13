'use strict';
const imm = require('immutable');
function Player(game) {
	this.owner = this;
	this.card = null;
	this.cast = 0;
	this.castele = 0;
	this.maxhp = this.hp = 100;
	this.atk = 0;
	this.status = new imm.Map();
	this.usedactive = false;
	this.type = etg.Player;
	this.active = new imm.Map();
	this.game = game;
	this.shield = undefined;
	this.weapon = undefined;
	this.creatures = new Array(23);
	this.permanents = new Array(16);
	this.gpull = undefined;
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
	this.shardgolem = undefined;
}
module.exports = Player;
const Thing = require('./Thing');
Player.prototype = Object.create(Thing.prototype);

Player.prototype.toString = function() {
	return this == this.game.player1 ? 'p1' : 'p2';
};
Player.prototype.isCloaked = function() {
	return this.permanents.some(pr => pr && pr.getStatus('cloak'));
};
Player.prototype.addCrea = function(x, fromhand) {
	if (util.place(this.creatures, x)) {
		if (fromhand && this.game.bonusstats != null && this == this.game.player1)
			this.game.bonusstats.creaturesplaced++;
		x.place(this, etg.Creature, fromhand);
	}
};
Player.prototype.setCrea = function(idx, x) {
	this.creatures[idx] = x;
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
	if (util.place(this.permanents, x)) {
		x.place(this, etg.Permanent, fromhand);
	}
};
Player.prototype.setWeapon = function(x, fromhand) {
	this.owner.weapon = x;
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
		this.hand.push(x);
	}
};
Player.prototype.addCard = function(card) {
	this.addCardInstance(new Thing(card));
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
	const info = [this.hp + '/' + this.maxhp + ' ' + this.deck.length + 'cards'];
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
	if (x == 0 || (!scramble && x < 0 && this.flatline)) return true;
	if (!this.canspend(qtype, x)) return false;
	if (!qtype) {
		const b = x < 0 ? -1 : 1;
		for (let i = x * b; i > 0; i--) {
			const q = b == -1 ? 1 + this.upto(12) : this.randomquanta();
			this.quanta[q] = Math.min(this.quanta[q] - b, 99);
		}
	} else this.quanta[qtype] = Math.min(this.quanta[qtype] - x, 99);
	return true;
};
Player.prototype.countcreatures = function() {
	return this.creatures.reduce((count, cr) => count + !!cr, 0);
};
Player.prototype.countpermanents = function() {
	return this.permanents.reduce((count, pr) => count + !!pr, 0);
};
Player.prototype.endturn = function(discard) {
	this.game.ply++;
	if (discard != undefined) {
		this.hand[discard].die();
	}
	this.spend(this.mark, this.markpower * (this.mark > 0 ? -1 : -3));
	const poison = this.foe.getStatus('poison');
	if (poison) this.foe.dmg(poison);
	let patienceFlag = false,
		floodingFlag = false,
		stasisFlag = false,
		floodingPaidFlag = false,
		freedomChance = 0;
	for (let i = 0; i < 16; i++) {
		let p;
		if ((p = this.permanents[i])) {
			p.trigger('auto');
			if (~p.getIndex()) {
				p.usedactive = false;
				if (p.getStatus('stasis')) {
					stasisFlag = true;
				}
				if (p.getStatus('flooding') && !floodingPaidFlag) {
					floodingPaidFlag = true;
					floodingFlag = true;
					if (!this.spend(etg.Water, 1)) {
						this.permanents[i] = undefined;
					}
				}
				if (p.getStatus('patience')) {
					patienceFlag = true;
					stasisFlag = true;
				}
				if (p.getStatus('freedom')) {
					freedomChance++;
				}
				p.maybeDecrStatus('frozen');
			}
		}
		if ((p = this.foe.permanents[i])) {
			if (p.getStatus('stasis')) {
				stasisFlag = true;
			} else if (p.getStatus('flooding')) {
				floodingFlag = true;
			}
		}
	}
	if (freedomChance) {
		freedomChance = 1 - Math.pow(0.7, freedomChance);
	}
	this.creatures.slice().forEach((cr, i) => {
		if (cr) {
			if (patienceFlag) {
				const floodbuff = floodingFlag && i > 4;
				cr.atk += floodbuff ? 5 : cr.getStatus('burrowed') ? 4 : 2;
				cr.buffhp(floodbuff ? 2 : 1);
			}
			cr.attack(stasisFlag, freedomChance);
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
		this.shield.trigger('auto');
	}
	if (this.weapon) this.weapon.attack();
	if (this.foe.sosa > 0) {
		this.foe.sosa--;
	}
	this.nova = 0;
	this.flatline = this.usedactive = false;
	this.foe.precognition = this.foe.sanctuary = false;
	for (let i = this.foe.drawpower; i > 0; i--) {
		this.foe.drawcard(true);
	}
	this.game.turn = this.foe;
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
Player.prototype.clone = function(game) {
	const obj = Object.create(Player.prototype);
	function maybeClone(x) {
		return x && x.clone(obj);
	}
	obj.owner = obj;
	obj.card = this.card;
	obj.cast = this.cast;
	obj.castele = this.castele;
	obj.hp = this.hp;
	obj.maxhp = this.maxhp;
	obj.atk = this.atk;
	obj.status = this.status;
	obj.usedactive = this.usedactive;
	obj.type = this.type;
	obj.active = this.active;
	obj.game = game;
	obj.shield = maybeClone(this.shield);
	obj.weapon = maybeClone(this.weapon);
	obj.creatures = this.creatures.map(maybeClone);
	obj.permanents = this.permanents.map(maybeClone);
	obj.gpull = this.gpull && obj.creatures[this.gpull.getIndex()];
	obj.hand = this.hand.map(maybeClone);
	obj.deck = this.deck.map(maybeClone);
	obj.quanta = new Int8Array(this.quanta);
	obj.sosa = this.sosa;
	obj.sanctuary = this.sanctuary;
	obj.precognition = this.precognition;
	obj.nova = this.nova;
	obj.deckpower = this.deckpower;
	obj.drawpower = this.drawpower;
	obj.markpower = this.markpower;
	obj.mark = this.mark;
	obj.shardgolem = this.shardgolem;
	return obj;
};
Player.prototype.hash = function() {
	return this == this.game.player1 ? 0 : 0x7fffffff;
};

var etg = require('./etg');
var util = require('./util');
var etgutil = require('./etgutil');
var Effect = require('./Effect');

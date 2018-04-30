'use strict';
const passives = new Set([
	'airborne',
	'aquatic',
	'nocturnal',
	'voodoo',
	'swarm',
	'ranged',
	'additive',
	'stackable',
	'token',
	'poisonous',
	'golem',
]);
function Thing(card) {
	this.owner = null;
	this.card = card;
	this.cast = card.cast;
	this.castele = card.castele;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.status = card.status;
	this.usedactive = true;
	this.type = 0;
	this.active = card.active;
}
module.exports = Thing;

Thing.prototype.toString = function() {
	return this.card.name;
};
Thing.prototype.transform = function(card) {
	this.card = card;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.status = this.status.filter((_v, k) => !passives.has(k));
	for (const [key, val] of card.status) {
		if (!this.getStatus(key)) this.status = this.status.set(key, val);
	}
	this.active = card.active;
	if (this.status.get('mutant')) {
		const buff = this.upto(25);
		this.buffhp(Math.floor(buff / 5));
		this.atk += buff % 5;
		this.mutantactive();
	} else {
		this.cast = card.cast;
		this.castele = card.castele;
	}
};
Thing.prototype.getIndex = function() {
	return this.type == etg.Weapon
		? this.owner.weapon == this ? 0 : -1
		: this.type == etg.Shield
			? this.owner.shield == this ? 0 : -1
			: (this.type == etg.Creature
					? this.owner.creatures
					: this.type == etg.Permanent ? this.owner.permanents : this.owner.hand
				).indexOf(this);
};
Thing.prototype.remove = function(index) {
	if (this.type == etg.Weapon) {
		if (this.owner.weapon != this) return -1;
		this.owner.weapon = undefined;
		return 0;
	}
	if (this.type == etg.Shield) {
		if (this.owner.shield != this) return -1;
		this.owner.shield = undefined;
		return 0;
	}
	if (index === undefined) index = this.getIndex();
	let arr = undefined;
	if (this.type == etg.Creature) {
		if (this.owner.gpull == this) this.owner.gpull = undefined;
		arr = this.owner.creatures;
	} else if (this.type == etg.Permanent) {
		arr = this.owner.permanents;
	}
	if (arr != undefined) {
		arr[index] = undefined;
	} else if (this.type == etg.Spell && ~index) {
		this.owner.hand.splice(index, 1);
	}
	return index;
};
Thing.prototype.die = function() {
	const idx = this.remove();
	if (idx == -1) return;
	if (this.type <= etg.Permanent) {
		this.proc('destroy', {});
	} else if (this.type == etg.Spell) {
		this.proc('discard');
	} else if (this.type == etg.Creature && !this.trigger('predeath')) {
		if (this.status.get('aflatoxin') & !this.card.isOf(Cards.MalignantCell)) {
			const cell = (this.owner.creatures[idx] = new Thing(
				this.card.as(Cards.MalignantCell),
			));
			cell.owner = this.owner;
			cell.type = etg.Creature;
		}
		if (
			this.owner.game.bonusstats != null &&
			this.owner == this.owner.game.player2
		)
			this.owner.game.bonusstats.creatureskilled++;
		this.deatheffect(idx);
	}
};
Thing.prototype.deatheffect = function(index) {
	const data = { index: index };
	this.proc('death', data);
	if (~index)
		Effect.mkDeath(
			ui.creaturePos(this.owner == this.owner.game.player1 ? 0 : 1, index),
		);
};
Thing.prototype.clone = function(owner) {
	const obj = Object.create(Thing.prototype);
	obj.owner = owner;
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
	return obj;
};
Thing.prototype.hash = function() {
	let hash =
		(this.owner == this.owner.game.player1 ? 17 : 19) ^
		(this.type * 0x8888888) ^
		(this.card.code & 0x3fff) ^
		this.status.hashCode() ^
		(this.hp * 17 + this.atk * 31 - this.maxhp - this.usedactive * 3);
	for (const [k, v] of this.active) {
		hash ^= util.hashString(k + ':' + v.name.join(' '));
	}
	if (this.active.has('cast')) {
		hash ^= (this.castele | (this.cast << 16)) * 7;
	}
	return hash & 0x7ffffff;
};
Thing.prototype.trigger = function(name, t, param) {
	const a = this.active.get(name);
	return a ? a.func(this, t, param) : 0;
};
Thing.prototype.proc = function(name, param) {
	function proc(c) {
		if (c) c.trigger(name, this, param);
	}
	if (this.active) {
		this.trigger('own' + name, this, param);
	}
	for (let i = 0; i < 2; i++) {
		const pl = i == 0 ? this.owner : this.owner.foe;
		pl.creatures.forEach(proc, this);
		pl.permanents.forEach(proc, this);
		proc.call(this, pl.shield);
		proc.call(this, pl.weapon);
	}
};
Thing.prototype.calcCore = function(prefix, filterstat) {
	if (!prefix(this)) return 0;
	for (let j = 0; j < 2; j++) {
		const pl = j == 0 ? this.owner : this.owner.foe;
		if (pl.permanents.some(pr => pr && pr.status.get(filterstat))) return 1;
	}
	return 0;
};
Thing.prototype.calcCore2 = function(prefix, filterstat) {
	if (!prefix(this)) return 0;
	let bonus = 0;
	for (let j = 0; j < 2; j++) {
		let pl = j == 0 ? this.owner : this.owner.foe,
			pr;
		for (let i = 0; i < 16; i++) {
			if ((pr = pl.permanents[i]) && pr.status.get(filterstat)) {
				if (pr.card.upped) return 2;
				else bonus = 1;
			}
		}
	}
	return bonus;
};
function isEclipseCandidate(c) {
	return c.status.get('nocturnal') && c.type == etg.Creature;
}
function isWhetCandidate(c) {
	return (
		c.status.get('golem') ||
		c.type == etg.Weapon ||
		(c.type != etg.Player && c.card.type == etg.Weapon)
	);
}
Thing.prototype.calcBonusAtk = function() {
	return (
		this.calcCore2(isEclipseCandidate, 'nightfall') +
		this.calcCore(isWhetCandidate, 'whetstone')
	);
};
Thing.prototype.calcBonusHp = function() {
	return (
		this.calcCore(isEclipseCandidate, 'nightfall') +
		this.calcCore2(isWhetCandidate, 'whetstone') +
		this.trigger('hp')
	);
};
Thing.prototype.info = function() {
	const info =
		this.type == etg.Creature
			? this.trueatk() + '|' + this.truehp() + '/' + this.maxhp
			: this.type == etg.Weapon
				? this.trueatk().toString()
				: this.type == etg.Shield ? this.truedr().toString() : '';
	const stext = skillText(this);
	return !info ? stext : stext ? info + '\n' + stext : info;
};
const activetexts = [
	'hit',
	'death',
	'owndeath',
	'buff',
	'destroy',
	'draw',
	'play',
	'spell',
	'dmg',
	'shield',
	'postauto',
];
Thing.prototype.activetext = function() {
	const acast = this.active.get('cast');
	if (acast)
		return this.cast + ':' + this.castele + acast.name[0];
	for (const akey of activetexts) {
		const a = this.active.get(akey);
		if (a) return akey + ' ' + a.name.join(' ');
	}
	const aauto = this.active.get('auto');
	return aauto ? aauto.name.join(' ') : '';
};
Thing.prototype.place = function(owner, type, fromhand) {
	this.owner = owner;
	this.type = type;
	this.proc('play', fromhand);
};
Thing.prototype.dmg = function(x, dontdie) {
	if (!x) return 0;
	else if (this.type == etg.Weapon) return x < 0 ? 0 : this.owner.dmg(x);
	else {
		const dmg =
			x < 0 ? Math.max(this.hp - this.maxhp, x) : Math.min(this.truehp(), x);
		this.hp -= dmg;
		this.proc('dmg', dmg);
		if (this.truehp() <= 0) {
			if (!dontdie) this.die();
		} else if (dmg > 0 && this.status.get('voodoo')) this.owner.foe.dmg(x);
		return dmg;
	}
};
Thing.prototype.spelldmg = function(x, dontdie) {
	return this.trigger('spelldmg', undefined, x) ? 0 : this.dmg(x, dontdie);
};
Thing.prototype.addpoison = function(x) {
	if (this.type == etg.Weapon) this.owner.addpoison(x);
	else if (!this.active.has('ownpoison') || this.trigger('ownpoison')) {
		this.incrStatus('poison', x);
		if (this.status.get('voodoo')) {
			this.owner.foe.addpoison(x);
		}
	}
};
Thing.prototype.delay = function(x) {
	this.incrStatus('delayed', x);
	if (this.status.get('voodoo')) this.owner.foe.delay(x);
};
Thing.prototype.freeze = function(x) {
	if (!this.active.has('ownfreeze') || this.trigger('ownfreeze')) {
		Effect.mkText('Freeze', this);
		if (x > this.getStatus('frozen')) this.setStatus('frozen', x);
		if (this.status.get('voodoo')) this.owner.foe.freeze(x);
	}
};
Thing.prototype.lobo = function() {
	for (const [k, v] of this.active) {
		v.name.forEach(name => {
			if (!parseSkill(name).passive) {
				this.rmactive(k, name);
			}
		});
	}
};
const mutantabilities = [
	'hatch',
	'freeze',
	'burrow',
	'destroy',
	'steal',
	'dive',
	'mend',
	'paradox',
	'lycanthropy',
	'growth 1',
	'infect',
	'gpull',
	'devour',
	'mutation',
	'growth 2',
	'ablaze 2',
	'poison 1',
	'deja',
	'endow',
	'guard',
	'mitosis',
];
Thing.prototype.mutantactive = function() {
	this.lobo();
	const index = this.owner.upto(mutantabilities.length + 2) - 2;
	if (index < 0) {
		this.setStatus(['momentum', 'immaterial'][~index], 1);
	} else {
		const active = Skills[mutantabilities[index]];
		if (mutantabilities[index] == 'growth 1') {
			this.addactive('death', active);
		} else {
			this.active = this.active.set('cast', active);
			this.cast = 1 + this.owner.upto(2);
			this.castele = this.card.element;
			return true;
		}
	}
};
Thing.prototype.isMaterial = function(type) {
	return (
		(type == etg.Permanent
			? this.type <= type
			: type ? this.type == type : this.type != etg.Player) &&
		!this.status.get('immaterial') &&
		!this.status.get('burrowed')
	);
};
function combineactive(a1, a2) {
	if (!a1) {
		return a2;
	}
	return {
		func: function(c, t, data) {
			const v1 = a1.func(c, t, data),
				v2 = a2.func(c, t, data);
			return v1 === undefined
				? v2
				: v2 === undefined ? v1 : v1 === true || v2 === true ? true : v1 + v2;
		},
		name: a1.name.concat(a2.name),
	};
}
Thing.prototype.addactive = function(type, active) {
	this.active = this.active.update(type, v => combineactive(v, active));
};
Thing.prototype.getSkill = function(type) {
	return this.active.get(type);
}
Thing.prototype.setSkill = function(type, sk) {
	this.active = this.active.set(type, sk);
}
Thing.prototype.rmactive = function(type, name) {
	const atype = this.active.get(type);
	if (!atype) return;
	const actives = atype.name;
	const idx = actives.indexOf(name);
	if (~idx) {
		this.active = actives.length === 1 ?
			this.active.delete(type) :
			this.active.set(type, actives.reduce(
				(previous, current, i) =>
					i == idx ? previous : combineactive(previous, Skills[current]),
				null,
			));
	}
};
Thing.prototype.hasactive = function(type, name) {
	const atype = this.active.get(type);
	return !!(atype && ~atype.name.indexOf(name));
};
Thing.prototype.canactive = function(spend) {
	if (
		this.owner.game.turn != this.owner ||
		this.owner.game.phase !== etg.PlayPhase
	)
		return false;
	else if (this.type == etg.Spell) {
		return (
			!this.owner.usedactive &&
			this.owner[spend ? 'spend' : 'canspend'](
				this.card.costele,
				this.card.cost,
			)
		);
	} else
		return (
			this.active.has('cast') &&
			!this.usedactive &&
			!this.status.get('delayed') &&
			!this.status.get('frozen') &&
			this.owner.canspend(this.castele, this.cast)
		);
};
Thing.prototype.castSpell = function(tgt, active, nospell) {
	const data = { tgt, active };
	this.proc('prespell', data);
	if (data.evade) {
		if (tgt) Effect.mkText('Evade', tgt);
	} else {
		active.func(this, data.tgt);
		if (!nospell) this.proc('spell', data);
	}
};
Thing.prototype.play = function(tgt, fromhand) {
	const {owner, card} = this;
	this.remove();
	if (card.type == etg.Spell) {
		this.castSpell(tgt, this.active.get('cast'));
	} else {
		audio.playSound(card.type <= etg.Permanent ? 'permPlay' : 'creaturePlay');
		if (card.type == etg.Creature) owner.addCrea(this, fromhand);
		else if (card.type == etg.Permanent || card.type == etg.Pillar)
			owner.addPerm(this, fromhand);
		else if (card.type == etg.Weapon) owner.setWeapon(this, fromhand);
		else owner.setShield(this, fromhand);
	}
};
Thing.prototype.useactive = function(t) {
	const {owner} = this;
	if (this.type == etg.Spell) {
		if (!this.canactive(true)) {
			return console.log(`${owner} cannot cast ${this}`);
		}
		this.remove();
		if (owner.status.get('neuro')) owner.addpoison(1);
		this.play(t, true);
		this.proc('cardplay');
		if (owner.game.bonusstats != null && owner == owner.game.player1)
			owner.game.bonusstats.cardsplayed[this.card.type]++;
	} else if (owner.spend(this.castele, this.cast)) {
		this.usedactive = true;
		if (this.status.get('neuro')) this.addpoison(1);
		this.castSpell(t, this.active.get('cast'));
	}
	owner.game.updateExpectedDamage();
};
Thing.prototype.truedr = function() {
	return this.hp + this.trigger('buff');
};
Thing.prototype.truehp = function() {
	return this.hp + this.calcBonusHp();
};
Thing.prototype.trueatk = function(adrenaline) {
	if (adrenaline === undefined) adrenaline = this.getStatus('adrenaline');
	let dmg = this.atk + this.getStatus('dive') + this.trigger('buff') + this.calcBonusAtk();
	if (this.status.get('burrowed')) dmg = Math.ceil(dmg / 2);
	return etg.calcAdrenaline(adrenaline, dmg);
};
Thing.prototype.attackCreature = function(target, trueatk) {
	if (trueatk === undefined) trueatk = this.trueatk();
	if (trueatk) {
		const dmg = target.dmg(trueatk);
		if (dmg) this.trigger('hit', target, dmg);
		target.trigger('shield', this, { dmg: dmg, blocked: 0 });
	}
};
Thing.prototype.attack = function(stasis, freedomChance, target) {
	const isCreature = this.type === etg.Creature;
	if (isCreature) {
		this.dmg(this.getStatus('poison'), true);
	}
	if (target === undefined)
		target =
			this.active.get('cast') === Skills.appease && !this.status.get('appeased')
				? this.owner
				: this.owner.foe;
	if (!this.status.get('frozen')) {
		this.trigger('auto');
	}
	this.usedactive = false;
	let trueatk;
	if (
		!(stasis || this.status.get('frozen') || this.status.get('delayed')) &&
		(trueatk = this.trueatk())
	) {
		let momentum =
			this.status.get('momentum') ||
			(this.status.get('burrowed') &&
				this.owner.permanents.some(pr => pr && pr.status.get('tunnel')));
		const psionic = this.status.get('psionic');
		if (
			freedomChance &&
			this.status.get('airborne') &&
			this.rng() < freedomChance
		) {
			if (momentum || psionic || (!target.shield && !target.gpull)) {
				trueatk = Math.ceil(trueatk * 1.5);
			} else {
				momentum = true;
			}
		}
		if (psionic) {
			target.spelldmg(trueatk);
		} else if (momentum || trueatk < 0) {
			target.dmg(trueatk);
			this.trigger('hit', target, trueatk);
		} else if (target.gpull) {
			this.attackCreature(target.gpull, trueatk);
		} else {
			const truedr = target.shield
				? Math.min(target.shield.truedr(), trueatk)
				: 0;
			const data = { dmg: trueatk - truedr, blocked: truedr };
			if (target.shield) target.shield.trigger('shield', this, data);
			const dmg = target.dmg(data.dmg);
			if (dmg > 0) this.trigger('hit', target, dmg);
			if (dmg != trueatk) this.trigger('blocked', target.shield, trueatk - dmg);
		}
	}
	const frozen = this.maybeDecrStatus('frozen');
	this.maybeDecrStatus('delayed');
	this.setStatus('dive', 0);
	if (isCreature && ~this.getIndex() && this.truehp() <= 0) {
		this.die();
	} else if (!isCreature || ~this.getIndex()) {
		if (!frozen) this.trigger('postauto');
		const adrenaline = this.getStatus('adrenaline');
		if (adrenaline) {
			if (adrenaline < etg.countAdrenaline(this.trueatk(0))) {
				this.incrStatus('adrenaline', 1);
				this.attack(stasis, freedomChance, target);
			} else {
				this.setStatus('adrenaline', 1);
			}
		}
	}
};
Thing.prototype.rng = function() {
	return this.owner.game.rng.real();
};
Thing.prototype.upto = function(x) {
	return (this.owner.game.rng.rnd() * x) | 0;
};
Thing.prototype.choose = function(x) {
	return x[this.upto(x.length)];
};
Thing.prototype.randomcard = function(upped, filter) {
	const keys = Cards.filter(upped, filter);
	return keys && keys.length && Cards.Codes[this.choose(keys)];
};
Thing.prototype.shuffle = function(array) {
	let counter = array.length,
		temp,
		index;
	while (counter--) {
		index = this.upto(counter) | 0;
		temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}
	return array;
};
Thing.prototype.buffhp = function(x) {
	if (this.type != etg.Weapon) {
		if (this.type == etg.Player && this.maxhp <= 500)
			this.maxhp = Math.min(this.maxhp + x, 500);
		else this.maxhp += x;
	}
	return this.dmg(-x);
};
Thing.prototype.getStatus = function(key) {
	return this.status.get(key) || 0;
}
Thing.prototype.setStatus = function(key, val) {
	this.status = this.status.set(key, val|0);
}
Thing.prototype.clearStatus = function(key, val) {
	this.status = this.status.clear();
}
Thing.prototype.maybeDecrStatus = function(key) {
	const val = this.getStatus(key);
	if (val > 0) this.setStatus(key, val-1);
	return val;
}
Thing.prototype.incrStatus = function(key, val) {
	this.setStatus(key, this.getStatus(key)+val);
};

var ui = require('./ui');
var etg = require('./etg');
var util = require('./util');
var audio = require('./audio');
var Cards = require('./Cards');
var Effect = require('./Effect');
var Skills = require('./Skills');
var skillText = require('./skillText');
var parseSkill = require('./parseSkill');

'use strict';
var ui = require('./ui');
var util = require('../util');
var Cards = require('./Cards');
var Effect = require('./Effect');
var Actives = require('./Skills');
var etgutil = require('../etgutil');
var skillText = require('./skillText');
function Thing(card, owner) {
	this.owner = owner;
	this.card = card;
	if (this.status) {
		for (const key in this.status) {
			if (key in passives) this.status = this.status.delete(key);
		}
		for (const key in card.status) {
			this.status = this.status.set(key, card.status.get(key));
		}
	} else {
		this.status = card.status;
	}
	this.active = card.active.delete('discard');
}
function Creature(card, owner) {
	this.usedactive = 2;
	if (card == Cards.ShardGolem) {
		this.card = card;
		this.owner = owner;
		var golem = owner.shardgolem || { hpStat: 1, atkStat: 1, cast: 0 };
		this.atk = golem.atkStat;
		this.maxhp = this.hp = golem.hpStat;
		this.cast = golem.cast;
		this.castele = Earth;
		this.active = golem.active;
		this.status = golem.status;
	} else this.transform(card, owner);
}
function Permanent(card, owner) {
	this.usedactive = 2;
	this.cast = card.cast;
	this.castele = card.castele;
	Thing.apply(this, arguments);
}
function Weapon(card, owner) {
	this.atk = card.attack;
	Permanent.apply(this, arguments);
}
function Shield(card, owner) {
	this.dr = card.health;
	Permanent.apply(this, arguments);
}
function Pillar(card, owner) {
	this.status = { charges: 1 };
	this.pendstate = false;
	Thing.apply(this, arguments);
}
function CardInstance(card, owner) {
	this.owner = owner;
	this.card = card;
}
Creature.prototype = Object.create(Thing.prototype);
Permanent.prototype = Object.create(Thing.prototype);
Weapon.prototype = Object.create(Permanent.prototype);
Shield.prototype = Object.create(Permanent.prototype);
Pillar.prototype = Object.create(Permanent.prototype);
CardInstance.prototype = Object.create(Thing.prototype);
var Other = 0;
var Entropy = 1;
var Death = 2;
var Gravity = 3;
var Earth = 4;
var Life = 5;
var Fire = 6;
var Water = 7;
var Light = 8;
var Air = 9;
var Time = 10;
var Darkness = 11;
var Aether = 12;
var PillarEnum = 0;
var WeaponEnum = 1;
var ShieldEnum = 2;
var PermanentEnum = 3;
var SpellEnum = 4;
var CreatureEnum = 5;
var PlayPhase = 0;
var EndPhase = 1;
var passives = {
	airborne: true,
	nocturnal: true,
	voodoo: true,
	swarm: true,
	ranged: true,
	additive: true,
	stackable: true,
	salvage: true,
	token: true,
	poisonous: true,
	singularity: true,
	siphon: true,
	mutant: true,
	bounce: true,
};
function combineactive(a1, a2) {
	if (!a1) {
		return a2;
	}
	return {
		func: function(c, t, data) {
			var v1 = a1.func(c, t, data),
				v2 = a2.func(c, t, data);
			return v1 === undefined
				? v2
				: v2 === undefined ? v1 : v1 === true || v2 === true ? true : v1 + v2;
		},
		name: a1.name.concat(a2.name),
	};
}

CardInstance.prototype.clone = function(owner) {
	return new CardInstance(this.card, owner);
};
var thingtypes = [Creature, Permanent, Weapon, Shield, Pillar];
thingtypes.forEach(function(type) {
	var proto = type.prototype;
	proto.clone = function(owner) {
		var obj = Object.create(proto);
		obj.active = this.active;
		obj.status = this.status;
		obj.owner = owner;
		for (var attr in this) {
			if (!(attr in obj) && this.hasOwnProperty(attr)) {
				obj[attr] = this[attr];
			}
		}
		return obj;
	};
});
CardInstance.prototype.hash = function() {
	return (
		(this.card.code << 1) | (this.owner == this.owner.game.player1 ? 1 : 0)
	);
};
function hashObj(obj) {
	var hash = 0xdadac3c3;
	for (var key in obj) {
		hash ^= util.hashString(key + "'" + obj[key]);
	}
	return hash;
}
Creature.prototype.hash = function() {
	var hash = this.owner == this.owner.game.player1 ? 17 : 19;
	hash ^=
		hashObj(this.status) ^
		(this.hp * 17 + this.atk * 31 - this.maxhp - this.usedactive * 3);
	hash ^= this.card.code;
	for (var key in this.active) {
		hash ^= util.hashString(key + ':' + this.active[key].name.join(':'));
	}
	if (this.active.has('cast')) {
		hash ^= this.cast * 7 + this.castele * 23;
	}
	return hash & 0x7fffffff;
};
Permanent.prototype.hash = function() {
	var hash = this.owner == this.owner.game.player1 ? 5351 : 5077;
	hash ^= hashObj(this.status) ^ (this.usedactive * 3);
	hash ^= this.card.code;
	for (var key in this.active) {
		hash ^= util.hashString(key + '=' + this.active[key].name.join(' '));
	}
	if (this.active.has('cast')) {
		hash ^= this.cast * 7 + this.castele * 23;
	}
	return hash & 0x7fffffff;
};
Weapon.prototype.hash = function() {
	var hash = this.owner == this.owner.game.player1 ? 13 : 11;
	hash ^= hashObj(this.status) ^ (this.atk * 31 - this.usedactive * 3);
	hash ^= this.card.code;
	for (var key in this.active) {
		hash ^= util.hashString(key + '-' + this.active[key].name.join(' '));
	}
	if (this.active.has('cast')) {
		hash ^= this.cast * 7 + this.castele * 23;
	}
	return hash & 0x7fffffff;
};
Shield.prototype.hash = function() {
	var hash = this.owner == this.owner.game.player1 ? 5009 : 4259;
	hash ^= hashObj(this.status) ^ (this.dr * 31 - this.usedactive * 3);
	hash ^= this.card.code;
	for (var key in this.active) {
		hash ^= util.hashString(key + '~' + this.active[key].name.join(' '));
	}
	if (this.active.has('cast')) {
		hash ^= this.cast * 7 + this.castele * 23;
	}
	return hash & 0x7fffffff;
};
Thing.prototype.toString = function() {
	return this.card.name;
};
CardInstance.prototype.toString = function() {
	return '::' + this.card.name;
};
Thing.prototype.trigger = function(name, t, param) {
	return this.active[name] ? this.active[name].func(this, t, param) : 0;
};
Thing.prototype.proc = function(name, param) {
	function proc(c) {
		if (c) c.trigger(name, this, param);
	}
	if (this.active) {
		this.trigger('own' + name, this, param);
	}
	for (var i = 0; i < 2; i++) {
		var pl = i == 0 ? this.owner : this.owner.foe;
		pl.creatures.forEach(proc, this);
		pl.permanents.forEach(proc, this);
		proc.call(this, pl.shield);
		proc.call(this, pl.weapon);
	}
};
function infocore(c, info) {
	var stext = skillText(c);
	return stext ? info + '\n' + stext : info;
}
Creature.prototype.info = function() {
	var info = this.trueatk() + '|' + this.truehp() + '/' + this.maxhp;
	if (this.owner.gpull == this) info += '\ngpull';
	return infocore(this, info);
};
Weapon.prototype.info = function() {
	return infocore(this, this.trueatk().toString());
};
Shield.prototype.info = function() {
	return infocore(this, this.dr + 'DR');
};
Pillar.prototype.info = function() {
	return infocore(
		this,
		this.status.charges +
			' 1:' +
			(this.pendstate ? this.owner.mark : this.card.element),
	);
};
Thing.prototype.info = function() {
	return skillText(this);
};
Thing.prototype.activetext = function() {
	if (this.active.has('cast'))
		return casttext(this.cast, this.castele) + this.active.get('cast').name.join(' ');
	var order = [
		'cost',
		'hit',
		'death',
		'owndeath',
		'buff',
		'destroy',
		'draw',
		'dmg',
		'shield',
		'postauto',
	];
	for (var i = 0; i < order.length; i++) {
		if (this.active[order[i]])
			return order[i] + ' ' + this.active[order[i]].name.join(' ');
	}
	return this.active.has('auto') ? this.active.get('auto').name.join(' ') : '';
};
Thing.prototype.place = function(fromhand) {
	this.proc('play', [fromhand]);
};
Creature.prototype.place = function(fromhand) {
	for (var i = 0; i < 23; i++) {
		if (!this.owner.creatures[i] && !this.owner.creatureslots[i]) {
			this.owner.creatures[i] = this;
			break;
		}
	}
	Thing.prototype.place.call(this, fromhand);
};
Permanent.prototype.place = function(fromhand) {
	if (this.status.additive) {
		for (var i = 0; i < 16; i++) {
			if (
				this.owner.permanents[i] &&
				this.card.code == this.owner.permanents[i].card.code
			) {
				this.owner.permanents[i].status.charges += this.status.charges;
				Thing.prototype.place.call(this.owner.permanents[i], fromhand);
				return;
			}
		}
	}
	util.place(this.owner.permanents, this);
	Thing.prototype.place.call(this, fromhand);
};
Pillar.prototype.place = function(fromhand) {
	if (
		this.card.name.match(/^Mark/) &&
		this.card.element == this.owner.mark &&
		!this.card.upped
	) {
		this.owner.markpower++;
		return;
	}
	Permanent.prototype.place.call(this, fromhand);
};
Weapon.prototype.place = function(fromhand) {
	if (
		this.status.additive &&
		this.owner.weapon &&
		this.card.as(this.owner.weapon.card) == this.card
	) {
		this.owner.weapon.status.charges += this.status.charges;
	} else {
		this.owner.weapon = this;
	}
	Thing.prototype.place.call(this, fromhand);
};
Shield.prototype.place = function(fromhand) {
	if (
		this.status.additive &&
		this.owner.shield &&
		this.owner.shield.card.asUpped(this.card.upped) == this.card
	) {
		this.owner.shield.status.charges += this.status.charges;
	} else if (
		this.owner.shield &&
		this.owner.shield.status.durability == 'usable' &&
		this.owner.shield.card != this.card
	) {
		for (var key in this.status) {
			if (!this.owner.shield.status[key])
				this.owner.shield.status[key] = this.status[key];
		}
		for (var key in this.active) {
			this.owner.shield.addactive(key, this.active[key]);
		}
		this.owner.shield.dr += this.dr;
		this.owner.shield.status.durability = 'used';
	} else this.owner.shield = this;
	Thing.prototype.place.call(this, fromhand);
};
CardInstance.prototype.place = function() {
	if (this.owner.hand.length < 8) {
		this.owner.hand.push(this);
	}
};
Weapon.prototype.addpoison = function(x) {
	return this.owner.addpoison(x);
};
Thing.prototype.buffhp = function(x) {
	if (this.type != 6 || this.maxhp < 500) {
		this.maxhp += x;
		if (this.maxhp > 500 && this.type == 6) {
			this.maxhp = 500;
		}
	}
	this.dmg(-x);
};
Weapon.prototype.spelldmg = function(x) {
	return this.owner.spelldmg(x);
};
Weapon.prototype.dmg = function(x) {
	return this.owner.dmg(x);
};
CardInstance.prototype.getIndex = function() {
	return this.owner.hand.indexOf(this);
};
Creature.prototype.getIndex = function() {
	return this.owner.creatures.indexOf(this);
};
Creature.prototype.addpoison = function(x) {
	this.defstatus('poison', 0);
	this.status.set('poison', this.status.get('poison') + x);
	if (this.status.get('voodoo')) {
		this.owner.foe.addpoison(x);
	}
};
Weapon.prototype.buffhp = function() {};
Weapon.prototype.delay = Creature.prototype.delay = function(x) {
	this.defstatus('delayed', 0);
	this.status.set('delayed', this.status.get('delayed') + x);
	if (this.status.get('voodoo')) this.owner.foe.delay(x);
};
Weapon.prototype.freeze = Creature.prototype.freeze = function(x) {
	if (!this.active.has('ownfreeze') || this.active.get('ownfreeze').func(this)) {
		Effect.mkText('Freeze', this);
		this.defstatus('frozen', 0);
		if (x > this.status.get('frozen')) this.status.set('frozen', x);
		if (this.status.get('voodoo')) this.owner.foe.freeze(x);
	}
};
Creature.prototype.spelldmg = Creature.prototype.dmg = function(x, dontdie) {
	if (!x) return 0;
	var dmg =
		x < 0 ? Math.max(this.hp - this.maxhp, x) : Math.min(this.truehp(), x);
	this.hp -= dmg;
	this.proc('dmg', [dmg]);
	if (this.truehp() <= 0) {
		if (!dontdie) this.die();
	} else if (dmg > 0 && this.status.get('voodoo')) this.owner.foe.dmg(x);
	return dmg;
};
Creature.prototype.remove = function(index) {
	if (this.owner.gpull == this) this.owner.gpull = null;
	if (index === undefined) index = this.getIndex();
	if (~index) {
		delete this.owner.creatures[index];
	}
	return index;
};
Permanent.prototype.remove = function(index) {
	if (index === undefined) index = this.getIndex();
	if (~index) {
		delete this.owner.permanents[index];
	}
	return index;
};
CardInstance.prototype.remove = function(index) {
	if (index === undefined) index = this.getIndex();
	if (~index) {
		this.owner.hand.splice(index, 1);
	}
	return index;
};
Creature.prototype.deatheffect = Weapon.prototype.deatheffect = function(
	index,
) {
	this.trigger('death', this, index);
	this.proc('death', [index]);
	if (index >= 0)
		Effect.mkDeath(
			ui.creaturePos(this.owner == this.owner.game.player1 ? 0 : 1, index),
		);
};
Creature.prototype.die = function() {
	var index = this.remove();
	if (~index) {
		if (this.status.aflatoxin && !this.card.isOf(Cards.MalignantCell)) {
			this.owner.creatures[index] = new Creature(
				Cards.MalignantCell,
				this.owner,
			);
		}
		if (!this.trigger('predeath')) {
			this.deatheffect(index);
		}
	}
};
CardInstance.prototype.transform = function(card) {
	this.card = card;
};
Creature.prototype.transform = Weapon.prototype.transform = function(
	card,
	owner,
) {
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.cast = card.cast;
	this.castele = card.castele;
	Thing.call(this, card, owner || this.owner);
	if (this.status.mutant) {
		var buff = this.owner.upto(25);
		this.buffhp(Math.floor(buff / 5));
		this.atk += buff % 5;
		this.mutantactive();
	}
};
Shield.prototype.transform = function(card, owner) {
	Shield.call(this, card, owner || this.owner);
	if (this.status.mutant) {
		this.mutantactive();
	}
};
Permanent.prototype.transform = function(card, owner) {
	Permanent.call(this, card, owner || this.owner);
	if (this.status.mutant) {
		this.mutantactive();
	}
};
Thing.prototype.evade = function(sender) {
	return false;
};
Creature.prototype.evade = function(sender) {
	if (
		sender != this.owner &&
		this.status.get('airborne') &&
		this.card.element == Air
	) {
		var freedomChance = 0;
		for (var i = 0; i < 16; i++) {
			if (this.owner.permanents[i] && this.owner.permanents[i].status.get('freedom')) {
				freedomChance += 0.25 * this.owner.permanents[i].status.get('charges');
			}
		}
		return freedomChance && this.owner.rng() < freedomChance;
	}
};
Creature.prototype.calcEclipse = function() {
	if (!this.status.nocturnal) {
		return 0;
	}
	var bonus = 0;
	for (var j = 0; j < 2; j++) {
		var pl = j == 0 ? this.owner : this.owner.foe;
		for (var i = 0; i < 16; i++) {
			if (pl.permanents[i] && pl.permanents[i].card.isOf(Cards.Nightfall)) {
				if (pl.permanents[i].card.upped) {
					return 2;
				} else {
					bonus = 1;
				}
			}
		}
	}
	return bonus;
};
Thing.prototype.lobo = function() {
	for (var key in this.active) {
		this.active[key].name.forEach(function(name) {
			if (!Actives[name].passive) {
				this.rmactive(key, name);
			}
		}, this);
	}
};
var mutantabilities = [
	'hatch',
	'freeze',
	'burrow',
	'destroy',
	'steal',
	'dive',
	'heal',
	'paradox',
	'lycanthropy',
	'growth1',
	'infect',
	'gpull',
	'devour',
	'mutation',
	'growth',
	'ablaze',
	'poison',
	'deja',
	'endow',
	'guard',
	'mitosis',
];
Thing.prototype.mutantactive = function() {
	this.lobo();
	var index = this.owner.upto(mutantabilities.length + 2) - 2;
	if (index < 0) {
		this.status = this.status.set(['momentum', 'immaterial'][~index], true);
	} else {
		var active = Actives[mutantabilities[index]];
		if (active == Actives.growth1) {
			this.addactive('death', active);
		} else {
			this.active = this.active.set('cast', active);
			this.cast = this.owner.upto(2) + 1;
			this.castele = this.card.element;
		}
	}
};
// adrtbl is a bitpacked 2d array
// [[0,0,0,0],[1,1,1],[2,2,2],[3,3,3],[3,2],[4,2],[4,2],[5,3],[6,3],[3],[4],[4],[4],[5],[5],[5]]
var adrtbl = new Uint16Array([
	4,
	587,
	1171,
	1755,
	154,
	162,
	162,
	234,
	242,
	25,
	33,
	33,
	33,
	41,
	41,
	41,
]);
function countAdrenaline(x) {
	x = Math.abs(x | 0);
	return x > 15 ? 1 : (adrtbl[x] & 7) + 1;
}
function getAdrenalRow(x) {
	x |= 0;
	var sign = (x > 0) - (x < 0);
	x = Math.abs(x);
	if (x > 15) return '';
	var row = adrtbl[x],
		ret = '';
	for (var i = 0; i < ret.length; i++) {
		row >>= 3;
		ret += (i ? ', ' : '') + (row & 7) * sign;
	}
	return ret;
}
Weapon.prototype.trueatk = Creature.prototype.trueatk = function(adrenaline) {
	var dmg = this.atk;
	if (this.status.dive) dmg += this.status.dive;
	dmg += this.trigger('buff');
	if (this instanceof Creature) {
		dmg += this.calcEclipse();
	}
	var y = adrenaline || this.status.adrenaline || 0;
	if (y < 2) return dmg;
	var row = adrtbl[Math.abs(dmg)];
	if (y - 2 >= (row & 7)) return 0;
	return ((row >> ((y - 1) * 3)) & 7) * ((dmg > 0) - (dmg < 0));
};
Weapon.prototype.truehp = function() {
	return this.card.health;
};
Creature.prototype.truehp = function() {
	return (
		this.hp + (this.calcEclipse(this.owner.game) != 0) + this.trigger('hp')
	);
};
Permanent.prototype.getIndex = function() {
	return this.owner.permanents.indexOf(this);
};
Permanent.prototype.die = function() {
	if (~this.remove()) {
		this.proc('destroy');
	}
};
Weapon.prototype.remove = function() {
	if (this.owner.weapon != this) return -1;
	delete this.owner.weapon;
	return 0;
};
Shield.prototype.remove = function() {
	if (this.owner.shield != this) return -1;
	delete this.owner.shield;
	return 0;
};
Thing.prototype.isMaterialInstance = function(type) {
	return (
		this instanceof type && !this.status.immaterial && !this.status.burrowed
	);
};
Thing.prototype.addactive = function(type, active) {
	this.active[type] = combineactive(this.active[type], active);
};
Thing.prototype.rmactive = function(type, name) {
	if (!this.active.has(type)) return;
	var actives = this.active.get(type).name,
		idx;
	if (~(idx = actives.indexOf(name))) {
		if (actives.length == 1) {
			this.active = this.active.delete(type);
		} else {
			this.active = this.active.set(type, actives.reduce(function(previous, current, i) {
				return i == idx ? previous : combineactive(previous, Actives[current]);
			}, null));
		}
	}
};
Thing.prototype.defstatus = function(key, def) {
	if (!(key in this.status)) {
		this.status = this.status.set(key, def);
	}
	return this.status.get('key');
};
Thing.prototype.hasactive = function(type, name) {
	return type in this.active && ~this.active[type].name.indexOf(name);
};
Thing.prototype.canactive = function() {
	return (
		this.owner.game.turn == this.owner &&
		this.active.has('cast') &&
		!this.usedactive &&
		!this.status.delayed &&
		!this.status.frozen &&
		this.owner.canspend(this.castele, this.cast)
	);
};
Thing.prototype.useactive = function(t) {
	this.usedactive = true;
	var castele = this.castele,
		cast = this.cast;
	if (!t || !t.evade(this.owner)) {
		this.active.get('cast').func(this, t);
		this.proc('spell');
	} else if (t) Effect.mkText('Evade', t);
	this.owner.spend(castele, cast);
	this.owner.game.updateExpectedDamage();
};
Weapon.prototype.attack = Creature.prototype.attack = function(
	stasis,
	freedomChance,
) {
	var isCreature = this instanceof Creature;
	if (isCreature) {
		this.dmg(this.status.poison, true);
	}
	var target = this.owner.foe;
	if (
		!this.status.frozen ||
		this.active.get('auto') == Actives.overdrive ||
		this.active.get('auto') == Actives.acceleration
	) {
		this.trigger('auto');
	}
	this.usedactive = false;
	var trueatk;
	if (
		!(
			stasis ||
			this.status.frozen ||
			this.status.delayed ||
			this.status.frightened ||
			this.status.law
		) &&
		(trueatk = this.trueatk()) != 0
	) {
		var momentum = this.status.momentum;
		if (
			this.status.airborne &&
			freedomChance &&
			this.owner.rng() < freedomChance
		) {
			momentum = true;
			trueatk = Math.ceil(trueatk * 1.5);
		}
		if (this.status.psion) {
			target.spelldmg(trueatk);
		} else if (momentum || trueatk < 0) {
			var stillblock = false,
				fsh,
				fsha;
			if (
				!momentum &&
				(fsh = target.shield) &&
				(fsha = fsh.active.get('shield')) &&
				(fsha == Actives.wings || fsha == Actives.weight)
			) {
				stillblock = fsha(fsh, this);
			}
			if (!stillblock) {
				target.dmg(trueatk);
				this.trigger('hit', target, trueatk);
			}
		} else if (isCreature && target.gpull && trueatk > 0) {
			var gpull = target.gpull;
			var dmg = gpull.dmg(trueatk);
			if (this.hasactive('hit', 'vampirism')) {
				this.owner.dmg(-dmg);
			}
		} else {
			var truedr = target.shield ? target.shield.dr : 0;
			var tryDmg = Math.max(trueatk - truedr, 0);
			if (
				!target.shield ||
				!target.shield.active.get('shield') ||
				!target.shield.trigger('shield', this, tryDmg)
			) {
				if (tryDmg > 0) {
					var dmg = target.dmg(tryDmg);
					this.trigger('hit', target, dmg);
				}
			}
		}
	}
	if (this.status.frozen) {
		this.status.frozen--;
	}
	if (this.status.delayed) {
		this.status.delayed--;
	}
	if (this.status.frightened) {
		this.status.frightened = false;
	}
	delete this.status.dive;
	if (isCreature && ~this.getIndex() && this.truehp() <= 0) {
		this.die();
	} else if (!isCreature || ~this.getIndex()) {
		this.trigger('postauto');
		if (this.status.adrenaline) {
			if (this.status.adrenaline < countAdrenaline(this.trueatk(0))) {
				this.status.adrenaline++;
				this.attack(stasis, freedomChance);
			} else {
				this.status.adrenaline = 1;
			}
		}
	}
};
CardInstance.prototype.canactive = function() {
	if (this.owner.silence || this.owner.game.turn != this.owner) return false;
	if (!this.card) {
		console.log('wtf cardless card');
		return false;
	}
	return this.owner.canspend(this.card.costele, this.card.cost, this);
};
CardInstance.prototype.useactive = function(target) {
	if (!this.canactive()) {
		console.log(
			(this.owner == this.owner.game.player1 ? '1' : '2') +
				' cannot cast ' +
				(this || '-'),
		);
		return;
	}
	var owner = this.owner,
		card = this.card;
	this.remove();
	if (owner.neuro) {
		owner.addpoison(1);
	}
	if (card.type <= PermanentEnum) {
		var cons = [Pillar, Weapon, Shield, Permanent][card.type];
		new cons(card, owner).place(true);
	} else if (card.type == SpellEnum) {
		if (!target || !target.evade(owner)) {
			card.active.get('auto').func(this, target);
		}
	} else if (card.type == CreatureEnum) {
		new Creature(card, owner).place(true);
	} else console.log('Unknown card type: ' + card.type);
	owner.spend(card.costele, card.cost, this);
	owner.game.updateExpectedDamage();
};
function casttext(cast, castele) {
	return cast == 0 ? '0' : cast + ':' + castele;
}
exports.Thing = Thing;
exports.Player = 6;
exports.CardInstance = CardInstance;
exports.Pillar = Pillar;
exports.Weapon = Weapon;
exports.Shield = Shield;
exports.Permanent = Permanent;
exports.Creature = Creature;
exports.passives = passives;
exports.countAdrenaline = countAdrenaline;
exports.getAdrenalRow = getAdrenalRow;
exports.casttext = casttext;
exports.Other = 0;
exports.Entropy = 1;
exports.Death = 2;
exports.Gravity = 3;
exports.Earth = 4;
exports.Life = 5;
exports.Fire = 6;
exports.Water = 7;
exports.Light = 8;
exports.Air = 9;
exports.Time = 10;
exports.Darkness = 11;
exports.Aether = 12;
exports.PillarEnum = 0;
exports.WeaponEnum = 1;
exports.ShieldEnum = 2;
exports.PermanentEnum = 3;
exports.SpellEnum = 4;
exports.CreatureEnum = 5;
exports.PlayPhase = 0;
exports.EndPhase = 1;
exports.PillarList = new Uint16Array([
	5002,
	5100,
	5200,
	5300,
	5400,
	5500,
	5600,
	5700,
	5800,
	5900,
	6000,
	6100,
	6200,
]);
exports.PendList = new Uint16Array([
	5004,
	5150,
	5250,
	5350,
	5450,
	5550,
	5650,
	5750,
	5850,
	5950,
	6050,
	6150,
	6250,
]);
exports.NymphList = new Uint16Array([
	0,
	5120,
	5220,
	5320,
	5420,
	5520,
	5620,
	5720,
	5820,
	5920,
	6020,
	6120,
	6220,
]);
exports.AlchemyList = new Uint16Array([
	0,
	5111,
	5212,
	5311,
	5413,
	5511,
	5611,
	5712,
	5811,
	5910,
	6011,
	6110,
	6209,
]);
exports.ShardList = new Uint16Array([
	0,
	5130,
	5230,
	5330,
	5430,
	5530,
	5630,
	5730,
	5830,
	5930,
	6030,
	6130,
	6230,
]);
exports.eleNames = [
	'Chroma',
	'Entropy',
	'Death',
	'Gravity',
	'Earth',
	'Life',
	'Fire',
	'Water',
	'Light',
	'Air',
	'Time',
	'Darkness',
	'Aether',
	'Random',
];

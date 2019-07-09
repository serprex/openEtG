export function Thing(card, owner) {
	this.owner = owner;
	this.card = card;
	if (this.status) {
		for (const key of this.status.keys()) {
			if (etg.passives.has(key)) this.status = this.status.delete(key);
		}
		for (const [key, val] of card.status) {
			this.status = this.status.set(key, val);
		}
	} else {
		this.status = card.status;
	}
	this.active = card.active.delete('discard');
}
export function Creature(card, owner) {
	this.type = etg.Creature;
	this.casts = 0;
	if (card == Cards.Names.ShardGolem) {
		this.card = card;
		this.owner = owner;
		var golem = owner.shardgolem || { hpStat: 1, atkStat: 1, cast: 0 };
		this.atk = golem.atkStat;
		this.maxhp = this.hp = golem.hpStat;
		this.cast = golem.cast;
		this.castele = etg.Earth;
		this.active = golem.active;
		this.status = golem.status;
	} else this.transform(card, owner);
}
export function Permanent(card, owner) {
	this.type = etg.Permanent;
	this.casts = 0;
	this.cast = card.cast;
	this.castele = card.castele;
	Thing.apply(this, arguments);
}
export function Weapon(card, owner) {
	this.atk = card.attack;
	Permanent.apply(this, arguments);
	this.type = etg.Weapon;
}
export function Shield(card, owner) {
	this.dr = card.health;
	Permanent.apply(this, arguments);
	this.type = etg.Shield;
}
export function CardInstance(card, owner) {
	this.owner = owner;
	this.type = etg.Spell;
	this.card = card;
	this.active = card.active;
	this.status = card.status;
}

Thing.prototype.toString = function() {
	return this.card.name;
};
CardInstance.prototype.toString = function() {
	return '::' + this.card.name;
};
CardInstance.prototype.getStatus = function(key) {
	return this.card.status.get(key) || 0;
};
Thing.prototype.trigger = function(name, t, param) {
	return this.active.get(name) ? this.active.get(name).func(this, t, param) : 0;
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
Thing.prototype.getStatus = function(key) {
	return (this.status && this.status.get(key)) || 0;
};
Thing.prototype.setStatus = function(key, val) {
	this.status = this.status.set(key, val | 0);
};
Thing.prototype.clearStatus = function(key) {
	this.status = this.status.delete(key);
};
Thing.prototype.maybeDecrStatus = function(key) {
	const val = this.getStatus(key);
	if (val > 0) this.setStatus(key, val - 1);
	return val;
};
Thing.prototype.incrStatus = function(key, val) {
	this.setStatus(key, this.getStatus(key) + val);
};

Creature.prototype = Object.create(Thing.prototype);
Permanent.prototype = Object.create(Thing.prototype);
Weapon.prototype = Object.create(Permanent.prototype);
Shield.prototype = Object.create(Permanent.prototype);
CardInstance.prototype = Object.create(Thing.prototype);

CardInstance.prototype.clone = function(owner) {
	return new CardInstance(this.card, owner);
};

var thingtypes = [Creature, Permanent, Weapon, Shield];
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
Creature.prototype.hash = function() {
	var hash = this.owner == this.owner.game.player1 ? 17 : 19;
	hash ^=
		this.status.hashCode() ^
		(this.hp * 17 + this.atk * 31 - this.maxhp - this.casts * 3);
	hash ^= this.card.code;
	for (var [key, val] of this.active) {
		hash ^= util.hashString(key + ':' + val.name.join(':'));
	}
	if (this.active.has('cast')) {
		hash ^= this.cast * 7 + this.castele * 23;
	}
	return hash & 0x7fffffff;
};
Permanent.prototype.hash = function() {
	var hash = this.owner == this.owner.game.player1 ? 5351 : 5077;
	hash ^= this.status.hashCode() ^ (this.casts * 3);
	hash ^= this.card.code;
	for (var [key, val] of this.active) {
		hash ^= util.hashString(key + '=' + val.name.join(' '));
	}
	if (this.active.has('cast')) {
		hash ^= this.cast * 7 + this.castele * 23;
	}
	return hash & 0x7fffffff;
};
Weapon.prototype.hash = function() {
	var hash = this.owner == this.owner.game.player1 ? 13 : 11;
	hash ^= this.status.hashCode() ^ (this.atk * 31 - this.casts * 3);
	hash ^= this.card.code;
	for (var [key, val] of this.active) {
		hash ^= util.hashString(key + '-' + val.name.join(' '));
	}
	if (this.active.has('cast')) {
		hash ^= this.cast * 7 + this.castele * 23;
	}
	return hash & 0x7fffffff;
};
Shield.prototype.hash = function() {
	var hash = this.owner == this.owner.game.player1 ? 5009 : 4259;
	hash ^= this.status.hashCode() ^ (this.dr * 31 - this.casts * 3);
	hash ^= this.card.code;
	for (var [key, val] of this.active) {
		hash ^= util.hashString(key + '~' + val.name.join(' '));
	}
	if (this.active.has('cast')) {
		hash ^= this.cast * 7 + this.castele * 23;
	}
	return hash & 0x7fffffff;
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
Thing.prototype.info = function() {
	return skillText(this);
};
var activetexts = [
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
Thing.prototype.activetext = function() {
	if (!this.active) return '';
	const acast = this.active.get('cast');
	if (acast) return this.cast + ':' + this.castele + acast.name[0];
	for (const akey of activetexts) {
		const a = this.active.get(akey);
		if (a) return akey + ' ' + a.name.join(' ');
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
	if (this.status.get('additive')) {
		for (var i = 0; i < 16; i++) {
			if (
				this.owner.permanents[i] &&
				this.card.code == this.owner.permanents[i].card.code
			) {
				this.owner.permanents[i].incrStatus(
					'charges',
					this.getStatus('charges'),
				);
				Thing.prototype.place.call(this.owner.permanents[i], fromhand);
				return;
			}
		}
	}
	util.place(this.owner.permanents, this);
	Thing.prototype.place.call(this, fromhand);
};
Weapon.prototype.place = function(fromhand) {
	if (
		this.status.get('additive') &&
		this.owner.weapon &&
		this.card.as(this.owner.weapon.card) === this.card
	) {
		this.owner.weapon.incrStatus('charges', this.getStatus('charges'));
	} else {
		if (this.owner.weapon) {
			this.setStatus('frozen', this.owner.weapon.status.get('frozen'));
		}
		this.owner.weapon = this;
	}
	Thing.prototype.place.call(this, fromhand);
};
Shield.prototype.place = function(fromhand) {
	if (
		this.status.get('additive') &&
		this.owner.shield &&
		this.owner.shield.card.asUpped(this.card.upped) == this.card
	) {
		this.owner.shield.status.set(
			'charges',
			(this.owner.shield.status.get('charges') | 0) +
				this.status.get('charges'),
		);
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
	this.incrStatus('poison', x);
	if (this.status.get('voodoo')) {
		this.owner.foe.addpoison(x);
	}
};
Weapon.prototype.buffhp = function() {};
Weapon.prototype.delay = Creature.prototype.delay = function(x) {
	this.defstatus('delayed', 0);
	this.incrStatus('delayed', x);
	if (this.status.get('voodoo')) this.owner.foe.delay(x);
};
Weapon.prototype.freeze = Creature.prototype.freeze = function(x) {
	if (
		!this.active.has('ownfreeze') ||
		this.active.get('ownfreeze').func(this)
	) {
		Effect.mkText('Freeze', this);
		this.defstatus('frozen', 0);
		if (x > this.status.get('frozen')) this.setStatus('frozen', x);
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
		if (
			this.status.get('aflatoxin') &&
			!this.card.isOf(Cards.Names.MalignantCell)
		) {
			this.owner.creatures[index] = new Creature(
				Cards.Names.MalignantCell,
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
	if (this.status.get('mutant')) {
		var buff = this.owner.upto(25);
		this.buffhp(Math.floor(buff / 5));
		this.atk += buff % 5;
		this.mutantactive();
	}
};
Shield.prototype.transform = function(card, owner) {
	Shield.call(this, card, owner || this.owner);
	if (this.status.get('mutant')) {
		this.mutantactive();
	}
};
Permanent.prototype.transform = function(card, owner) {
	Permanent.call(this, card, owner || this.owner);
	if (this.status.get('mutant')) {
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
		this.card.element == etg.Air
	) {
		var freedomChance = 0;
		for (var i = 0; i < 16; i++) {
			if (
				this.owner.permanents[i] &&
				this.owner.permanents[i].status.get('freedom')
			) {
				freedomChance += 0.25 * this.owner.permanents[i].status.get('charges');
			}
		}
		return freedomChance && this.owner.rng() < freedomChance;
	}
};
Creature.prototype.calcEclipse = function() {
	if (!this.status.get('nocturnal')) {
		return 0;
	}
	var bonus = 0;
	for (var j = 0; j < 2; j++) {
		var pl = j == 0 ? this.owner : this.owner.foe;
		for (var i = 0; i < 16; i++) {
			if (
				pl.permanents[i] &&
				pl.permanents[i].card.isOf(Cards.Names.Nightfall)
			) {
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
	for (const [key, val] of this.active) {
		for (const name of val.name) {
			if (!Actives[name].passive) {
				this.rmactive(key, name);
			}
		}
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

Weapon.prototype.trueatk = Creature.prototype.trueatk = function(adrenaline) {
	if (adrenaline === undefined) adrenaline = this.getStatus('adrenaline');
	var dmg = this.atk;
	if (this.status.get('dive')) dmg += this.status.get('dive');
	dmg += this.trigger('buff');
	if (this.type === etg.Creature) {
		dmg += this.calcEclipse();
	}
	return etg.calcAdrenaline(adrenaline, dmg);
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
	this.owner.weapon = null;
	return 0;
};
Shield.prototype.remove = function() {
	if (this.owner.shield != this) return -1;
	this.owner.shield = null;
	return 0;
};
Thing.prototype.isMaterial = function(type) {
	return (
		(type == etg.Permanent
			? this.type <= type
			: type
			? this.type == type
			: this.type != etg.Player) &&
		!this.status.get('immaterial') &&
		!this.status.get('burrowed')
	);
};
Thing.prototype.addactive = function(type, active) {
	this.active = this.active.update(type, v => Skill.combine(v, active));
};
Thing.prototype.rmactive = function(type, name) {
	if (!this.active.has(type)) return;
	var actives = this.active.get(type).name,
		idx;
	if (~(idx = actives.indexOf(name))) {
		if (actives.length == 1) {
			this.active = this.active.delete(type);
		} else {
			this.active = this.active.set(
				type,
				actives.reduce((previous, current, i) => {
					return i == idx
						? previous
						: Skill.combine(previous, Actives[current]);
				}, null),
			);
		}
	}
};
Thing.prototype.defstatus = function(key, def) {
	if (!this.status.has(key)) {
		this.status = this.status.set(key, def);
	}
	return this.status.get(key);
};
Thing.prototype.hasactive = function(type, name) {
	return this.active.has(type) && ~this.active.get(type).name.indexOf(name);
};
Thing.prototype.canactive = function() {
	return (
		this.owner.game.turn == this.owner &&
		this.active &&
		this.active.has('cast') &&
		this.casts &&
		!this.status.get('delayed') &&
		!this.status.get('frozen') &&
		this.owner.canspend(this.castele, this.cast)
	);
};
Thing.prototype.useactive = function(t) {
	this.casts--;
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
		this.dmg(this.getStatus('poison'), true);
	}
	var target = this.owner.foe;
	if (
		!this.status.get('frozen') ||
		this.active.get('auto') == Actives.overdrive ||
		this.active.get('auto') == Actives.acceleration
	) {
		this.trigger('auto');
	}
	this.casts = 1;
	this.clearStatus('ready');
	var trueatk;
	if (
		!(
			stasis ||
			this.status.get('frozen') ||
			this.status.get('delayed') ||
			this.status.get('frightened') ||
			this.status.get('law')
		) &&
		(trueatk = this.trueatk()) != 0
	) {
		var momentum = this.getStatus('momentum');
		if (
			this.status.get('airborne') &&
			freedomChance &&
			this.owner.rng() < freedomChance
		) {
			momentum = true;
			trueatk = Math.ceil(trueatk * 1.5);
		}
		if (this.status.get('psion')) {
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
				stillblock = fsha.func(fsh, this);
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
	this.maybeDecrStatus('frozen');
	this.maybeDecrStatus('delayed');
	if (this.status.get('frightened')) {
		this.setStatus('frightened', 0);
	}
	if (this.status.get('dive')) {
		this.setStatus('dive', 0);
	}
	if (isCreature && ~this.getIndex() && this.truehp() <= 0) {
		this.die();
	} else if (!isCreature || ~this.getIndex()) {
		this.trigger('postauto');
		if (this.status.get('adrenaline')) {
			if (
				this.status.get('adrenaline') < etg.countAdrenaline(this.trueatk(0))
			) {
				this.incrStatus('adrenaline', 1);
				this.attack(stasis, freedomChance);
			} else {
				this.setStatus('adrenaline', 1);
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
	const { owner, card } = this;
	this.remove();
	if (owner.status.get('neuro')) {
		owner.addpoison(1);
	}
	if (card.type <= etg.Permanent) {
		var cons = [Weapon, Shield, Permanent][card.type ? card.type - 1 : 2];
		new cons(card, owner).place(true);
	} else if (card.type == etg.Spell) {
		if (!target || !target.evade(owner)) {
			card.active.get('cast').func(this, target);
		}
	} else if (card.type == etg.Creature) {
		new Creature(card, owner).place(true);
	} else console.log('Unknown card type: ' + card.type);
	owner.spend(card.costele, card.cost, this);
	owner.game.updateExpectedDamage();
};
CardInstance.prototype.isMaterial = function(type) {
	return type === undefined || type == etg.Spell;
};

import * as ui from './ui.js';
import * as util from '../util.js';
import Effect from './Effect.js';
import Actives from './Skills.js';
import Skill from '../Skill.js';
import skillText from './skillText.js';
import * as Cards from './Cards.js';
import * as etg from './etg.js';

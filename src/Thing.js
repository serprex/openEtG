import * as imm from './immutable.js';

export default function Thing(game, id) {
	if (!id || typeof id !== 'number') {
		throw new Error(`Invalid id ${id}`);
	}
	this.game = game;
	this.id = id;
}

import * as etg from './etg.js';
import Skill from './Skill.js';
import * as sfx from './audio.js';
import Skills from './Skills.js';
import skillText from './skillText.js';
import parseSkill from './parseSkill.js';

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
function defineProp(key) {
	Object.defineProperty(Thing.prototype, key, {
		get() {
			return this.game.get(this.id).get(key);
		},
		set(val) {
			this.game.set(this.id, key, val);
		},
	});
}
Object.defineProperty(Thing.prototype, 'ownerId', {
	get() {
		return this.game.get(this.id).get('owner');
	},
	set(val) {
		if (val && typeof val !== 'number') throw new Error(`Invalid id: ${val}`);
		this.game.set(this.id, 'owner', val);
	},
});
Object.defineProperty(Thing.prototype, 'owner', {
	get() {
		return this.game.byId(this.game.get(this.id).get('owner'));
	},
});
defineProp('card');
defineProp('cast');
defineProp('castele');
defineProp('maxhp');
defineProp('hp');
defineProp('atk');
defineProp('status');
defineProp('usedactive');
defineProp('type');
defineProp('active');

Thing.prototype.init = function(card, owner) {
	this.ownerId = owner;
	this.card = card;
	this.cast = card.cast;
	this.castele = card.castele;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.status = card.status;
	this.usedactive = true;
	this.type = 0;
	this.active = card.active;
	return this;
};
Thing.prototype.clone = function(ownerId) {
	return this.game.cloneInstance(this, ownerId);
};

Thing.prototype.toString = function() {
	return this.card && this.card.name;
};
Thing.prototype.transform = function(card) {
	this.card = card;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	let status = this.status.filter((_v, k) => !passives.has(k));
	for (const [key, val] of card.status) {
		if (!status.get(key)) status = status.set(key, val);
	}
	this.status = status;
	this.active = card.active;
	if (this.status.get('mutant')) {
		const buff = this.game.upto(25);
		this.buffhp(Math.floor(buff / 5));
		this.incrAtk(buff % 5);
		this.mutantactive();
	} else {
		this.cast = card.cast;
		this.castele = card.castele;
	}
};
Thing.prototype.getIndex = function() {
	const { id, owner, type } = this;
	let arrName;
	switch (type) {
		case etg.Player:
			return this.game.players.indexOf(this.id);
		case etg.Weapon:
			return owner.weaponId === id ? 0 : -1;
		case etg.Shield:
			return owner.shieldId === id ? 0 : -1;
		case etg.Creature:
			arrName = 'creatures';
			break;
		case etg.Permanent:
			arrName = 'permanents';
			break;
		default:
			arrName = 'hand';
	}
	return this.game
		.get(owner.id)
		.get(arrName)
		.indexOf(id);
};
Thing.prototype.remove = function(index) {
	if (this.type === etg.Weapon) {
		if (this.owner.weaponId !== this.id) return -1;
		this.owner.weaponId = 0;
		return 0;
	}
	if (this.type === etg.Shield) {
		if (this.owner.shieldId !== this.id) return -1;
		this.owner.shieldId = 0;
		return 0;
	}
	if (index === undefined) index = this.getIndex();
	if (index !== -1) {
		let arrName = undefined;
		if (this.type === etg.Creature) {
			if (this.owner.gpull === this.id) this.owner.gpull = 0;
			arrName = 'creatures';
		} else if (this.type === etg.Permanent) {
			arrName = 'permanents';
		}
		if (arrName) {
			this.game.updateIn([this.ownerId, arrName], a => {
				const arr = new Uint32Array(a);
				arr[index] = 0;
				return arr;
			});
		} else {
			this.game.updateIn([this.ownerId, 'hand'], hand => {
				const arr = Array.from(hand);
				arr.splice(index, 1);
				return arr;
			});
		}
	}
	return index;
};
Thing.prototype.die = function() {
	const idx = this.remove();
	if (idx === -1) return;
	if (this.type <= etg.Permanent) {
		this.proc('destroy', {});
	} else if (this.type === etg.Spell) {
		this.proc('discard');
	} else if (this.type === etg.Creature && !this.trigger('predeath')) {
		if (
			this.status.get('aflatoxin') &
			!this.card.isOf(this.game.Cards.Names.MalignantCell)
		) {
			const cell = this.game.newThing(
				this.card.as(this.game.Cards.Names.MalignantCell),
			);
			const creatures = new Uint32Array(this.owner.creatureIds);
			creatures[idx] = cell.id;
			this.game.set(this.ownerId, 'creatures', creatures);
			cell.ownerId = this.ownerId;
			cell.type = etg.Creature;
		}
		if (this.game.bonusstats) {
			this.game.updateIn(
				[this.game.id, 'bonusstats', 'creatureskilled'],
				creatureskilled => {
					creatureskilled = new Map(creatureskilled);
					return creatureskilled.set(
						this.game.turn,
						(creatureskilled.get(this.game.turn) | 0) + 1,
					);
				},
			);
		}
		this.deatheffect(idx);
	}
};
Thing.prototype.deatheffect = function(index) {
	const data = { index };
	this.proc('death', data);
	if (~index) {
		this.game.effect({ x: 'Death', id: this.id });
	}
};
Thing.prototype.trigger = function(name, t, param) {
	const a = this.active.get(name);
	return a ? a.func(this.game, this, t, param) : 0;
};
Thing.prototype.proc = function(name, param) {
	function proc(c) {
		if (c) this.game.trigger(c, name, this, param);
	}
	this.trigger('own' + name, this, param);
	for (let i = 0; i < 2; i++) {
		const pl = i === 0 ? this.owner : this.owner.foe;
		pl.creatureIds.forEach(proc, this);
		pl.permanentIds.forEach(proc, this);
		proc.call(this, pl.shieldId);
		proc.call(this, pl.weaponId);
	}
};
Thing.prototype.calcCore = function(prefix, filterstat) {
	if (!prefix(this)) return 0;
	for (let j = 0; j < 2; j++) {
		const pl = j === 0 ? this.owner : this.owner.foe;
		if (pl.permanentIds.some(pr => pr && this.game.getStatus(pr, filterstat)))
			return 1;
	}
	return 0;
};
Thing.prototype.calcCore2 = function(prefix, filterstat) {
	if (!prefix(this)) return 0;
	let bonus = 0;
	for (let j = 0; j < 2; j++) {
		const pl = j === 0 ? this.owner : this.owner.foe,
			perms = pl.permanentIds;
		for (let i = 0; i < 16; i++) {
			const pr = perms[i];
			if (pr && this.game.getStatus(pr, filterstat)) {
				if (this.game.get(pr).get('card').upped) return 2;
				else bonus = 1;
			}
		}
	}
	return bonus;
};
function isEclipseCandidate(c) {
	return c.status.get('nocturnal') && c.type === etg.Creature;
}
function isWhetCandidate(c) {
	return (
		c.status.get('golem') ||
		c.type === etg.Weapon ||
		(c.type === etg.Creature && c.card.type === etg.Weapon)
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
		this.type === etg.Creature
			? `${this.trueatk()}|${this.truehp()}/${this.maxhp}`
			: this.type === etg.Weapon
			? this.trueatk().toString()
			: this.type === etg.Shield
			? this.truedr().toString()
			: '';
	const stext = skillText(this);
	return !info ? stext : stext ? info + '\n' + stext : info;
};
Thing.prototype.place = function(owner, type, fromhand) {
	this.game.set(this.id, 'owner', owner.id);
	this.game.set(this.id, 'type', type);
	this.proc('play', fromhand);
};
Thing.prototype.incrAtk = function(x) {
	this.game.effect({ x: 'Atk', id: this.id, amt: x });
	this.atk += x;
};
Thing.prototype.dmg = function(x, dontdie) {
	if (!x) return 0;
	else if (this.type === etg.Weapon) return x < 0 ? 0 : this.owner.dmg(x);
	else {
		const dmg =
			x < 0 ? Math.max(this.hp - this.maxhp, x) : Math.min(this.truehp(), x);
		this.hp -= dmg;
		this.game.effect({ x: 'Dmg', id: this.id, amt: dmg });
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
	if (this.type === etg.Weapon) this.owner.addpoison(x);
	else if (!this.active.has('ownpoison') || this.trigger('ownpoison')) {
		this.game.effect({ x: 'Poison', id: this.id, amt: x });
		sfx.playSound('poison');
		this.incrStatus('poison', x);
		if (this.status.get('voodoo')) {
			this.owner.foe.addpoison(x);
		}
	}
};
Thing.prototype.delay = function(x) {
	this.game.effect({ x: 'Delay', id: this.id, amt: x });
	sfx.playSound('stasis');
	this.incrStatus('delayed', x);
	if (this.status.get('voodoo')) this.owner.foe.delay(x);
};
Thing.prototype.freeze = function(x) {
	if (!this.active.has('ownfreeze') || this.trigger('ownfreeze')) {
		this.game.effect({ x: 'Freeze', id: this.id, amt: x });
		sfx.playSound('freeze');
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
	'infect',
	'gpull',
	'devour',
	'mutation',
	'growth 1',
	'growth 2',
	'growth 2 0',
	'poison 1',
	'deja',
	'endow',
	'guard',
	'mitosis',
];
Thing.prototype.mutantactive = function() {
	this.lobo();
	const index = this.game.upto(mutantabilities.length + 2) - 2;
	if (index < 0) {
		this.setStatus(['momentum', 'immaterial'][~index], 1);
	} else {
		const active = parseSkill(mutantabilities[index]);
		if (mutantabilities[index] === 'growth 1') {
			this.addactive('death', active);
		} else {
			this.active = this.active.set('cast', active);
			this.cast = 1 + this.game.upto(2);
			this.castele = this.card.element;
			return true;
		}
	}
};
Thing.prototype.isMaterial = function(type) {
	return (
		(type === etg.Permanent
			? this.type <= type
			: type
			? this.type === type
			: this.type !== etg.Player) &&
		(this.type === etg.Spell ||
			(!this.status.get('immaterial') && !this.status.get('burrowed')))
	);
};
Thing.prototype.addactive = function(type, active) {
	this.game.updateIn([this.id, 'active', type], v => Skill.combine(v, active));
};
Thing.prototype.getSkill = function(type) {
	return this.active.get(type);
};
Thing.prototype.setSkill = function(type, sk) {
	this.active = this.active.set(type, sk);
};
Thing.prototype.rmactive = function(type, name) {
	const atype = this.active.get(type);
	if (!atype) return;
	const actives = atype.name,
		idx = actives.indexOf(name);
	if (~idx) {
		this.active =
			actives.length === 1
				? this.active.delete(type)
				: this.active.set(
						type,
						actives.reduce(
							(previous, current, i) =>
								i === idx
									? previous
									: Skill.combine(previous, parseSkill(current)),
							null,
						),
				  );
	}
};
Thing.prototype.hasactive = function(type, name) {
	const atype = this.active.get(type);
	return !!(atype && ~atype.name.indexOf(name));
};
Thing.prototype.canactive = function(spend) {
	if (
		this.game.turn !== this.ownerId ||
		this.game.phase !== etg.PlayPhase ||
		this.getIndex() === -1
	) {
		return false;
	} else if (this.type === etg.Spell) {
		return (
			!this.owner.usedactive &&
			this.owner[spend ? 'spend' : 'canspend'](
				this.card.costele,
				this.card.cost,
			)
		);
	} else {
		return (
			this.active.has('cast') &&
			!this.usedactive &&
			!this.status.get('delayed') &&
			!this.status.get('frozen') &&
			this.owner.canspend(this.castele, this.cast)
		);
	}
};
Thing.prototype.castSpell = function(tgt, active, nospell) {
	const data = { tgt, active };
	this.proc('prespell', data);
	if (data.evade) {
		if (tgt) this.game.effect({ x: 'Text', text: 'Evade', id: tgt });
	} else {
		active.func(this.game, this, this.game.byId(data.tgt));
		if (!nospell) this.proc('spell', data);
	}
};
Thing.prototype.play = function(tgt, fromhand) {
	const { owner, card } = this;
	this.remove();
	if (card.type === etg.Spell) {
		this.castSpell(tgt ? tgt.id : 0, this.active.get('cast'));
	} else {
		sfx.playSound(card.type <= etg.Permanent ? 'permPlay' : 'creaturePlay');
		if (card.type === etg.Creature) owner.addCrea(this, fromhand);
		else if (card.type === etg.Permanent || card.type === etg.Pillar)
			owner.addPerm(this, fromhand);
		else if (card.type === etg.Weapon) owner.setWeapon(this, fromhand);
		else owner.setShield(this, fromhand);
	}
};
Thing.prototype.useactive = function(t) {
	const { owner } = this;
	if (this.type === etg.Spell) {
		if (!this.canactive(true)) {
			return console.log(`${owner} cannot cast ${this}`);
		}
		this.remove();
		if (owner.getStatus('neuro')) owner.addpoison(1);
		this.play(t, true);
		this.proc('cardplay');
		if (this.game.bonusstats) {
			this.game.updateIn(
				[this.game.id, 'bonusstats', 'cardsplayed'],
				cardsplayed => {
					cardsplayed = new Map(cardsplayed);
					const a = new Int32Array(cardsplayed.get(this.ownerId) || 6);
					a[this.card.type]++;
					cardsplayed.set(this.ownerId, a);
					return cardsplayed;
				},
			);
		}
	} else if (owner.spend(this.castele, this.cast)) {
		this.usedactive = true;
		if (this.getStatus('neuro')) this.addpoison(1);
		this.castSpell(t ? t.id : 0, this.active.get('cast'));
	}
};
Thing.prototype.truedr = function() {
	return this.hp + this.trigger('buff');
};
Thing.prototype.truehp = function() {
	return this.hp + this.calcBonusHp();
};
Thing.prototype.trueatk = function(adrenaline) {
	if (adrenaline === undefined) adrenaline = this.getStatus('adrenaline');
	let dmg =
		this.atk +
		this.getStatus('dive') +
		this.trigger('buff') +
		this.calcBonusAtk();
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
Thing.prototype.attack = function(target, attackPhase) {
	const flags = { attackPhase, stasis: false, freedom: false };
	const isCreature = this.type === etg.Creature;
	if (isCreature) {
		this.dmg(this.getStatus('poison'), true);
	}
	if (target === undefined)
		target =
			this.active.get('cast') === Skills.appease && !this.status.get('appeased')
				? this.owner
				: this.owner.foe;
	const frozen = this.status.get('frozen');
	if (!frozen) {
		this.proc('attack', flags);
	}
	const { stasis, freedom } = flags;
	this.usedactive = false;
	let trueatk;
	if (
		!(stasis || frozen || this.status.get('delayed')) &&
		(trueatk = this.trueatk())
	) {
		let momentum =
			this.status.get('momentum') ||
			(this.status.get('burrowed') &&
				this.owner.permanentIds.some(
					id => id && this.game.getStatus(id, 'tunnel'),
				));
		const psionic = this.status.get('psionic');
		if (freedom) {
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
			this.attackCreature(this.game.byId(target.gpull), trueatk);
		} else {
			const truedr = target.shield
				? Math.min(target.shield.truedr(), trueatk)
				: 0;
			const data = { dmg: trueatk - truedr, blocked: truedr };
			if (target.shield) target.shield.trigger('shield', this, data);
			const dmg = target.dmg(data.dmg);
			if (dmg > 0) this.trigger('hit', target, dmg);
			if (dmg !== trueatk)
				this.trigger('blocked', target.shield, trueatk - dmg);
		}
	}
	this.maybeDecrStatus('frozen');
	this.maybeDecrStatus('delayed');
	this.setStatus('dive', 0);
	if (~this.getIndex()) {
		if (isCreature && this.truehp() <= 0) {
			this.die();
		} else {
			if (!frozen) this.trigger('postauto');
			const adrenaline = this.getStatus('adrenaline');
			if (adrenaline) {
				if (adrenaline < etg.countAdrenaline(this.trueatk(0))) {
					this.incrStatus('adrenaline', 1);
					this.attack(target, attackPhase);
				} else {
					this.setStatus('adrenaline', 1);
				}
			}
		}
	}
};
Thing.prototype.v_attack = function(stasis, freedomChance) {
	const isCreature = this.type === etg.Creature;
	if (isCreature) {
		this.dmg(this.getStatus('poison'), true);
	}
	const target = this.owner.foe;
	if (
		!this.status.get('frozen') ||
		this.active.get('ownattack') === Skills.v_overdrive ||
		this.active.get('ownattack') === Skills.v_acceleration
	) {
		this.proc('attack');
	}
	this.casts = 1;
	this.setStatus('ready', 0);
	let trueatk;
	if (
		!(stasis || this.status.get('frozen') || this.status.get('delayed')) &&
		(trueatk = this.trueatk()) != 0
	) {
		let momentum = this.getStatus('momentum');
		if (
			this.status.get('airborne') &&
			freedomChance &&
			this.game.rng() < freedomChance
		) {
			momentum = true;
			trueatk = Math.ceil(trueatk * 1.5);
		}
		if (this.status.get('psion')) {
			target.spelldmg(trueatk);
		} else if (momentum || trueatk < 0) {
			let stillblock = false,
				fsh,
				fsha;
			if (
				!momentum &&
				(fsh = target.shield) &&
				(fsha = fsh.active.get('shield')) &&
				(fsha == Skills.v_wings || fsha == Skills.v_weight)
			) {
				stillblock = fsha.func(fsh, this);
			}
			if (!stillblock) {
				target.dmg(trueatk);
				this.trigger('hit', target, trueatk);
			}
		} else if (isCreature && target.gpull && trueatk > 0) {
			const gpull = this.game.byId(target.gpull);
			const dmg = gpull.dmg(trueatk);
			if (this.hasactive('hit', 'vampirism')) {
				this.owner.dmg(-dmg);
			}
		} else {
			const truedr = target.shield ? target.shield.dr : 0;
			const tryDmg = Math.max(trueatk - truedr, 0);
			if (
				!target.shield ||
				!target.shield.active.get('shield') ||
				!target.shield.trigger('shield', this, tryDmg)
			) {
				if (tryDmg > 0) {
					const dmg = target.dmg(tryDmg);
					this.trigger('hit', target, dmg);
				}
			}
		}
	}
	this.maybeDecrStatus('frozen');
	this.maybeDecrStatus('delayed');
	if (this.status.get('dive')) {
		this.setStatus('dive', 0);
	}
	if (~this.getIndex()) {
		if (isCreature && this.truehp() <= 0) {
			this.die();
		} else {
			this.trigger('postauto');
			if (this.status.get('adrenaline')) {
				if (
					this.status.get('adrenaline') < etg.countAdrenaline(this.trueatk(0))
				) {
					this.incrStatus('adrenaline', 1);
					this.v_attack(stasis, freedomChance);
				} else {
					this.setStatus('adrenaline', 1);
				}
			}
		}
	}
};

Thing.prototype.buffhp = function(x) {
	if (this.type !== etg.Weapon) {
		if (this.type === etg.Player && this.maxhp <= 500)
			this.maxhp = Math.min(this.maxhp + x, 500);
		else this.maxhp += x;
	}
	return this.dmg(-x);
};
Thing.prototype.getStatus = function(key) {
	return this.game.getStatus(this.id, key);
};
Thing.prototype.setStatus = function(key, val) {
	return this.game.setStatus(this.id, key, val);
};
Thing.prototype.clearStatus = function() {
	this.game.setIn([this.id, 'status'], new imm.Map());
};
Thing.prototype.maybeDecrStatus = function(key) {
	let oldval;
	this.game.updateIn([this.id, 'status', key], (val = 0) => {
		oldval = val;
		return val > 0 ? val - 1 : 0;
	});
	return oldval;
};
Thing.prototype.incrStatus = function(key, val) {
	this.game.updateIn([this.id, 'status', key], (x = 0) => x + val);
};

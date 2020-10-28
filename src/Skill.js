import * as etg from './etg.js';
import { hashString } from './util.js';
import { registerHashFunc } from './immutable.js';

export default class Skill {
	constructor(name, func, passive, target) {
		this.name = name;
		this.func = func;
		this.passive = passive;
		this.target = target;
		this.hash = null;
	}

	toString() {
		return this.name.join(' ');
	}

	static combine(a1, a2) {
		if (!a1) return a2;
		if (!a2) return a1;
		return new Skill(
			a1.name.concat(a2.name),
			(ctx, c, t, data) => {
				const v1 = a1.func(ctx, c, t, data),
					v2 = a2.func(ctx, c, t, data);
				return v1 === undefined
					? v2
					: v2 === undefined
					? v1
					: v1 === true || v2 === true || v1 + v2;
			},
			false,
			null,
		);
	}

	static Targeting = {
		own: (c, t) => c.ownerId === t.ownerId,
		foe: (c, t) => c.ownerId !== t.ownerId,
		notself: (c, t) => c.id !== t.id,
		all: (c, t) => true,
		card: (c, t) => c.id !== t.id && t.type === etg.Spell,
		pill: (c, t) => t.isMaterial(etg.Permanent) && t.getStatus('pillar'),
		weap: (c, t) =>
			t.isMaterial() &&
			(t.type === etg.Weapon ||
				(t.type !== etg.Spell && t.card.type === etg.Weapon)),
		shie: (c, t) =>
			t.isMaterial() &&
			(t.type === etg.Shield ||
				(t.type !== etg.Spell && t.card.type === etg.Shield)),
		playerweap: (c, t) => t.type === etg.Weapon,
		perm: (c, t) => t.isMaterial(etg.Permanent),
		permnonstack: (c, t) =>
			t.isMaterial(etg.Permanent) && !t.getStatus('stackable'),
		stack: (c, t) => t.isMaterial(etg.Permanent) && t.getStatus('stackable'),
		crea: (c, t) => t.isMaterial(etg.Creature),
		creacrea: (c, t) =>
			t.isMaterial(etg.Creature) && t.card.type === etg.Creature,
		play: (c, t) => t.type === etg.Player,
		notplay: (c, t) => t.type !== etg.Player,
		sing: (c, t) =>
			t.isMaterial(etg.Creature) && t.getSkill('cast') !== c.getSkill('cast'),
		butterfly: (c, t) =>
			(t.type === etg.Creature || t.type === etg.Weapon) &&
			!t.getStatus('immaterial') &&
			!t.getStatus('burrowed') &&
			(t.trueatk() < 3 || (t.type === etg.Creature && t.truehp() < 3)),
		v_butterfly: (c, t) => t.isMaterial(etg.Creature) && t.trueatk() < 3,
		devour: (c, t) => t.isMaterial(etg.Creature) && t.truehp() < c.truehp(),
		paradox: (c, t) => t.isMaterial(etg.Creature) && t.truehp() < t.trueatk(),
		notskele: (c, t) =>
			t.type !== etg.Player && !t.card.isOf(t.owner.game.Cards.Names.Skeleton),
		forceplay: (c, t) =>
			t.type === etg.Spell || (t.isMaterial() && t.getSkill('cast')),
		airbornecrea: (c, t) =>
			t.isMaterial(etg.Creature) && t.getStatus('airborne'),
		golem: (c, t) => t.type !== etg.Spell && t.getStatus('golem') && t.attack,
		groundcrea: (c, t) =>
			t.isMaterial(etg.Creature) && !t.getStatus('airborne'),
		wisdom: (c, t) =>
			(t.type === etg.Creature || t.type === etg.Weapon) &&
			!t.getStatus('burrowed'),
		quinttog: (c, t) => t.type === etg.Creature && !t.getStatus('burrowed'),
	};

	static getTargeting(name) {
		const t = Skill.Targeting[name];
		if (t === undefined) throw new Error(`Unknown targeting ${name}`);
		return t;
	}

	static parseTargeting(str) {
		if (str in Skill.Targeting) {
			return Skill.Targeting[str];
		} else {
			const splitIdx = str.lastIndexOf(':');
			const prefixes = ~splitIdx
					? str.substr(0, splitIdx).split(':').map(Skill.getTargeting)
					: [],
				filters = (~splitIdx ? str.substr(splitIdx + 1) : str)
					.split('+')
					.map(Skill.getTargeting);
			return (Skill.Targeting[str] = (c, t) => {
				function check(f) {
					return f(c, t);
				}
				return prefixes.every(check) && filters.some(check);
			});
		}
	}
}
registerHashFunc(Skill, function () {
	let r = 78457;
	for (let i = 0; i < this.name.length; i++) {
		r = ((r * 17) ^ hashString(this.name[i])) & 0x7fffffff;
	}
	return r;
});

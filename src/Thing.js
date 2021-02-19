import * as etg from './etg.js';
import skillText from './skillText.js';
import Card from './Card.js';
import enums from './enum.json';

function decodeSkillName(cell) {
	const skid = cell & 0xffff,
		n = enums.Skill[skid],
		c = enums.SkillParams[skid] ?? 0;
	return c === 0
		? n
		: c === 1
		? `${n} ${cell >>> 16}`
		: `${n} ${(cell >>> 16) & 0xff} ${cell >>> 24}`;
}

export default class Thing {
	constructor(game, id) {
		if (!id || typeof id !== 'number') {
			throw new Error(`Invalid id ${id}`);
		}
		this.game = game;
		this.id = id;
	}
	toString() {
		return this.card.name;
	}
	get active() {
		const raw = this.game.game.get_skills(this.id),
			skills = new Map();
		let idx = 0;
		while (idx < raw.length) {
			const ev = enums.Event[raw[idx] & 255],
				lastidx = idx + (raw[idx] >>> 8),
				name = [];
			while (idx++ < lastidx) {
				name.push(decodeSkillName(raw[idx]));
			}
			if (name.length) skills.set(ev, name);
		}
		return skills;
	}
	get status() {
		const raw = this.game.game.get_stats(this.id),
			status = new Map();
		for (let i = 0; i < raw.length; i += 2) {
			status.set(enums.Stat[raw[i]], raw[i + 1]);
		}
		return status;
	}
	getSkill(k) {
		const name = Array.from(
			this.game.game.get_one_skill(this.id, enums.EventId[k]),
			decodeSkillName,
		);
		if (name.length) return name;
	}
	get ownerId() {
		return this.game.get_owner(this.id);
	}
	get owner() {
		return this.game.byId(this.game.get_owner(this.id));
	}
	get card() {
		return this.game.Cards.Codes[this.game.get(this.id, 'card')];
	}
	get type() {
		return this.game.get_kind(this.id);
	}
	get cast() {
		return this.game.get(this.id, 'cast');
	}
	get castele() {
		return this.game.get(this.id, 'castele');
	}
	get cost() {
		return this.game.get(this.id, 'cost');
	}
	get costele() {
		return this.game.get(this.id, 'costele');
	}
	get maxhp() {
		return this.game.get(this.id, 'maxhp');
	}
	get hp() {
		return this.game.get(this.id, 'hp');
	}
	get atk() {
		return this.game.get(this.id, 'atk');
	}
	get casts() {
		return this.game.get(this.id, 'casts');
	}
	get kind() {
		return this.game.get_kind(this.id);
	}
	getIndex() {
		return this.game.getIndex(this.id);
	}
	info() {
		const info =
			this.type === etg.Creature || this.type === etg.Weapon
				? `${this.trueatk()}|${this.truehp()}/${this.maxhp}`
				: this.type === etg.Shield
				? this.truedr().toString()
				: '';
		const stext = skillText(this);
		return !info ? stext : stext ? info + '\n' + stext : info;
	}
	isMaterial(type) {
		return this.game.game.material(this.id, type | 0);
	}
	canactive() {
		return this.game.game.canactive(this.id);
	}
	truedr() {
		return this.game.game.truedr(this.id);
	}
	truehp() {
		return this.game.game.truehp(this.id);
	}
	trueatk() {
		return this.game.game.trueatk(this.id);
	}
	getStatus(key) {
		return this.game.get(this.id, key);
	}
}

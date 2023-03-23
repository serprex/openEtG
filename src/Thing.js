import skillText from './skillText.js';
import enums from './enum.json' assert { type: 'json' };
import { decodeSkillName, read_skill, read_status } from './util.js';
import wasm from './wasm.js';

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
		return read_skill(this.game.game.get_skills(this.id));
	}
	get status() {
		return read_status(this.game.game.get_stats(this.id));
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
		const type = this.type == wasm.Kind.Spell ? this.card.type : this.type;
		const info =
			type === wasm.Kind.Creature || type === wasm.Kind.Weapon
				? `${this.trueatk()}|${this.truehp()}/${this.maxhp}`
				: type === wasm.Kind.Shield
				? this.truedr().toString()
				: '';
		const stext = skillText(this);
		return !info ? stext : stext ? info + '\n' + stext : info;
	}
	isMaterial(type) {
		return this.game.game.material(this.id, type);
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

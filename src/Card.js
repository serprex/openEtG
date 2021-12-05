import enums from './enum.json' assert { type: 'json' };
import * as etg from './etg.js';
import * as etgutil from './etgutil.js';
import skillText from './skillText.js';
import { read_skill, read_status } from './util.js';
import wasm from './wasm.js';

export default class Card {
	constructor(Cards, set, code, realcode) {
		this.Cards = Cards;
		this.type = wasm.card_type(set, code);
		this.element = wasm.card_element(set, code);
		this.name = enums.Card[code];
		this.code = realcode;
		this.rarity = wasm.card_rarity(set, code);
		this.attack = wasm.card_attack(set, code);
		this.health = wasm.card_health(set, code);
		this.cost = wasm.card_cost(set, code);
		this.costele = wasm.card_costele(set, code);
		this.cast = wasm.card_cast(set, code);
		this.castele = wasm.card_castele(set, code);
		this.active = read_skill(wasm.card_skills(set, code));
		this.status = read_status(wasm.card_stats(set, code));
	}

	get shiny() {
		return !!(this.code & 16384);
	}

	get upped() {
		return ((this.code & 0x3fff) - 1000) % 4000 > 1999;
	}

	valueOf() {
		return this.code;
	}

	as(card) {
		return card.asUpped(this.upped).asShiny(this.shiny);
	}

	isFree() {
		return (
			this.getStatus('pillar') && !this.upped && !this.rarity && !this.shiny
		);
	}

	info() {
		if (this.type === etg.Spell) {
			return skillText(this);
		} else {
			const text = [];
			if (this.type === etg.Shield && this.health)
				text.push(
					this.health > 0
						? `Reduce damage by ${this.health}`
						: `Increase damage by ${-this.health}`,
				);
			else if (this.type === etg.Creature || this.type === etg.Weapon)
				text.push(`${this.attack}|${this.health}`);
			const skills = skillText(this);
			if (skills) text.push(skills);
			return text.join('\n');
		}
	}

	toString() {
		return this.code;
	}

	asUpped(upped) {
		return this.upped === !!upped
			? this
			: this.Cards.Codes[etgutil.asUpped(this.code, upped)];
	}

	asShiny(shiny) {
		return this.shiny === !!shiny
			? this
			: this.Cards.Codes[etgutil.asShiny(this.code, shiny)];
	}

	isOf(card) {
		return (
			card.code === etgutil.asShiny(etgutil.asUpped(this.code, false), false)
		);
	}

	getStatus(key) {
		return this.status.get(key) | 0;
	}

	getSkill(key) {
		return this.active.get(key);
	}

	hasactive(key, name) {
		const a = this.getSkill(key);
		return !!(a && ~a.indexOf(name));
	}
}

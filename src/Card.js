import * as imm from './immutable.js';
import * as etg from './etg.js';
import * as util from './util.js';
import Skill from './Skill.js';
import * as etgutil from './etgutil.js';
import skillText from './skillText.js';
import parseSkill from './parseSkill.js';

const statuscache = new Map(),
	activecache = new Map(),
	activecastcache = new Map();

function readCost(coststr, defaultElement) {
	if (typeof coststr === 'number')
		return new Int8Array([coststr, defaultElement]);
	const cidx = coststr.indexOf(':'),
		cost = +(~cidx ? coststr.substr(0, cidx) : coststr);
	return isNaN(cost)
		? null
		: new Int8Array([cost, ~cidx ? +coststr.substr(cidx + 1) : defaultElement]);
}

export default class Card {
	constructor(Cards, type, info) {
		this.Cards = Cards;
		this.type = type;
		this.element = info.E;
		this.name = info.Name;
		this.code = info.Code;
		this.rarity = info.R | 0;
		this.attack = info.Attack | 0;
		this.health = info.Health | 0;
		if (info.Cost) {
			[this.cost, this.costele] = readCost(info.Cost, this.element);
		} else {
			this.cost = 0;
			this.costele = 0;
		}
		this.cast = 0;
		this.castele = 0;
		if (info.Skill) {
			if (this.type === etg.Spell) {
				this.active = new imm.Map({ cast: parseSkill(info.Skill) });
				this.cast = this.cost;
				this.castele = this.costele;
			} else if (activecache.has(info.Skill)) {
				this.active = activecache.get(info.Skill);
				const castinfo = activecastcache.get(info.Skill);
				if (castinfo) {
					[this.cast, this.castele] = castinfo;
				}
			} else {
				this.active = new imm.Map();
				for (const active of util.iterSplit(info.Skill, '+')) {
					const eqidx = active.indexOf('=');
					const a0 = ~eqidx ? active.substr(0, eqidx) : 'ownattack';
					const cast = readCost(a0, this.element);
					this.active = this.active.update(cast ? 'cast' : a0, a =>
						Skill.combine(a, parseSkill(active.substr(eqidx + 1))),
					);
					if (cast) {
						[this.cast, this.castele] = cast;
						activecastcache.set(info.Skill, cast);
					}
				}
				activecache.set(info.Skill, this.active);
			}
		} else this.active = new imm.Map();
		if (info.Status) {
			if (statuscache.has(info.Status)) {
				this.status = statuscache.get(info.Status);
			} else {
				this.status = new imm.Map();
				for (const status of util.iterSplit(info.Status, '+')) {
					const eqidx = status.indexOf('=');
					this.status = this.status.set(
						~eqidx ? status.substr(0, eqidx) : status,
						+(eqidx === -1 || status.substr(eqidx + 1)),
					);
				}
				statuscache.set(info.Status, this.status);
			}
		} else this.status = new imm.Map();
	}

	get shiny() {
		return !!(this.code & 16384);
	}

	get upped() {
		return (this.code & 0x3fff) > 6999;
	}

	hashCode() {
		return this.code;
	}

	valueOf() {
		return this.code;
	}

	as(card) {
		return card.asUpped(this.upped).asShiny(this.shiny);
	}

	isFree() {
		return (
			this.type === etg.Pillar && !this.upped && !this.rarity && !this.shiny
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

	getStatus = function(key) {
		return this.status.get(key);
	};
}

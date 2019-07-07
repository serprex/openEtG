import * as imm from '../immutable.js';
import * as util from '../util.js';
import * as etg from './etg.js';
import { Thing } from './Thing.js';
import * as Cards from './Cards.js';
import * as etgutil from '../etgutil.js';
import skillText from './skillText.js';
import Actives from './Skills.js';

const statuscache = {},
	activecache = {},
	activecastcache = {};
export default function Card(type, info) {
	this.type = type;
	this.element = info.E;
	this.name = info.Name;
	this.code = info.Code;
	this.tier = info.Tier;
	this.attack = info.Attack | 0;
	this.health = info.Health | 0;
	if (info.Cost) {
		[this.cost, this.costele] = readCost(info.Cost, this.element);
	} else {
		this.cost = 0;
		this.costele = 0;
	}
	if (info.Active) {
		if (this.type === etg.Spell) {
			this.active = new imm.Map({ cast: Actives[info.Active] });
			this.cast = this.cost;
			this.castele = this.costele;
		} else if (info.Active in activecache) {
			this.active = activecache[info.Active];
			const castinfo = activecastcache[info.Active];
			if (castinfo) {
				[this.cast, this.castele] = castinfo;
			}
		} else {
			this.active = new imm.Map();
			for (const active of util.iterSplit(info.Active, '+')) {
				const eqidx = active.indexOf('=');
				const a0 = ~eqidx ? active.substr(0, eqidx) : 'auto';
				const cast = readCost(a0, this.element);
				Thing.prototype.addactive.call(
					this,
					cast ? 'cast' : a0,
					Actives[active.substr(eqidx + 1)],
				);
				if (cast) {
					[this.cast, this.castele] = cast;
					activecastcache[info.Active] = cast;
				}
			}
			activecache[info.Active] = this.active;
		}
	} else this.active = new imm.Map();
	if (info.Status) {
		if (info.Status in statuscache) {
			this.status = statuscache[info.Status];
		} else {
			this.status = new imm.Map();
			for (const status of util.iterSplit(info.Status, '+')) {
				const eqidx = status.indexOf('=');
				this.status = this.status.set(
					~eqidx ? status.substr(0, eqidx) : status,
					eqidx == -1 || +status.substr(eqidx + 1),
				);
			}
			statuscache[info.Status] = this.status;
		}
	} else this.status = new imm.Map();
}
Object.defineProperty(Card.prototype, 'upped', {
	get: function() {
		return (this.code & 0x3fff) > 6999;
	},
});
Card.prototype.info = function() {
	if (this.type == etg.Spell) {
		return skillText(this);
	} else {
		var text = [];
		if (this.type == etg.Shield && this.health)
			text.push('Reduce damage by ' + this.health);
		else if (this.type == etg.Creature || this.type == etg.Weapon)
			text.push(this.attack + '|' + this.health);
		var skills = skillText(this);
		if (skills) text.push(skills);
		return text.join('\n');
	}
};
Card.prototype.toString = function() {
	return this.code;
};
Card.prototype.asUpped = function(upped) {
	return this.upped == upped
		? this
		: Cards.Codes[etgutil.asUpped(this.code, upped)];
};
Card.prototype.isOf = function(card) {
	return card.code == etgutil.asUpped(this.code, false);
};
Card.prototype.getStatus = function(key) {
	return this.status.get(key) || 0;
};
function readCost(coststr, defaultElement) {
	if (typeof coststr == 'number')
		return new Int8Array([coststr, defaultElement]);
	const cidx = coststr.indexOf(':'),
		cost = +(~cidx ? coststr.substr(0, cidx) : coststr);
	return isNaN(cost)
		? null
		: new Int8Array([cost, ~cidx ? +coststr.substr(cidx + 1) : defaultElement]);
}

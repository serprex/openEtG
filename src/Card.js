'use strict';
const imm = require('immutable'),
	etg = require('./etg'),
	util = require('./util'),
	statuscache = {},
	activecache = {},
	activecastcache = {};
function Card(type, info) {
	this.type = type;
	this.element = info.E;
	this.name = info.Name;
	this.code = info.Code;
	this.rarity = info.R || 0;
	this.attack = info.Attack || 0;
	this.health = info.Health || 0;
	if (info.Cost) {
		[this.cost, this.costele] = readCost(info.Cost, this.element);
	} else {
		this.cost = 0;
		this.costele = 0;
	}
	this.cast = 0;
	this.castele = 0;
	if (info.Skill) {
		if (this.type == etg.Spell) {
			this.active = new imm.Map({ cast: parseSkill(info.Skill) });
			this.cast = this.cost;
			this.castele = this.costele;
		} else if (info.Skill in activecache) {
			this.active = activecache[info.Skill];
			const castinfo = activecastcache[info.Skill];
			if (castinfo) {
				[this.cast, this.castele] = castinfo;
			}
		} else {
			this.active = new imm.Map();
			for (const active of util.iterSplit(info.Skill, '+')) {
				const eqidx = active.indexOf('=');
				const a0 = ~eqidx ? active.substr(0, eqidx) : 'ownattack';
				const cast = readCost(a0, this.element);
				Thing.prototype.addactive.call(
					this,
					cast ? 'cast' : a0,
					parseSkill(active.substr(eqidx + 1)),
				);
				if (cast) {
					[this.cast, this.castele] = cast;
					activecastcache[info.Skill] = cast;
				}
			}
			activecache[info.Skill] = this.active;
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
	Object.freeze(this);
}
Object.defineProperty(Card.prototype, 'shiny', {
	get: function() {
		return this.code & 16384;
	},
});
Object.defineProperty(Card.prototype, 'upped', {
	get: function() {
		return (this.code & 0x3fff) > 6999;
	},
});
module.exports = Card;

Card.prototype.as = function(card) {
	return card.asUpped(this.upped).asShiny(this.shiny);
};
Card.prototype.isFree = function() {
	return this.type == etg.Pillar && !this.upped && !this.rarity && !this.shiny;
};
Card.prototype.info = function() {
	if (this.type == etg.Spell) {
		return skillText(this);
	} else {
		const text = [];
		if (this.type == etg.Shield && this.health)
			text.push('Reduce damage by ' + this.health);
		else if (this.type == etg.Creature || this.type == etg.Weapon)
			text.push(this.attack + '|' + this.health);
		const skills = skillText(this);
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
Card.prototype.asShiny = function(shiny) {
	return !this.shiny == !shiny
		? this
		: Cards.Codes[etgutil.asShiny(this.code, shiny)];
};
Card.prototype.isOf = function(card) {
	return card.code == etgutil.asShiny(etgutil.asUpped(this.code, false), false);
};
Card.prototype.getStatus = function(key) {
	return this.status.get(key) || 0;
}
function readCost(coststr, defaultElement) {
	if (typeof coststr == 'number')
		return new Int8Array([coststr, defaultElement]);
	const cidx = coststr.indexOf(':'),
		cost = +(~cidx ? coststr.substr(0, cidx) : coststr);
	return isNaN(cost)
		? null
		: new Int8Array([
				cost,
				~cidx ? +(coststr.substr(cidx + 1)) : defaultElement,
			]);
}

var audio = require('./audio');
var Cards = require('./Cards');
var Thing = require('./Thing');
var etgutil = require('./etgutil');
var skillText = require('./skillText');
var parseSkill = require('./parseSkill');

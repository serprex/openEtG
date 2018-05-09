'use strict';
const imm = require('immutable'),
	util = require('../util'),
	statuscache = {},
	activecache = {},
	activecastcache = {};
function Card(type, info) {
	this.type = type;
	this.element = info.E;
	this.name = info.Name;
	this.code = info.Code;
	this.tier = info.Tier;
	if (info.Attack) {
		this.attack = parseInt(info.Attack);
	}
	if (info.Health) {
		this.health = parseInt(info.Health);
	}
	this.readCost('cost', info.Cost || '0');
	if (info.Active) {
		if (this.type == etg.SpellEnum) {
			this.active = new imm.Map({ cast: Actives[info.Active] });
			this.cast = this.cost;
			this.castele = this.costele;
		} else if (info.Active in activecache) {
			this.active = activecache[info.Active];
			var castinfo = activecastcache[info.Active];
			if (castinfo) {
				[this.cast, this.castele] = castinfo;
			}
		} else {
			this.active = new imm.Map();
			for (const active of util.iterSplit(info.Active, '+')) {
				const eqidx = active.indexOf('=');
				const a0 = ~eqidx ? active.substr(0, eqidx) : 'auto';
				const cast = this.readCost(a0, this.element);
				if (active.length == 1) {
					this.active = this.active.set('auto', Actives[active[0]]);
				} else {
					var iscast = this.readCost('cast', active[0]);
					this.active = this.active.set(iscast ? 'cast' : active[0], Actives[active[1]]);
					if (iscast) activecastcache[info.Active] = [this.cast, this.castele];
				}
			}	activecache[info.Active] = this.active;
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
module.exports = Card;
Card.prototype.attack = 0;
Card.prototype.health = 0;
Card.prototype.status = {};
Card.prototype.active = {};
Card.prototype.readCost = function(attr, cost) {
	if (typeof cost == 'number') {
		this[attr] = cost;
		this[attr + 'ele'] = this.element;
		return false;
	}
	var c = cost.split(':');
	var cost = parseInt(c[0]);
	if (isNaN(cost)) return;
	this[attr] = cost;
	this[attr + 'ele'] = c.length == 1 ? this.element : parseInt(c[1]);
	return true;
};
Card.prototype.info = function() {
	if (this.type == etg.SpellEnum) {
		return skillText(this);
	} else {
		var text = [];
		if (this.type == etg.ShieldEnum && this.health)
			text.push('Reduce damage by ' + this.health);
		else if (this.type == etg.CreatureEnum || this.type == etg.WeaponEnum)
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

var etg = require('./etg');
var Cards = require('./Cards');
var etgutil = require('../etgutil');
var skillText = require('./skillText');
var Actives = require('./Skills');

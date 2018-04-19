'use strict';
function Card(type, info) {
	this.type = type;
	this.element = parseInt(info.E);
	this.name = info.Name;
	this.code = info.Code;
	this.tier = parseInt(info.Tier);
	this.upped = this.code > 6999;
	if (info.Attack) {
		this.attack = parseInt(info.Attack);
	}
	if (info.Health) {
		this.health = parseInt(info.Health);
	}
	this.readCost('cost', info.Cost || '0');
	if (info.Active) {
		if (this.type == etg.SpellEnum) {
			this.active = Actives[info.Active];
		} else if (info.Active in activecache) {
			this.active = activecache[info.Active];
			var castinfo = activecastcache[info.Active];
			if (castinfo) {
				this.cast = castinfo[0];
				this.castele = castinfo[1];
			}
		} else {
			activecache[info.Active] = this.active = {};
			var actives = info.Active.split('+');
			for (var i = 0; i < actives.length; i++) {
				var active = actives[i].split('=');
				if (active.length == 1) {
					this.active.auto = Actives[active[0]];
				} else {
					var iscast = this.readCost('cast', active[0]);
					this.active[iscast ? 'cast' : active[0]] = Actives[active[1]];
					if (iscast) activecastcache[info.Active] = [this.cast, this.castele];
				}
			}
		}
	}
	if (info.Status) {
		if (info.Status in statuscache) {
			this.status = statuscache[info.Status];
		} else {
			statuscache[info.Status] = this.status = {};
			var statuses = info.Status.split('+');
			for (var i = 0; i < statuses.length; i++) {
				var status = statuses[i].split('=');
				this.status[status[0]] = status.length == 1 || parseInt(status[1]);
			}
		}
	}
}
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
var Actives = require('./Actives');
var statuscache = {},
	activecache = {},
	activecastcache = {};

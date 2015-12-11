"use strict";
function Card(type, info){
	this.type = type;
	this.element = parseInt(info.E);
	this.name = info.Name;
	this.code = info.Code;
	this.rarity = parseInt(info.R) || 0;
	this.attack = parseInt(info.Attack) || 0;
	this.health = parseInt(info.Health) || 0;
	if (info.Cost){
		var cost = readCost(info.Cost, this.element);
		this.cost = cost[0];
		this.costele = cost[1];
	}else{
		this.cost = 0;
		this.costele = 0;
	}
	this.cast = 0;
	this.castele = 0;
	if (info.Skill){
		if (this.type == etg.SpellEnum){
			this.active = {cast:etg.parseSkill(info.Skill)};
			this.cast = this.cost;
			this.castele = this.costele;
		}else if (info.Skill in activecache){
			this.active = activecache[info.Skill];
			var castinfo = activecastcache[info.Skill];
			if (castinfo){
				this.cast = castinfo[0];
				this.castele = castinfo[1];
			}
		}else{
			activecache[info.Skill] = this.active = {};
			util.iterSplit(info.Skill, "+", function(active){
				var eqidx = active.indexOf("=");
				var a0 = ~eqidx ? active.substr(0, eqidx) : "auto";
				var cast = readCost(a0, this.element);
				Thing.prototype.addactive.call(this, cast?"cast":a0, etg.parseSkill(active.substr(eqidx+1)));
				if (cast){
					this.cast = cast[0];
					this.castele = cast[1];
					activecastcache[info.Skill] = cast;
				}
			}, this);
			Object.freeze(this.active);
		}
	}else this.active = emptyObj;
	if (info.Status){
		if (info.Status in statuscache){
			this.status = statuscache[info.Status];
		}else{
			statuscache[info.Status] = this.status = Object.create(etg.DefaultStatus);
			util.iterSplit(info.Status, "+", function(status){
				var eqidx = status.indexOf("=");
				this.status[~eqidx?status.substr(0,eqidx):status] = eqidx == -1 || parseInt(status.substr(eqidx+1));
			}, this);
			Object.freeze(this.status);
		}
	}else this.status = emptyStatus;
	Object.freeze(this);
}
Object.defineProperty(Card.prototype, "shiny", { get: function() { return this.code & 16384; }});
Object.defineProperty(Card.prototype, "upped", { get: function() { return (this.code&0x3FFF) > 6999; }});
module.exports = Card;

Card.prototype.as = function(card){
	return card.asUpped(this.upped).asShiny(this.shiny);
}
Card.prototype.isFree = function() {
	return this.type == etg.PillarEnum && !this.upped && !this.rarity && !this.shiny;
}
Card.prototype.info = function(){
	if (this.type == etg.SpellEnum){
		return skillText(this);
	}else{
		var text = [];
		if (this.type == etg.ShieldEnum && this.health) text.push("Reduce damage by "+this.health)
		else if (this.type == etg.CreatureEnum || this.type == etg.WeaponEnum) text.push(this.attack+"|"+this.health);
		var skills = skillText(this);
		if (skills) text.push(skills);
		return text.join("\n");
	}
}
Card.prototype.toString = function(){ return this.code; }
Card.prototype.asUpped = function(upped){
	return this.upped == upped ? this : Cards.Codes[etgutil.asUpped(this.code, upped)];
}
Card.prototype.asShiny = function(shiny){
	return !this.shiny == !shiny ? this : Cards.Codes[etgutil.asShiny(this.code, shiny)];
}
Card.prototype.isOf = function(card){
	return card.code == etgutil.asShiny(etgutil.asUpped(this.code, false), false);
}
Card.prototype.play = function(owner, src, tgt){
	if (this.type <= etg.PermanentEnum){
		ui.playSound("permPlay");
		var cons = [etg.Permanent, etg.Weapon, etg.Shield, etg.Permanent][this.type];
		return new cons(this, owner).place(true);
	}else if (this.type == etg.SpellEnum){
		src.castSpell(tgt, this.active.cast);
	}else if (this.type == etg.CreatureEnum){
		ui.playSound("creaturePlay");
		return new etg.Creature(this, owner).place(true);
	}else console.log("Unknown card type: " + this.type);
}
function readCost(coststr, defaultElement){
	if (typeof coststr == "number") return new Int8Array([coststr, defaultElement]);
	var cidx = coststr.indexOf(":"), cost = parseInt(~cidx?coststr.substr(0,cidx):coststr);
	return isNaN(cost) ? null : new Int8Array([cost, ~cidx?parseInt(coststr.substr(cidx+1)):defaultElement]);
}

var ui = require("./ui");
var etg = require("./etg");
var util = require("./util");
var Cards = require("./Cards");
var Thing = require("./Thing");
var etgutil = require("./etgutil");
var skillText = require("./skillText");
var emptyObj = Object.freeze({}), emptyStatus = Object.freeze(Object.create(etg.DefaultStatus));
var statuscache = {}, activecache = {}, activecastcache = {};

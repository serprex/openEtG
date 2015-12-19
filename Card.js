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
		if (this.type == etg.Spell){
			this.active = {cast:parseSkill(info.Skill)};
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
				Thing.prototype.addactive.call(this, cast?"cast":a0, parseSkill(active.substr(eqidx+1)));
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
			statuscache[info.Status] = this.status = new Status();
			util.iterSplit(info.Status, "+", function(status){
				var eqidx = status.indexOf("=");
				this.status.set(~eqidx?status.substr(0,eqidx):status, eqidx == -1 || parseInt(status.substr(eqidx+1)));
			}, this);
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
	return this.type == etg.Pillar && !this.upped && !this.rarity && !this.shiny;
}
Card.prototype.info = function(){
	if (this.type == etg.Spell){
		return skillText(this);
	}else{
		var text = [];
		if (this.type == etg.Shield && this.health) text.push("Reduce damage by "+this.health)
		else if (this.type == etg.Creature || this.type == etg.Weapon) text.push(this.attack+"|"+this.health);
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
Card.prototype.play = function(owner, src, tgt, fromhand){
	if (this.type == etg.Spell){
		src.castSpell(tgt, this.active.cast);
	}else{
		audio.playSound(this.type <= etg.Permanent ? "permPlay" : "creaturePlay");
		var thing = new Thing(this);
		if (this.type == etg.Creature) owner.addCrea(thing, fromhand);
		else if (this.type == etg.Permanent || this.type == etg.Pillar) owner.addPerm(thing, fromhand);
		else if (this.type == etg.Weapon) owner.setWeapon(thing, fromhand);
		else owner.setShield(thing, fromhand);
		return thing;
	}
}
function readCost(coststr, defaultElement){
	if (typeof coststr == "number") return new Int8Array([coststr, defaultElement]);
	var cidx = coststr.indexOf(":"), cost = parseInt(~cidx?coststr.substr(0,cidx):coststr);
	return isNaN(cost) ? null : new Int8Array([cost, ~cidx?parseInt(coststr.substr(cidx+1)):defaultElement]);
}

var etg = require("./etg");
var util = require("./util");
var audio = require("./audio");
var Cards = require("./Cards");
var Thing = require("./Thing");
var Status = require("./Status");
var etgutil = require("./etgutil");
var skillText = require("./skillText");
var parseSkill = require("./parseSkill");
var emptyObj = Object.freeze({}), emptyStatus = new Status(), statuscache = {}, activecache = {}, activecastcache = {};

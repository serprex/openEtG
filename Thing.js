"use strict"
var passives = new Set(["airborne", "aquatic", "nocturnal", "voodoo", "swarm", "ranged", "additive", "stackable", "token", "poisonous", "golem"]);
function Thing(card, owner){
	this.owner = owner;
	this.card = card;
	this.cast = card.cast;
	this.castele = card.castele;
	if (this.status){
		for (var key in this.status){
			if (passives.has(key)) delete this.status[key];
		}
		for (var key in card.status){
			if (!this.status[key]) this.status[key] = card.status[key];
		}
	}else{
		this.status = etg.cloneStatus(card.status);
		this.usedactive = true;
	}
	this.active = util.clone(card.active);
}
module.exports = Thing;

Thing.prototype.toString = function(){ return this.card.name; }
Thing.prototype.proc = function(name, param) {
	function proc(c){
		var a;
		if (c && (a = c.active[name])){
			a.call(null, c, this, param);
		}
	}
	if (this.active && this.active["own" + name]){
		this.active["own" + name].call(null, this, this, param);
	}
	for(var i=0; i<2; i++){
		var pl = i==0?this.owner:this.owner.foe;
		pl.creatures.forEach(proc, this);
		pl.permanents.forEach(proc, this);
		proc.call(this, pl.shield);
		proc.call(this, pl.weapon);
	}
}
Thing.prototype.info = function(){
	return skillText(this);
}
var activetexts = ["hit", "death", "owndeath", "buff", "destroy", "draw", "play", "spell", "dmg", "shield", "postauto"];
Thing.prototype.activetext = function(){
	if (this.active.cast) return this.cast + ":" + this.castele + this.active.cast.activename[0];
	for(var i=0; i<activetexts.length; i++){
		if (this.active[activetexts[i]])
			return activetexts[i] + " " + this.active[activetexts[i]].activename.join(" ");
	}
	return this.active.auto ? this.active.auto.activename.join(" ") : "";
}
Thing.prototype.place = function(fromhand){
	this.proc("play", fromhand);
}
Thing.prototype.delay = function(x){
	this.status.delayed += x;
	if (this.status.voodoo) this.owner.foe.delay(x);
}
Thing.prototype.freeze = function(x){
	if (!this.active.ownfreeze || this.active.ownfreeze(this)){
		Effect.mkText("Freeze", this);
		if (x > this.status.frozen) this.status.frozen = x;
		if (this.status.voodoo) this.owner.foe.freeze(x);
	}
}
Thing.prototype.lobo = function(){
	for (var key in this.active){
		this.active[key].activename.forEach(function(name){
			if (!etg.parseSkill(name).passive){
				this.rmactive(key, name);
			}
		}, this);
	}
}
var mutantabilities = ["hatch","freeze","burrow","destroy","steal","dive","mend","paradox","lycanthropy","growth 1","infect","gpull","devour","mutation","growth 2","ablaze","poison 1","deja","endow","guard","mitosis"];
Thing.prototype.mutantactive = function(){
	this.lobo();
	var index = this.owner.upto(mutantabilities.length+2)-2;
	if (index<0){
		this.status[["momentum","immaterial"][~index]] = true;
	}else{
		var active = Skills[mutantabilities[index]];
		if (mutantabilities[index] == "growth 1"){
			this.addactive("death", active);
		}else{
			this.active.cast = active;
			this.cast = this.owner.uptoceil(2);
			this.castele = this.card.element;
			return true;
		}
	}
}
Thing.prototype.isMaterial = function(type) {
	return (type ? this instanceof type : !(this instanceof etg.CardInstance) && !(this instanceof Player)) && !this.status.immaterial && !this.status.burrowed;
}
function combineactive(a1, a2){
	if (!a1){
		return a2;
	}
	var combine = function(){
		var v1 = a1.apply(null, arguments), v2 = a2.apply(null, arguments);
		return v1 === undefined ? v2 : v2 === undefined ? v1 : v1 === true || v2 === true ? true : v1+v2;
	}
	combine.activename = a1.activename.concat(a2.activename);
	return combine;
}
Thing.prototype.addactive = function(type, active){
	this.active[type] = combineactive(this.active[type], active);
}
Thing.prototype.rmactive = function(type, activename){
	if (!this.active[type])return;
	var actives = this.active[type].activename, idx;
	if (~(idx=actives.indexOf(activename))){
		if (actives.length == 1){
			delete this.active[type];
		} else {
			this.active[type] = actives.reduce(function(previous, current, i){
				return i == idx ? previous : combineactive(previous, Skills[current]);
			}, null);
		}
	}
}
Thing.prototype.hasactive = function(type, activename) {
	return (type in this.active) && ~this.active[type].activename.indexOf(activename);
}
Thing.prototype.canactive = function() {
	return this.owner.game.turn == this.owner && this.active.cast && !this.usedactive && !this.status.delayed && !this.status.frozen && this.owner.canspend(this.castele, this.cast);
}
Thing.prototype.castSpell = function(t, active, nospell){
	var data = {tgt: t, active: active};
	this.proc("prespell", data);
	if (data.evade){
		if (t) Effect.mkText("Evade", t);
	}else{
		active(this, data.tgt);
		if (!nospell) this.proc("spell", data);
	}
}
Thing.prototype.useactive = function(t) {
	if (this.owner.spend(this.castele, this.cast)){
		this.usedactive = true;
		if (this.status.neuro) this.addpoison(1);
		this.castSpell(t, this.active.cast);
		this.owner.game.updateExpectedDamage();
	}
}
Thing.prototype.rng = function(){
	return this.owner.game.rng.real();
}
Thing.prototype.upto = function(x){
	return Math.floor(this.owner.game.rng.rnd()*x);
}
Thing.prototype.uptoceil = function(x){
	return Math.ceil((1-this.owner.game.rng.rnd())*x);
}
Thing.prototype.choose = function(x){
	return x[this.upto(x.length)];
}
Thing.prototype.randomcard = function(upped, filter){
	var keys = Cards.filter(upped, filter);
	return keys && keys.length && Cards.Codes[this.choose(keys)];
}
Thing.prototype.shuffle = function(array) {
	var counter = array.length, temp, index;
	while (counter--) {
		index = this.upto(counter)|0;
		temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}
	return array;
}
Thing.prototype.buffhp = function(x) {
	var isPlayer = this instanceof require("./Player");
	if (isPlayer && this.maxhp < 500) this.maxhp = Math.min(this.maxhp+x, 500);
	else this.maxhp += x;
	this.dmg(-x);
}

var etg = require("./etg");
var util = require("./util");
var Cards = require("./Cards");
var Effect = require("./Effect");
var Player = require("./Player");
var Skills = require("./Skills");
var skillText = require("./skillText");

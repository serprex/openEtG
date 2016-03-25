"use strict"
var passives = new Set(["airborne", "aquatic", "nocturnal", "voodoo", "swarm", "ranged", "additive", "stackable", "token", "poisonous", "golem"]);
function Thing(card){
	this.owner = null;
	this.card = card;
	this.cast = card.cast;
	this.castele = card.castele;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.status = card.status.clone();
	this.usedactive = true;
	this.type = 0;
	this.active = util.clone(card.active);
}
module.exports = Thing;

Thing.prototype.toString = function(){ return this.card.name; }
Thing.prototype.transform = function(card){
	this.card = card;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	for (var i=0; i<this.status.keys.length; i++){
		var key = this.status.keys[i];
		if (passives.has(key)) this.status.vals[i] = 0;
	}
	for (var i=0; i<card.status.keys.length; i++){
		var key = card.status.keys[i];
		if (!this.status.get(key)) this.status.set(key, card.status.vals[i]);
	}
	this.active = util.clone(card.active);
	if (this.status.get("mutant")){
		var buff = this.upto(25);
		this.buffhp(Math.floor(buff/5));
		this.atk += buff%5;
		this.mutantactive();
	}else{
		this.cast = card.cast;
		this.castele = card.castele;
	}
}
Thing.prototype.getIndex = function(){
	return this.type == etg.Weapon ? (this.weapon == this ? 0 : -1) :
		this.type == etg.Shield ? (this.shield == this ? 0 : -1) :
		(this.type == etg.Creature ? this.owner.creatures :
		this.type == etg.Permanent ? this.owner.permanents :
		this.owner.hand).indexOf(this);
}
Thing.prototype.remove = function(index){
	if (this.type == etg.Weapon){
		if (this.owner.weapon != this) return -1;
		this.owner.weapon = undefined;
		return 0;
	}
	if (this.type == etg.Shield){
		if (this.owner.shield != this) return -1;
		this.owner.shield = undefined;
		return 0;
	}
	if (index === undefined) index = this.getIndex();
	var arr = undefined;
	if (this.type == etg.Creature) {
		if (this.owner.gpull == this) this.owner.gpull = undefined;
		arr = this.owner.creatures;
	}else if (this.type == etg.Permanent) {
		arr = this.owner.permanents;
	}
	if (arr != undefined){
		arr[index] = undefined;
	} else if (this.type == etg.Spell && ~index) {
		this.owner.hand.splice(index, 1);
	}
	return index;
}
Thing.prototype.die = function(){
	var idx = this.remove();
	if (idx == -1) return;
	if (this.type <= etg.Permanent){
		this.proc("destroy", {});
	} else if (this.type == etg.Spell){
		this.proc("discard");
	} else if (this.type == etg.Creature && !this.trigger("predeath")){
		if (this.status.get("aflatoxin") & !this.card.isOf(Cards.MalignantCell)){
			var cell = this.owner.creatures[idx] = new Thing(this.card.as(Cards.MalignantCell));
			cell.owner = this.owner;
			cell.type = etg.Creature;
		}
		if (this.owner.game.bonusstats != null && this.owner == this.owner.game.player2) this.owner.game.bonusstats.creatureskilled++;
		this.deatheffect(idx);
	}
}
Thing.prototype.deatheffect = function(index){
	var data = {index:index}
	this.proc("death", data);
	if (~index) Effect.mkDeath(ui.creaturePos(this.owner == this.owner.game.player1?0:1, index));
}
Thing.prototype.clone = function(owner){
	var obj = Object.create(Thing.prototype);
	obj.owner = owner;
	obj.card = this.card;
	obj.cast = this.cast;
	obj.castele = this.castele;
	obj.hp = this.hp;
	obj.maxhp = this.maxhp;
	obj.atk = this.atk;
	obj.status = this.status.clone();
	obj.usedactive = this.usedactive;
	obj.type = this.type;
	obj.active = util.clone(this.active);
	return obj;
}
Thing.prototype.hash = function(){
	var hash = (this.owner == this.owner.game.player1 ? 17 : 19) ^ (this.type*0x8888888) ^ this.card.code ^
		this.status.hash() ^ (this.hp*17 + this.atk*31 - this.maxhp - this.usedactive*3);
	for (var key in this.active){
		hash ^= util.hashString(key + ":" + this.active[key].name.join(" "));
	}
	if (this.active.cast){
		hash ^= (this.castele | this.cast<<16) * 7;
	}
	return hash & 0x7ffffff;
}
Thing.prototype.trigger = function(name, t, param) {
	return this.active[name] ? this.active[name].func(this, t, param) : 0;
}
Thing.prototype.proc = function(name, param) {
	function proc(c){
		if (c) c.trigger(name, this, param);
	}
	if (this.active){
		this.trigger("own" + name, this, param);
	}
	for(var i=0; i<2; i++){
		var pl = i==0?this.owner:this.owner.foe;
		pl.creatures.forEach(proc, this);
		pl.permanents.forEach(proc, this);
		proc.call(this, pl.shield);
		proc.call(this, pl.weapon);
	}
}
Thing.prototype.calcCore = function(prefix, filterstat){
	if (!prefix(this)) return 0;
	for (var j=0; j<2; j++){
		var pl = j == 0 ? this.owner : this.owner.foe;
		if (pl.permanents.some(function(pr){return pr && pr.status.get(filterstat)})) return 1;
	}
	return 0;
}
Thing.prototype.calcCore2 = function(prefix, filterstat){
	if (!prefix(this)) return 0;
	var bonus = 0;
	for (var j=0; j<2; j++){
		var pl = j == 0 ? this.owner : this.owner.foe, pr;
		for (var i=0; i<16; i++){
			if ((pr = pl.permanents[i]) && pr.status.get(filterstat)){
				if (pr.card.upped) return 2;
				else bonus = 1;
			}
		}
	}
	return bonus;
}
function isEclipseCandidate(c){
	return c.status.get("nocturnal") && c.type == etg.Creature;
}
function isWhetCandidate(c){
	return c.status.get("golem") || c.type == etg.Weapon || c.card.type == etg.Weapon;
}
Thing.prototype.calcBonusAtk = function(){
	return this.calcCore2(isEclipseCandidate, "nightfall") + this.calcCore(isWhetCandidate, "whetstone");
}
Thing.prototype.calcBonusHp = function(){
	return this.calcCore(isEclipseCandidate, "nightfall") + this.calcCore2(isWhetCandidate, "whetstone") + this.trigger("hp");
}
Thing.prototype.info = function(){
	var info = this.type == etg.Creature ? this.trueatk()+"|"+this.truehp()+"/"+this.maxhp :
		this.type == etg.Weapon ? this.trueatk().toString() :
		this.type == etg.Shield ? this.truedr().toString() :
		"";
	var stext = skillText(this);
	return !info ? stext : stext ? info + "\n" + stext : info;
}
var activetexts = ["hit", "death", "owndeath", "buff", "destroy", "draw", "play", "spell", "dmg", "shield", "postauto"];
Thing.prototype.activetext = function(){
	if (this.active.cast) return this.cast + ":" + this.castele + this.active.cast.name[0];
	for(var i=0; i<activetexts.length; i++){
		if (this.active[activetexts[i]])
			return activetexts[i] + " " + this.active[activetexts[i]].name.join(" ");
	}
	return this.active.auto ? this.active.auto.name.join(" ") : "";
}
Thing.prototype.place = function(owner, type, fromhand){
	this.owner = owner;
	this.type = type;
	this.proc("play", fromhand);
}
Thing.prototype.dmg = function(x, dontdie){
	if (!x) return 0;
	else if (this.type == etg.Weapon) return x<0 ? 0 : this.owner.dmg(x);
	else{
		var dmg = x<0 ? Math.max(this.hp-this.maxhp, x) : Math.min(this.truehp(), x);
		this.hp -= dmg;
		this.proc("dmg", dmg);
		if (this.truehp() <= 0){
			if (!dontdie)this.die();
		}else if (dmg>0 && this.status.get("voodoo")) this.owner.foe.dmg(x);
		return dmg;
	}
}
Thing.prototype.spelldmg = function(x, dontdie){
	return this.trigger("spelldmg", undefined, x) ? 0 : this.dmg(x, dontdie);
}
Thing.prototype.addpoison = function(x) {
	if (this.type == etg.Weapon) this.owner.addpoison(x);
	else if (!this.active.ownpoison || this.trigger("ownpoison")){
		this.status.incr("poison", x);
		if (this.status.get("voodoo")){
			this.owner.foe.addpoison(x);
		}
	}
}
Thing.prototype.delay = function(x){
	this.status.incr("delayed", x);
	if (this.status.get("voodoo")) this.owner.foe.delay(x);
}
Thing.prototype.freeze = function(x){
	if (!this.active.ownfreeze || this.trigger("ownfreeze")){
		Effect.mkText("Freeze", this);
		if (x > this.status.get("frozen")) this.status.set("frozen", x);
		if (this.status.get("voodoo")) this.owner.foe.freeze(x);
	}
}
Thing.prototype.lobo = function(){
	for (var key in this.active){
		this.active[key].name.forEach(function(name){
			if (!parseSkill(name).passive){
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
		this.status.set(["momentum","immaterial"][~index], 1);
	}else{
		var active = Skills[mutantabilities[index]];
		if (mutantabilities[index] == "growth 1"){
			this.addactive("death", active);
		}else{
			this.active.cast = active;
			this.cast = 1+this.owner.upto(2);
			this.castele = this.card.element;
			return true;
		}
	}
}
Thing.prototype.isMaterial = function(type) {
	return (type == etg.Permanent ? this.type <= type : type ? this.type == type : this.type != etg.Spell && this.type != etg.Player) && !this.status.get("immaterial") && !this.status.get("burrowed");
}
function combineactive(a1, a2){
	if (!a1){
		return a2;
	}
	return { func: function(c, t, data){
		var v1 = a1.func(c, t, data), v2 = a2.func(c, t, data);
		return v1 === undefined ? v2 : v2 === undefined ? v1 : v1 === true || v2 === true ? true : v1+v2;
	}, name: a1.name.concat(a2.name) };
}
Thing.prototype.addactive = function(type, active){
	this.active[type] = combineactive(this.active[type], active);
}
Thing.prototype.rmactive = function(type, name){
	if (!this.active[type])return;
	var actives = this.active[type].name, idx;
	if (~(idx=actives.indexOf(name))){
		if (actives.length == 1){
			delete this.active[type];
		} else {
			this.active[type] = actives.reduce(function(previous, current, i){
				return i == idx ? previous : combineactive(previous, Skills[current]);
			}, null);
		}
	}
}
Thing.prototype.hasactive = function(type, name) {
	return (type in this.active) && ~this.active[type].name.indexOf(name);
}
Thing.prototype.canactive = function(spend) {
	if (this.owner.game.turn != this.owner) return false;
	else if (this.type == etg.Spell){
		return !this.owner.usedactive && this.owner[spend?"spend":"canspend"](this.card.costele, this.card.cost);
	}else return this.active.cast && !this.usedactive && !this.status.get("delayed") && !this.status.get("frozen") && this.owner.canspend(this.castele, this.cast);
}
Thing.prototype.castSpell = function(t, active, nospell){
	var data = {tgt: t, active: active};
	this.proc("prespell", data);
	if (data.evade){
		if (t) Effect.mkText("Evade", t);
	}else{
		active.func(this, data.tgt);
		if (!nospell) this.proc("spell", data);
	}
}
Thing.prototype.useactive = function(t) {
	var owner = this.owner;
	if (this.type == etg.Spell){
		if (!this.canactive(true)){
			return console.log(this.owner + " cannot cast " + this);
		}
		this.remove();
		if (owner.status.get("neuro")) owner.addpoison(1);
		this.card.play(owner, this, t, true);
		this.proc("cardplay");
		if (owner.game.bonusstats != null && owner == owner.game.player1) owner.game.bonusstats.cardsplayed[this.card.type]++;
		owner.game.updateExpectedDamage();
	}else if (owner.spend(this.castele, this.cast)){
		this.usedactive = true;
		if (this.status.get("neuro")) this.addpoison(1);
		this.castSpell(t, this.active.cast);
		owner.game.updateExpectedDamage();
	}
}
Thing.prototype.truedr = function(){
	return this.hp + this.trigger("buff");
}
Thing.prototype.truehp = function(){
	return this.hp + this.calcBonusHp();
}
Thing.prototype.trueatk = function(adrenaline){
	if (adrenaline === undefined) adrenaline = this.status.get("adrenaline");
	var dmg = this.atk + this.status.get("dive") + this.trigger("buff");
	dmg += this.calcBonusAtk();
	if (this.status.get("burrowed")) dmg = Math.ceil(dmg/2);
	return etg.calcAdrenaline(adrenaline, dmg);
}
Thing.prototype.attackCreature = function(target, trueatk){
	if (trueatk === undefined) trueatk = this.trueatk();
	if (trueatk){
		var dmg = target.dmg(trueatk);
		if (dmg) this.trigger("hit", target, dmg);
		target.trigger("shield", this, dmg);
	}
}
Thing.prototype.attack = function(stasis, freedomChance, target){
	var isCreature = this.type == etg.Creature;
	if (isCreature){
		this.dmg(this.status.get("poison"), true);
	}
	if (target === undefined) target = this.active.cast == Skills.appease && !this.status.get("appeased") ? this.owner : this.owner.foe;
	if (!this.status.get("frozen")){
		this.trigger("auto");
	}
	this.usedactive = false;
	var trueatk;
	if (!(stasis || this.status.get("frozen") || this.status.get("delayed")) && (trueatk = this.trueatk()) != 0){
		var momentum = this.status.get("momentum") ||
			(this.status.get("burrowed") && this.owner.permanents.some(function(pr){ return pr && pr.status.get("tunnel") }));
		var psionic = this.status.get("psionic");
		if (freedomChance && this.status.get("airborne") && this.rng() < freedomChance){
			if (momentum || psionic || (!target.shield && !target.gpull)){
				trueatk = Math.ceil(trueatk * 1.5);
			}else{
				momentum = true;
			}
		}
		if (psionic){
			target.spelldmg(trueatk);
		}else if (momentum || trueatk < 0){
			target.dmg(trueatk);
			this.trigger("hit", target, trueatk);
		}else if (target.gpull){
			this.attackCreature(target.gpull, trueatk);
		}else{
			var truedr = target.shield ? target.shield.truedr() : 0;
			var tryDmg = Math.max(trueatk - truedr, 0), blocked = Math.max(Math.min(truedr, trueatk), 0);
			if (!target.shield || !target.shield.trigger("shield", this, tryDmg, blocked)){
				if (truedr > 0) this.trigger("blocked", target.shield, blocked);
				if (tryDmg > 0) this.trigger("hit", target, target.dmg(tryDmg));
			}else this.trigger("blocked", target.shield, trueatk);
		}
	}
	var frozen = this.status.maybeDecr("frozen");
	this.status.maybeDecr("delayed");
	this.status.set("dive", 0);
	if (isCreature && ~this.getIndex() && this.truehp() <= 0){
		this.die();
	}else if (!isCreature || ~this.getIndex()){
		if (!frozen) this.trigger("postauto");
		var adrenaline = this.status.get("adrenaline");
		if(adrenaline){
			if(adrenaline < etg.countAdrenaline(this.trueatk(0))){
				this.status.incr("adrenaline", 1);
				this.attack(stasis, freedomChance, target);
			}else{
				this.status.set("adrenaline", 1);
			}
		}
	}
}
Thing.prototype.rng = function(){
	return this.owner.game.rng.real();
}
Thing.prototype.upto = function(x){
	return this.owner.game.rng.rnd()*x|0;
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
	if (this.type != etg.Weapon){
		if (this.type == etg.Player && this.maxhp <= 500) this.maxhp = Math.min(this.maxhp+x, 500);
		else this.maxhp += x;
	}
	return this.dmg(-x);
}

var ui = require("./ui");
var etg = require("./etg");
var util = require("./util");
var Cards = require("./Cards");
var Effect = require("./Effect");
var Skills = require("./Skills");
var skillText = require("./skillText");
var parseSkill = require("./parseSkill");

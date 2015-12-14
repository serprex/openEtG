"use strict"
var passives = new Set(["airborne", "aquatic", "nocturnal", "voodoo", "swarm", "ranged", "additive", "stackable", "token", "poisonous", "golem"]);
function Thing(card){
	this.owner = null;
	this.card = card;
	this.cast = card.cast;
	this.castele = card.castele;
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	this.status = etg.cloneStatus(card.status);
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
	for (var key in this.status){
		if (passives.has(key)) this.status[key] = etg.DefaultStatus[key];
	}
	for (var key in card.status){
		if (!this.status[key]) this.status[key] = card.status[key];
	}
	this.active = util.clone(card.active);
	if (this.status.mutant){
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
	} else if (this.type == etg.Creature && !(this.active.predeath && this.active.predeath(this))){
		if (this.status.aflatoxin & !this.card.isOf(Cards.MalignantCell)){
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
	obj.status = etg.cloneStatus(this.status);
	obj.usedactive = this.usedactive;
	obj.type = this.type;
	obj.active = util.clone(this.active);
	return obj;
}
Thing.prototype.hash = function(){
	var hash = (this.owner == this.owner.game.player1 ? 17 : 19) ^ (this.type*0x8888888) ^ this.card.code ^
		util.hashObj(this.status) ^ (this.hp*17 + this.atk*31 - this.maxhp - this.usedactive*3);
	for (var key in this.active){
		hash ^= util.hashString(key + ":" + this.active[key].activename.join(" "));
	}
	if (this.active.cast){
		hash ^= (this.castele | this.cast<<16) * 7;
	}
	return hash & 0x7ffffff;
}
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
Thing.prototype.calcCore = function(prefix, filterstat){
	if (!prefix(this)) return 0;
	for (var j=0; j<2; j++){
		var pl = j == 0 ? this.owner : this.owner.foe;
		if (pl.permanents.some(function(pr){return pr && pr.status[filterstat]})) return 1;
	}
	return 0;
}
Thing.prototype.calcCore2 = function(prefix, filterstat){
	if (!prefix(this)) return 0;
	var bonus = 0;
	for (var j=0; j<2; j++){
		var pl = j == 0 ? this.owner : this.owner.foe, pr;
		for (var i=0; i<16; i++){
			if ((pr = pl.permanents[i]) && pr.status[filterstat]){
				if (pr.card.upped) return 2;
				else bonus = 1;
			}
		}
	}
	return bonus;
}
function isEclipseCandidate(c){
	return c.status.nocturnal && c.type == etg.Creature;
}
function isWhetCandidate(c){
	return c.status.golem || c.type == etg.Weapon || c.card.type == etg.Weapon;
}
Thing.prototype.calcBonusAtk = function(){
	return this.calcCore2(isEclipseCandidate, "nightfall") + this.calcCore(isWhetCandidate, "whetstone");
}
Thing.prototype.calcBonusHp = function(){
	return this.calcCore(isEclipseCandidate, "nightfall") + this.calcCore2(isWhetCandidate, "whetstone") + (this.active.hp ? this.active.hp(this) : 0);
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
	if (this.active.cast) return this.cast + ":" + this.castele + this.active.cast.activename[0];
	for(var i=0; i<activetexts.length; i++){
		if (this.active[activetexts[i]])
			return activetexts[i] + " " + this.active[activetexts[i]].activename.join(" ");
	}
	return this.active.auto ? this.active.auto.activename.join(" ") : "";
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
		}else if (dmg>0 && this.status.voodoo)this.owner.foe.dmg(x);
		return dmg;
	}
}
Thing.prototype.spelldmg = function(x, dontdie){
	if (this.active.spelldmg && this.active.spelldmg(this, undefined, x)) return 0;
	return this.dmg(x, dontdie);
}
Thing.prototype.addpoison = function(x) {
	if (this.type == etg.Weapon) this.owner.addpoison(x);
	else if (!this.active.ownpoison || this.active.ownpoison(this)){
		this.status.poison += x;
		if (this.status.voodoo){
			this.owner.foe.addpoison(x);
		}
	}
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
		this.status[["momentum","immaterial"][~index]] = true;
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
	return (type == etg.Permanent ? this.type <= type : type ? this.type == type : this.type != etg.Spell && this.type != etg.Player) && !this.status.immaterial && !this.status.burrowed;
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
Thing.prototype.canactive = function(spend) {
	if (this.owner.game.turn != this.owner) return false;
	else if (this.type == etg.Spell){
		if (this.owner.silence) return false;
		return this.owner[spend?"spend":"canspend"](this.card.costele, this.card.cost);
	}else return this.active.cast && !this.usedactive && !this.status.delayed && !this.status.frozen && this.owner.canspend(this.castele, this.cast);
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
	var owner = this.owner;
	if (this.type == etg.Spell){
		if (!this.canactive(true)){
			return console.log(this.owner + " cannot cast " + this);
		}
		this.remove();
		if (owner.status.neuro) owner.addpoison(1);
		this.card.play(owner, this, t, true);
		this.proc("cardplay");
		if (owner.game.bonusstats != null && owner == owner.game.player1) owner.game.bonusstats.cardsplayed[this.card.type]++;
		owner.game.updateExpectedDamage();
	}else if (owner.spend(this.castele, this.cast)){
		this.usedactive = true;
		if (this.status.neuro) this.addpoison(1);
		this.castSpell(t, this.active.cast);
		owner.game.updateExpectedDamage();
	}
}
Thing.prototype.truedr = function(){
	return this.hp + (this.active.buff ? this.active.buff(this) : 0);
}
Thing.prototype.truehp = function(){
	return this.hp + this.calcBonusHp();
}
Thing.prototype.trueatk = function(adrenaline){
	var dmg = this.atk;
	if (this.status.dive)dmg += this.status.dive;
	if (this.active.buff)dmg += this.active.buff(this);
	dmg += this.calcBonusAtk();
	if (this.status.burrowed)dmg = Math.ceil(dmg/2);
	return etg.calcAdrenaline(adrenaline || this.status.adrenaline, dmg);
}
Thing.prototype.attackCreature = function(target, trueatk){
	if (trueatk === undefined) trueatk = this.trueatk();
	if (trueatk){
		var dmg = target.dmg(trueatk);
		if (dmg && this.active.hit) this.active.hit(this, target, dmg);
		if (target.active.shield) target.active.shield(target, this, dmg);
	}
}
Thing.prototype.attack = function(stasis, freedomChance, target){
	var isCreature = this.type == etg.Creature;
	if (isCreature){
		this.dmg(this.status.poison, true);
	}
	if (target === undefined) target = this.active.cast == Skills.appease && !this.status.appeased ? this.owner : this.owner.foe;
	if (this.active.auto && !this.status.frozen){
		this.active.auto(this);
	}
	this.usedactive = false;
	var trueatk;
	if (!(stasis || this.status.frozen || this.status.delayed) && (trueatk = this.trueatk()) != 0){
		var momentum = this.status.momentum ||
			(this.status.burrowed && this.owner.permanents.some(function(pr){ return pr && pr.status.tunnel }));
		if (this.status.airborne && freedomChance && this.rng() < freedomChance){
			if (!momentum && !target.shield && !target.gpull && !this.status.psionic){
				trueatk = Math.ceil(trueatk * 1.5);
			}else{
				momentum = true;
			}
		}
		if (this.status.psionic){
			target.spelldmg(trueatk);
		}else if (momentum || trueatk < 0){
			target.dmg(trueatk);
			if (this.active.hit){
				this.active.hit(this, target, trueatk);
			}
		}else if (target.gpull){
			this.attackCreature(target.gpull, trueatk);
		}else{
			var truedr = target.shield ? target.shield.truedr() : 0;
			var tryDmg = Math.max(trueatk - truedr, 0), blocked = Math.max(Math.min(truedr, trueatk), 0);
			if (!target.shield || !target.shield.active.shield || !target.shield.active.shield(target.shield, this, tryDmg, blocked)){
				if (truedr > 0 && this.active.blocked) this.active.blocked(this, target.shield, blocked);
				if (tryDmg > 0){
					var dmg = target.dmg(tryDmg);
					if (this.active.hit){
						this.active.hit(this, target, dmg);
					}
				}
			}else if (this.active.blocked) this.active.blocked(this, target.shield, trueatk);
		}
	}
	if (this.status.frozen){
		this.status.frozen--;
	}
	if (this.status.delayed){
		this.status.delayed--;
	}
	if (this.status.dive){
		this.status.dive = 0;
	}
	if (isCreature && ~this.getIndex() && this.truehp() <= 0){
		this.die();
	}else if (!isCreature || ~this.getIndex()){
		if (this.active.postauto && !this.status.frozen) {
			this.active.postauto(this);
		}
		if(this.status.adrenaline){
			if(this.status.adrenaline < etg.countAdrenaline(this.trueatk(0))){
				this.status.adrenaline++;
				this.attack(stasis, freedomChance, target);
			}else{
				this.status.adrenaline = 1;
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
		if (this instanceof Player && this.maxhp <= 500) this.maxhp = Math.min(this.maxhp+x, 500);
		else this.maxhp += x;
	}
	return this.dmg(-x);
}

var ui = require("./ui");
var etg = require("./etg");
var util = require("./util");
var Cards = require("./Cards");
var Effect = require("./Effect");
var Player = require("./Player");
var Skills = require("./Skills");
var skillText = require("./skillText");
var parseSkill = require("./parseSkill");

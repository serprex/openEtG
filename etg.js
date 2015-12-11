"use strict";
var DefaultStatus = exports.DefaultStatus = {
	adrenaline:0,
	chargecap:0,
	delayed:0,
	dive:0,
	frozen:0,
	neuro:false,
	poison:0,
	steamatk:0,
	storedAtk:0,
	storedpower:0,
};
var util = require("./util");
var Thing = require("./Thing");
var Skills = require("./Skills");
var etgutil = require("./etgutil");
function parseSkill(name){
	if (name in Skills){
		return Skills[name];
	}else{
		var spidx = name.indexOf(" ");
		if (~spidx){
			Skills[name] = Skills[name.slice(0, spidx)](name.slice(spidx+1));
			Skills[name].activename = [name];
			return Skills[name];
		}
	}
	console.log("Unknown active", name);
}
function Creature(card, owner){
	if (card.isOf(Cards.ShardGolem)){
		this.owner = owner;
		this.card = card;
		var golem = owner.shardgolem || { stat: 1, cast: 0 };
		this.cast = golem.cast;
		this.castele = Earth;
		this.usedactive = true;
		this.status = cloneStatus(golem.status);
		this.active = util.clone(golem.active);
		this.atk = this.maxhp = this.hp = golem.stat;
	}else this.transform(card, owner);
}
function Permanent(card, owner){
	Thing.apply(this, arguments);
}
function Weapon(card, owner){
	this.atk = card.attack;
	Permanent.apply(this, arguments);
}
function Shield(card, owner){
	this.dr = card.health;
	Permanent.apply(this, arguments);
}
function CardInstance(card, owner){
	this.owner = owner;
	this.card = card;
}
Creature.prototype = Object.create(Thing.prototype);
Permanent.prototype = Object.create(Thing.prototype);
Weapon.prototype = Object.create(Permanent.prototype);
Shield.prototype = Object.create(Permanent.prototype);
CardInstance.prototype = Object.create(Thing.prototype);
Object.defineProperty(CardInstance.prototype, "active", { get: function() { return this.card.active; }});
Object.defineProperty(CardInstance.prototype, "status", { get: function() { return this.card.status; }});
function cloneStatus(status){
	var result = Object.create(DefaultStatus);
	for(var key in status){
		if (DefaultStatus[key] != status[key]){
			result[key] = status[key];
		}
	}
	return result;
}
CardInstance.prototype.clone = function(owner){
	return new CardInstance(this.card, owner);
}
;[Creature, Permanent, Weapon, Shield].forEach(function(type){
	var proto = type.prototype;
	proto.clone = function(owner){
		var obj = Object.create(proto);
		obj.owner = owner;
		obj.status = cloneStatus(this.status);
		obj.active = util.clone(this.active);
		for(var attr in this){
			if (!(attr in obj) && this.hasOwnProperty(attr)){
				obj[attr] = this[attr];
			}
		}
		return obj;
	}
});
CardInstance.prototype.hash = function(){
	return this.card.code << 1 | (this.owner == this.owner.game.player1);
}
Creature.prototype.hash = function(){
	var hash = this.owner == this.owner.game.player1 ? 17 : 19;
	hash ^= util.hashObj(this.status) ^ (this.hp*17 + this.atk*31 - this.maxhp - this.usedactive * 3);
	hash ^= this.card.code;
	for (var key in this.active){
		hash ^= util.hashString(key + ":" + this.active[key].activename.join(" "));
	}
	if (this.active.cast){
		hash ^= (this.castele | this.cast<<4) * 7;
	}
	return hash & 0x7FFFFFFF;
}
Permanent.prototype.hash = function(){
	var hash = this.owner == this.owner.game.player1 ? 5351 : 5077;
	hash ^= util.hashObj(this.status) ^ (this.usedactive * 3);
	hash ^= this.card.code;
	for (var key in this.active){
		hash ^= util.hashString(key + "=" + this.active[key].activename.join(" "));
	}
	if (this.active.cast){
		hash ^= (this.castele | this.cast<<4) * 7;
	}
	return hash & 0x7FFFFFFF;
}
Weapon.prototype.hash = function(){
	var hash = this.owner == this.owner.game.player1 ? 13 : 11;
	hash ^= util.hashObj(this.status) ^ (this.atk*31 - this.usedactive * 3);
	hash ^= this.card.code;
	for (var key in this.active){
		hash ^= util.hashString(key + "-" + this.active[key].activename.join(" "));
	}
	if (this.active.cast){
		hash ^= (this.castele | this.cast<<4) * 7;
	}
	return hash & 0x7FFFFFFF;
}
Shield.prototype.hash = function(){
	var hash = this.owner == this.owner.game.player1 ? 5009 : 4259;
	hash ^= util.hashObj(this.status) ^ (this.dr*31 - this.usedactive * 3);
	hash ^= this.card.code;
	for (var key in this.active){
		hash ^= util.hashString(key + "~" + this.active[key].activename.join(" "));
	}
	if (this.active.cast){
		hash ^= (this.castele | this.cast<<4) * 7;
	}
	return hash & 0x7FFFFFFF;
}
CardInstance.prototype.toString = function() { return "::" + this.card.name; }
function infocore(c, info){
	var stext = skillText(c);
	return stext ? info + "\n" + stext : info;
}
Creature.prototype.info = function(){
	var info = this.trueatk()+"|"+this.truehp()+"/"+this.maxhp;
	if (this.owner.gpull == this) info += "\ngpull";
	return infocore(this, info);
}
Weapon.prototype.info = function(){
	return infocore(this, this.trueatk().toString());
}
Shield.prototype.info = function(){
	return infocore(this, this.truedr() + "DR");
}
Creature.prototype.place = function(fromhand){
	if (util.place(this.owner.creatures, this)){
		if (this.owner.game.bonusstats != null && this.owner == this.owner.game.player1) this.owner.game.bonusstats.creaturesplaced++;
		Thing.prototype.place.call(this, fromhand);
	}
}
Permanent.prototype.place = function(fromhand){
	if (this.status.additive){
		var dullcode = etgutil.asShiny(this.card.code, false);
		for(var i=0; i<16; i++){
			if (this.owner.permanents[i] && etgutil.asShiny(this.owner.permanents[i].card.code, false) == dullcode){
				this.owner.permanents[i].status.charges += this.status.charges;
				Thing.prototype.place.call(this.owner.permanents[i], fromhand);
				return;
			}
		}
	}
	if (util.place(this.owner.permanents, this)){
		Thing.prototype.place.call(this, fromhand);
	}
}
Weapon.prototype.place = function(fromhand){
	this.owner.weapon = this;
	Thing.prototype.place.call(this, fromhand);
}
Shield.prototype.place = function(fromhand){
	if (this.status.additive && this.owner.shield && this.card.as(this.owner.shield.card) == this.card){
		this.owner.shield.status.charges += this.status.charges;
	}else{
		this.owner.shield = this;
	}
	Thing.prototype.place.call(this, fromhand);
}
CardInstance.prototype.place = function(){
	return this.owner.hand.length < 8 ? this.owner.hand.push(this) : -1;
}
Weapon.prototype.addpoison = function(x) {
	return this.owner.addpoison(x);
}
Weapon.prototype.spelldmg = function(x) {
	return this.owner.spelldmg(x);
}
Weapon.prototype.dmg = function(x) {
	return this.owner.dmg(x);
}
CardInstance.prototype.getIndex = function() { return this.owner.hand.indexOf(this); }
Creature.prototype.getIndex = function() { return this.owner.creatures.indexOf(this); }
Creature.prototype.addpoison = function(x) {
	if (!this.active.ownpoison || this.active.ownpoison(this)){
		this.status.poison += x;
		if (this.status.voodoo){
			this.owner.foe.addpoison(x);
		}
	}
}
Weapon.prototype.buffhp = function(){}
Creature.prototype.spelldmg = function(x, dontdie){
	if (this.active.spelldmg && this.active.spelldmg(this, undefined, x)) return 0;
	return this.dmg(x, dontdie);
}
Creature.prototype.dmg = function(x, dontdie){
	if (!x)return 0;
	var dmg = x<0 ? Math.max(this.hp-this.maxhp, x) : Math.min(this.truehp(), x);
	this.hp -= dmg;
	this.proc("dmg", dmg);
	if (this.truehp() <= 0){
		if (!dontdie)this.die();
	}else if (dmg>0 && this.status.voodoo)this.owner.foe.dmg(x);
	return dmg;
}
Creature.prototype.remove = function(index) {
	if (this.owner.gpull == this) this.owner.gpull = undefined;
	if (index === undefined)index=this.getIndex();
	if (~index){
		this.owner.creatures[index] = undefined;
	}
	return index;
}
Permanent.prototype.remove = function(index){
	if (index === undefined)index=this.getIndex();
	if (~index){
		this.owner.permanents[index] = undefined;
	}
	return index;
}
CardInstance.prototype.remove = function(index) {
	if (index === undefined)index=this.getIndex();
	if (~index){
		this.owner.hand.splice(index, 1);
	}
	return index;
}
CardInstance.prototype.die = function(idx){
	var idx = this.remove(idx);
	if (~idx) this.proc("discard");
}
Creature.prototype.deatheffect = Weapon.prototype.deatheffect = function(index) {
	var data = {index:index}
	this.proc("death", data);
	if (~index) Effect.mkDeath(ui.creaturePos(this.owner == this.owner.game.player1?0:1, index));
}
Creature.prototype.die = function() {
	var index = this.remove();
	if (~index){
		if (!(this.active.predeath && this.active.predeath(this))){
			if (this.status.aflatoxin & !this.card.isOf(Cards.MalignantCell)){
				this.owner.creatures[index] = new Creature(this.card.as(Cards.MalignantCell), this.owner);
			}
			if (this.owner.game.bonusstats != null && this.owner == this.owner.game.player2) this.owner.game.bonusstats.creatureskilled++;
			this.deatheffect(index);
		}
	}
}
CardInstance.prototype.transform = function(card){
	this.card = card;
}
Creature.prototype.transform = function(card, owner){
	Thing.call(this, card, owner || this.owner);
	this.maxhp = this.hp = card.health;
	this.atk = card.attack;
	if (this.status.mutant){
		var buff = this.owner.upto(25);
		this.buffhp(Math.floor(buff/5));
		this.atk += buff%5;
		this.mutantactive();
	}
}
Weapon.prototype.transform = function(card, owner){
	Weapon.call(this, card, owner || this.owner);
	if (this.status.mutant){
		this.atk += this.owner.upto(5);
		this.mutantactive();
	}
}
Shield.prototype.transform = function(card, owner){
	Shield.call(this, card, owner || this.owner);
	if (this.status.mutant){
		this.mutantactive();
	}
}
Permanent.prototype.transform = function(card, owner){
	Permanent.call(this, card, owner || this.owner);
	if (this.status.mutant){
		this.mutantactive();
	}
}
Weapon.prototype.calcCore = Creature.prototype.calcCore = function(prefix, filterstat){
	if (!prefix(this)) return 0;
	for (var j=0; j<2; j++){
		var pl = j == 0 ? this.owner : this.owner.foe;
		if (pl.permanents.some(function(pr){return pr && pr.status[filterstat]})) return 1;
	}
	return 0;
}
Weapon.prototype.calcCore2 = Creature.prototype.calcCore2 = function(prefix, filterstat){
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
	return c.status.nocturnal && c instanceof Creature;
}
function isWhetCandidate(c){
	return c.status.golem || c.card.type == exports.WeaponEnum;
}
Weapon.prototype.calcBonusAtk = Creature.prototype.calcBonusAtk = function(){
	return this.calcCore2(isEclipseCandidate, "nightfall") + this.calcCore(isWhetCandidate, "whetstone");
}
Creature.prototype.calcBonusHp = function(){
	return this.calcCore(isEclipseCandidate, "nightfall") + this.calcCore2(isWhetCandidate, "whetstone");
}
// adrtbl is a bitpacked 2d array
// [[0,0,0,0],[1,1,1],[2,2,2],[3,3,3],[3,2],[4,2],[4,2],[5,3],[6,3],[3],[4],[4],[4],[5],[5],[5]]
var adrtbl = new Uint16Array([4, 587, 1171, 1755, 154, 162, 162, 234, 242, 25, 33, 33, 33, 41, 41, 41]);
function countAdrenaline(x){
	x = Math.abs(x|0);
	return x>15?1:(adrtbl[x]&7)+1;
}
function getAdrenalRow(x){
	x|=0;
	var sign=(x>0)-(x<0);
	x = Math.abs(x);
	if (x>15) return "";
	var row = adrtbl[x], atks = row&7, ret = "";
	for(var i=0; i<atks; i++){
		row >>= 3;
		ret += (i?", ":"")+((row&7)*sign);
	}
	return ret;
}
Weapon.prototype.trueatk = Creature.prototype.trueatk = function(adrenaline){
	var dmg = this.atk;
	if (this.status.dive)dmg += this.status.dive;
	if (this.active.buff)dmg += this.active.buff(this);
	dmg += this.calcBonusAtk();
	if (this.status.burrowed)dmg = Math.ceil(dmg/2);
	var y=adrenaline || this.status.adrenaline || 0;
	if (y<2)return dmg;
	var row = adrtbl[Math.abs(dmg)];
	if (y-2 >= (row&7)) return 0;
	return ((row>>(y-1)*3)&7)*((dmg>0)-(dmg<0));
}
Shield.prototype.truedr = function(){
	var dr = this.dr;
	if (this.active.buff){
		dr += this.active.buff(this);
	}
	return dr;
}
Weapon.prototype.truehp = function(){ return this.card.health; }
Creature.prototype.truehp = function(){
	var hp = this.hp + this.calcBonusHp(this.owner.game);
	if (this.active.hp) hp += this.active.hp(this);
	return hp;
}
Permanent.prototype.getIndex = function() { return this.owner.permanents.indexOf(this); }
Permanent.prototype.die = function(){
	if (~this.remove()){
		this.proc("destroy", {});
	}
}
Weapon.prototype.remove = function() {
	if (this.owner.weapon != this)return -1;
	this.owner.weapon = undefined;
	return 0;
}
Shield.prototype.remove = function() {
	if (this.owner.shield != this)return -1;
	this.owner.shield = undefined;
	return 0;
}
Creature.prototype.attackCreature = Weapon.prototype.attackCreature = function(target, trueatk){
	if (trueatk === undefined) trueatk = this.trueatk();
	if (trueatk){
		var dmg = target.dmg(trueatk);
		if (dmg > 0 && this.active.hit){
			this.active.hit(this, target, dmg);
		}
		if (target.active.shield){
			target.active.shield(target, this, dmg);
		}
	}
}
Weapon.prototype.attack = Creature.prototype.attack = function(stasis, freedomChance, target){
	var isCreature = this instanceof Creature;
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
		if (this.status.airborne && freedomChance && this.owner.rng() < freedomChance){
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
			if(this.status.adrenaline < countAdrenaline(this.trueatk(0))){
				this.status.adrenaline++;
				this.attack(stasis, freedomChance, target);
			}else{
				this.status.adrenaline = 1;
			}
		}
	}
}
CardInstance.prototype.canactive = function(spend){
	if (this.owner.silence || this.owner.game.turn != this.owner)return false;
	return this.owner[spend?"spend":"canspend"](this.card.costele, this.card.cost);
}
CardInstance.prototype.useactive = function(target){
	if (!this.canactive(true)){
		console.log((this.owner==this.owner.game.player1?"1":"2") + " cannot cast " + (this || "-"));
		return;
	}
	var owner = this.owner;
	this.remove();
	if (owner.status.neuro){
		owner.addpoison(1);
	}
	this.card.play(owner, this, target);
	this.proc("cardplay");
	if (owner.game.bonusstats != null && owner == owner.game.player1) owner.game.bonusstats.cardsplayed[this.card.type]++;
	owner.game.updateExpectedDamage();
}
var filtercache = [];
function filtercards(upped, filter, cmp, showshiny){
	var cacheidx = (upped?1:0)|(showshiny?2:0);
	if (!(cacheidx in filtercache)){
		filtercache[cacheidx] = [];
		for (var key in Cards.Codes){
			var card = Cards.Codes[key];
			if (card.upped == upped && !card.shiny == !showshiny && !card.status.token){
				filtercache[cacheidx].push(card);
			}
		}
		filtercache[cacheidx].sort();
	}
	var keys = filtercache[cacheidx].filter(filter);
	if (cmp) keys.sort(cmp);
	return keys;
}
exports.CardInstance = CardInstance;
exports.Weapon = Weapon;
exports.Shield = Shield;
exports.Permanent = Permanent;
exports.Creature = Creature;
exports.filtercards = filtercards;
exports.countAdrenaline = countAdrenaline;
exports.getAdrenalRow = getAdrenalRow;
exports.cloneStatus = cloneStatus;
exports.parseSkill = parseSkill;
exports.Chroma = 0;
exports.Entropy = 1;
exports.Death = 2;
exports.Gravity = 3;
exports.Earth = 4;
exports.Life = 5;
exports.Fire = 6;
exports.Water = 7;
exports.Light = 8;
exports.Air = 9;
exports.Time = 10;
exports.Darkness = 11;
exports.Aether = 12;
exports.PillarEnum = 0;
exports.WeaponEnum = 1;
exports.ShieldEnum = 2;
exports.PermanentEnum = 3;
exports.SpellEnum = 4;
exports.CreatureEnum = 5;
exports.MulliganPhase1 = 0;
exports.MulliganPhase2 = 1;
exports.PlayPhase = 2;
exports.EndPhase = 3;
exports.PillarList = new Uint16Array([5002, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200]);
exports.PendList = new Uint16Array([5004, 5150, 5250, 5350, 5450, 5550, 5650, 5750, 5850, 5950, 6050, 6150, 6250]);
exports.NymphList = new Uint16Array([0, 5120, 5220, 5320, 5420, 5520, 5620, 5720, 5820, 5920, 6020, 6120, 6220]);
exports.AlchemyList = new Uint16Array([0, 5111, 5212, 5311, 5413, 5511, 5611, 5712, 5811, 5910, 6011, 6110, 6209]);
exports.ShardList = new Uint16Array([0, 5130, 5230, 5330, 5430, 5530, 5630, 5730, 5830, 5930, 6030, 6130, 6230]);

var ui = require("./ui");
var Cards = require("./Cards");
var Effect = require("./Effect");
var skillText = require("./skillText");
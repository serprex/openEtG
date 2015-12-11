"use strict";
function Player(game){
	this.game = game;
	this.owner = this;
	this.shield = undefined;
	this.weapon = undefined;
	this.status = Object.create(etg.DefaultStatus);
	this.creatures = new Array(23);
	this.permanents = new Array(16);
	this.gpull = undefined;
	this.hand = [];
	this.deck = [];
	this.quanta = new Int8Array(13);
	this.sosa = 0;
	this.silence = false;
	this.sanctuary = false;
	this.precognition = false;
	this.nova = 0;
	this.maxhp = this.hp = 100;
	this.deckpower = 1;
	this.drawpower = 1;
	this.markpower = 1;
	this.mark = 0;
	this.shardgolem = undefined;
}
Player.prototype = Object.create(require("./Thing").prototype);
module.exports = Player;

Player.prototype.toString = function(){ return this == this.game.player1?"p1":"p2"; }
Player.prototype.isCloaked = function(){
	return this.permanents.some(function(pr){
		return pr && pr.status.cloak;
	});
}
Player.prototype.forEach = function(func, dohand){
	func(this.weapon);
	func(this.shield);
	this.creatures.forEach(func);
	this.permanents.forEach(func);
	if (dohand) this.hand.forEach(func);
}
function plinfocore(info, key, val){
	if (val===true) info.push(key);
	else if (val) info.push(val + key);
}
Player.prototype.info = function(){
	var info = [this.hp + "/" + this.maxhp + " " + this.deck.length + "cards"];
	for (var key in this.status){
		plinfocore(info, key, this.status[key]);
	}
	["nova", "neuro", "sosa", "silence", "sanctuary", "flatline", "precognition"].forEach(function(key){
		plinfocore(info, key, this[key]);
	}, this);
	if (this.gpull) info.push("gpull");
	return info.join("\n");
}
Player.prototype.randomquanta = function() {
	var nonzero = 0;
	for(var i=1; i<13; i++){
		nonzero += this.quanta[i];
	}
	if (nonzero == 0){
		return -1;
	}
	nonzero = this.uptoceil(nonzero);
	for(var i=1; i<13; i++){
		if ((nonzero -= this.quanta[i])<=0){
			return i;
		}
	}
}
Player.prototype.canspend = function(qtype, x) {
	if (x <= 0)return true;
	if (qtype) return this.quanta[qtype] >= x;
	for (var i=1; i<13; i++) x -= this.quanta[i];
	return x <= 0;
}
Player.prototype.spend = function(qtype, x) {
	if (x == 0 || (x<0 && this.flatline))return true;
	if (!this.canspend(qtype, x))return false;
	if (!qtype) {
		var b = x < 0 ? -1 : 1;
		for (var i = x * b;i > 0;i--) {
			var q = b == -1 ? this.uptoceil(12) : this.randomquanta();
			this.quanta[q] = Math.min(this.quanta[q] - b, 99);
		}
	} else this.quanta[qtype] = Math.min(this.quanta[qtype] - x, 99);
	return true;
}
Player.prototype.countcreatures = function() {
	return this.creatures.reduce(function(count, cr){
		return count+!!cr;
	}, 0);
}
Player.prototype.countpermanents = function() {
	return this.permanents.reduce(function(count, pr){
		return count+!!pr;
	}, 0);
}
Player.prototype.endturn = function(discard) {
	this.game.ply++;
	if (discard != undefined){
		this.hand[discard].die(discard);
	}
	this.spend(this.mark, this.markpower * (this.mark > 0 ? -1 : -3));
	if (this.foe.status.poison){
		this.foe.dmg(this.foe.status.poison);
	}
	var patienceFlag = false, floodingFlag = false, stasisFlag = false, floodingPaidFlag = false, freedomChance = 0;
	for(var i=0; i<16; i++){
		var p;
		if ((p=this.permanents[i])){
			if (p.active.auto){
				p.active.auto(p);
			}
			if (~p.getIndex()){
				p.usedactive = false;
				if (p.status.stasis){
					stasisFlag = true;
				}
				if (p.status.flooding && !floodingPaidFlag){
					floodingPaidFlag = true;
					floodingFlag = true;
					if (!this.spend(Water, 1)){
						this.permanents[i] = undefined;
					}
				}
				if (p.status.patience){
					patienceFlag = true;
					stasisFlag = true;
				}
				if (p.status.freedom){
					freedomChance++;
				}
				if (p.status.frozen){
					p.status.frozen--;
				}
			}
		}
		if ((p=this.foe.permanents[i])){
			if (p.status.stasis){
				stasisFlag = true;
			}
			if (p.status.flooding){
				floodingFlag = true;
			}
		}
	}
	if (freedomChance){
		freedomChance = (1-Math.pow(.7,freedomChance));
	}
	this.creatures.slice().forEach(function(cr, i){
		if (cr){
			if (patienceFlag){
				var floodbuff = floodingFlag && i>4;
				cr.atk += floodbuff?5:cr.status.burrowed?4:2;
				cr.buffhp(floodbuff?2:1);
			}
			cr.attack(stasisFlag, freedomChance);
			if (floodingFlag && !cr.status.aquatic && cr.isMaterial() && cr.getIndex() > 4){
				cr.die();
			}
		}
	});
	if (this.shield){
		this.shield.usedactive = false;
		if(this.shield.active.auto)this.shield.active.auto(this.shield);
	}
	if (this.weapon)this.weapon.attack();
	if (this.foe.sosa > 0){
		this.foe.sosa--;
	}
	this.nova = 0;
	this.flatline = this.silence = false;
	this.foe.precognition = this.foe.sanctuary = false;
	for (var i = this.foe.drawpower; i > 0; i--) {
		this.foe.drawcard(true);
	}
	this.game.turn = this.foe;
	this.foe.proc("turnstart");
	this.game.updateExpectedDamage();
}
Player.prototype.drawcard = function(drawstep) {
	if (this.hand.length<8){
		if (this.deck.length>0){
			if (~new etg.CardInstance(this.deck.pop(), this).place()){
				this.proc("draw", drawstep);
				if (this.deck.length == 0 && this.game.player1 == this && !Effect.disable)
					Effect.mkSpriteFade(ui.getBasicTextImage("Last card!", 32, "white", "black"));
			}
		}else this.game.setWinner(this.foe);
	}
}
Player.prototype.drawhand = function(x) {
	while (this.hand.length){
		this.deck.push(this.hand.pop().card);
	}
	this.shuffle(this.deck);
	if (x > this.deck.length) x = deck.length;
	for(var i=0; i<x; i++){
		this.hand.push(new etg.CardInstance(this.deck.pop(), this));
	}
}
function destroyCloak(pr){
	if (pr && pr.status.cloak) pr.die();
}
Player.prototype.masscc = function(caster, func, massmass){
	this.permanents.forEach(destroyCloak);
	if (massmass) this.foe.permanents.forEach(destroyCloak);
	var crs = this.creatures.slice(), crsfoe = massmass && this.foe.creatures.slice();
	for(var i=0; i<23; i++){
		if (crs[i] && crs[i].isMaterial()){
			func(caster, crs[i]);
		}
		if (crsfoe && crsfoe[i] && crsfoe[i].isMaterial()){
			func(caster, crsfoe[i]);
		}
	}
}
Player.prototype.delay = function(x) {
	if (this.weapon)this.weapon.delay(x);
}
Player.prototype.freeze = function(x) {
	if (this.weapon)this.weapon.freeze(x);
}
Player.prototype.dmg = function(x, ignoresosa) {
	if (!x)return 0;
	var sosa = this.sosa && !ignoresosa;
	if (sosa){
		x *= -1;
	}
	if (x<0){
		var heal = Math.max(this.hp-this.maxhp, x);
		this.hp -= heal;
		return sosa?-x:heal;
	}else{
		this.hp -= x;
		if (this.hp <= 0){
			this.game.setWinner(this.foe);
		}
		return sosa?-x:x;
	}
}
Player.prototype.spelldmg = function(x) {
	return (!this.shield || !this.shield.status.reflective?this:this.foe).dmg(x);
}
Player.prototype.addpoison = function(x) {
	this.status.poison += x;
}
Player.prototype.truehp = function(){ return this.hp; }
Player.prototype.clone = function(game){
	var obj = Object.create(Player.prototype);
	function maybeClone(x){
		return x && x.clone(obj);
	}
	obj.game = game;
	obj.owner = obj;
	obj.shield = maybeClone(this.shield);
	obj.weapon = maybeClone(this.weapon);
	obj.status = etg.cloneStatus(this.status);
	obj.creatures = this.creatures.map(maybeClone);
	obj.permanents = this.permanents.map(maybeClone);
	obj.hand = this.hand.map(maybeClone);
	obj.gpull = this.gpull && obj.creatures[this.gpull.getIndex()];
	obj.deck = this.deck.slice();
	obj.quanta = new Int8Array(this.quanta);
	for(var attr in this){
		if (!(attr in obj) && this.hasOwnProperty(attr)){
			obj[attr] = this[attr];
		}
	}
	return obj;
}

var etg = require("./etg");

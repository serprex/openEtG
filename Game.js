"use strict";
function Game(seed, flip){
	this.rng = new MersenneTwister(seed);
	this.phase = 0;
	this.player1 = new Player(this);
	this.player2 = new Player(this);
	this.player1.foe = this.player2;
	this.player2.foe = this.player1;
	this.first = this.turn = (seed&1)^!flip ? this.player1 : this.player2;
	this.ply = 0;
	this.targeting = null;
	this.expectedDamage = new Int16Array(2);
	this.time = Date.now();
	this.bonusstats = {
		cardsplayed : new Int32Array(6),
		creaturesplaced: 0,
		creatureskilled: 0,
	};
}
module.exports = Game;

Game.prototype.clone = function(){
	var obj = Object.create(Game.prototype);
	obj.rng = this.rng.clone();
	obj.phase = this.phase;
	obj.player1 = this.player1.clone(obj);
	obj.player2 = this.player2.clone(obj);
	obj.player1.foe = obj.player2;
	obj.player2.foe = obj.player1;
	obj.turn = this.turn == this.player1 ? obj.player1 : obj.player2;
	obj.first = this.first == this.player1 ? obj.player1 : obj.player2;
	obj.ply = this.ply;
	obj.targeting = null;
	obj.expectedDamage = null;
	obj.time = 0;
	obj.bonusstats = null;
	return obj;
}
Game.prototype.players = function(n){
	return n ? this.player2 : this.player1;
}
Game.prototype.setWinner = function(play){
	if (!this.winner){
		this.winner = play;
		this.phase = etg.EndPhase;
		if (this.time) this.time = Date.now() - this.time;
	}
}
Game.prototype.progressMulligan = function(){
	if (this.phase == etg.MulliganPhase1){
		this.phase = etg.MulliganPhase2;
	}else if(this.phase == etg.MulliganPhase2){
		this.phase = etg.PlayPhase;
	}else{
		console.log("Not mulligan phase: " + game.phase);
		return;
	}
	this.turn = this.turn.foe;
}
var blacklist = new Set(["spectate", "flip", "seed", "p1deckpower", "p2deckpower", "deck", "urdeck"]);
Game.prototype.addData = function(data) {
	for (var key in data) {
		if (!blacklist.has(key)){
			var p1or2 = key.match(/^p(1|2)/);
			if (p1or2){
				this["player" + p1or2[1]][key.slice(2)] = data[key];
			}else this[key] = data[key];
		}
	}
}
function removeSoPa(p){
	if (p) p.status.set("patience", 0);
}
Game.prototype.updateExpectedDamage = function(){
	if (this.expectedDamage){
		this.expectedDamage[0] = this.expectedDamage[1] = 0;
		if (!this.winner){
			Effect.disable = true;
			for(let i = 0; i<3; i++){
				const gclone = this.clone();
				gclone.player1.permanents.forEach(removeSoPa);
				gclone.player2.permanents.forEach(removeSoPa);
				gclone.rng.seed(gclone.rng.mt[0]^(i*997));
				gclone.turn.endturn();
				if (!gclone.winner) gclone.turn.endturn();
				this.expectedDamage[0] += this.player1.hp - gclone.player1.hp;
				this.expectedDamage[1] += this.player2.hp - gclone.player2.hp;
			}
			Effect.disable = false;
			this.expectedDamage[0] = this.expectedDamage[0]/3|0;
			this.expectedDamage[1] = this.expectedDamage[1]/3|0;
		}
	}
}
Game.prototype.tgtToBits = function(x) {
	if (x === undefined) return 0;
	var bits = x.type == etg.Player ? 1 :
		x.type == etg.Weapon ? 17 :
		x.type == etg.Shield ? 33 :
		(x.type == etg.Creature ? 2 : x.type == etg.Permanent ? 4 : 5) | x.getIndex()<<4;
	return x.owner == this.player2 ? bits|8 : bits;
}
Game.prototype.bitsToTgt = function(x) {
	var tgtop = x&7, x4 = x>>4, player = this.players(!(x&8));
	return tgtop == 0 ? undefined :
		tgtop == 1 ? player[["owner", "weapon", "shield"][x4]] :
		tgtop == 2 ? player.creatures[x4] :
		tgtop == 4 ? player.permanents[x4] :
		tgtop == 5 ? player.hand[x4] :
		console.log("Unknown tgtop: " + tgtop + ", " + x4);
}
Game.prototype.getTarget = function(src, active, cb) {
	var targetingFilter = Cards.Targeting[active.name[0]];
	if (targetingFilter) {
		var game = this;
		this.targeting = {
			filter: function(t) { return (t.type == etg.Player || t.type == etg.Spell || t.owner == game.turn || t.status.get("cloak") || !t.owner.isCloaked()) && targetingFilter(src, t); },
			cb: function(){
				cb.apply(null, arguments);
				game.targeting = null;
			},
			text: active.name[0],
			src: src,
		}
	} else cb();
}

var etg = require("./etg");
var Cards = require("./Cards");
var Effect = require("./Effect");
var Player = require("./Player");
var MersenneTwister = require("./MersenneTwister");

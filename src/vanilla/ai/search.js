"use strict";
var etg = require("../etg");
var smth = require("../Thing");
var Cards = require("../Cards");
var evalGame = require("./eval");
var lethal = require("./lethal");
function getWorstCard(game){
	var worstcard = 0, curEval = 0x7fffffff, hash = {};
	for (var i=0; i<8; i++){
		var code = game.player2.hand[i].card.code;
		if (code in hash) continue;
		hash[code] = true;
		var gclone = game.clone();
		var cardinst = gclone.player2.hand[i];
		var card = cardinst.card;
		gclone.player2.hand.splice(i, 1);
		if (card.active.get('discard')) {
			card.active.get('discard')(cardinst, gclone.player2);
		}
		var discvalue = evalGame(gclone);
		if (discvalue < curEval){
			curEval = discvalue;
			worstcard = i;
		}
	}
	return [worstcard, curEval];
}
var afilter = {
	web:function(c,t){
		return t.status.get('airborne');
	},
	freeze:function(c,t){
		return t.status.get('frozen') < 3;
	},
	pacify:function(c,t){
		return t.trueatk() != 0;
	},
	readiness:function(c,t){
		return t.active.get('cast') && (t.cast || t.usedactive);
	},
	silence:function(c,t){
		return t.active.get('cast') && !t.usedactive;
	},
	lobotomize:function(c,t){
		if (!t.status.get('momentum') && !t.status.get('psionic')) {
			for (var key in t.active){
				if (t.active.get('key') && key != "ownplay"){
					return true;
				}
			}
			return false;
		}
		return true;
	},
};
function AiSearch(game){
	var currentEval, worstcard;
	if (game.player2.hand.length < 8){
		worstcard = undefined;
		currentEval = evalGame(game);
	}else{
		var worst_eval = getWorstCard(game);
		worstcard = worst_eval[0];
		currentEval = worst_eval[1];
	}
	this.nth = 0;
	this.eval = currentEval;
	this.cmdct = -1;
	this.cdepth = 2;
	this.casthash = [];
	this.limit = 99;
	this.worstcard = worstcard;
	var lethalResult = lethal(game);
	this.cmd = lethalResult[0] >= 0 ? "" :
		lethalResult[1] !== undefined ? ((this.cmdct = lethalResult[1]), "cast") :
		((this.cmdct = worstcard), "endturn");
}
function searchActive(active, c, t){
	var func = afilter[active.name[0]];
	return !func || t.type == etg.Player || t.hasactive("prespell", "protectonce") || func(c, t);
}
AiSearch.prototype.step = function(game) {
	var self = this, currentEval = this.eval,
		nth = this.nth, tend = Date.now() + 40;
	function iterLoop(game, n, cmdct0, casthash) {
		function incnth(tgt){
			nth++;
			return iterCore(tgt) && Date.now() > tend;
		}
		function iterCore(c) {
			if (!c || !c.canactive()) return;
			var ch = c.hash();
			if (ch in casthash) return;
			else casthash[ch] = true;
			var active = c instanceof smth.CardInstance ? c.card.type == etg.SpellEnum && c.card.active.get('cast') : c.active.get('cast');
			var cbits = game.tgtToBits(c) ^ 8, tgthash = [];
			function evalIter(t) {
				if (t && t.hash){
					var th = t.hash();
					if (th in tgthash) return;
					else tgthash[th] = true;
				}
				if ((!game.targeting || (t && game.targeting.filter(t) && searchActive(active, c, t))) && (n || --self.limit > 0)) {
					var tbits = game.tgtToBits(t) ^ 8;
					var gameClone = game.clone();
					gameClone.bitsToTgt(cbits).useactive(gameClone.bitsToTgt(tbits));
					var v, wc;
					if (gameClone.player2.hand.length < 8){
						v = evalGame(gameClone);
					}else{
						var worst_eval = getWorstCard(gameClone);
						wc = worst_eval[0];
						v = worst_eval[1];
					}
					if (v < currentEval || (v == currentEval && n > self.cdepth)) {
						self.cmdct = ~cmdct0 ? cmdct0 : (cbits | tbits << 9);
						self.worstcard = wc;
						self.cdepth = n;
						currentEval = v;
					}
					if (n && v-currentEval < 24) {
						iterLoop(gameClone, 0, cbits | tbits << 9, []);
					}
				}
			}
			var preEval = currentEval;
			if (active && active.name[0] in Cards.Targeting) {
				game.getTarget(c, active);
				for (var j = 0;j < 2;j++) {
					var pl = j == 0 ? c.owner : c.owner.foe;
					evalIter(pl);
					evalIter(pl.weapon);
					evalIter(pl.shield);
					pl.creatures.forEach(evalIter);
					pl.permanents.forEach(evalIter);
					pl.hand.forEach(evalIter);
				}
				game.targeting = null;
			}else{
				evalIter();
			}
			return true;
		}
		var p2 = game.player2;
		if (n){
			if (nth == 0 && incnth(p2.weapon)){
				return true;
			}
			if (nth == 1 && incnth(p2.shield)){
				return true;
			}
			var nbase = 2;
			if (nth >= nbase && nth < nbase + p2.hand.length) {
				for (var i = nth - nbase; i < p2.hand.length; i++) {
					if (incnth(p2.hand[i])){
						return true;
					}
				}
			}
			nbase += p2.hand.length;
			if (nth >= nbase && nth < nbase + 16) {
				for (var i = nth - nbase;i < 16;i++) {
					if (incnth(p2.permanents[i])){
						return true;
					}
				}
			}
			nbase += 16;
			if (nth >= nbase && nth < nbase + 23) {
				for (var i = nth - nbase;i < 23;i++) {
					if (incnth(p2.creatures[i])){
						return true;
					}
				}
			}
		}else{
			iterCore(p2.weapon);
			iterCore(p2.shield);
			p2.hand.forEach(iterCore);
			p2.permanents.forEach(iterCore);
			p2.creatures.forEach(iterCore);
		}
		return false;
	}
	var ret = iterLoop(game, 1, -1, this.casthash);
	if (ret){
		this.nth = nth;
		this.eval = currentEval;
	} else if (~this.cmdct) {
		this.cmd = "cast";
	} else {
		this.cmd = "endturn";
		this.cmdct = game.player2.hand.length == 8 ? this.worstcard : undefined;
	}
}
module.exports = AiSearch;
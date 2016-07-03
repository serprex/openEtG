"use strict";
var etg = require("../etg");
var Cards = require("../Cards");
var Skills = require("../Skills");
var evalGame = require("./eval");
function getWorstCard(game){
	var worstcard = 0, curEval = 2147483647, hash = {};
	for (var i=0; i<8; i++){
		var code = game.player2.hand[i].card.code;
		if (code in hash) continue;
		hash[code] = true;
		var gclone = game.clone();
		gclone.player2.hand[i].die();
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
		return t.status.get("airborne");
	},
	freeze:function(c,t){
		return t.status.get("frozen") < 3;
	},
	pacify:function(c,t){
		return t.trueatk() != 0;
	},
	readiness:function(c,t){
		return t.active.cast && (t.cast || t.usedactive);
	},
	silence:function(c,t){
		return t.active.cast && !t.usedactive;
	},
	lobotomize:function(c,t){
		if (!t.status.get("momentum") && !t.status.get("psionic")) {
			for (var key in t.active){
				if (t.active[key] && key != "ownplay"){
					return true;
				}
			}
			return false;
		}
		return true;
	},
};
function searchSkill(active, c, t){
	var func = afilter[active.name[0]];
	return !func || t.type == etg.Player || t.hasactive("prespell", "protectonce") || func(c, t);
}
module.exports = function(game, previous) {
	var currentEval, worstcard;
	if (previous === undefined){
		if (game.player2.hand.length < 8){
			currentEval = evalGame(game);
		}else{
			var worst_eval = getWorstCard(game);
			worstcard = worst_eval[0];
			currentEval = worst_eval[1];
		}
		var lethal = require("./lethal")(game);
		return lethal[0] < 0 ?
			(lethal[1] !== undefined ? ["cast",  lethal[1]] : worstcard === undefined ? ["endturn", worstcard] : ["endturn"]):
			[0, currentEval, -1, 2, [], 512, worstcard];
	}
	var limit = previous[5], cmdct = previous[2], cdepth = previous[3], nth = previous[0];
	currentEval = previous[1];
	worstcard = previous[6];
	var tend = Date.now() + 9;
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
			var active = c.type == etg.Spell ? c.card.type == etg.Spell && c.card.active.cast : c.active.cast;
			var cbits = game.tgtToBits(c) ^ 8, tgthash = [];
			function evalIter(t) {
				if (t && t.hash){
					var th = t.hash();
					if (th in tgthash) return;
					else tgthash[th] = true;
				}
				if ((!game.targeting || (t && game.targeting.filter(t) && searchSkill(active, c, t))) && (n || --limit > 0)) {
					var tbits = game.tgtToBits(t) ^ 8;
					var gameClone = game.clone();
					gameClone.bitsToTgt(cbits).useactive(gameClone.bitsToTgt(tbits));
					if (c.type == etg.Permanent && c.status.get("patience") && c.active.cast == Skills.die && c.owner == game.player2){
						for(var i=0; i<16; i++){
							var pr = gameClone.player2.permanents[i];
							if (pr && pr.status.get("patience") && pr.active.cast == Skills.die) pr.useactive();
						}
					}
					var v, wc;
					if (gameClone.player2.hand.length < 8){
						v = evalGame(gameClone);
					}else{
						var worst_eval = getWorstCard(gameClone);
						wc = worst_eval[0];
						v = worst_eval[1];
					}
					if (v < currentEval || (v == currentEval && n > cdepth)) {
						cmdct = ~cmdct0 ? cmdct0 : (cbits | tbits << 9);
						worstcard = wc;
						cdepth = n;
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
					pl.forEach(evalIter);
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
				return casthash;
			}
			if (nth == 1 && incnth(p2.shield)){
				return casthash;
			}
			var nbase = 2;
			if (nth >= nbase && nth < nbase + p2.hand.length) {
				for (var i = nth - nbase; i < p2.hand.length; i++) {
					if (incnth(p2.hand[i])){
						return casthash;
					}
				}
			}
			nbase += p2.hand.length;
			if (nth >= nbase && nth < nbase + 16) {
				for (var i = nth - nbase;i < 16;i++) {
					if (incnth(p2.permanents[i])){
						return casthash;
					}
				}
			}
			nbase += 16;
			if (nth >= nbase && nth < nbase + 23) {
				for (var i = nth - nbase;i < 23;i++) {
					if (incnth(p2.creatures[i])){
						return casthash;
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
	}
	var ret = iterLoop(game, 1, -1, previous[4]);
	return ret ? [nth, currentEval, cmdct, cdepth, ret, limit, worstcard] :
		~cmdct ? ["cast", cmdct] :
		game.player2.hand.length == 8 ? ["endturn", worstcard] :
		["endturn"];
}
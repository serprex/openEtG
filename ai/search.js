"use strict";
var etg = require("./etg");
var evalGameState = require("./eval");
var Actives = require("./Actives");
var Cards = require("./Cards");
module.exports = function(game, previous) {
	var worstcard, currentEval;
	if (previous === undefined){
		if (game.player2.hand.length < 8){
			currentEval = evalGameState(game);
		}else{
			currentEval = 2147483647;
			for (var i=0; i<game.player2.hand.length; i++){
				var gclone = game.clone();
				var cardinst = gclone.player2.hand[i];
				gclone.player2.hand.splice(i, 1);
				if (cardinst.card.active.discard){
					cardinst.card.active.discard(cardinst, gclone.player2);
				}
				var discvalue = evalGameState(gclone);
				if (discvalue < currentEval){
					currentEval = discvalue;
					worstcard = i;
				}
			}
		}
		var lethal = require("./lethal")(game);
		return lethal[0] < 0 ?
			(!game.winner ? ["cast",  lethal[1]] : worstcard === undefined ? ["endturn", worstcard] : ["endturn"]):
			[0, currentEval, undefined, 2, [], 999, worstcard];
	}
	var limit = previous[5], cmdct = previous[2], cdepth = previous[3];
	currentEval = previous[1];
	function iterLoop(game, n, cmdct0, casthash, nth) {
		function iterCore(c) {
			if (!c || !c.canactive()) return;
			if (c.hash){
				var ch = c.hash();
				if (ch in casthash) return;
				else casthash[ch] = true;
			}
			var active = c instanceof etg.CardInstance ? c.card.type == etg.SpellEnum && c.card.active : c.active.cast;
			var cbits = game.tgtToBits(c) ^ 8, tgthash = [], loglist = n ? {} : undefined;
			function evalIter(t) {
				if (t && t.hash){
					var th = t.hash();
					if (th in tgthash) return;
					else tgthash[th] = true;
				}
				if ((!game.targetingMode || (t && game.targetingMode(t))) && limit-- > 0) {
					var tbits = game.tgtToBits(t) ^ 8;
					var gameClone = game.clone();
					gameClone.bitsToTgt(cbits).useactive(gameClone.bitsToTgt(tbits));
					var v = evalGameState(gameClone);
					if (v < currentEval || (v == currentEval && n > cdepth)) {
						cmdct = cmdct0 || (cbits | tbits << 9);
						cdepth = n;
						currentEval = v;
					}
					if (n && v-currentEval < 24) {
						delete gameClone.targetingMode;
						iterLoop(gameClone, 0, cbits | tbits << 9, []);
						if (loglist) loglist[t ? t : "-"] = currentEval;
					}
				}
			}
			var preEval = currentEval;
			if (active && active.activename in Cards.Targeting) {
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
				if (loglist) console.log(currentEval, preEval, c.toString(), active.activename, loglist);
				delete game.targetingMode;
			}else{
				evalIter();
				if (loglist) console.log(currentEval, preEval, c.toString(), loglist);
			}
			return true;
		}
		var p2 = game.player2;
		if (iterCore(p2.weapon) && n && !nth--){
			return casthash;
		}
		if (iterCore(p2.shield) && n && !nth--){
			return casthash;
		}
		for (var i = 0; i < p2.hand.length; i++) {
			if (iterCore(p2.hand[i]) && n && !nth--){
				return casthash;
			}
		}
		for (var i = 0;i < 16;i++) {
			if (iterCore(p2.permanents[i]) && n && !nth--){
				return casthash;
			}
		}
		for (var i = 0;i < 23;i++) {
			if (iterCore(p2.creatures[i]) && n && !nth--){
				return casthash;
			}
		}
	}
	var ret = iterLoop(game, 1, undefined, previous[4], previous[0]);
	if (ret){
		return [previous[0]+2, currentEval, cmdct, cdepth, ret, limit, previous[6]];
	}else if (cmdct) {
		return ["cast", cmdct];
	} else if (game.player2.hand.length == 8) {
		return ["endturn", worstcard];
	} else return ["endturn"];
}
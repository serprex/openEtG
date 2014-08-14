"use strict";
var etg = require("./etg");
var evalGameState = require("./eval");
var Actives = require("./Actives");
var Cards = require("./Cards");
module.exports = function(game, previous) {
	if (previous === undefined) previous = [0, evalGameState(game), undefined, 2, {}, 999];
	var limit = previous[5], cmdct = previous[2], currentEval = previous[1], cdepth = previous[3];
	function iterLoop(game, n, cmdct0, casthash, nth) {
		function iterCore(c) {
			if (!c || !c.canactive()) return;
			if (c.hash){
				var ch = c.hash();
				if (ch in casthash) return;
				else casthash[ch] = true;
			}
			var active = c instanceof etg.CardInstance ? c.card.type == etg.SpellEnum && c.card.active : c.active.cast;
			var cbits = game.tgtToBits(c) ^ 8, tgthash = {}, loglist = n ? {} : undefined;
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
						iterLoop(gameClone, 0, cbits | tbits << 9, {});
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
				if (loglist) console.log(currentEval, preEval, c.card.name, active.activename, loglist);
				delete game.targetingMode;
			}else{
				evalIter();
				if (loglist) console.log(currentEval, preEval, c.card.name, loglist);
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
		return [previous[0]+2, currentEval, cmdct, cdepth, ret, limit];
	}else if (cmdct) {
		return ["cast", cmdct];
	} else if (game.player2.hand.length == 8) {
		var mincardvalue = 999, worstcard = 0;
		for (var i = 0;i < 8;i++) {
			var cardinst = game.player2.hand[i];
			var cardvalue = game.player2.quanta[cardinst.card.element] - cardinst.card.cost;
			if (cardinst.card.active && cardinst.card.active.discard == Actives.obsession) { cardvalue -= 5; }
			if (cardinst.card.active && cardinst.card.active.discard == Actives.hasten) { cardvalue += 3; }
			if (cardvalue < mincardvalue) {
				mincardvalue = cardvalue;
				worstcard = i;
			}
		}
		return ["endturn", worstcard];
	} else return ["endturn"];
}
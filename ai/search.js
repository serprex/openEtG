var etg = require("./etg");
var evalGameState = require("./eval");
var Actives = require("./Actives");
module.exports = function(game) {
	var limit = 999;
	var cmdct, currentEval = evalGameState(game), cdepth = 2;
	function iterLoop(game, n, cmdct0) {
		var log = n ? console.log.bind(console) : function(){};
		var casthash = {};
		function iterCore(c, active) {
			if (c.hash){
				var ch = c.hash();
				if (ch in casthash) return;
				else casthash[ch] = true;
			}
			var cbits = game.tgtToBits(c) ^ 8;
			var tgthash = {};
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
						currentEval = v;
					}
					if (n) {
						var targetingModeBack = gameClone.targetingMode, targetingModeCbBack = gameClone.targetingModeCb;
						delete gameClone.targetingMode;
						iterLoop(gameClone, 0, cbits | tbits << 9);
						log("\t" + c + " " + (t || "-") + " " + v);
						gameClone.targetingMode = targetingModeBack;
						gameClone.targetingModeCb = targetingModeCbBack;
					}
				}
			}
			if (active && active.activename in Targeting) {
				log("in " + active.activename + " " + currentEval);
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
				log("out " + currentEval);
				delete game.targetingMode;
			}else{
				evalIter();
			}
		}
		var self = game.player2;
		var wp = self.weapon, sh = self.shield;
		if (wp && wp.canactive()) {
			iterCore(wp, wp.active.cast);
		}
		if (sh && sh.canactive()) {
			iterCore(sh, sh.active.cast);
		}
		for (var i = 0;i < 23;i++) {
			var cr = self.creatures[i];
			if (cr && cr.canactive()) {
				iterCore(cr, cr.active.cast);
			}
		}
		for (var i = 0;i < 16;i++) {
			var pr = self.permanents[i];
			if (pr && pr.canactive()) {
				iterCore(pr, pr.active.cast);
			}
		}
		for (var i = 0; i < self.hand.length; i++) {
			var cardinst = self.hand[i];
			if (cardinst.canactive()) {
				iterCore(cardinst, cardinst.card.type == etg.SpellEnum && cardinst.card.active);
			}
		}
	}
	iterLoop(game, 1);
	console.log("Leftover iters: " + limit);
	if (cmdct) {
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
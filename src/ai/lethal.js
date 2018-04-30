'use strict';
const Cards = require('../Cards');
module.exports = function(game) {
	let limit = 333,
		cmdct,
		currentEval = game.player1.hp;
	function iterLoop(game, cmdct0) {
		function iterCore(c) {
			if (!c || !c.canactive()) return;
			const ch = c.hash();
			if (ch in casthash) return;
			else casthash[ch] = true;
			const active = c.active.cast;
			const cbits = game.tgtToBits(c) ^ 8;
			function evalIter(t) {
				if (
					(!game.targeting || (t && game.targeting.filter(t))) &&
					--limit > 0
				) {
					const tbits = game.tgtToBits(t) ^ 8;
					const gameClone = game.clone();
					gameClone.bitsToTgt(cbits).useactive(gameClone.bitsToTgt(tbits));
					const v =
						gameClone.winner == gameClone.player2
							? -999
							: gameClone.winner == gameClone.player1
								? 999
								: gameClone.player1.hp;
					if (v < currentEval) {
						cmdct = cmdct0 || cbits | (tbits << 9);
						currentEval = v;
						if (!gameClone.winner) {
							iterLoop(gameClone, cmdct);
						}
					}
				}
			}
			if (active && active.name[0] in Cards.Targeting) {
				game.getTarget(c, active);
				if (c.owner.shield && c.owner.shield.getStatus('reflective'))
					evalIter(c.owner);
				evalIter(c.owner.foe);
				c.owner.creatures.forEach(cr => {
					if (cr && cr.getStatus('voodoo')) evalIter(cr);
				});
				game.targeting = null;
			} else {
				evalIter();
			}
		}
		const p2 = game.player2,
			casthash = [];
		p2.hand.forEach(iterCore);
		p2.permanents.forEach(iterCore);
		p2.creatures.forEach(iterCore);
	}
	iterLoop(game);
	return [currentEval, cmdct];
};

import * as etg from '../../etg.js';
import Skills from '../Skills.js';
import evalGame from './eval.js';
import lethal from './lethal.js';

function getWorstCard(game) {
	let worstcard = 0,
		curEval = 0x7fffffff;
	const hash = new Set();
	for (let i = 0; i < 8; i++) {
		var code = game.player2.hand[i].card.code;
		if (hash.has(code)) continue;
		hash.add(code);
		var gclone = game.clone();
		var cardinst = gclone.player2.hand[i];
		var card = cardinst.card;
		gclone.player2.hand.splice(i, 1);
		if (card.active.has('discard')) {
			card.active.get('discard').func(cardinst, gclone.player2);
		}
		var discvalue = evalGame(gclone);
		if (discvalue < curEval) {
			curEval = discvalue;
			worstcard = i;
		}
	}
	return [worstcard, curEval];
}
const afilter = new Map()
	.set(Skills.web, (c, t) => t.status.get('airborne'))
	.set(Skills.freeze, (c, t) => t.status.get('frozen') < 3)
	.set(Skills.readiness, (c, t) => t.active.get('cast'))
	.set(Skills.lobotomize, (c, t) => {
		if (!t.status.get('momentum') && !t.status.get('psionic')) {
			for (var key in t.active) {
				if (t.active.get('key') && key != 'ownplay') {
					return true;
				}
			}
			return false;
		}
		return true;
	});

function searchActive(active, c, t) {
	const func = afilter.get(active);
	return !func || t.type == etg.Player || func(c, t);
}

export default class AiSearch {
	constructor(game) {
		var currentEval, worstcard;
		if (game.player2.hand.length < 8) {
			worstcard = undefined;
			currentEval = evalGame(game);
		} else {
			var worst_eval = getWorstCard(game);
			worstcard = worst_eval[0];
			currentEval = worst_eval[1];
		}
		this.nth = 0;
		this.eval = currentEval;
		this.cmdct = -1;
		this.cdepth = 2;
		this.casthash = new Set();
		this.limit = 99;
		this.worstcard = worstcard;
		var lethalResult = lethal(game);
		this.cmd =
			lethalResult[0] >= 0
				? ''
				: lethalResult[1] !== undefined
				? ((this.cmdct = lethalResult[1]), 'cast')
				: ((this.cmdct = worstcard), 'end');
	}

	step(game) {
		var self = this,
			currentEval = this.eval,
			nth = this.nth,
			tend = Date.now() + 30;
		function iterLoop(game, n, cmdct0, casthash) {
			function incnth(tgt) {
				nth++;
				return iterCore(tgt) && Date.now() > tend;
			}
			function iterCore(c) {
				if (!c || !c.canactive()) return;
				var ch = c.hash();
				if (casthash.has(ch)) return;
				casthash.add(ch);
				var active =
					c.type === etg.Spell
						? c.card.type == etg.Spell && c.card.active.get('cast')
						: c.active.get('cast');
				var cbits = game.tgtToBits(c) ^ 8,
					tgthash = new Set();
				function evalIter(t) {
					if (t && t.hash) {
						var th = t.hash();
						if (tgthash.has(th)) return;
						tgthash.add(th);
					}
					if (
						(!game.targeting ||
							(t && game.targeting.filter(t) && searchActive(active, c, t))) &&
						(n || --self.limit > 0)
					) {
						var tbits = game.tgtToBits(t) ^ 8;
						var gameClone = game.clone();
						gameClone.bitsToTgt(cbits).useactive(gameClone.bitsToTgt(tbits));
						if (
							c.type === etg.Permanent &&
							c.getStatus('patience') &&
							c.active.get('cast') === Skills.die &&
							c.owner === game.player2
						) {
							for (let i = 0; i < 16; i++) {
								const pr = gameClone.player2.permanents[i];
								if (
									pr &&
									pr.getStatus('patience') &&
									pr.active.get('cast') === Skills.die
								)
									pr.useactive();
							}
						}
						let v, wc;
						if (gameClone.player2.hand.length < 8) {
							v = evalGame(gameClone);
						} else {
							[wc, v] = getWorstCard(gameClone);
						}
						if (v < currentEval || (v == currentEval && n > self.cdepth)) {
							self.cmdct = ~cmdct0 ? cmdct0 : cbits | (tbits << 9);
							self.worstcard = wc;
							self.cdepth = n;
							currentEval = v;
						}
						if (n && v - currentEval < 24) {
							iterLoop(gameClone, 0, cbits | (tbits << 9), new Set());
						}
					}
				}
				var preEval = currentEval;
				if (active && active.name[0] in game.Cards.Targeting) {
					game.getTarget(c, active);
					for (var j = 0; j < 2; j++) {
						var pl = j == 0 ? c.owner : c.owner.foe;
						evalIter(pl);
						if (pl.weapon) evalIter(pl.weapon);
						if (pl.shield) evalIter(pl.shield);
						pl.creatures.forEach(c => c && evalIter(c));
						pl.permanents.forEach(p => p && evalIter(p));
						pl.hand.forEach(h => h && evalIter(h));
					}
					game.targeting = null;
				} else {
					evalIter();
				}
				return true;
			}
			var p2 = game.player2;
			if (n) {
				if (nth == 0 && incnth(p2.weapon)) {
					return true;
				}
				if (nth == 1 && incnth(p2.shield)) {
					return true;
				}
				var nbase = 2;
				if (nth >= nbase && nth < nbase + p2.hand.length) {
					for (var i = nth - nbase; i < p2.hand.length; i++) {
						if (incnth(p2.hand[i])) {
							return true;
						}
					}
				}
				nbase += p2.hand.length;
				if (nth >= nbase && nth < nbase + 16) {
					for (var i = nth - nbase; i < 16; i++) {
						if (incnth(p2.permanents[i])) {
							return true;
						}
					}
				}
				nbase += 16;
				if (nth >= nbase && nth < nbase + 23) {
					for (var i = nth - nbase; i < 23; i++) {
						if (incnth(p2.creatures[i])) {
							return true;
						}
					}
				}
			} else {
				iterCore(p2.weapon);
				iterCore(p2.shield);
				p2.hand.forEach(iterCore);
				p2.permanents.forEach(iterCore);
				p2.creatures.forEach(iterCore);
			}
			return false;
		}
		var ret = iterLoop(game, 1, -1, this.casthash);
		if (ret) {
			this.nth = nth;
			this.eval = currentEval;
		} else if (~this.cmdct) {
			this.cmd = 'cast';
		} else {
			this.cmd = 'end';
			this.cmdct = game.player2.hand.length == 8 ? this.worstcard : undefined;
		}
	}
}

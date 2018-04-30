'use strict';
const etg = require('../etg'),
	Cards = require('../Cards'),
	Skills = require('../Skills'),
	parseSkill = require('../parseSkill'),
	evalGame = require('./eval'),
	lethal = require('./lethal');
function getWorstCard(game) {
	let worstcard = 0,
		curEval = 0x7fffffff;
	const hash = new Set();
	for (let i = 0; i < 8; i++) {
		const code = game.player2.hand[i].card.code;
		if (hash.has(code)) continue;
		hash.add(code);
		const gclone = game.clone();
		gclone.player2.hand[i].die();
		const discvalue = evalGame(gclone);
		if (discvalue < curEval) {
			curEval = discvalue;
			worstcard = i;
		}
	}
	return [worstcard, curEval];
}
const afilter = {
	web: (c, t) => t.getStatus('airborne'),
	freeze: (c, t) => t.getStatus('frozen') < 3,
	pacify: (c, t) => t.trueatk(),
	readiness: (c, t) => t.active.get('cast') && (t.cast || t.usedactive),
	silence: (c, t) => t.active.get('cast') && !t.usedactive,
	lobotomize: (c, t) => {
		if (!t.getStatus('psionic')) {
			for (const [key, act] of t.active) {
				if (key != 'ownplay' && act.name.some(name => !parseSkill(name).passive)) {
					return true;
				}
			}
			return false;
		}
		return true;
	},
};
function AiSearch(game) {
	let worstcard;
	if (game.player2.hand.length < 8) {
		worstcard = undefined;
		this.eval = evalGame(game);
	} else {
		[worstcard, this.eval] = getWorstCard(game);
	}
	this.nth = 0;
	this.cmdct = -1;
	this.cdepth = 2;
	this.casthash = new Set();
	this.limit = 648;
	this.worstcard = worstcard;
	const lethalResult = lethal(game);
	this.cmd =
		lethalResult[0] >= 0
			? ''
			: lethalResult[1] !== undefined
				? ((this.cmdct = lethalResult[1]), 'cast')
				: ((this.cmdct = worstcard), 'endturn');
}
function searchSkill(active, c, t) {
	const func = afilter[active.name[0]];
	return (
		!func ||
		t.type == etg.Player ||
		t.hasactive('prespell', 'protectonce') ||
		func(c, t)
	);
}
AiSearch.prototype.step = function(game, previous) {
	const tend = Date.now() + 30;
	let currentEval = this.eval,
		nth = this.nth;
	const iterLoop = (game, n, cmdct0, casthash) => {
		const incnth = tgt => {
			nth++;
			return iterCore(tgt) && Date.now() > tend;
		};
		const iterCore = c => {
			if (!c || !c.canactive()) return;
			const ch = c.hash();
			if (casthash.has(ch)) return;
			casthash.add(ch);
			const active = (c.type !== etg.Spell || c.card.type === etg.Spell) && c.active.get('cast');
			const cbits = game.tgtToBits(c) ^ 8,
				tgthash = new Set();
			const evalIter = t => {
				if (t && t.hash) {
					const th = t.hash();
					if (tgthash.has(th)) return;
					tgthash.add(th);
				}
				if (
					(!game.targeting ||
						(t && game.targeting.filter(t) && searchSkill(active, c, t))) &&
					(n || --this.limit > 0)
				) {
					const tbits = game.tgtToBits(t) ^ 8,
						gameClone = game.clone();
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
					if (v < currentEval || (v == currentEval && n > this.cdepth)) {
						this.cmdct = ~cmdct0 ? cmdct0 : cbits | (tbits << 9);
						this.worstcard = wc;
						this.cdepth = n;
						currentEval = v;
					}
					if (n && v - currentEval < 24) {
						iterLoop(gameClone, 0, cbits | (tbits << 9), new Set());
					}
				}
			};
			if (active && active.name[0] in Cards.Targeting) {
				game.getTarget(c, active);
				for (let j = 0; j < 2; j++) {
					const pl = j == 0 ? c.owner : c.owner.foe;
					evalIter(pl);
					pl.forEach(evalIter);
				}
				game.targeting = null;
			} else {
				evalIter();
			}
			return true;
		};
		const p2 = game.player2;
		if (n) {
			if (nth == 0 && incnth(p2.weapon)) {
				return true;
			}
			if (nth == 1 && incnth(p2.shield)) {
				return true;
			}
			let nbase = 2;
			if (nth >= nbase && nth < nbase + p2.hand.length) {
				for (let i = nth - nbase; i < p2.hand.length; i++) {
					if (incnth(p2.hand[i])) {
						return true;
					}
				}
			}
			nbase += p2.hand.length;
			if (nth >= nbase && nth < nbase + 16) {
				for (let i = nth - nbase; i < 16; i++) {
					if (incnth(p2.permanents[i])) {
						return true;
					}
				}
			}
			nbase += 16;
			if (nth >= nbase && nth < nbase + 23) {
				for (let i = nth - nbase; i < 23; i++) {
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
	};
	const ret = iterLoop(game, 1, -1, this.casthash);
	if (ret) {
		this.nth = nth;
		this.eval = currentEval;
	} else if (~this.cmdct) {
		this.cmd = 'cast';
	} else {
		this.cmd = 'endturn';
		this.cmdct = game.player2.hand.length == 8 ? this.worstcard : undefined;
	}
};
module.exports = AiSearch;

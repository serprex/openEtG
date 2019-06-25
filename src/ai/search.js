'use strict';
const etg = require('../etg'),
	Cards = require('../Cards'),
	Skills = require('../Skills'),
	parseSkill = require('../parseSkill'),
	evalGame = require('./eval'),
	lethal = require('./lethal');
function getWorstCard(game, player) {
	let worstcard = 0,
		curEval = 0x7fffffff,
		hand = player.hand;
	const hash = new Set();
	for (let i = 0; i < 8; i++) {
		const code = hand[i].card.code,
			handId = hand[i].id;
		if (hash.has(code)) continue;
		hash.add(code);
		const gclone = game.clone();
		gclone.byId(handId).die();
		const discvalue = evalGame(gclone);
		if (discvalue < curEval) {
			curEval = discvalue;
			worstcard = handId;
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
				if (
					key != 'ownplay' &&
					act.name.some(name => !parseSkill(name).passive)
				) {
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
	if (game.player2.handIds.length < 8) {
		worstcard = undefined;
		this.eval = evalGame(game);
	} else {
		[worstcard, this.eval] = getWorstCard(game, game.player2);
	}
	this.nth = 0;
	this.cmdct = null;
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
			: ((this.cmdct = { c: game.player2Id, t: worstcard }), 'endturn');
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
AiSearch.prototype.step = function(game) {
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
			const ch = game.props.get(c.id).hashCode();
			if (casthash.has(ch)) return;
			casthash.add(ch);
			const active =
				(c.type !== etg.Spell || c.card.type === etg.Spell) &&
				c.active.get('cast');
			const tgthash = new Set();
			const evalIter = t => {
				if (t) {
					const th = game.props.get(t.id).hashCode();
					if (tgthash.has(th)) return;
					tgthash.add(th);
				}
				if (
					(!game.targeting ||
						(t && game.targeting.filter(t) && searchSkill(active, c, t))) &&
					(n || --this.limit > 0)
				) {
					const gameClone = game.clone();
					gameClone.byId(c.id).useactive(t && gameClone.byId(t.id));
					if (
						c.type === etg.Permanent &&
						c.getStatus('patience') &&
						c.active.get('cast') === Skills.die &&
						c.ownerId === game.player2Id
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
					if (gameClone.player2.handIds.length < 8) {
						v = evalGame(gameClone);
					} else {
						[wc, v] = getWorstCard(gameClone, gameClone.player2);
					}
					if (v < currentEval || (v == currentEval && n > this.cdepth)) {
						this.cmdct = cmdct0 || { c: c.id, t: t && t.id };
						this.worstcard = wc;
						this.cdepth = n;
						currentEval = v;
					}
					if (n && v - currentEval < 24) {
						iterLoop(gameClone, 0, { c: c.id, t: t && t.id }, new Set());
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
			if (nth >= nbase && nth < nbase + p2.handIds.length) {
				const { hand } = p2;
				for (let i = nth - nbase; i < p2.handIds.length; i++) {
					if (incnth(hand[i])) {
						return true;
					}
				}
			}
			nbase += p2.handIds.length;
			if (nth >= nbase && nth < nbase + 16) {
				const { permanents } = p2;
				for (let i = nth - nbase; i < 16; i++) {
					if (incnth(permanents[i])) {
						return true;
					}
				}
			}
			nbase += 16;
			if (nth >= nbase && nth < nbase + 23) {
				const { creatures } = p2;
				for (let i = nth - nbase; i < 23; i++) {
					if (incnth(creatures[i])) {
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
	const ret = iterLoop(game, 1, null, this.casthash);
	if (ret) {
		this.nth = nth;
		this.eval = currentEval;
	} else if (this.cmdct) {
		this.cmd = 'cast';
	} else {
		this.cmd = 'endturn';
		this.cmdct =
			game.player2.handIds.length == 8
				? { c: game.player2Id, t: this.worstcard }
				: {};
	}
};
module.exports = AiSearch;

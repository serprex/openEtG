import * as etg from '../etg.js';
import Skills from '../Skills.js';
import parseSkill from '../parseSkill.js';
import evalGame from './eval.js';
import lethal from './lethal.js';

function getWorstCard(game, player) {
	let worstcard = 0,
		curEval = -0x7fffffff;
	const hash = new Set(),
		hand = player.hand;
	for (let i = 0; i < 8; i++) {
		const code = hand[i].card.code,
			handId = hand[i].id;
		if (hash.has(code)) continue;
		hash.add(code);
		const gclone = game.clone();
		gclone.byId(handId).die();
		const discvalue = evalGame(gclone);
		if (discvalue > curEval) {
			curEval = discvalue;
			worstcard = handId;
		}
	}
	return [worstcard, curEval];
}

const afilter = new Map()
	.set(Skills.web, (c, t) => t.getStatus('airborne'))
	.set(Skills.freeze, (c, t) => t.getStatus('frozen') < 3)
	.set(Skills.pacify, (c, t) => t.trueatk())
	.set(
		Skills.readiness,
		(c, t) => t.active.get('cast') && (t.cast || t.usedactive),
	)
	.set(Skills.silence, (c, t) => t.active.get('cast') && !t.usedactive)
	.set(Skills.lobotomize, (c, t) => {
		if (!t.getStatus('psionic')) {
			for (const [key, act] of t.active) {
				if (
					key !== 'ownplay' &&
					act.name.some(name => !parseSkill(name).passive)
				) {
					return true;
				}
			}
			return false;
		}
		return true;
	});

function searchSkill(active, c, t) {
	const func = afilter.get(active);
	return (
		!func ||
		t.type === etg.Player ||
		t.hasactive('prespell', 'protectonce') ||
		func(c, t)
	);
}

export default class AiSearch {
	constructor(game) {
		let worstcard;
		this.player = game.byId(game.turn);
		if (this.player.handIds.length < 8) {
			worstcard = undefined;
			this.eval = evalGame(game);
		} else {
			[worstcard, this.eval] = getWorstCard(game, this.player);
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
				? null
				: lethalResult[1] !== undefined
				? ((this.cmdct = lethalResult[1]), { x: 'cast', ...this.cmdct })
				: ((this.cmdct = { t: worstcard }), { x: 'end', ...this.cmdct });
	}

	step(game) {
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
				const evalIter = (t, targetFilter) => {
					if (t) {
						const th = game.props.get(t.id).hashCode();
						if (tgthash.has(th)) return;
						tgthash.add(th);
					}
					if (
						(!targetFilter ||
							(t && targetFilter(t) && searchSkill(active, c, t))) &&
						(n || --this.limit > 0)
					) {
						const gameClone = game.clone(),
							playerClone = gameClone.byId(this.player.id);
						if (
							c.type === etg.Permanent &&
							c.getStatus('patience') &&
							c.ownerId === this.player.id &&
							c.active.get('cast') === Skills.die
						) {
							playerClone.permanents.forEach(
								pr =>
									pr &&
									pr.getStatus('patience') &&
									pr.active.get('cast') === Skills.die &&
									pr.useactive(),
							);
						} else {
							gameClone.byId(c.id).useactive(t && gameClone.byId(t.id));
						}
						let v, wc;
						if (playerClone.handIds.length < 8) {
							v = evalGame(gameClone);
						} else {
							[wc, v] = getWorstCard(gameClone, playerClone);
						}
						if (v > currentEval || (v === currentEval && n > this.cdepth)) {
							this.cmdct = cmdct0 || { c: c.id, t: t && t.id };
							this.worstcard = wc;
							this.cdepth = n;
							currentEval = v;
						}
						if (n && currentEval - v < 24) {
							iterLoop(gameClone, 0, { c: c.id, t: t && t.id }, new Set());
						}
					}
				};
				if (active && active.castName in game.Cards.Targeting) {
					const targetFilter = game.targetFilter(c, active);
					for (let j = 0; j < 2; j++) {
						const pl = j === 0 ? c.owner : c.owner.foe;
						evalIter(pl, targetFilter);
						pl.forEach(inst => evalIter(inst, targetFilter));
					}
				} else {
					evalIter();
				}
				return true;
			};
			const p2 = game.byId(this.player.id);
			if (n) {
				if (nth === 0 && incnth(p2.weapon)) {
					return true;
				}
				if (nth === 1 && incnth(p2.shield)) {
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
			this.cmd = { x: 'cast', ...this.cmdct };
		} else {
			this.cmd = {
				x: 'end',
				...(this.player.handIds.length === 8 ? { t: this.worstcard } : {}),
			};
		}
	}
}

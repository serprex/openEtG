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
		(c, t) => t.active.get('cast') && (t.cast || t.casts === 0),
	)
	.set(Skills.silence, (c, t) => t.active.get('cast') && t.casts !== 0)
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

export default function aiSearch(game) {
	let worstcard, score;
	const player = game.byId(game.turn);
	if (player.handIds.length < 8) {
		worstcard = undefined;
		score = evalGame(game);
	} else {
		[worstcard, score] = getWorstCard(game, player);
	}
	let cmdct = null;
	let cdepth = 2;
	let casthash = new Set();
	let limit = 648;
	const lethalResult = lethal(game);
	if (lethalResult[0] < 0) {
		return lethalResult[1] !== undefined
			? { x: 'cast', ...lethalResult[1] }
			: { x: 'end', t: worstcard };
	}

	const iterLoop = (game, n, cmdct0, casthash) => {
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
					(n || --limit > 0)
				) {
					const gameClone = game.clone(),
						playerClone = gameClone.byId(player.id);
					if (
						c.type === etg.Permanent &&
						c.getStatus('patience') &&
						c.ownerId === player.id &&
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
					if (v > score || (v === score && n > cdepth)) {
						cmdct = cmdct0 || { c: c.id, t: t?.id };
						worstcard = wc;
						cdepth = n;
						score = v;
					}
					if (n && score - v < 24) {
						iterLoop(gameClone, 0, { c: c.id, t: t?.id }, new Set());
					}
				}
			};
			if (active?.target) {
				const targetFilter = game.targetFilter(c, active);
				for (let j = 0; j < 2; j++) {
					const pl = j === 0 ? c.owner : c.owner.foe;
					evalIter(pl, targetFilter);
					pl.forEach(inst => evalIter(inst, targetFilter));
				}
			} else {
				evalIter();
			}
		};
		game.byId(player.id).forEach(iterCore, true);
	};
	iterLoop(game, 1, null, casthash);
	return cmdct
		? { x: 'cast', ...cmdct }
		: { x: 'end', t: player.handIds.length === 8 ? worstcard : undefined };
}

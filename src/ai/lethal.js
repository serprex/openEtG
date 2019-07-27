export default function lethal(game) {
	let limit = 333,
		cmdct,
		currentEval = game.get(game.get(game.turn).get('foe')).get('hp');
	function iterLoop(game, cmdct0) {
		const pl = game.byId(game.turn),
			foe = pl.foe;
		function iterCore(c) {
			if (!c || !c.canactive()) return;
			const ch = game.props.get(c.id).hashCode();
			if (casthash.has(ch)) return;
			casthash.add(ch);
			const active = c.active.get('cast');
			function evalIter(t, targetFilter) {
				if ((!targetFilter || (t && targetFilter(t))) && --limit > 0) {
					const gameClone = game.clone();
					gameClone.byId(c.id).useactive(t && gameClone.byId(t.id));
					const v =
						gameClone.winner === pl.id
							? -999
							: gameClone.winner === foe.id
							? 999
							: gameClone.byId(foe.id).hp;
					if (v < currentEval) {
						cmdct = cmdct0 || { c: c.id, t: t && t.id };
						currentEval = v;
						if (!gameClone.winner) {
							iterLoop(gameClone, cmdct);
						}
					}
				}
			}
			if (active && active.castName in game.Cards.Targeting) {
				const targetFilter = game.targetFilter(c, active);
				if (c.owner.shield && c.owner.shield.getStatus('reflective'))
					evalIter(c.owner, targetFilter);
				evalIter(c.owner.foe, targetFilter);
				c.owner.creatures.forEach(cr => {
					if (cr && cr.getStatus('voodoo')) evalIter(cr, targetFilter);
				});
			} else {
				evalIter();
			}
		}
		const casthash = new Set();
		pl.hand.forEach(iterCore);
		pl.permanents.forEach(iterCore);
		pl.creatures.forEach(iterCore);
		iterCore(pl.weapon);
	}
	iterLoop(game);
	return [currentEval, cmdct];
}

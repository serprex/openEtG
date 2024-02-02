import { onCleanup, onMount } from 'solid-js';
import { Index } from 'solid-js/web';

import { userEmit } from '../../sock.jsx';
import { addcard, decodedeck } from '../../etgutil.js';
import Card from '../../Components/Card.jsx';
import * as store from '../../store.jsx';
import { choose } from '../../util.js';

function exitFunc() {
	store.doNav(import('./MainMenu.jsx'));
}

export default function OriginalResult({ game }) {
	const p1id = game.userId(store.state.username);
	const cardswon = [];
	let electrumwon = null;

	const canRematch = () =>
		game.data.rematch &&
		(!game.data.rematchFilter || game.data.rematchFilter(game, p1id));

	const onkeydown = e => {
		if (e.target.tagName === 'TEXTAREA') return;
		if (e.key === ' ' || e.key === 'Enter') exitFunc();
		else if (e.key === 'w' && canRematch()) game.data.rematch();
	};

	onMount(() => {
		document.addEventListener('keydown', onkeydown);
	});
	onCleanup(() => {
		document.removeEventListener('keydown', onkeydown);
	});

	const replay = game.replayJson();
	if (replay) {
		store.clearChat('Replay');
		store.chat(() => replay, 'Replay');
	}

	if (game.winner === p1id) {
		const foedecks = game.data.players.filter(pd => !pd.user);
		if (foedecks.length !== 0) {
			const foedeck = choose(foedecks);
			const foeDeck = decodedeck(foedeck.deck)
				.map(code => game.Cards.Codes[code])
				.filter(
					card => card && !card.isFree() && !card.name.startsWith('Mark of '),
				);
			let newpool = '';
			for (let i = 0; i < game.data.spins; i++) {
				const spins = [];
				while (spins.length < 4) {
					let card = choose(foeDeck);
					if (card.pillar) card = choose(foeDeck);
					if (card.rarity === 15 || card.rarity === 20) {
						card = game.Cards.Codes[1033];
					}
					spins.push(card);
				}
				const c0 = choose(spins),
					c1 = choose(spins),
					c2 = choose(spins);
				cardswon.push([c0, c1, c2]);
				if (c0 === c1 && c1 === c2) {
					newpool = addcard(newpool, c0.code);
				}
			}
			electrumwon =
				((game.data.basereward +
					game.data.hpreward * (game.get(p1id, 'hp') / 100)) *
					(game.get(p1id, 'hp') === game.get(p1id, 'maxhp') ? 2 : 1)) |
				0;

			const update = {
				electrum: game.data.cost + electrumwon,
				pool: newpool || undefined,
			};
			if (update.electrum || update.pool) {
				userEmit('origadd', update);
				store.addOrig(update);
			}
		}
	}

	return (
		<>
			<input
				type="button"
				value="Exit"
				style="position:absolute;left:412px;top:440px"
				onClick={exitFunc}
			/>
			{canRematch() && (
				<input
					type="button"
					value="Rematch"
					onClick={game.data.rematch}
					style="position:absolute;left:412px;top:490px"
				/>
			)}
			<Index each={cardswon}>
				{(c, i) => (
					<div
						style={c()[0] === c()[1] && c()[1] === c()[2] ? '' : 'opacity:.3'}>
						{c().map((card, ci) => (
							<Card x={16 + ci * 32 + i * 300} y={16 + ci * 32} card={card} />
						))}
					</div>
				)}
			</Index>
			{electrumwon > 0 && (
				<div style="text-align:center;width:900px;position:absolute;left:0px;top:550px">
					{electrumwon}
					<span class="ico gold" />
				</div>
			)}
		</>
	);
}

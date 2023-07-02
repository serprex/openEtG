import { onCleanup, onMount } from 'solid-js';
import { For } from 'solid-js/web';

import { userEmit } from '../../sock.jsx';
import * as etg from '../../etg.js';
import * as etgutil from '../../etgutil.js';
import * as Components from '../../Components/index.jsx';
import * as store from '../../store.jsx';
import { choose } from '../../util.js';
import enums from '../../enum.json' assert { type: 'json' };

function exitFunc() {
	store.doNav(import('./MainMenu.jsx'));
}

export default function OriginalResult({ game }) {
	const rx = store.useRx(),
		player1 = game.byUser(rx.user ? rx.user.name : '');
	const cardswon = [];
	let electrumwon = null;

	const canRematch = () =>
		game.data.rematch &&
		(!game.data.rematchFilter || game.data.rematchFilter(game, player1.id));

	const onkeydown = e => {
		if (e.target.tagName === 'TEXTAREA') return;
		const kc = e.which;
		if (kc === 32 || kc === 13) exitFunc();
		else if ((kc === 87 || e.key === 'w') && canRematch()) {
			game.data.rematch();
		}
	};

	onMount(() => {
		document.addEventListener('keydown', onkeydown);
	});
	onCleanup(() => {
		document.removeEventListener('keydown', onkeydown);
	});

	if (game.winner === player1.id) {
		const foedecks = game.data.players.filter(pd => !pd.user);
		if (foedecks.length === 0) return;
		const foedeck = choose(foedecks),
			foeDeck = etgutil
				.decodedeck(foedeck.deck)
				.map(code => game.Cards.Codes[code])
				.filter(
					card => card && !card.isFree() && !card.name.startsWith('Mark of '),
				);
		let newpool = '';
		for (let i = 0; i < game.data.spins; i++) {
			const spins = [];
			while (spins.length < 4) {
				let card = choose(foeDeck);
				if (card.getStatus('pillar')) card = choose(foeDeck);
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
				newpool = etgutil.addcard(newpool, c0.code);
			}
		}
		electrumwon =
			((game.data.basereward + game.data.hpreward * (player1.hp / 100)) *
				(player1.hp === player1.maxhp ? 2 : 1)) |
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
					onClick={() => game.data.rematch()}
					style="position:absolute;left:412px;top:490px"
				/>
			)}
			<For each={cardswon}>
				{(c, i) => (
					<div style={c[0] === c[1] && c[1] === c[2] ? '' : 'opacity:.3'}>
						<Components.Card x={16 + i() * 300} y={16} card={c[0]} />
						<Components.Card x={48 + i() * 300} y={48} card={c[1]} />
						<Components.Card x={80 + i() * 300} y={80} card={c[2]} />
					</div>
				)}
			</For>
			{electrumwon && (
				<Components.Text
					text={`${electrumwon}$`}
					style="text-align:center;width:900px;position:absolute;left:0px;top:550px"
				/>
			)}
		</>
	);
}
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';

import { userEmit } from '../../sock.jsx';
import * as etg from '../../etg.js';
import * as etgutil from '../../etgutil.js';
import * as Components from '../../Components/index.jsx';
import * as store from '../../store.jsx';
import { choose } from '../../util.js';

function exitFunc() {
	store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
}

export default function OriginalResult({ game }) {
	const user = useSelector(({ user }) => user),
		orig = useSelector(({ orig }) => orig),
		cardswonref = useRef(null),
		electrumwonref = useRef(null);

	const player1 = game.byUser(user ? user.name : '');

	const canRematch = useMemo(
		() =>
			game.data.rematch &&
			(!game.data.rematchFilter || game.data.rematchFilter(game, player1.id)),
		[game.data.rematch, game.data.rematchFilter],
	);

	const onkeydown = useCallback(
		e => {
			if (e.target.tagName === 'TEXTAREA') return;
			const kc = e.which;
			if (kc === 32 || kc === 13) exitFunc();
			else if ((kc === 87 || e.key === 'w') && canRematch) {
				game.data.rematch();
			}
		},
		[canRematch, game.data.rematch],
	);

	useEffect(() => {
		document.addEventListener('keydown', onkeydown);
		return () => document.removeEventListener('keydown', onkeydown);
	}, [onkeydown]);

	useEffect(() => {
		if (game.winner !== player1.id) return;
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
		const cardswon = [];
		for (let i = 0; i < game.data.spins; i++) {
			const spins = [];
			while (spins.length < 4) {
				let card = choose(foeDeck);
				if (card.getStatus('pillar')) card = choose(foeDeck);
				if (card.rarity === 15 || card.rarity === 20) {
					card = game.Cards.Names.Relic;
				}
				spins.push(card);
			}
			const c0 = choose(spins),
				c1 = choose(spins),
				c2 = choose(spins);
			cardswon.push(
				<div
					key={cardswon.length}
					style={{ opacity: c0 === c1 && c1 === c2 ? undefined : '.3' }}>
					<Components.Card x={16 + i * 300} y={16} card={c0} />
					<Components.Card x={48 + i * 300} y={48} card={c1} />
					<Components.Card x={80 + i * 300} y={80} card={c2} />
				</div>,
			);
			if (c0 === c1 && c1 === c2) {
				newpool = etgutil.addcard(newpool, c0.code);
			}
		}
		const electrumwon =
			((game.data.basereward + game.data.hpreward * (player1.hp / 100)) *
				(player1.hp === player1.maxhp ? 2 : 1)) |
			0;

		const update = {
			electrum: game.data.cost + electrumwon,
			pool: newpool || undefined,
		};
		if (update.electrum || update.pool) {
			userEmit('origadd', update);
			store.store.dispatch(store.addOrig(update));
		}

		cardswonref.current = cardswon;
		electrumwonref.current = electrumwon;
	}, []);

	return (
		<>
			<input
				type="button"
				value="Exit"
				style={{
					position: 'absolute',
					left: '412px',
					top: '440px',
				}}
				onClick={exitFunc}
			/>
			{canRematch && (
				<input
					type="button"
					value="Rematch"
					onClick={() => game.data.rematch()}
					style={{
						position: 'absolute',
						left: '412px',
						top: '490px',
					}}
				/>
			)}
			{cardswonref.current}
			{electrumwonref.current && (
				<Components.Text
					text={`${electrumwonref.current}$`}
					style={{
						textAlign: 'center',
						width: '900px',
						position: 'absolute',
						left: '0px',
						top: '550px',
					}}
				/>
			)}
		</>
	);
}
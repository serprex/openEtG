import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import * as userutil from '../userutil.js';
import * as Components from '../Components/index.jsx';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';

export default function Trade({ foe }) {
	const user = useSelector(({ user }) => user);
	const [confirm, setConfirm] = useState(0);
	const [canconfirm, setCanconfirm] = useState(false);
	const [card, setCard] = useState(null);
	const [deck, setDeck] = useState([]);
	const [gold, setGold] = useState(0);
	const [offer, setOffer] = useState([]);
	const [gopher, setGopher] = useState(0);

	useEffect(() => {
		store.store.dispatch(
			store.setCmds({
				offertrade: data => {
					setOffer(etgutil.decodedeck(data.c));
					setGopher(data.g | 0);
					setCanconfirm(true);
				},
				tradedone: data => {
					store.store.dispatch(
						store.updateUser({
							pool: etgutil.mergedecks(
								etgutil.removedecks(user.pool, data.oldcards),
								data.newcards,
							),
							gold: user.gold + data.g,
						}),
					);
					store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
				},
				tradecanceled: data => {
					if (data.u === foe) {
						store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
					}
				},
			}),
		);
	}, [user, foe]);

	useEffect(() => sock.userEmit('reloadtrade', { f: foe }), [foe]);

	const cardminus = useMemo(() => {
			const minus = [];
			for (const code of deck) {
				minus[code] = (minus[code] ?? 0) + 1;
			}
			return minus;
		}, [deck]),
		cardpool = useMemo(() => etgutil.deck2pool(user.pool), [user.pool]);

	return (
		<>
			{(confirm === 0 || (confirm === 1 && canconfirm)) && (
				<input
					type="button"
					value={confirm === 0 ? 'Trade' : 'Confirm'}
					onClick={
						confirm === 0
							? () => {
									sock.userEmit('offertrade', {
										f: foe,
										cards: etgutil.encodedeck(deck),
										g: gold,
										forcards: null,
										forg: null,
									});
									setConfirm(1);
							  }
							: () => {
									sock.userEmit('offertrade', {
										f: foe,
										cards: etgutil.encodedeck(deck),
										g: gold,
										forcards: etgutil.encodedeck(offer),
										forg: gopher,
									});
									setConfirm(2);
							  }
					}
					style={{
						position: 'absolute',
						left: '10px',
						top: confirm === 0 ? '40px' : '60px',
					}}
				/>
			)}
			<Components.DeckDisplay
				cards={Cards}
				deck={deck}
				onMouseOver={(i, card) => setCard(card)}
				onClick={i => {
					const newdeck = deck.slice();
					newdeck.splice(i, 1);
					setDeck(newdeck);
				}}
			/>
			<Components.DeckDisplay
				cards={Cards}
				deck={offer}
				x={450}
				onMouseOver={(i, card) => setCard(card)}
			/>
			<Components.Text
				text={`${gold + userutil.calcWealth(Cards, deck, true)}$`}
				style={{
					position: 'absolute',
					left: '100px',
					top: '235px',
				}}
			/>
			<Components.Text
				text={`(${gold}$)`}
				style={{
					position: 'absolute',
					left: '250px',
					top: '235px',
				}}
			/>
			<Components.Text
				text={`${gopher + userutil.calcWealth(Cards, offer, true)}$`}
				style={{
					position: 'absolute',
					left: '350px',
					top: '235px',
				}}
			/>
			<Components.Text
				text={`(${gopher}$)`}
				style={{
					position: 'absolute',
					left: '500px',
					top: '235px',
				}}
			/>
			<input
				type="button"
				value="Cancel"
				onClick={() => {
					sock.userEmit('canceltrade', { f: foe });
					store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
				}}
				style={{
					position: 'absolute',
					left: '10px',
					top: '10px',
				}}
			/>
			<input
				type="number"
				placeholder="Gold"
				value={gold}
				onChange={e =>
					setGold(
						Math.min(Math.min(user.gold, Math.abs(e.target.value | 0)), 65535),
					)
				}
				style={{
					position: 'absolute',
					left: '8px',
					top: '235px',
					width: '84px',
				}}
			/>
			{confirm === 0 && (
				<Components.CardSelector
					cards={Cards}
					cardpool={cardpool}
					cardminus={cardminus}
					onMouseOver={setCard}
					onClick={card => {
						const code = card.code;
						if (
							deck.length < 30 &&
							!card.isFree() &&
							code in cardpool &&
							!(code in cardminus && cardminus[code] >= cardpool[code])
						) {
							setDeck(deck.concat([code]));
						}
					}}
				/>
			)}
			<Components.Card x={734} y={8} card={card} />
		</>
	);
}
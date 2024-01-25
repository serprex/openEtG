import { createEffect, createMemo, createSignal, onMount } from 'solid-js';

import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import { calcWealth } from '../userutil.js';
import Card from '../Components/Card.jsx';
import CardSelector from '../Components/CardSelector.jsx';
import DeckDisplay from '../Components/DeckDisplay.jsx';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';

export default function Trade(props) {
	const rx = store.useRx();
	const [confirm, setConfirm] = createSignal(0);
	const [card, setCard] = createSignal(null);
	const [deck, setDeck] = createSignal([]);
	const [gold, setGold] = createSignal(0);
	const [offer, setOffer] = createSignal(null);
	const offerDeck = createMemo(() =>
		etgutil.decodedeck(offer()?.forcards ?? ''),
	);

	onMount(() => {
		sock.setCmds({
			offertrade: data => {
				setOffer({
					foralt: data.a,
					forcards: data.c,
					forg: data.g,
				});
			},
			tradedone: data => {
				store.setAlt(data.alt || null);
				store.updateUser({
					pool: etgutil.mergedecks(
						etgutil.removedecks(rx.user.pool, data.oldcards),
						data.newcards,
					),
					gold: rx.user.gold + data.g,
				});
				store.doNav(import('./MainMenu.jsx'));
			},
			tradecanceled: data => {
				if (data.u === props.foe) {
					store.doNav(import('./MainMenu.jsx'));
				}
			},
		});
	});

	createEffect(() => sock.userEmit('reloadtrade', { f: props.foe }));

	const cardminus = createMemo(() => {
			const minus = [];
			for (const code of deck()) {
				minus[code] = (minus[code] ?? 0) + 1;
			}
			return minus;
		}),
		cardpool = createMemo(() => etgutil.deck2pool(rx.user.pool));

	return (
		<>
			{(confirm() === 0 || (confirm() === 1 && offer() !== null)) && (
				<input
					type="button"
					value={confirm() === 0 ? 'Trade' : 'Confirm'}
					onClick={() => {
						if (confirm() === 0) {
							sock.userEmit('offertrade', {
								f: props.foe,
								cards: etgutil.encodedeck(deck()),
								g: gold(),
								foralt: null,
								forcards: null,
								forg: null,
							});
							setConfirm(1);
						} else {
							sock.userEmit('offertrade', {
								f: props.foe,
								cards: etgutil.encodedeck(deck()),
								g: gold(),
								...offer(),
							});
							setConfirm(2);
						}
					}}
					style={{
						position: 'absolute',
						left: '10px',
						top: confirm() === 0 ? '40px' : '60px',
					}}
				/>
			)}
			<DeckDisplay
				cards={Cards}
				deck={deck()}
				onMouseOver={(_i, card) => setCard(card)}
				onClick={i => {
					const newdeck = deck().slice();
					newdeck.splice(i, 1);
					setDeck(newdeck);
				}}
			/>
			<DeckDisplay
				cards={Cards}
				deck={offerDeck()}
				x={450}
				onMouseOver={(_i, card) => setCard(card)}
			/>
			<div style="position:absolute;left:100px;top:235px">
				{gold() + calcWealth(Cards, deck(), true)}
				<span class="ico gold" />
			</div>
			<div style="position:absolute;left:250px;top:235px">
				({gold()}
				<span class="ico gold" />)
			</div>
			<div style="position:absolute;left:350px;top:235px">
				{(offer()?.forg ?? 0) + calcWealth(Cards, offerDeck(), true)}
				<span class="ico gold" />
			</div>
			<div style="position:absolute;left:500px;top:235px">
				({offer()?.forg ?? 0}
				<span class="ico gold" />)
			</div>
			<input
				type="button"
				value="Cancel"
				onClick={() => {
					sock.userEmit('canceltrade', { f: props.foe });
					store.doNav(import('./MainMenu.jsx'));
				}}
				style="position:absolute;left:10px;top:10px"
			/>
			<input
				type="number"
				placeholder="Gold"
				value={gold()}
				onChange={e =>
					setGold(
						Math.min(
							Math.min(rx.user.gold, Math.abs(e.target.value | 0)),
							65535,
						),
					)
				}
				style="position:absolute;left:8px;top:235px;width:84px"
			/>
			{confirm() === 0 && (
				<CardSelector
					cards={Cards}
					cardpool={cardpool()}
					cardminus={cardminus()}
					onMouseOver={setCard}
					onClick={card => {
						const code = card.code;
						if (
							deck().length < 30 &&
							!card.isFree() &&
							code in cardpool() &&
							!(code in cardminus() && cardminus()[code] >= cardpool()[code])
						) {
							setDeck(deck().concat([code]));
						}
					}}
				/>
			)}
			<Card x={734} y={8} card={card()} />
		</>
	);
}

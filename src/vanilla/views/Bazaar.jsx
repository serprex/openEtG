import { createMemo, createSignal } from 'solid-js';

import * as etgutil from '../../etgutil.js';
import Cards from '../Cards.js';
import { userEmit } from '../../sock.jsx';
import * as store from '../../store.jsx';
import * as Components from '../../Components/index.jsx';

export default function OriginalBazaar() {
	const rx = store.useRedux();
	const [deck, setDeck] = createSignal([]);
	const [card, setCard] = createSignal(null);
	const cost = () => {
		let cost = 0;
		for (const code of deck()) {
			const card = Cards.Codes[code];
			cost += 6 * card.rarity ** 2 + card.cost;
		}
		return cost;
	};

	return (
		<>
			<Components.DeckDisplay
				cards={Cards}
				deck={deck()}
				onMouseOver={(i, card) => setCard(card)}
				onClick={i => {
					const newdeck = deck().slice();
					newdeck.splice(i, 1);
					setDeck(newdeck);
				}}
			/>
			<Components.Text
				text={`${rx.orig.electrum}$`}
				style={{
					position: 'absolute',
					left: '8px',
					top: '235px',
				}}
			/>
			<Components.Text
				text={`${cost()}$`}
				style={{
					position: 'absolute',
					left: '100px',
					top: '235px',
				}}
			/>
			{deck().length > 0 &&
				(rx.orig.electrum >= cost() ? (
					<input
						type="button"
						value="Buy"
						style={{
							position: 'absolute',
							left: '200px',
							top: '235px',
						}}
						onClick={() => {
							const update = {
								electrum: -cost(),
								pool: etgutil.encodedeck(deck()),
							};
							userEmit('origadd', update);
							store.store.dispatch(store.addOrig(update));
							store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
						}}
					/>
				) : (
					<div
						style={{
							position: 'absolute',
							left: '200px',
							top: '235px',
						}}>
						{`You need ${cost() - rx.orig.electrum} more electrum to afford ${
							deck().length === 1 ? 'this card' : 'these cards'
						}`}
					</div>
				))}
			<input
				type="button"
				value="Exit"
				onClick={() => {
					store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
				}}
				style={{
					position: 'absolute',
					left: '10px',
					top: '10px',
				}}
			/>
			<Components.CardSelector
				cards={Cards}
				filter={card =>
					card.rarity >= 1 && card.rarity <= 4 && card.name !== 'Relic'
				}
				onMouseOver={setCard}
				onClick={card => {
					if (deck().length < 60 && !card.upped && !card.isFree()) {
						setDeck(deck().concat([card.code]));
					}
				}}
			/>
			<Components.Card x={734} y={8} card={card()} />
		</>
	);
}

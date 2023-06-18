import { createMemo, createSignal } from 'solid-js';

import * as etgutil from '../../etgutil.js';
import Cards from '../Cards.js';
import { userEmit } from '../../sock.jsx';
import * as store from '../../store.jsx';
import * as Components from '../../Components/index.jsx';

export default function OriginalUpgrade(props) {
	const rx = store.useRedux();
	const [deck, setDeck] = createSignal([]);
	const [card, setCard] = createSignal(null);

	const cardminus = createMemo(() => {
		const cardminus = [];
		for (const code of deck()) {
			cardminus[code] = (cardminus[code] ?? 0) + 1;
		}
		return cardminus;
	});
	const cardpool = createMemo(() => {
		const cardpool = etgutil.deck2pool(rx.orig.pool);
		for (const key in cardpool) {
			const card = Cards.Codes[key];
			if (card.upped) delete cardpool[key];
		}
		return cardpool;
	});
	const cost = () => deck().length * 1500;

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
						value="Upgrade"
						style={{
							position: 'absolute',
							left: '200px',
							top: '235px',
						}}
						onClick={() => {
							const update = {
								electrum: -cost(),
								pool: etgutil.encodedeck(deck().map(code => code + 2000)),
								rmpool: etgutil.encodedeck(
									deck().filter(code => !Cards.Codes[code].isFree()),
								),
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
							deck().length === 1 ? 'this upgrade' : 'these upgrades'
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
				cardpool={cardpool()}
				cardminus={cardminus()}
				filter={card =>
					card.isFree() ||
					(card.code in cardpool() &&
						(cardminus()[card.code] ?? 0) < cardpool()[card.code])
				}
				onMouseOver={setCard}
				onClick={card => {
					if (deck().length < 60) {
						setDeck(deck().concat([card.code]));
					}
				}}
			/>
			<Components.Card x={734} y={8} card={card()} />
		</>
	);
}

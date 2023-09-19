import { createMemo, createSignal } from 'solid-js';
import { Show } from 'solid-js/web';

import * as etgutil from '../../etgutil.js';
import Cards from '../Cards.js';
import { userEmit } from '../../sock.jsx';
import * as store from '../../store.jsx';
import { Card, CardSelector, DeckDisplay } from '../../Components/index.jsx';
import Text from '../../Components/Text.jsx';

export default function OriginalUpgrade(props) {
	const rx = store.useRx();
	const [deck, setDeck] = createSignal([]);
	const [card, setCard] = createSignal(null);

	const cardminus = createMemo(() => {
		const cardminus = [];
		for (const code of deck()) {
			cardminus[code] = (cardminus[code] ?? 0) + 1;
		}
		return cardminus;
	});
	const cardpool = createMemo(() => etgutil.deck2pool(rx.orig.pool));

	const buyCost = createMemo(() => {
		let cost = 0;
		for (const code of deck()) {
			const card = Cards.Codes[code];
			cost += 6 * card.rarity ** 2 + card.cost;
		}
		return cost;
	});
	const sellCost = createMemo(() => {
		let cost = 0;
		for (const code of deck()) {
			const card = Cards.Codes[code];
			cost += 4 * card.rarity ** 2 + card.cost;
		}
		return cost;
	});
	const upgradeCost = () => deck().length * 1500;

	const canUpgrade = () =>
		deck().length > 0 &&
		deck().every(code => {
			const card = Cards.Codes[code];
			return (
				card.isFree() ||
				(code in cardpool() &&
					(cardminus()[code] ?? 0) <= cardpool()[code] &&
					!card.upped)
			);
		});
	const canBuy = () =>
		deck().length > 0 &&
		deck().every(code => {
			const card = Cards.Codes[code];
			return card.rarity >= 1 && card.rarity <= 4 && card.name !== 'Relic';
		});
	const canSell = () =>
		deck().length > 0 &&
		deck().every(
			code =>
				code in cardpool() && (cardminus()[code] ?? 0) <= cardpool()[code],
		);

	return (
		<>
			<DeckDisplay
				cards={Cards}
				deck={deck()}
				onMouseOver={(i, card) => setCard(card)}
				onClick={i => {
					const newdeck = deck().slice();
					newdeck.splice(i, 1);
					setDeck(newdeck);
				}}
			/>
			<Text
				text={`${rx.orig.electrum}$`}
				style="position:absolute;left:4px;top:235px"
			/>
			<div style="position:absolute;left:200px;top:4px">
				{canBuy() && rx.orig.electrum < buyCost()
					? `Need ${buyCost() - rx.orig.electrum} more to afford card${
							deck().length === 1 ? '' : 's'
					  }`
					: canUpgrade() && rx.orig.electrum < upgradeCost()
					? `Need ${upgradeCost() - rx.orig.electrum} more to afford upgrade${
							deck().length === 1 ? '' : 's'
					  }`
					: ''}
			</div>
			<div style="position:absolute;left:100px;top:235px">
				<Text text={`${buyCost()}$`} style="display:inline;margin-right:4px" />
				<Show when={canBuy() && rx.orig.electrum >= buyCost()}>
					<input
						type="button"
						value="Buy"
						onClick={() => {
							const update = {
								electrum: -buyCost(),
								pool: etgutil.encodedeck(deck()),
							};
							userEmit('origadd', update);
							store.addOrig(update);
							store.doNav(import('./MainMenu.jsx'));
						}}
					/>
				</Show>
			</div>
			<div style="position:absolute;left:300px;top:235px">
				<Text text={`${sellCost()}$`} style="display:inline;margin-right:4px" />
				<Show when={canSell()}>
					<input
						type="button"
						value="Sell"
						onClick={() => {
							const update = {
								electrum: sellCost(),
								rmpool: etgutil.encodedeck(deck()),
							};
							userEmit('origadd', update);
							store.addOrig(update);
							store.doNav(import('./MainMenu.jsx'));
						}}
					/>
				</Show>
			</div>
			<div style="position:absolute;left:500px;top:235px">
				<Text
					text={`${upgradeCost()}$`}
					style="display:inline;margin-right:4px"
				/>
				<Show when={canUpgrade() && rx.orig.electrum >= upgradeCost()}>
					<input
						type="button"
						value="Upgrade"
						onClick={() => {
							const update = {
								electrum: -upgradeCost(),
								pool: etgutil.encodedeck(deck().map(code => code + 2000)),
								rmpool: etgutil.encodedeck(
									deck().filter(code => !Cards.Codes[code].isFree()),
								),
							};
							userEmit('origadd', update);
							store.addOrig(update);
							store.doNav(import('./MainMenu.jsx'));
						}}
					/>
				</Show>
			</div>
			<input
				type="button"
				value="Exit"
				onClick={() => store.doNav(import('./MainMenu.jsx'))}
				style="position:absolute;left:4px;top:4px"
			/>
			<CardSelector
				cards={Cards}
				shiny={false}
				cardpool={cardpool()}
				cardminus={cardminus()}
				filter={card =>
					card.isFree() ||
					(card.code in cardpool() &&
						(cardminus()[card.code] ?? 0) < cardpool()[card.code]) ||
					(card.rarity >= 1 && card.rarity <= 4 && card.name !== 'Relic')
				}
				onMouseOver={setCard}
				onClick={card => {
					if (deck().length < 60) {
						setDeck(deck().concat([card.code]));
					}
				}}
			/>
			<Card x={734} y={8} card={card()} />
		</>
	);
}

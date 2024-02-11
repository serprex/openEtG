import { createSignal } from 'solid-js';

import { playSound } from '../audio.js';
import Card from './Card.jsx';
import CardSelector from './CardSelector.jsx';
import DeckDisplay from './DeckDisplay.jsx';
import { asShiny } from '../etgutil.js';

export default function Editor(props) {
	const [card, setCard] = createSignal(null);

	const addCard = card => {
		if (props.deck.length < 60) props.setDeck(props.deck.concat([card.code]));
	};

	const rmCard = code => {
		const idx = props.deck.indexOf(code);
		if (~idx) {
			const newdeck = props.deck.slice();
			newdeck.splice(idx, 1);
			props.setDeck(newdeck);
		} else {
			code = asShiny(code, true);
			const idx = props.deck.indexOf(code);
			if (~idx) {
				const newdeck = props.deck.slice();
				newdeck.splice(idx, 1);
				props.setDeck(newdeck);
			}
		}
	};

	return (
		<>
			<DeckDisplay
				cards={props.cards}
				onMouseOver={(_, card) => setCard(card)}
				onClick={(i, card) => {
					const newdeck = props.deck.slice();
					newdeck.splice(i, 1);
					props.setDeck(newdeck);
				}}
				deck={props.deck}
				pool={props.pool}
				autoup={props.autoup}
			/>
			<CardSelector
				cards={props.cards}
				onMouseOver={setCard}
				onClick={addCard}
				onContextMenu={rmCard}
				maxedIndicator={!props.acard}
				filterboth={!!props.pool}
				cardpool={props.pool}
				cardminus={props.cardMinus}
				noupped={props.noupped}
				shiny={props.shiny}
				autoup={props.autoup}
			/>
			<input
				type="button"
				value="Clear"
				onClick={() => props.setDeck([])}
				style="position:absolute;left:8px;top:32px"
			/>
			<span
				class={'ico e' + props.mark}
				style="position:absolute;left:66px;top:200px"
			/>
			<div style="position:absolute;left:100px;top:234px">
				{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
					<span
						class={`imgb ico e${i}${props.mark === i ? ' selected' : ''}`}
						onClick={() => {
							playSound('click');
							props.setMark(i);
						}}
						onMouseOver={props.onMouseOver}
					/>
				))}
			</div>
			<Card x={734} y={8} card={card()} />
		</>
	);
}

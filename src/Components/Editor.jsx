import { createSignal } from 'solid-js';

import * as Components from '../Components/index.jsx';
import * as etgutil from '../etgutil.js';

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
			code = etgutil.asShiny(code, true);
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
			<Components.DeckDisplay
				cards={props.cards}
				onMouseOver={(_, card) => setCard(card)}
				onClick={(i, card) => {
					const newdeck = props.deck.slice();
					newdeck.splice(i, 1);
					props.setDeck(newdeck);
				}}
				deck={props.deck}
				pool={props.pool}
			/>
			<Components.CardSelector
				cards={props.cards}
				onMouseOver={setCard}
				onClick={addCard}
				onContextMenu={rmCard}
				maxedIndicator={!props.acard}
				filterboth={!!props.pool}
				cardpool={props.pool}
				cardminus={props.cardMinus}
				noupped={props.noupped}
			/>
			<input
				type="button"
				value="Clear"
				onClick={() => props.setDeck([])}
				style={{
					position: 'absolute',
					left: '8px',
					top: '32px',
				}}
			/>
			<span
				class={'ico e' + props.mark}
				style={{
					position: 'absolute',
					left: '66px',
					top: '200px',
				}}
			/>
			<For each={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}>
				{i => (
					<Components.IconBtn
						e={'e' + i}
						x={100 + i * 32}
						y={234}
						click={() => props.setMark(i)}
					/>
				)}
			</For>
			<Components.Card x={734} y={8} card={card()} />
		</>
	);
}
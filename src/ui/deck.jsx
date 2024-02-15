import { onMount, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import Cards from '../AllCards.js';
import Card from '../Components/Card.jsx';
import DeckDisplay from '../Components/DeckDisplay.jsx';
import { decodedeck } from '../etgutil.js';
import { calcWealth } from '../userutil.js';

function App() {
	const [deck, setDeck] = createSignal(decodedeck(location.hash.slice(1))),
		[card, setCard] = createSignal(null);

	onMount(() => {
		window.addEventListener('hashchange', () => {
			setDeck(decodedeck(location.hash.slice(1)));
		});
	});

	return (
		<>
			<DeckDisplay
				cards={Cards}
				renderMark
				x={-60}
				y={-24}
				deck={deck()}
				onMouseOver={(i, card) => setCard(card)}
			/>
			<Card x={36} y={206} card={card()} />
			<span style="position:absolute;left:204px;top:206px">
				{calcWealth(Cards, deck(), true)} <span class="ico gold" />
			</span>
		</>
	);
}

render(() => <App />, document.getElementById('deck'));

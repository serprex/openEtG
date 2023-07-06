import { onMount, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import Cards from '../AllCards.js';
import { Card, DeckDisplay } from '../Components/index.jsx';
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
				x={-64}
				y={-24}
				deck={deck()}
				onMouseOver={(i, card) => setCard(card)}
			/>
			<Card x={36} y={206} card={card()} />
			<span style="position:absolute;left:204px;top:206px">
				{calcWealth(Cards, deck(), true)}
			</span>
		</>
	);
}

render(() => <App />, document.getElementById('deck'));

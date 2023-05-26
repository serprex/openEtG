import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Cards from '../AllCards.js';
import { Card, DeckDisplay } from '../Components/index.jsx';
import { decodedeck } from '../etgutil.js';
import { calcWealth } from '../userutil.js';

const wealthStyle = {
	position: 'absolute',
	left: '204px',
	top: '206px',
};
function App() {
	const [deck, setDeck] = useState(decodedeck(location.hash.slice(1))),
		[card, setCard] = useState(null);

	useEffect(() => {
		window.addEventListener('hashchange', () => {
			setDeck(decodedeck(location.hash.slice(1)));
		});
	}, []);

	return (
		<>
			<DeckDisplay
				cards={Cards}
				renderMark
				x={-64}
				y={-24}
				deck={deck}
				onMouseOver={(i, card) => setCard(card)}
			/>
			<Card x={36} y={206} card={card} />
			<span style={wealthStyle}>{calcWealth(Cards, deck, true)}</span>
		</>
	);
}

createRoot(document.getElementById('deck')).render(<App />);
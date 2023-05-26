import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../Game.js';
import { toTrueMark, encodedeck } from '../etgutil.js';
import { Earth, ShardList } from '../etg.js';
import { Text } from '../Components/index.jsx';

function App() {
	const [cards, setCards] = useState(new Uint8Array(24));

	let info = 'Too many cards';
	const deck = [toTrueMark(Earth), ShardList[Earth] + 2000];
	cards.forEach((count, idx) => {
		for (let i = 0; i < count; i++)
			deck.push(ShardList[(idx % 12) + 1] + (idx >= 12 ? 2000 : 0));
	});
	if (deck.length < 10) {
		const data = {
			seed: 0,
			players: [
				{ idx: 0, deck: encodedeck(deck) },
				{ idx: 1, deck: '' },
			],
		};
		const game = new Game(data),
			player = game.byId(1);
		game.next({ x: 'end' }, false);

		let id = 0;
		for (const handId of player.handIds) {
			if (game.byId(handId).card.code == ShardList[Earth] + 2000) {
				id = handId;
				break;
			}
		}
		if (id) {
			game.next({ x: 'cast', c: id }, false);
			const golemId = player.creatureIds[0];
			info = golemId ? game.byId(golemId).info() : 'No Shard Golem spawned';
		} else info = 'No Shard of Integrity to cast';
	}

	const form = [];
	for (let idx = 0; idx < 12; idx++) {
		const count = cards[idx];
		form.push(
			<div key={idx}>
				<div className={`ico e${idx + 1}`} />
				<input
					style={{ display: 'block', width: '60px' }}
					type="number"
					value={cards[idx]}
					onChange={e => {
						const newCards = new Uint8Array(cards);
						newCards[idx] = Math.max(e.target.value | 0, 0);
						setCards(newCards);
					}}
				/>
				<input
					style={{ display: 'block', width: '60px' }}
					type="number"
					value={cards[idx + 12]}
					onChange={e => {
						const newCards = new Uint8Array(cards);
						newCards[idx + 12] = Math.max(e.target.value | 0, 0);
						setCards(newCards);
					}}
				/>
			</div>,
		);
	}
	return (
		<>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
				}}>
				{form}
			</div>
			<Text text={info} style={{ width: '900px' }} />
		</>
	);
}

createRoot(document.getElementById('soi')).render(<App />);
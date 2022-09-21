import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../Game.js';
import { toTrueMark, encodedeck } from '../etgutil.js';
import { Earth, ShardList } from '../etg.js';
import { Text } from '../Components/index.jsx';

class App extends Component {
	state = { cards: new Uint8Array(24) };

	info() {
		const deck = [];
		this.state.cards.forEach((count, idx) => {
			for (let i = 0; i < count; i++)
				deck.push(ShardList[(idx % 12) + 1] + (idx >= 12 ? 2000 : 0));
		});
		if (deck.length > 7) return 'Too many cards';
		deck.push(ShardList[Earth] + 2000);
		deck.push(toTrueMark(Earth));
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
		if (!id) return 'No Shard of Integrity to cast';
		game.next({ x: 'cast', c: id }, false);
		const golemId = player.creatureIds[0];
		return golemId ? game.byId(golemId).info() : 'No Shard Golem spawned';
	}

	render() {
		const form = [];
		for (let idx = 0; idx < 12; idx++) {
			const count = this.state.cards[idx];
			form.push(
				<div key={idx}>
					<div className={`ico e${idx + 1}`} />
					<input
						style={{ display: 'block', width: '60px' }}
						type="number"
						value={this.state.cards[idx]}
						onChange={e =>
							this.setState(state => {
								const newstate = new Uint8Array(state.cards);
								newstate[idx] = Math.max(e.target.value | 0, 0);
								return { cards: newstate };
							})
						}
					/>
					<input
						style={{ display: 'block', width: '60px' }}
						type="number"
						value={this.state.cards[idx + 12]}
						onChange={e =>
							this.setState(state => {
								const newstate = new Uint8Array(state.cards);
								newstate[idx + 12] = Math.max(e.target.value | 0, 0);
								return { cards: newstate };
							})
						}
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
				<Text text={this.info()} style={{ width: '900px' }} />
			</>
		);
	}
}

createRoot(document.getElementById('soi')).render(<App />);
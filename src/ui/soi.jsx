import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import Game from '../Game.js';
import { toTrueMark, encodedeck } from '../etgutil.js';
import { Earth, ShardList } from '../etg.js';
import { Text } from '../Components/index.jsx';

function App() {
	const [cards, setCards] = createSignal(new Uint8Array(24));

	const info = () => {
		const deck = [toTrueMark(Earth), ShardList[Earth] + 2000];
		cards().forEach((count, idx) => {
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
				if (game.byId(handId).card.code === ShardList[Earth] + 2000) {
					id = handId;
					break;
				}
			}
			if (id) {
				game.next({ x: 'cast', c: id }, false);
				const golemId = player.creatureIds[0];
				return golemId ? game.byId(golemId).info() : 'No Shard Golem spawned';
			} else return 'No Shard of Integrity to cast';
		} else return 'Too many cards';
	};

	const form = () => {
		const cs = cards();
		const form = [];
		for (let idx = 0; idx < 12; idx++) {
			const count = cs[idx];
			form.push(
				<div>
					<div class={`ico e${idx + 1}`} />
					<input
						style="display:block;width:60px"
						type="number"
						value={cs[idx]}
						onChange={e => {
							const newCards = new Uint8Array(cs);
							newCards[idx] = Math.max(e.target.value | 0, 0);
							setCards(newCards);
						}}
					/>
					<input
						style="display:block;width:60px"
						type="number"
						value={cs[idx + 12]}
						onChange={e => {
							const newCards = new Uint8Array(cs);
							newCards[idx + 12] = Math.max(e.target.value | 0, 0);
							setCards(newCards);
						}}
					/>
				</div>,
			);
		}
		return form;
	};

	return (
		<>
			<div style="display:flex;justify-content:space-between">{form}</div>
			<Text text={info()} style="width:900px" />
		</>
	);
}

render(() => <App />, document.getElementById('soi'));
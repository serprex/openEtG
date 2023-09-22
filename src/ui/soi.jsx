import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import Game from '../Game.js';
import { toTrueMark, encodedeck } from '../etgutil.js';
import { Kind } from '../rs/pkg/etg.js';
import Text from '../Components/Text.jsx';

const Earth = 4;

function Shard(element) {
	return 5030 + element * 100;
}

function App() {
	const [cards, setCards] = createSignal(new Uint8Array(24));

	const info = () => {
		const deck = [toTrueMark(Earth), Shard(Earth) + 2000];
		cards().forEach((count, idx) => {
			for (let i = 0; i < count; i++)
				deck.push(Shard((idx % 12) + 1) + (idx >= 12 ? 2000 : 0));
		});
		if (deck.length < 10) {
			const data = {
				seed: 0,
				players: [
					{ idx: 0, deck: encodedeck(deck) },
					{ idx: 1, deck: '' },
				],
			};
			const game = new Game(data);
			game.nextCmd({ x: 'end' }, false);

			let id = 0;
			for (const handId of game.get_hand(1)) {
				if (game.get(handId, 'card') === Shard(Earth) + 2000) {
					id = handId;
					break;
				}
			}
			if (id) {
				game.nextCmd({ x: 'cast', c: id }, false);
				const golemId = game
					.visible_instances(1)
					.find(id => game.get_kind(id) === Kind.Creature);
				return golemId ? game.info(golemId) : 'No Shard Golem spawned';
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

import { createSignal, onMount, Show } from 'solid-js';
import { For } from 'solid-js/web';

import { encodeCode } from '../etgutil.js';
import Cards from '../Cards.js';
import Card from '../Components/Card.jsx';
import { doNav } from '../store.jsx';
import { emit, setCmds } from '../sock.jsx';

export default function ArenaTop({ lv }) {
	const [top, setTop] = createSignal([]);
	const [card, setCard] = createSignal(null);

	onMount(() => {
		setCmds({ arenatop: ({ top }) => setTop(top) });
		emit({ x: 'arenatop', lv });
	});

	return (
		<>
			<ol class="atopol" style="position:absolute;left:90px;top:16px">
				<For each={top()}>
					{data => {
						const card = Cards.Codes[data[5]].asUpped(lv);
						return (
							<li>
								<a
									class="atoptext"
									href={`/deck/05${encodeCode(card.code)}${data[6]}`}
									target="_blank">
									{data[0]}
								</a>
								<span class="atop1">{data[1]}</span>
								<span class="atop2">{data[2]}</span>
								<span class="atopdash">-</span>
								<span class="atop3">{data[3]}</span>
								<span class="atop4">{data[4]}</span>
								<span
									class="atoptext"
									onMouseMove={e =>
										setCard({ card, x: e.clientX + 4, y: e.clientY + 4 })
									}
									onMouseLeave={[setCard, null]}>
									{card.name}
								</span>
							</li>
						);
					}}
				</For>
			</ol>
			<input
				type="button"
				value="Exit"
				onClick={() => doNav(import('./MainMenu.jsx'))}
				style="position:absolute;left:8px;top:300px"
			/>
			<Show when={card()}>
				{card => (
					<Card
						style={`position:fixed;left:${card().x}px;top:${card().y}px`}
						card={card().card}
					/>
				)}
			</Show>
		</>
	);
}

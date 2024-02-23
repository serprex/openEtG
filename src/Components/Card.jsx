import { Show } from 'solid-js';
import { encodeCode, asShiny } from '../etgutil.js';
import Text from './Text.jsx';
import { maybeLightenStr } from '../ui.js';

export default function Card(props) {
	return (
		<Show when={props.card}>
			{card => (
				<div
					class="card"
					style={`${
						card().upped ? 'color:#000;' : ''
					}background-color:${maybeLightenStr(card())};${props.style ?? ''}`}>
					<span class="name">{card().name}</span>
					<img
						class={card().shiny ? 'shiny' : ''}
						src={`/Cards/${encodeCode(
							card().code + (asShiny(card().code, false) < 5000 ? 4000 : 0),
						)}.webp`}
					/>
					<div
						class="text"
						style={`background-color:${maybeLightenStr(card())}`}>
						<Text text={card().text} icoprefix="te" />
					</div>
					{!!card().rarity && <span class={`rarity ico r${card().rarity}`} />}
					{!!card().cost && (
						<span class="cost">
							{card().cost}
							<span class={`ico te${card().costele}`} />
						</span>
					)}
					<span class={`kind ico t${card().type}`} />
				</div>
			)}
		</Show>
	);
}

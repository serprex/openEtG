import { Show } from 'solid-js';
import { encodeCode, asShiny } from '../etgutil.js';
import Text from './Text.jsx';
import { maybeLightenStr } from '../ui.js';

export default function Card(props) {
	return (
		<Show when={props.card}>
			{card => (
				<div
					style={{
						position: 'absolute',
						left: props.x + 'px',
						top: props.y + 'px',
						width: '160px',
						height: '256px',
						'pointer-events': 'none',
						'z-index': '5',
						color: card().upped ? '#000' : '',
						overflow: 'hidden',
						'background-color': maybeLightenStr(card()),
						'border-radius': '4px',
						'border-width': '3px',
						'border-style': 'double',
					}}>
					<span style="position:absolute;left:2px;top:2px;font-size:12px">
						{card().name}
					</span>
					<img
						class={card().shiny ? 'shiny' : ''}
						src={`/Cards/${encodeCode(
							card().code + (asShiny(card().code, false) < 5000 ? 4000 : 0),
						)}.webp`}
						style="position:absolute;top:20px;left:8px;width:128px;height:128px;border-width:1px;border-color:#000;border-style:solid"
					/>
					<div
						style={`position:absolute;padding:1px;bottom:0;font-size:9px;min-height:102px;background-color:${maybeLightenStr(
							card(),
						)};border-radius:0 0 4px 4px`}>
						<Text text={card().text} icoprefix="te" />
					</div>
					{!!card().rarity && (
						<span
							class={`ico r${card().rarity}`}
							style="position:absolute;right:2px;top:40px"
						/>
					)}
					{!!card().cost && (
						<span style="position:absolute;right:0;padding-right:2px;padding-top:2px;font-size:12px">
							{card().cost}
							<span class={`ico te${card().costele}`} />
						</span>
					)}
					<span
						class={`ico t${card().type}`}
						style="position:absolute;right:2px;top:22px"
					/>
				</div>
			)}
		</Show>
	);
}

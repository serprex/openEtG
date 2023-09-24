import { encodeCode, asShiny } from '../etgutil.js';
import Text from './Text.jsx';
import { maybeLightenStr } from '../ui.js';

export default function Card(p) {
	const textColor = () => p.card && (p.card.upped ? '#000' : ''),
		backColor = () => p.card && maybeLightenStr(p.card);
	return (
		<>
			{p.card && (
				<div
					style={{
						position: 'absolute',
						left: p.x + 'px',
						top: p.y + 'px',
						width: '160px',
						height: '256px',
						'pointer-events': 'none',
						'z-index': '5',
						color: textColor(),
						overflow: 'hidden',
						'background-color': backColor(),
						'border-radius': '4px',
						'border-width': '3px',
						'border-style': 'double',
					}}>
					<span style="position:absolute;left:2px;top:2px;font-size:12px">
						{p.card.name}
					</span>
					<img
						class={p.card.shiny ? 'shiny' : ''}
						src={`/Cards/${encodeCode(
							p.card.code + (asShiny(p.card.code, false) < 5000 ? 4000 : 0),
						)}.webp`}
						style="position:absolute;top:20px;left:8px;width:128px;height:128px;border-width:1px;border-color:#000;border-style:solid"
					/>
					<div
						style={`position:absolute;padding:2px;bottom:0;font-size:10px;min-height:102px;background-color:${backColor()};border-radius:0 0 4px 4px`}>
						<Text text={p.card.text} icoprefix="te" />
					</div>
					{!!p.card.rarity && (
						<span
							class={`ico r${p.card.rarity}`}
							style="position:absolute;right:2px;top:40px"
						/>
					)}
					{!!p.card.cost && (
						<span style="position:absolute;right:0;padding-right:2px;padding-top:2px;font-size:12px">
							{p.card.cost}
							<span class={`ico te${p.card.costele}`} />
						</span>
					)}
					<span
						class={`ico t${p.card.type}`}
						style="position:absolute;right:2px;top:22px"
					/>
				</div>
			)}
		</>
	);
}

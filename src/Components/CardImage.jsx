import { gradientStr, maybeLightenStr } from '../ui.js';

export default function CardImage(props) {
	const bgcol = () => maybeLightenStr(props.card);
	return (
		<div
			class="cardslot"
			onMouseOver={props.onMouseOver}
			onMouseLeave={props.onMouseOut}
			onClick={props.onClick}
			onContextMenu={props.onContextMenu}
			style={{
				'background-image': `linear-gradient(60deg,${bgcol()},${bgcol()} 75%,${gradientStr(
					props.card,
				)})`,
				color: props.card.upped ? '#000' : '#fff',
				...props.style,
			}}>
			<span style="overflow:hidden;text-overflow:ellipsis">
				{props.card.name}
			</span>
			{!!props.card.cost && (
				<span style="flex-shrink:0;pointer-events:none">
					{props.card.cost}
					<span class={'ico te' + props.card.costele} />
				</span>
			)}
		</div>
	);
}

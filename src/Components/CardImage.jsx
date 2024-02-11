import { maybeLightenStr } from '../ui.js';

export default function CardImage(props) {
	return (
		<div
			class={`cardslot${props.card.shiny ? ' shiny' : ''}`}
			onMouseOver={props.onMouseOver}
			onMouseLeave={props.onMouseOut}
			onClick={props.onClick}
			onContextMenu={props.onContextMenu}
			style={{
				'background-color': maybeLightenStr(props.card),
				color: props.card.upped ? '#000' : '#fff',
				...props.style,
			}}>
			<span style="overflow:hidden;text-overflow:ellipsis">
				{props.card.name}
			</span>
			{!!props.card.cost && (
				<span style="flex-shrink:0">
					{props.card.cost}
					<span class={'ico te' + props.card.costele} />
				</span>
			)}
		</div>
	);
}

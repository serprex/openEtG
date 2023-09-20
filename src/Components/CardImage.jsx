import { maybeLightenStr } from '../ui.js';

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
				'background-color': bgcol(),
				'border-color': props.opacity
					? '#f00'
					: props.card.shiny
					? '#daa520'
					: '#222',
				color: props.card.upped ? '#000' : '#fff',
				...props.style,
			}}>
			{props.card.name}
			{!!props.card.cost && (
				<span
					style={`position:absolute;right:0;padding-right:2px;padding-top:2px;background-color:${bgcol()}`}>
					{props.card.cost}
					<span class={'ico te' + props.card.costele} />
				</span>
			)}
		</div>
	);
}

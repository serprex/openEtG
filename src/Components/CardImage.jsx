import { maybeLightenStr, strcols } from '../ui.js';

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
				background:
					props.card.shiny ?
						`linear-gradient(90deg,${bgcol()},${bgcol()} 66%,${
							strcols[props.card.element + !props.card.upped * 13]
						})`
					:	bgcol(),
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

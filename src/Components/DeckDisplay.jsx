import { asShiny, asUpped, fromTrueMark } from '../etgutil.js';
import CardImage from './CardImage.jsx';

export default function DeckDisplay(props) {
	const children = () => {
		let mark = -1,
			j = -1;
		const children = [],
			cardMinus = [],
			cardCounts = [];
		for (let i = 0; i < props.deck.length; i++) {
			const code = props.deck[i],
				card = props.cards.Codes[code];
			if (card) {
				j++;
				let style = null;
				if (props.pool && !card.isFree()) {
					const uncode = asUpped(asShiny(code, false), false);
					const tooMany = !card.pillar && cardCounts[uncode] >= 6;
					if (!card.pillar) cardCounts[uncode] = (cardCounts[uncode] ?? 0) + 1;
					const notEnough = !props.cards.checkPool(
						props.pool,
						cardMinus,
						card,
						uncode,
						props.autoup,
					);
					if (tooMany || notEnough) {
						style = { opacity: '.5' };
					}
				}
				children.push(
					<CardImage
						card={card}
						onMouseOver={
							props.onMouseOver && (() => props.onMouseOver(i, card))
						}
						onClick={props.onClick && (() => props.onClick(i, card))}
						style={style}
					/>,
				);
			} else {
				const ismark = fromTrueMark(code);
				if (~ismark) mark = ismark;
			}
		}
		if (mark !== -1 && props.renderMark) {
			children.push(
				<span class={'ico e' + mark} style="position:absolute;left:-36px" />,
			);
		}
		return children;
	};
	return (
		<div
			class="deckdisplay"
			style={`position:absolute;left:${(props.x ?? 0) + 100}px;top:${
				(props.y ?? 0) + 32
			}px`}>
			{children}
		</div>
	);
}

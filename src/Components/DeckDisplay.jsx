import { fromTrueMark } from '../etgutil.js';
import CardImage from './CardImage.jsx';

export default function DeckDisplay(props) {
	const children = () => {
		let mark = -1,
			j = -1;
		const children = [],
			cardMinus = [],
			cardCount = [];
		for (let i = 0; i < props.deck.length; i++) {
			const code = props.deck[i],
				card = props.cards.Codes[code];
			if (card) {
				j++;
				let opacity;
				if (props.pool && !card.isFree()) {
					const tooMany =
						!card.getStatus('pillar') &&
						props.cards.cardCount(cardCount, card) >= 6;
					const notEnough = !props.cards.checkPool(
						props.pool,
						cardCount,
						cardMinus,
						card,
					);
					if (tooMany || notEnough) {
						opacity = '.5';
					}
				}
				children.push(
					<CardImage
						card={card}
						onMouseOver={
							props.onMouseOver && (() => props.onMouseOver(i, card))
						}
						onClick={props.onClick && (() => props.onClick(i, card))}
						style={{
							position: 'absolute',
							left: `${(props.x ?? 0) + 100 + ((j / 10) | 0) * 99}px`,
							top: `${(props.y ?? 0) + 32 + (j % 10) * 19}px`,
							opacity,
						}}
					/>,
				);
			} else {
				const ismark = fromTrueMark(code);
				if (~ismark) mark = ismark;
			}
		}
		if (mark !== -1 && props.renderMark) {
			children.push(
				<span
					class={'ico e' + mark}
					style={{
						position: 'absolute',
						left: `${(props.x ?? 0) + 66}px`,
						top: `${(props.y ?? 0) + 188}px`,
					}}
				/>,
			);
		}
		return children;
	};
	return <>{children}</>;
}

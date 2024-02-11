import { createSignal } from 'solid-js';
import { Index } from 'solid-js/web';

import { selector_filter } from '../rs/pkg/etg.js';
import { asShiny, asUpped } from '../etgutil.js';
import { useRx, setOpt } from '../store.jsx';
import CardImage from './CardImage.jsx';
import IconBtn from './IconBtn.jsx';

function RaritySelector(props) {
	return (
		<>
			{[1, 2, 3, 4].map(i => (
				<IconBtn
					e={'r' + i}
					x={props.x}
					y={props.y + i * 24}
					click={() => props.onChange(i)}
				/>
			))}
		</>
	);
}

function ElementSelector(props) {
	return (
		<>
			{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
				<IconBtn
					e={'e' + i}
					x={props.x + (!i || i & 1) * 36}
					y={286 + (((i + 1) / 2) | 0) * 32}
					click={() => props.onChange(i)}
				/>
			))}
		</>
	);
}

function maybeShiny(props, card) {
	if (props.filterboth && props.shiny) {
		const shinycode = asShiny(card.code, true);
		if (
			shinycode in props.cardpool &&
			props.cardpool[shinycode] >
				((props.cardminus && props.cardminus[shinycode]) ?? 0)
		) {
			return card.asShiny(true);
		}
	}
	return card;
}
function poolCount(props, code) {
	return (
		props.cardpool[code] - ((props.cardminus && props.cardminus[code]) ?? 0)
	);
}
function CardSelectorColumn(props) {
	const result = () => {
		const children = [];
		for (let j = 0; j < props.cards.length; j++) {
			let countText = null;
			const card = props.cards[j],
				code = card.code;
			let style = '';
			if (props.cardpool) {
				const scode = asShiny(code, true);
				const cardAmount =
						card.isFree() ? '-'
						: code in props.cardpool ? poolCount(props, code)
						: 0,
					shinyAmount =
						props.filterboth && props.shiny && scode in props.cardpool ?
							poolCount(props, scode)
						:	0;
				if (
					cardAmount === 0 &&
					shinyAmount === 0 &&
					!(
						card.upped &&
						card.Cards.cardSet === 'Open' &&
						props.autoup &&
						(poolCount(props, asUpped(code, false)) >=
							(card.rarity === -1 ? 1 : 6) *
								(card.upped && card.shiny ? 6 : 1) ||
							(card.rarity === 4 &&
								poolCount(props, asUpped(scode, false)) >= 1))
					)
				) {
					style = 'opacity:.5';
				}
				countText = (
					<span
						class={`selectortext${
							props.maxedIndicator && !card.pillar && cardAmount >= 6 ?
								cardAmount >= 12 ?
									' beigeback'
								:	' lightback'
							:	''
						}`}>
						{cardAmount + (shinyAmount ? '/' + shinyAmount : '')}
					</span>
				);
			}
			children.push(
				<>
					<CardImage
						style={style}
						card={card}
						onClick={props.onClick && [props.onClick, maybeShiny(props, card)]}
						onContextMenu={
							props.onContextMenu &&
							(e => {
								e.preventDefault();
								props.onContextMenu(code);
							})
						}
						onMouseOver={
							props.onMouseOver && [props.onMouseOver, maybeShiny(props, card)]
						}
					/>
					{countText}
				</>,
			);
		}
		return children;
	};
	return <>{result}</>;
}

function CardSelectorCore(props) {
	const columns = () => {
		const columns = [];
		const count = props.noupped ? 3 : 6;
		for (let i = 0; i < count; i++) {
			let column = Array.from(
				selector_filter(props.cards.set, i, props.element, props.rarity),
				code => props.cards.Codes[code],
			);
			if (props.filter) column = column.filter(props.filter);
			columns.push(column);
		}
		if (props.shiny && !props.filterboth) {
			for (const column of columns) {
				for (let i = 0; i < column.length; i++) {
					column[i] = column[i].asShiny(true);
				}
			}
		}
		return columns;
	};

	return (
		<Index each={columns()}>
			{(cards, i) => (
				<div
					class="cardselector"
					style={`position:absolute;left:${props.x + i * 133}px;top:${
						props.y
					}px`}>
					<CardSelectorColumn {...props} cards={cards()} />
				</div>
			)}
		</Index>
	);
}

export default function CardSelector(props) {
	const opts = useRx(state => state.opts);
	const [element, setElement] = createSignal(0);
	const [rarity, setRarity] = createSignal(0);

	return (
		<>
			{props.shiny === undefined && (
				<input
					type="button"
					value="Toggle Shiny"
					style="position:absolute;left:4px;top:578px"
					onClick={() => setOpt('toggleshiny', !opts.toggleshiny)}
				/>
			)}
			<RaritySelector
				x={80}
				y={338}
				value={rarity()}
				onChange={r => setRarity(cur => (cur === r ? 0 : r))}
			/>
			<ElementSelector x={4} y={316} value={element()} onChange={setElement} />
			<CardSelectorCore
				{...props}
				x={100}
				y={272}
				rarity={rarity()}
				element={element()}
				shiny={props.shiny ?? opts.toggleshiny}
				autoup={props.autoup}
			/>
		</>
	);
}

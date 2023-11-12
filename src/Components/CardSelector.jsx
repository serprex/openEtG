import { createMemo, createSignal } from 'solid-js';
import { Index } from 'solid-js/web';

import { selector_filter } from '../rs/pkg/etg.js';
import { asShiny, asUpped } from '../etgutil.js';
import { useRx, setOpt } from '../store.jsx';
import Card from './Card.jsx';
import CardImage from './CardImage.jsx';
import IconBtn from './IconBtn.jsx';
import Text from './Text.jsx';

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
	const memo = createMemo(() => {
		const children = [],
			countTexts = [];
		for (let j = 0; j < props.cards.length; j++) {
			const y = props.y + j * 19,
				card = props.cards[j],
				code = card.code;
			let opacity = undefined;
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
						(poolCount(props, asUpped(code, false)) >=
							(card.rarity === -1 ? 1 : 6) *
								(card.upped && card.shiny ? 6 : 1) ||
							(card.rarity === 4 &&
								poolCount(props, asUpped(scode, false)) >= 1))
					)
				) {
					opacity = '.5';
				}
				countTexts.push(
					<div
						class={`selectortext${
							props.maxedIndicator && !card.pillar && cardAmount >= 6 ?
								cardAmount >= 12 ?
									' beigeback'
								:	' lightback'
							:	''
						}`}>
						{cardAmount + (shinyAmount ? '/' + shinyAmount : '')}
					</div>,
				);
			}
			children.push(
				<CardImage
					style={{
						position: 'absolute',
						left: `${props.x}px`,
						top: `${y}px`,
						opacity,
					}}
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
				/>,
			);
		}
		return { children, countTexts };
	});
	return (
		<>
			<div
				style={`position:absolute;left:${props.x + 100}px;top:${
					props.y
				}px;text-height:0`}>
				{memo().countTexts}
			</div>
			{memo().children}
		</>
	);
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
				<CardSelectorColumn
					{...props}
					cards={cards()}
					x={props.x + i * 133}
					y={props.y}
				/>
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
			/>
		</>
	);
}

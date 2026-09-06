import { Repeat, createSignal } from 'solid-js';

import { playSound } from '../audio.js';
import { selector_filter } from '../rs/pkg/etg.js';
import { asShiny, asUpped } from '../etgutil.js';
import { appState, setOpt } from '../store.jsx';
import CardImage from './CardImage.jsx';

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
			let style = null;
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
					style = { opacity: '.5' };
				}
				countText = (
					<span
						class={[
							'selectortext',
							props.maxedIndicator &&
								!card.pillar &&
								cardAmount >= 6 &&
								(cardAmount >= 12 ? 'beigeback' : 'lightback'),
						]}>
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
	const column = i => {
		let column = Array.from(
			selector_filter(props.cards.set, i, props.element, props.rarity),
			code => props.cards.Codes[code],
		);
		if (props.filter) column = column.filter(props.filter);
		if (props.shiny && !props.filterboth) {
			column = column.map(card => card.asShiny(true));
		}
		return column;
	};

	return (
		<Repeat count={props.noupped ? 3 : 6}>
			{i => (
				<div
					class="cardselector"
					style={`position:absolute;left:${props.x + i * 133}px;top:${
						props.y
					}px`}>
					<CardSelectorColumn {...props} cards={column(i)} />
				</div>
			)}
		</Repeat>
	);
}

export default function CardSelector(props) {
	const [element, setElement] = createSignal(0);
	const [rarity, setRarity] = createSignal(0);

	return (
		<>
			{props.shiny === undefined && (
				<input
					type="button"
					value="Shiny"
					class={appState.opts.toggleshiny ? 'selected' : ''}
					style="position:absolute;left:4px;top:578px"
					onClick={() => setOpt('toggleshiny', !appState.opts.toggleshiny)}
				/>
			)}
			<div style="position:absolute;left:78px;top:338px">
				<Repeat count={4} from={1}>
					{i => (
						<div
							class={['imgb', 'ico', `r${i}`, { selected: rarity() === i }]}
							style="display:block;margin-top:18px"
							onClick={() => {
								playSound('click');
								setRarity(cur => (cur === i ? 0 : i));
							}}
						/>
					)}
				</Repeat>
			</div>
			<div
				class="selectorelements"
				style="position:absolute;left:4px;top:288px">
				<Repeat count={13}>
					{i => (
						<span
							class={['imgb', 'ico', `e${i}`, { selected: element() === i }]}
							style={i ? undefined : 'grid-column:2'}
							onClick={() => {
								playSound('click');
								setElement(i);
							}}
						/>
					)}
				</Repeat>
			</div>
			<CardSelectorCore
				{...props}
				x={100}
				y={272}
				rarity={rarity()}
				element={element()}
				shiny={props.shiny ?? appState.opts.toggleshiny}
				autoup={props.autoup}
			/>
		</>
	);
}

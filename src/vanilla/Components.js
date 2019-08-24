import React from 'react';

import * as ui from '../ui.js';
import * as etg from '../etg.js';
import Cards from './Cards.js';
import * as etgutil from '../etgutil.js';
import { CardImage, Text, IconBtn } from '../Components/index.js';

export function Card(props) {
	const card = props.card || (props.code && Cards.Codes[props.code]);
	if (!card) return null;
	const textColor = card.upped ? '#000' : '',
		backColor = ui.maybeLightenStr(card);
	return (
		<div
			style={{
				position: 'absolute',
				left: props.x + 'px',
				top: props.y + 'px',
				width: '128px',
				height: '256px',
				pointerEvents: 'none',
				zIndex: '4',
				color: textColor,
				overflow: 'hidden',
				backgroundColor: backColor,
				borderRadius: '4px',
			}}>
			<span
				style={{
					position: 'absolute',
					left: '2px',
					top: '2px',
					fontSize: '12px',
				}}>
				{card.name}
			</span>
			<img
				className={card.code & 0x4000 ? 'shiny' : ''}
				src={`/Cards/${card.code.toString(32)}.png`}
				style={{
					position: 'absolute',
					top: '20px',
					width: '128px',
					height: '128px',
				}}
			/>
			<Text
				text={card.info()}
				icoprefix="te"
				style={{
					position: 'absolute',
					padding: '2px',
					bottom: '0',
					fontSize: '10px',
					width: '128px',
					minHeight: '108px',
					backgroundColor: backColor,
					borderRadius: '0 0 4px 4px',
				}}
			/>
			{!!card.rarity && (
				<span
					className={`ico r${card.rarity}`}
					style={{
						position: 'absolute',
						right: '30px',
						bottom: '2px',
					}}
				/>
			)}
			{!!card.cost && (
				<span
					style={{
						position: 'absolute',
						right: '2px',
						top: '2px',
						fontSize: '12px',
					}}>
					{card.cost}
					{card.element != card.costele && (
						<span className={`ico ce${card.costele}`} />
					)}
				</span>
			)}
			<span
				className={`ico t${card.type}`}
				style={{
					position: 'absolute',
					right: '2px',
					bottom: '2px',
				}}
			/>
		</div>
	);
}

export function DeckDisplay(props) {
	let mark = -1,
		j = -1;
	return (
		<>
			{props.deck.map((code, i) => {
				const card = Cards.Codes[code];
				if (card) {
					j++;
					return (
						<CardImage
							key={j}
							card={card}
							onMouseOver={
								props.onMouseOver && (() => props.onMouseOver(i, code))
							}
							onClick={props.onClick && (() => props.onClick(i, code))}
							x={(props.x || 0) + 100 + Math.floor(j / 10) * 99}
							y={(props.y || 0) + 32 + (j % 10) * 19}
						/>
					);
				} else {
					const ismark = etgutil.fromTrueMark(code);
					if (~ismark) mark = ismark;
				}
			})}
			{!!(~mark && props.renderMark) && (
				<span
					key={children.length}
					className={'ico e' + mark}
					style={{
						position: 'absolute',
						left: (props.x || 0) + 66 + 'px',
						top: (props.y || 0) + 200 + 'px',
					}}
				/>
			)}
		</>
	);
}

export function ElementSelector(props) {
	const children = [];
	for (let i = 0; i < 13; i++) {
		children.push(
			<IconBtn
				key={i}
				e={'e' + i}
				x={!i || i & 1 ? props.x : props.x + 36}
				y={316 + Math.floor((i - 1) / 2) * 32}
				click={() => props.onChange(i)}
			/>,
		);
	}
	return children;
}

function CardSelectorColumn(props) {
	function maybeShiny(code) {
		if (props.filterboth && !props.shiny) {
			const scode = etgutil.asShiny(code, 1);
			if (
				scode in props.cardpool &&
				props.cardpool[scode] >
					((props.cardminus && props.cardminus[scode]) || 0)
			) {
				return scode;
			}
		}
		return code;
	}
	const children = [],
		countTexts = [];
	for (let j = 0; j < props.cards.length; j++) {
		const y = props.y + j * 19,
			card = props.cards[j],
			code = card.code;
		children.push(
			<CardImage
				x={props.x}
				y={y}
				card={card}
				onClick={props.onClick && (() => props.onClick(maybeShiny(code)))}
				onContextMenu={
					props.onContextMenu &&
					(e => {
						e.preventDefault();
						props.onContextMenu(code);
					})
				}
				onMouseOver={
					props.onMouseOver && (() => props.onMouseOver(maybeShiny(code)))
				}
			/>,
		);
		if (props.cardpool) {
			const scode = etgutil.asShiny(code, true);
			const cardAmount = card.isFree()
					? '-'
					: code in props.cardpool
					? props.cardpool[code] -
					  ((props.cardminus && props.cardminus[code]) || 0)
					: 0,
				shinyAmount =
					props.filterboth && !props.shiny && scode in props.cardpool
						? props.cardpool[scode] -
						  ((props.cardminus && props.cardminus[scode]) || 0)
						: 0;
			countTexts.push(
				<div
					className={
						'selectortext' +
						(props.maxedIndicator && card.type != etg.Pillar && cardAmount >= 6
							? cardAmount >= 12
								? ' beigeback'
								: ' lightback'
							: '')
					}>
					{cardAmount + (shinyAmount ? '/' + shinyAmount : '')}
				</div>,
			);
		}
	}
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left: `${props.x + 100}px`,
					top: `${props.y}px`,
					textHeight: '0',
				}}>
				{countTexts}
			</div>
			{children}
		</>
	);
}

export function CardSelectorCore(props) {
	const children = [];
	for (let i = 0; i < 6; i++) {
		const cards = Cards.filter(
			i > 2,
			x =>
				x.element == props.element &&
				((i % 3 == 0 && x.type == etg.Creature) ||
					(i % 3 == 1 && x.type <= etg.Permanent) ||
					(i % 3 == 2 && x.type == etg.Spell)),
			Cards.cardCmp,
		);
		children.push(
			<CardSelectorColumn
				key={i}
				{...props}
				cards={cards}
				x={props.x + i * 133}
				y={props.y}
			/>,
		);
	}
	return children;
}

export class CardSelector extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			element: 0,
		};
	}

	render() {
		return (
			<>
				<ElementSelector
					x={4}
					y={316}
					onChange={element => this.setState({ element })}
				/>
				<CardSelectorCore
					{...this.props}
					x={100}
					y={272}
					element={this.state.element}
				/>
			</>
		);
	}
}

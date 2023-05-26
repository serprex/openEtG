import { useMemo, useState, Fragment } from 'react';
import { useSelector } from 'react-redux';

import { playSound } from '../audio.js';
import * as etg from '../etg.js';
import * as etgutil from '../etgutil.js';
import * as store from '../store.jsx';
import { maybeLightenStr } from '../ui.js';

export function Box(props) {
	return (
		<div
			className="bgbox"
			style={{
				position: 'absolute',
				left: props.x + 'px',
				top: props.y + 'px',
				width: props.width + 'px',
				height: props.height + 'px',
			}}>
			{props.children || null}
		</div>
	);
}

export function CardImage(props) {
	const { card } = props,
		bgcol = maybeLightenStr(card);
	return (
		<div
			className="cardslot"
			onMouseOver={props.onMouseOver}
			onMouseLeave={props.onMouseOut}
			onClick={props.onClick}
			onContextMenu={props.onContextMenu}
			style={{
				backgroundColor: bgcol,
				borderColor: props.opacity ? '#f00' : card.shiny ? '#daa520' : '#222',
				color: card.upped ? '#000' : '#fff',
				...props.style,
			}}>
			{card.name}
			{!!card.cost && (
				<span
					style={{
						position: 'absolute',
						right: '0',
						paddingRight: '2px',
						paddingTop: '2px',
						backgroundColor: bgcol,
					}}>
					{card.cost}
					<span className={'ico te' + card.costele} />
				</span>
			)}
		</div>
	);
}

export function Text(props) {
	const { text, icoprefix = 'ce' } = props;
	const str = text ? text.toString() : '';

	const elec = useMemo(() => {
		const sep = /\d\d?:\d\d?|\$|\n/g;
		const ico = `ico ${icoprefix}`;
		let reres,
			lastindex = 0;
		const elec = [];
		while ((reres = sep.exec(str))) {
			const piece = reres[0];
			if (reres.index !== lastindex) {
				elec.push(
					<Fragment key={elec.length}>
						{str.slice(lastindex, reres.index)}
					</Fragment>,
				);
			}
			if (piece === '\n') {
				elec.push(<br key={elec.length} />);
			} else if (piece === '$') {
				elec.push(<span key={elec.length} className="ico gold" />);
			} else if (/^\d\d?:\d\d?$/.test(piece)) {
				const parse = piece.split(':');
				const num = +parse[0];
				if (num === 0) {
					elec.push(<Fragment key={elec.length}>0</Fragment>);
				} else if (num < 4) {
					const icon = <span className={ico + parse[1]} />;
					for (let j = 0; j < num; j++) {
						elec.push(<Fragment key={elec.length}>{icon}</Fragment>);
					}
				} else {
					elec.push(
						parse[0],
						<span key={elec.length} className={ico + parse[1]} />,
					);
				}
			}
			lastindex = reres.index + piece.length;
		}
		if (lastindex !== str.length) {
			elec.push(<Fragment key={elec.length}>{str.slice(lastindex)}</Fragment>);
		}
		return elec;
	}, [str, icoprefix]);

	return (
		<div className={props.className} style={props.style}>
			{elec}
		</div>
	);
}

export function IconBtn(props) {
	return (
		<span
			className={'imgb ico ' + props.e}
			style={{
				position: 'absolute',
				left: props.x + 'px',
				top: props.y + 'px',
			}}
			onClick={e => {
				playSound('click');
				if (props.click) props.click.call(e.target, e);
			}}
			onMouseOver={props.onMouseOver}
		/>
	);
}

export function ExitBtn(props) {
	return (
		<input
			type="button"
			value="Exit"
			onClick={
				props.onClick ||
				(() => {
					store.store.dispatch(store.doNav(import('../views/MainMenu.jsx')));
				})
			}
			style={{
				position: 'absolute',
				left: props.x + 'px',
				top: props.y + 'px',
			}}
		/>
	);
}

export function Card(props) {
	const { card } = props;
	if (!card) return null;
	const textColor = card.upped ? '#000' : '',
		backColor = maybeLightenStr(card);
	return (
		<div
			style={{
				position: 'absolute',
				left: props.x + 'px',
				top: props.y + 'px',
				width: '160px',
				height: '256px',
				pointerEvents: 'none',
				zIndex: '5',
				color: textColor,
				overflow: 'hidden',
				backgroundColor: backColor,
				borderRadius: '4px',
				borderWidth: '3px',
				borderStyle: 'double',
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
				className={card.shiny ? 'shiny' : ''}
				src={`/Cards/${etgutil.encodeCode(
					card.code + (etgutil.asShiny(card.code, false) < 5000 ? 4000 : 0),
				)}.webp`}
				style={{
					position: 'absolute',
					top: '20px',
					left: '8px',
					width: '128px',
					height: '128px',
					borderWidth: '1px',
					borderColor: '#000',
					borderStyle: 'solid',
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
					minHeight: '102px',
					backgroundColor: backColor,
					borderRadius: '0 0 4px 4px',
				}}
			/>
			{!!card.rarity && (
				<span
					className={`ico r${card.rarity}`}
					style={{ position: 'absolute', right: '2px', top: '40px' }}
				/>
			)}
			{!!card.cost && (
				<span
					style={{
						position: 'absolute',
						right: '0',
						paddingRight: '2px',
						paddingTop: '2px',
						fontSize: '12px',
					}}>
					{card.cost}
					<span className={`ico te${card.costele}`} />
				</span>
			)}
			<span
				className={`ico t${card.type}`}
				style={{
					position: 'absolute',
					right: '2px',
					top: '22px',
				}}
			/>
		</div>
	);
}

export function DeckDisplay(props) {
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
					key={j}
					card={card}
					onMouseOver={props.onMouseOver && (() => props.onMouseOver(i, card))}
					onClick={props.onClick && (() => props.onClick(i, card))}
					style={{
						position: 'absolute',
						left: `${(props.x ?? 0) + 100 + Math.floor(j / 10) * 99}px`,
						top: `${(props.y ?? 0) + 32 + (j % 10) * 19}px`,
						opacity,
					}}
				/>,
			);
		} else {
			const ismark = etgutil.fromTrueMark(code);
			if (~ismark) mark = ismark;
		}
	}
	return (
		<>
			{children}
			{mark !== -1 && props.renderMark && (
				<span
					className={'ico e' + mark}
					style={{
						position: 'absolute',
						left: `${(props.x ?? 0) + 66}px`,
						top: `${(props.y ?? 0) + 188}px`,
					}}
				/>
			)}
		</>
	);
}

export function RaritySelector(props) {
	const children = [];
	for (let i = 0; i < 5; i++) {
		children.push(
			<IconBtn
				key={i}
				e={(i ? 'r' : 't') + i}
				x={props.x}
				y={props.y + i * 24}
				click={() => props.onChange(i)}
			/>,
		);
	}
	return children;
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

function maybeShiny(props, card) {
	if (props.filterboth && !props.shiny) {
		const shiny = card.asShiny(true);
		if (
			shiny.code in props.cardpool &&
			props.cardpool[shiny.code] >
				((props.cardminus && props.cardminus[shiny.code]) ?? 0)
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
	const children = [],
		countTexts = [];
	for (let j = 0; j < props.cards.length; j++) {
		const y = props.y + j * 19,
			card = props.cards[j],
			code = card.code;
		let opacity = '.5';
		if (props.cardpool) {
			const scode = etgutil.asShiny(code, true);
			const cardAmount = card.isFree()
					? '-'
					: code in props.cardpool
					? poolCount(props, code)
					: 0,
				shinyAmount =
					props.filterboth && !props.shiny && scode in props.cardpool
						? poolCount(props, scode)
						: 0;
			if (!props.cardpool || cardAmount !== 0 || shinyAmount !== 0) {
				opacity = undefined;
			} else if (card.upped && !card.Cards.Names.Relic) {
				if (
					poolCount(props, etgutil.asUpped(code, false)) >=
					(card.rarity === -1 ? 1 : 6) * (card.upped && card.shiny ? 6 : 1)
				) {
					opacity = undefined;
				} else if (
					card.rarity === 4 &&
					poolCount(props, etgutil.asUpped(scode, false)) >= 1
				) {
					opacity = undefined;
				}
			}
			countTexts.push(
				<div
					key={countTexts.length}
					className={`selectortext ${
						props.maxedIndicator && !card.getStatus('pillar') && cardAmount >= 6
							? cardAmount >= 12
								? ' beigeback'
								: ' lightback'
							: ''
					}`}>
					{cardAmount + (shinyAmount ? '/' + shinyAmount : '')}
				</div>,
			);
		}
		children.push(
			<CardImage
				key={code}
				style={{
					position: 'absolute',
					left: `${props.x}px`,
					top: `${y}px`,
					opacity,
				}}
				card={card}
				onClick={
					props.onClick && (() => props.onClick(maybeShiny(props, card)))
				}
				onContextMenu={
					props.onContextMenu &&
					(e => {
						e.preventDefault();
						props.onContextMenu(code);
					})
				}
				onMouseOver={
					props.onMouseOver &&
					(() => props.onMouseOver(maybeShiny(props, card)))
				}
			/>,
		);
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
	const columns = useMemo(() => {
		const columns = [];
		const count = props.noupped ? 3 : 6;
		for (let i = 0; i < count; i++) {
			columns.push(
				props.cards.filter(
					i > 2,
					x =>
						(!props.filter || props.filter(x)) &&
						(x.element === props.element || props.rarity === 4) &&
						((i % 3 === 0 && x.type === etg.Creature) ||
							(i % 3 === 1 && x.type <= etg.Permanent) ||
							(i % 3 === 2 && x.type === etg.Spell)) &&
						(!props.rarity || props.rarity === x.rarity),
					props.cards.cardCmp,
					props.shiny && !props.filterboth,
				),
			);
		}

		return columns;
	}, [
		props.cards,
		props.filter,
		props.element,
		props.rarity,
		props.shiny,
		props.filterboth,
		props.noupped,
	]);

	return columns.map((cards, i) => (
		<CardSelectorColumn
			key={i}
			{...props}
			cards={cards}
			x={props.x + i * 133}
			y={props.y}
		/>
	));
}

export function CardSelector(props) {
	const [element, setElement] = useState(0);
	const [rarity, setRarity] = useState(0);
	const shiny = useSelector(({ opts }) => opts.toggleshiny);

	return (
		<>
			<input
				type="button"
				value="Toggle Shiny"
				style={{
					position: 'absolute',
					left: '4px',
					top: '578px',
				}}
				onClick={() =>
					store.store.dispatch(store.setOpt('toggleshiny', !shiny))
				}
			/>
			<RaritySelector x={80} y={338} value={rarity} onChange={setRarity} />
			<ElementSelector x={4} y={316} value={element} onChange={setElement} />
			<CardSelectorCore
				{...props}
				x={100}
				y={272}
				rarity={rarity}
				element={element}
				shiny={shiny}
			/>
		</>
	);
}
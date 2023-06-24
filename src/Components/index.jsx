import { createMemo, createSignal } from 'solid-js';
import { Index } from 'solid-js/web';

import { playSound } from '../audio.js';
import * as etg from '../etg.js';
import * as etgutil from '../etgutil.js';
import * as store from '../store.jsx';
import { maybeLightenStr } from '../ui.js';

export function Box(props) {
	return (
		<div
			class="bgbox"
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
			class="cardslot"
			onMouseOver={props.onMouseOver}
			onMouseLeave={props.onMouseOut}
			onClick={props.onClick}
			onContextMenu={props.onContextMenu}
			style={{
				'background-color': bgcol,
				'border-color': props.opacity
					? '#f00'
					: card.shiny
					? '#daa520'
					: '#222',
				color: card.upped ? '#000' : '#fff',
				...props.style,
			}}>
			{card.name}
			{!!card.cost && (
				<span
					style={{
						position: 'absolute',
						right: '0',
						'padding-right': '2px',
						'padding-top': '2px',
						'background-color': bgcol,
					}}>
					{card.cost}
					<span class={'ico te' + card.costele} />
				</span>
			)}
		</div>
	);
}

export function Text(props) {
	const elec = () => {
		const str = props.text ? props.text.toString() : '';
		const sep = /\d\d?:\d\d?|\$|\n/g;
		const ico = `ico ${props.icoprefix ?? 'ce'}`;
		let reres,
			lastindex = 0;
		const elec = [];
		while ((reres = sep.exec(str))) {
			const piece = reres[0];
			if (reres.index !== lastindex) {
				elec.push(str.slice(lastindex, reres.index));
			}
			if (piece === '\n') {
				elec.push(<br />);
			} else if (piece === '$') {
				elec.push(<span class="ico gold" />);
			} else if (/^\d\d?:\d\d?$/.test(piece)) {
				const parse = piece.split(':');
				const num = +parse[0];
				const className = ico + parse[1];
				if (num === 0) {
					elec.push('0');
				} else if (num < 4) {
					for (let j = 0; j < num; j++) {
						elec.push(<span class={className} />);
					}
				} else {
					elec.push(parse[0], <span class={className} />);
				}
			}
			lastindex = reres.index + piece.length;
		}
		if (lastindex !== str.length) {
			elec.push(str.slice(lastindex));
		}
		return elec;
	};

	return (
		<div class={props.class} style={props.style}>
			{elec}
		</div>
	);
}

export function IconBtn(props) {
	return (
		<span
			class={'imgb ico ' + props.e}
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
				props.onClick || (() => store.doNav(import('../views/MainMenu.jsx')))
			}
			style={{
				position: 'absolute',
				left: props.x + 'px',
				top: props.y + 'px',
			}}
		/>
	);
}

export function Card(p) {
	const textColor = () => p.card && (p.card.upped ? '#000' : ''),
		backColor = () => p.card && maybeLightenStr(p.card);
	return (
		<>
			{p.card && (
				<div
					style={{
						position: 'absolute',
						left: p.x + 'px',
						top: p.y + 'px',
						width: '160px',
						height: '256px',
						'pointer-events': 'none',
						'z-index': '5',
						color: textColor(),
						overflow: 'hidden',
						'background-color': backColor(),
						'border-radius': '4px',
						'border-width': '3px',
						'border-style': 'double',
					}}>
					<span style="position:absolute;left:2px;top:2px;font-size:12px">
						{p.card.name}
					</span>
					<img
						class={p.card.shiny ? 'shiny' : ''}
						src={`/Cards/${etgutil.encodeCode(
							p.card.code +
								(etgutil.asShiny(p.card.code, false) < 5000 ? 4000 : 0),
						)}.webp`}
						style="position:absolute;top:20px;left:8px;width:128px;height:128px;border-width:1px;border-color:#000;border-style:solid"
					/>
					<Text
						text={p.card.info()}
						icoprefix="te"
						style={{
							position: 'absolute',
							padding: '2px',
							bottom: '0',
							'font-size': '10px',
							'min-height': '102px',
							'background-color': backColor,
							'border-radius': '0 0 4px 4px',
						}}
					/>
					{!!p.card.rarity && (
						<span
							class={`ico r${p.card.rarity}`}
							style="position:absolute;right:2px;top:40px"
						/>
					)}
					{!!p.card.cost && (
						<span style="position:absolute;right:0;padding-right:2px;padding-top:2px;font-size:12px">
							{p.card.cost}
							<span class={`ico te${p.card.costele}`} />
						</span>
					)}
					<span
						class={`ico t${p.card.type}`}
						style="position:absolute;right:2px;top:22px"
					/>
				</div>
			)}
		</>
	);
}

export function DeckDisplay(props) {
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
				const ismark = etgutil.fromTrueMark(code);
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

export function RaritySelector(props) {
	const children = [];
	for (let i = 0; i < 5; i++) {
		children.push(
			<IconBtn
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
				e={'e' + i}
				x={!i || i & 1 ? props.x : props.x + 36}
				y={286 + (((i + 1) / 2) | 0) * 32}
				click={() => props.onChange(i)}
			/>,
		);
	}
	return children;
}

function maybeShiny(props, card) {
	if (props.filterboth && props.shiny) {
		const shinycode = etgutil.asShiny(card.code);
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
				const scode = etgutil.asShiny(code, true);
				const cardAmount = card.isFree()
						? '-'
						: code in props.cardpool
						? poolCount(props, code)
						: 0,
					shinyAmount =
						props.filterboth && props.shiny && scode in props.cardpool
							? poolCount(props, scode)
							: 0;
				if (
					cardAmount === 0 &&
					shinyAmount === 0 &&
					!(
						card.upped &&
						!card.Cards.Names.Relic &&
						(poolCount(props, etgutil.asUpped(code, false)) >=
							(card.rarity === -1 ? 1 : 6) *
								(card.upped && card.shiny ? 6 : 1) ||
							(card.rarity === 4 &&
								poolCount(props, etgutil.asUpped(scode, false)) >= 1))
					)
				) {
					opacity = '.5';
				}
				countTexts.push(
					<div
						class={`selectortext ${
							props.maxedIndicator &&
							!card.getStatus('pillar') &&
							cardAmount >= 6
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
		return { children, countTexts };
	});
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left: `${props.x + 100}px`,
					top: `${props.y}px`,
					'text-height': '0',
				}}>
				{memo().countTexts}
			</div>
			{memo().children}
		</>
	);
}

export function CardSelectorCore(props) {
	const columns = () => {
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

export function CardSelector(props) {
	const rx = store.useRx();
	const [element, setElement] = createSignal(0);
	const [rarity, setRarity] = createSignal(0);

	return (
		<>
			<input
				type="button"
				value="Toggle Shiny"
				style="position:absolute;left:4px;top:578px"
				onClick={() => store.setOpt('toggleshiny', !rx.opts.toggleshiny)}
			/>
			<RaritySelector x={80} y={338} value={rarity()} onChange={setRarity} />
			<ElementSelector x={4} y={316} value={element()} onChange={setElement} />
			<CardSelectorCore
				{...props}
				x={100}
				y={272}
				rarity={rarity()}
				element={element()}
				shiny={rx.opts.toggleshiny}
			/>
		</>
	);
}
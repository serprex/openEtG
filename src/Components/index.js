'use strict';
const ui = require('../ui'),
	etg = require('../etg'),
	svg = require('../svg'),
	audio = require('../audio'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	store = require('../store'),
	React = require('react');

exports.Box = function(props) {
	return <div
		className='bgbox'
		style={{
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
			width: props.width + 'px',
			height: props.height + 'px',
		}}>
		{props.children || null}
	</div>;
};

function CardImage(props) {
	const card = props.card,
		bordcol = card && card.shiny ? '#daa520' : '#222',
		bgcol = card ? ui.maybeLightenStr(card) : card === null ? '#876' : '#111';
	return <div
		className='cardslot'
		onMouseOver={props.onMouseOver}
		onClick={props.onClick}
		style={{
			backgroundColor: bgcol,
			borderColor: bordcol,
			color: card && card.upped ? '#000' : '#fff',
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
			whiteSpace: 'nowrap',
			overflow: 'hidden',
			opacity: props.opacity,
		}}>
		{card.name}
		{!!card.cost && <span
			style={{
				position: 'absolute',
				right: '0',
				backgroundColor: bgcol,
				paddingLeft: '2px',
			}}>
			{card.cost}
			{card.costele !== card.element &&
				<span className={'ico te' + card.costele } />}
		</span>}
	</div>;
}
exports.CardImage = CardImage;

exports.Text = function(props) {
	if (!props.text) return null;
	const text = props.text.toString().replace(/\|/g, ' / ');
	const sep = /\d\d?:\d\d?|\$|\n/g;
	const icoprefix = 'ico ' + (props.icoprefix || 'ce');
	let reres,
		lastindex = 0;
	const elec = [];
	while ((reres = sep.exec(text))) {
		const piece = reres[0];
		if (reres.index != lastindex) {
			elec.push(text.slice(lastindex, reres.index));
		}
		if (piece == '\n') {
			elec.push(<br />);
		} else if (piece == '$') {
			elec.push(<span className='ico gold' />);
		} else if (/^\d\d?:\d\d?$/.test(piece)) {
			const parse = piece.split(':');
			const num = +parse[0];
			if (num == 0) {
				elec.push('0');
			} else if (num < 4) {
				const icon = <span className={icoprefix + parse[1]} />;
				for (let j = 0; j < num; j++) {
					elec.push(icon);
				}
			} else {
				elec.push(parse[0], <span className={icoprefix + parse[1]} />);
			}
		}
		lastindex = reres.index + piece.length;
	}
	if (lastindex != text.length) {
		elec.push(text.slice(lastindex));
	}
	return <div className={props.className} style={props.style}>{elec}</div>;
};

function IconBtn(props) {
	return <span className={'imgb ico ' + props.e}
		style={{
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		}}
		onClick={(e) => {
			audio.playSound('buttonClick');
			if (props.click) props.click.call(e.target, e);
		}}
		onMouseOver={props.onMouseOver}
	/>;
}
exports.IconBtn = IconBtn;

exports.ExitBtn = function(props) {
	return <input type='button'
		value='Exit'
		onClick={props.onClick ||
			(() => {
				store.store.dispatch(store.doNav(require('../views/MainMenu')));
			})}
		style={{
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		}}
	/>;
};

exports.Card = function(props) {
	const card = props.card || (props.code && Cards.Codes[props.code]);
	if (!card) return null;
	const svgcard = svg.card(card);
	return <svg
		width={'128'}
		height={'256'}
		style={{
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
			pointerEvents: 'none',
			zIndex: '4',
		}}
		dangerouslySetInnerHTML={{
			__html: svgcard.slice(svgcard.indexOf('>') + 1, -6),
		}}
	/>;
};

function DeckDisplay(props) {
	let mark = -1,
		j = -1;
	const children = [], codeCount = [];
	for (let i=0; i<props.deck.length; i++) {
		const code = props.deck[i], card = Cards.Codes[code];
		if (card) {
			j++;
			let opacity;
			if (props.pool && !card.isFree()) {
				codeCount[code] = (codeCount[code] || 0)+1;
				if (!props.pool[code] || codeCount[code] > props.pool) {
					opacity = '.5';
				}
			}
			children.push(<CardImage
				key={j}
				card={card}
				onMouseOver={props.onMouseOver && (() => props.onMouseOver(i, code))}
				onClick={props.onClick && (() => props.onClick(i, code))}
				x={(props.x || 0) + 100 + Math.floor(j / 10) * 99}
				y={(props.y || 0) + 32 + (j % 10) * 19}
				opacity={opacity}
			/>);
		} else {
			const ismark = etgutil.fromTrueMark(code);
			if (~ismark) mark = ismark;
		}
	}
	return <>
		{children}
		{mark !== -1 && props.renderMark &&
			<span className={'ico e' + mark}
				style={{
					position: 'absolute',
					left: (props.x || 0) + 66 + 'px',
					top: (props.y || 0) + 200 + 'px',
					border: opacity && '2px #f00 solid',
				}}
			/>
		}
	</>
}
exports.DeckDisplay = DeckDisplay;

function RaritySelector(props) {
	const children = [];
	for (let i = 0; i < 5; i++) {
		children.push(
			<IconBtn key={i}
				e={(i ? 'r' : 't') + i}
				x={props.x}
				y={props.y + i * 32}
				click={() => props.onChange(i)}
			/>
		);
	}
	return children;
}
exports.RaritySelector = RaritySelector;

function ElementSelector(props) {
	const children = [];
	for (let i = 0; i < 13; i++) {
		children.push(
			<IconBtn key={i}
				e={'e' + i}
				x={!i || i & 1 ? props.x : props.x+36}
				y={316 + Math.floor((i - 1) / 2) * 32}
				click={() => props.onChange(i)}
			/>
		);
	}
	return children;
}
exports.ElementSelector = ElementSelector;

function CardSelectorColumn(props) {
	function maybeShiny(code) {
		if (props.filterboth && !props.shiny) {
			const scode = etgutil.asShiny(code, 1);
			if (
				scode in props.cardpool &&
				props.cardpool[scode] >
				((props.cardminus && props.cardminus[scode]) ||
					0)
			) {
				return scode;
			}
		}
		return code;
	}
	const children = [], countTexts = [];
	for (let j = 0; j < props.cards.length; j++) {
		const y = props.y + j * 19,
			card = props.cards[j],
			code = card.code;
		children.push(
			<CardImage
				x={props.x}
				y={y}
				card={card}
				onClick={props.onClick && (() =>
					props.onClick(maybeShiny(code))
				)}
				onMouseOver={props.onMouseOver && (() =>
					props.onMouseOver(maybeShiny(code))
				)}
			/>
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
				<div className={'selectortext' +
					(props.maxedIndicator &&
						card.type != etg.Pillar &&
						cardAmount >= 6
						? cardAmount >= 12 ? ' beigeback' : ' lightback'
						: '')}>
					{cardAmount + (shinyAmount ? '/' + shinyAmount : '')}
				</div>
			);
		}
	}
	return <>
		<div style={{
			position: 'absolute',
			left: `${props.x+100}px`,
			top: `${props.y}px`,
			textHeight: '0',
		}}>{countTexts}</div>
		{children}
	</>;
}
function CardSelectorCore(props) {
	const children = [];
	for (let i = 0; i < 6; i++) {
		const cards = Cards.filter(
			i > 2,
			x => (
				(x.element == props.element || props.rarity == 4) &&
				((i % 3 == 0 && x.type == etg.Creature) ||
					(i % 3 == 1 && x.type <= etg.Permanent) ||
					(i % 3 == 2 && x.type == etg.Spell)) &&
				(!props.cardpool ||
					x.code in props.cardpool ||
					(props.filterboth &&
						etgutil.asShiny(x.code, true) in props.cardpool) ||
					props.showall ||
					x.isFree()) &&
				(!props.rarity || props.rarity == Math.min(x.rarity, 4))
			),
			Cards.cardCmp,
			props.shiny && !props.filterboth,
		);
		children.push(<CardSelectorColumn key={i} {...props} cards={cards} x={props.x+i*133} y={props.y} />)
	}
	return children;
}
exports.CardSelectorCore = CardSelectorCore;

class CardSelector extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			shiny: false,
			showall: false,
			element: 0,
			rarity: 0,
		};
	}

	render() {
		return <>
			<input type='button'
				value='Toggle Shiny'
				style={{
					position: 'absolute',
					left: '4px',
					top: '578px',
				}}
				onClick={() => this.setState({ shiny: !this.state.shiny })}
			/>
			<input type='button'
				value={this.state.showall ? 'Auto Hide' : 'Show All'}
				style={{
					position: 'absolute',
					left: '4px',
					top: '530px',
				}}
				onClick={() => this.setState({ showall: !this.state.showall })}
			/>
			<RaritySelector x={74} y={338} value={this.state.rarity} onChange={rarity => this.setState({rarity})} />
			<ElementSelector x={4} y={316} value={this.state.rarity} onChange={element => this.setState({element})} />
			<CardSelectorCore {...this.props} x={100} y={272} shiny={this.state.shiny} showall={this.state.showall} rarity={this.state.rarity} element={this.state.element} />
		</>;
		return children;
	}
}
exports.CardSelector = CardSelector;

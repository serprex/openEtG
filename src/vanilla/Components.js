'use strict';
const ui = require('./ui'),
	etg = require('./etg'),
	Cards = require('./Cards'),
	etgutil = require('../etgutil'),
	store = require('./store'),
	React = require('react');

exports.Box = function(props) {
	return <div
		className='bgbox'
		children={props.children}
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
		onContextMenu={props.onContextMenu}
		style={{
			backgroundColor: bgcol,
			borderColor: props.opacity ? '#f00' : bordcol,
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
				<span className={'ico te' + card.costele} />}
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
			const num = parseInt(parse[0]);
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
	return <div
		className={props.className}
		style={props.style}>{elec}</div>;
};

function IconBtn(props) {
	return <span className={'imgb ico ' + props.e}
		style={{
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		}}
		onClick={(e) => {
			if (props.click) props.click.call(e.target, e);
		}}
		onMouseOver={props.onMouseOver}
	/>;
}
exports.IconBtn = IconBtn;

exports.Card = function(props) {
	const card = props.card || (props.code && Cards.Codes[props.code]);
	if (!card) return null;
	const textColor = card.upped ? '#000' : '';
	return <div
		style={{
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
			width: '128px',
			height: '256px',
			pointerEvents: 'none',
			zIndex: '4',
			color: textColor,
			backgroundImage: 'url("../assets/cardBacks.png")',
			backgroundPosition: `${(card.element + card.upped * 13) * -128}px 0px`,
			backgroundRepeat: 'no-repeat',
			overflow: 'hidden',
		}}>
		<span style={{
			position: 'absolute',
			left: '2px',
			top: '2px',
			fontSize: '12px',
		}}>
			{card.name}
		</span>
		<img className={card.code & 0x4000 ? 'shiny' : ''}
			src={`/Cards/${card.code.toString(32)}.png`}
			style={{
				position:'absolute',
				top:'20px',
				width: '128px',
				height: '128px',
				backgroundColor: ui.maybeLightenStr(card),
			}}
		/>
		<exports.Text text={card.info()} icoprefix='te'
			style={{
				position: 'absolute',
				padding: '2px',
				top: '148px',
				fontSize: '10px',
				width: '128px',
				height: '108px',
				backgroundImage: 'url("/assets/cardBacks.png")',
				backgroundPosition: `${(card.element + card.upped * 13) * -128}px -20px`,
			}}
		/>
		{!!card.rarity &&
			<span className={`ico r${card.rarity}`}
				style={{
					position:'absolute',
					right:'30px',
					bottom:'2px',
				}}
			/>
		}
		{!!card.cost &&
			<span style={{
				position:'absolute',
				right:'2px',
				top:'2px',
				fontSize: '12px',
			}}>
				{card.cost}
				{card.element != card.costele &&
					<span className={`ico ce${card.costele}`} />}
			</span>
		}
		<span className={`ico t${card.type}`}
			style={{
				position:'absolute',
				right:'2px',
				bottom:'2px',
			}}
		/>
	</div>;
};

function DeckDisplay(props) {
	let mark = -1,
		j = -1;
	const children = props.deck.map((code, i) => {
		const card = Cards.Codes[code];
		if (card) {
			j++;
			return <CardImage
				card={card}
				onMouseOver={props.onMouseOver && (() => props.onMouseOver(i, code))}
				onClick={props.onClick && (() => props.onClick(i, code))}
				x={(props.x || 0) + 100 + Math.floor(j / 10) * 99}
				y={(props.y || 0) + 32 + (j % 10) * 19}
			/>;
		} else {
			const ismark = etgutil.fromTrueMark(code);
			if (~ismark) mark = ismark;
		}
	});
	if (~mark && props.renderMark) {
		children.push(
			<span className={'ico e' + mark}
				style={{
					position: 'absolute',
					left: (props.x || 0) + 66 + 'px',
					top: (props.y || 0) + 200 + 'px',
				}}
			/>
		);
	}
	return children;
}
exports.DeckDisplay = DeckDisplay;

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
				onContextMenu={props.onContextMenu && (e => {
					e.preventDefault();
					props.onContextMenu(code);
				})}
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
				x.element == props.element /* &&
				((i % 3 == 0 && x.type == etg.Creature) ||
					(i % 3 == 1 && x.type <= etg.Permanent) ||
					(i % 3 == 2 && x.type == etg.Spell))*/
			),
			Cards.cardCmp,
		);
		children.push(<CardSelectorColumn key={i} {...props}
			cards={cards} x={props.x+i*133} y={props.y} />);
	}
	return children;
}
exports.CardSelectorCore = CardSelectorCore;

class CardSelector extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			element: 0,
		};
	}

	render() {
		return <>
			<ElementSelector x={4} y={316} onChange={element => this.setState({element})} />
			<CardSelectorCore {...this.props} x={100} y={272} element={this.state.element} />
		</>;
		return children;
	}
}
exports.CardSelector = CardSelector;

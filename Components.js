"use strict";
const ui = require('./ui'),
	etg = require('./etg'),
	svg = require('./svg'),
	audio = require('./audio'),
	Cards = require('./Cards'),
	etgutil = require('./etgutil'),
	options = require('./options'),
	h = preact.h, Component = preact.Component;

exports.rect = function(x, y, wid, hei) {
	let style = {
		position: 'absolute',
		left: x+'px',
		top: y+'px',
		width: wid+'px',
		height: hei+'px',
	};
	return function(props) {
		return h('div', Object.assign({}, props, { style: props.style ? Object.assign({}, props.style, style) : style }));
	}
}

function CardImage(props) {
	let card = props.card, spans = [h('span', {}, card.name)];
	let bordcol = card && card.shiny ? '#daa520' : '#222';
	let bgcol = card ? ui.maybeLightenStr(card) : card === null ? '#876' : '#111';
	if (card && card.cost) {
		spans.push(h('span', { style: { float: 'right', marginRight: '2px' }}, card.cost));
		if (card.costele !== card.element) {
			spans.push(h('span', { className: 'ico ce' + card.costele, style: { float: 'right' }}));
		}
	}
	return h('div', {
		className: 'cardslot',
		onMouseOver: props.onMouseOver,
		onClick: props.onClick,
		style: {
			backgroundColor: bgcol,
			borderColor: bordcol,
			color: card && card.upped ? '#000' : '#fff',
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
		children: spans,
	});
}
exports.CardImage = CardImage;

exports.Input = function(props){
	var ele = h('input', {
		placeholder: props.placeholder,
		onKeyPress: props.onKeyPress,
		onClick: props.onClick,
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
	});
	if (props.num) ele.className = 'numput';
	if (props.opt) options.register(props.opt, ele, props.nopersist);
	return ele;
}

exports.Text = function(props){
	var text = props.text.toString().replace(/\|/g, ' / ');
	var sep = /\d\d?:\d\d?|\$|\n/g, reres, lastindex = 0;
	var ele = h('div', { style: props.style }), elec = [];
	while (reres = sep.exec(text)){
		var piece = reres[0];
		if (reres.index != lastindex){
			elec.push(text.slice(lastindex, reres.index));
		}
		if (piece == "\n") {
			elec.push(h('br'))
		}else if (piece == "$") {
			elec.push(h('span', { className: 'ico gold' }));
		}else if (/^\d\d?:\d\d?$/.test(piece)) {
			var parse = piece.split(":");
			var num = parseInt(parse[0]);
			if (num == 0) {
				elec.push(h('0'));
			} else if (num < 4) {
				var icon = h('span', { className: 'ico ce'+parse[1] });
				for (var j = 0;j < num;j++) {
					elec.push(icon);
				}
			}else{
				elec.push(parse[0], h('span', { className: 'ico ce'+parse[1] }))
			}
		}
		lastindex = reres.index + piece.length;
	}
	if (lastindex != text.length){
		elec.push(text.slice(lastindex));
	}
	ele.children = elec;
	return ele;
}

function IconBtn(props) {
	return h('span', {
		className: 'imgb ico ' + props.e,
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
		onClick: function(e){
			audio.playSound('buttonClick');
			if (props.click) props.click.call(e.target, e);
		},
		onMouseOver: props.onMouseOver,
	});
}
exports.IconBtn = IconBtn;

exports.ExitBtn = function(props) {
	return h('input', {
		type: 'button',
		value: 'Exit',
		onClick: props.onClick || function() { props.doNav(require('./views/MainMenu')); },
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		}
	});
}

exports.Card = function(props) {
	const card = props.card || props.code && Cards.Codes[props.code];
	if (!card) return null;
	const svgcard = svg.card(card);
	return h('svg', {
		width: '128',
		height: '256',
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
		dangerouslySetInnerHTML: { __html: svgcard.slice(svgcard.indexOf('>')+1,-6) },
	});
}

function DeckDisplay(props) {
	return h('div', {
		children: props.deck.map(function(code, i){
			const card = Cards.Codes[code];
			return card && h(CardImage, {
				card: card,
				onMouseOver: function() { return props.onMouseOver(i, code); },
				onClick: function() { return props.onClick(i, code); },
				x: 100 + Math.floor(i / 10) * 99,
				y: 32 + (i % 10) * 19,
			});
		}),
	});
}
exports.DeckDisplay = DeckDisplay;

class CardSelector extends Component {
	constructor(props) {
		super(props)
		this.state = {
			shiny: false,
			showall: false,
			element: 0,
			rarity: 0,
		};
	}

	render() {
		const self = this;
		const children = [
			h('input', {
				type: 'button',
				value: 'Toggle Shiny',
				style: {
					position: 'absolute',
					left: '4px',
					top: '578px',
				},
				onClick: function() {
					self.setState({ shiny: !self.state.shiny });
				},
			}),
			h('input', {
				type: 'button',
				value: self.state.showall ? 'Auto Hide' : 'Show All',
				style: {
					position: 'absolute',
					left: '4px',
					top: '530px',
				},
				onClick: function() {
					self.setState({ showall: !self.state.showall });
				},
			}),
		];
		for (let i = 0;i < 13; i++) {
			children.push(h(IconBtn, {
				e: 'e'+i,
				x: !i || i&1?4:40,
				y: 316 + Math.floor((i-1)/2) * 32,
				click: function() {
					self.setState({ element: i });
				},
			}));
		}
		for (let i = 0;i < 5; i++){
			children.push(h(IconBtn, {
				e: (i?'r':'t')+i,
				x: 74,
				y: 338+i*32,
				click: function() {
					self.setState({ rarity: i });
				},
			}));
		}
		for (let i = 0;i < 6; i++) {
			const x = 100+i*133;
			const column = Cards.filter(i > 2,
				function(x) {
					return (
						x.element == self.state.element ||
						self.state.rarity == 4
					) && (
						i % 3 == 0 && x.type == etg.Creature ||
						i % 3 == 1 && x.type <= etg.Permanent ||
						i % 3 == 2 && x.type == etg.Spell
					) && (
						!self.props.cardpool ||
						x.code in self.props.cardpool ||
						self.props.filterboth && etgutil.asShiny(x.code, true) in self.props.cardpool ||
						self.state.showall ||
						x.isFree()
					) && (
						!self.state.rarity ||
						self.state.rarity == Math.min(x.rarity, 4)
					);
				}, Cards.cardCmp, this.state.shiny && !this.props.filterboth);
			const countTexts = [];
			for (let j=0; j<column.length; j++) {
				const y = 272+j*19, card = column[j], code = card.code;
				children.push(h(CardImage, {
					x: x, y: y,
					card: card,
					onClick: self.props.onClick && function() {
						if (self.props.filterboth && !self.state.shiny){
							const scode = card.asShiny(true).code;
							if (scode in self.props.cardpool && self.props.cardpool[scode] > ((self.props.cardminus && self.props.cardminus[scode]) || 0)) {
								code = scode;
							}
						}
						return self.props.onClick(code);
					},
					onMouseOver: self.props.onMouseOver && function() { return self.props.onMouseOver(code); },
				}));
				if (this.props.cardpool) {
					const scode = etgutil.asShiny(card.code, true);
					var cardAmount = card.isFree() ? "-" : code in this.props.cardpool ? this.props.cardpool[code] - ((this.props.cardminus && this.props.cardminus[code]) || 0) : 0, shinyAmount = 0;
					if (this.props.filterboth && !this.state.shiny) {
						shinyAmount = scode in this.props.cardpool ? this.props.cardpool[scode] - ((this.props.cardminus && this.props.cardminus[scode]) || 0) : 0;
					}
					countTexts.push(h('div', {
						className: 'selectortext' + (this.props.maxedIndicator && card.type != etg.Pillar && cardAmount >= 6 ?(cardAmount >= 12 ? ' beigeback' : ' lightback'):''),
					}, cardAmount + (shinyAmount ? '/' + shinyAmount : '')));
				}
			}
			children.push(h('div', {
				style: {
					position: 'absolute',
					left: x+100+'px',
					top: '272px',
					textHeight: '0',
					whiteSpace: 'pre',
				},
				children: countTexts,
			}));
		}
		return h('div', {}, children);
	}
}
exports.CardSelector = CardSelector;
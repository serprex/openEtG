'use strict';
const ui = require('./ui'),
	etg = require('./etg'),
	svg = require('./svg'),
	audio = require('./audio'),
	Cards = require('./Cards'),
	etgutil = require('./etgutil'),
	options = require('./options'),
	h = preact.h,
	Component = preact.Component;

exports.rect = function(x, y, wid, hei) {
	const style = {
		position: 'absolute',
		left: x + 'px',
		top: y + 'px',
		width: wid + 'px',
		height: hei + 'px',
	};
	return function(props) {
		return h(
			'div',
			Object.assign({}, props, {
				style: props.style ? Object.assign({}, props.style, style) : style,
			}),
		);
	};
};

exports.Box = function(props) {
	return h('div', {
		className: 'bgbox',
		children: props.children,
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
			width: props.width + 'px',
			height: props.height + 'px',
		},
	});
};

function CardImage(props) {
	let card = props.card,
		spans = [card.name];
	let bordcol = card && card.shiny ? '#daa520' : '#222';
	let bgcol = card ? ui.maybeLightenStr(card) : card === null ? '#876' : '#111';
	if (card && card.cost) {
		spans.push(
			h(
				'span',
				{
					style: {
						float: 'right',
						marginRight: '2px',
					},
				},
				card.cost,
				card.costele !== card.element &&
					h('span', { className: 'ico te' + card.costele }),
			),
		);
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

exports.Input = function(props) {
	return h('input', {
		className: props.num ? 'numput' : undefined,
		ref: props.opt
			? function(ctrl) {
					ctrl && options.register(props.opt, ctrl, props.nopersist);
				}
			: undefined,
		placeholder: props.placeholder,
		onKeyPress: props.onKeyPress,
		onClick: props.onClick,
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
	});
};

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
			elec.push(h('br'));
		} else if (piece == '$') {
			elec.push(h('span', { className: 'ico gold' }));
		} else if (/^\d\d?:\d\d?$/.test(piece)) {
			const parse = piece.split(':');
			const num = parseInt(parse[0]);
			if (num == 0) {
				elec.push('0');
			} else if (num < 4) {
				const icon = h('span', { className: icoprefix + parse[1] });
				for (let j = 0; j < num; j++) {
					elec.push(icon);
				}
			} else {
				elec.push(parse[0], h('span', { className: icoprefix + parse[1] }));
			}
		}
		lastindex = reres.index + piece.length;
	}
	if (lastindex != text.length) {
		elec.push(text.slice(lastindex));
	}
	return h('div', {
		className: props.className,
		style: props.style,
		children: elec,
	});
};

function IconBtn(props) {
	return h('span', {
		className: 'imgb ico ' + props.e,
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
		onClick: function(e) {
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
		onClick:
			props.onClick ||
			function() {
				props.doNav(require('./views/MainMenu'));
			},
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
	});
};

exports.Card = function(props) {
	const card = props.card || (props.code && Cards.Codes[props.code]);
	if (!card) return null;
	const svgcard = svg.card(card);
	return h('svg', {
		width: '128',
		height: '256',
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
			pointerEvents: 'none',
			zIndex: '4',
		},
		dangerouslySetInnerHTML: {
			__html: svgcard.slice(svgcard.indexOf('>') + 1, -6),
		},
	});
};

function DeckDisplay(props) {
	let mark = -1,
		i = -1;
	const children = props.deck.map(function(code) {
		const card = Cards.Codes[code];
		if (card) {
			i++;
			return h(CardImage, {
				card: card,
				onMouseOver:
					props.onMouseOver &&
					function() {
						return props.onMouseOver(i, code);
					},
				onClick:
					props.onClick &&
					function() {
						return props.onClick(i, code);
					},
				x: (props.x || 0) + 100 + Math.floor(i / 10) * 99,
				y: (props.y || 0) + 32 + (i % 10) * 19,
			});
		} else {
			const ismark = etgutil.fromTrueMark(code);
			if (~ismark) mark = ismark;
		}
	});
	if (~mark && props.renderMark) {
		children.push(
			h('span', {
				className: 'ico e' + mark,
				style: {
					position: 'absolute',
					left: (props.x || 0) + 66 + 'px',
					top: (props.y || 0) + 200 + 'px',
				},
			}),
		);
	}
	return h('div', {
		children: children,
	});
}
exports.DeckDisplay = DeckDisplay;

class CardSelector extends Component {
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
		for (let i = 0; i < 13; i++) {
			children.push(
				h(IconBtn, {
					e: 'e' + i,
					x: !i || i & 1 ? 4 : 40,
					y: 316 + Math.floor((i - 1) / 2) * 32,
					click: function() {
						self.setState({ element: i });
					},
				}),
			);
		}
		for (let i = 0; i < 5; i++) {
			children.push(
				h(IconBtn, {
					e: (i ? 'r' : 't') + i,
					x: 74,
					y: 338 + i * 32,
					click: function() {
						self.setState({ rarity: i });
					},
				}),
			);
		}
		for (let i = 0; i < 6; i++) {
			const x = 100 + i * 133;
			const column = Cards.filter(
				i > 2,
				function(x) {
					return (
						(x.element == self.state.element || self.state.rarity == 4) &&
						((i % 3 == 0 && x.type == etg.Creature) ||
							(i % 3 == 1 && x.type <= etg.Permanent) ||
							(i % 3 == 2 && x.type == etg.Spell)) &&
						(!self.props.cardpool ||
							x.code in self.props.cardpool ||
							(self.props.filterboth &&
								etgutil.asShiny(x.code, true) in self.props.cardpool) ||
							self.state.showall ||
							x.isFree()) &&
						(!self.state.rarity || self.state.rarity == Math.min(x.rarity, 4))
					);
				},
				Cards.cardCmp,
				this.state.shiny && !this.props.filterboth,
			);
			const countTexts = [];
			for (let j = 0; j < column.length; j++) {
				const y = 272 + j * 19,
					card = column[j];
				let code = card.code;
				children.push(
					h(CardImage, {
						x: x,
						y: y,
						card: card,
						onClick:
							self.props.onClick &&
							function() {
								if (self.props.filterboth && !self.state.shiny) {
									const scode = card.asShiny(true).code;
									if (
										scode in self.props.cardpool &&
										self.props.cardpool[scode] >
											((self.props.cardminus && self.props.cardminus[scode]) ||
												0)
									) {
										code = scode;
									}
								}
								return self.props.onClick(code);
							},
						onMouseOver:
							self.props.onMouseOver &&
							function() {
								if (self.props.filterboth && !self.state.shiny) {
									const scode = card.asShiny(true).code;
									if (
										scode in self.props.cardpool &&
										self.props.cardpool[scode] >
											((self.props.cardminus && self.props.cardminus[scode]) ||
												0)
									) {
										code = scode;
									}
								}
								return self.props.onMouseOver(code);
							},
					}),
				);
				if (this.props.cardpool) {
					const scode = etgutil.asShiny(card.code, true);
					var cardAmount = card.isFree()
							? '-'
							: code in this.props.cardpool
								? this.props.cardpool[code] -
									((this.props.cardminus && this.props.cardminus[code]) || 0)
								: 0,
						shinyAmount = 0;
					if (this.props.filterboth && !this.state.shiny) {
						shinyAmount =
							scode in this.props.cardpool
								? this.props.cardpool[scode] -
									((this.props.cardminus && this.props.cardminus[scode]) || 0)
								: 0;
					}
					countTexts.push(
						h(
							'div',
							{
								className:
									'selectortext' +
									(this.props.maxedIndicator &&
									card.type != etg.Pillar &&
									cardAmount >= 6
										? cardAmount >= 12 ? ' beigeback' : ' lightback'
										: ''),
							},
							cardAmount + (shinyAmount ? '/' + shinyAmount : ''),
						),
					);
				}
			}
			children.push(
				h('div', {
					style: {
						position: 'absolute',
						left: x + 100 + 'px',
						top: '272px',
						textHeight: '0',
						whiteSpace: 'pre',
					},
					children: countTexts,
				}),
			);
		}
		return h('div', {}, children);
	}
}
exports.CardSelector = CardSelector;

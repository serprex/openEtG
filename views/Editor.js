'use strict';
const px = require('../px'),
	etg = require('../etg'),
	chat = require('../chat'),
	sock = require('../sock'),
	Cards = require('../Cards'),
	tutor = require('../tutor'),
	etgutil = require('../etgutil'),
	options = require('../options'),
	Components = require('../Components'),
	React = require('react'),
	h = React.createElement;

const artable = {
	hp: { min: 65, max: 200, incr: 45, cost: 1 },
	mark: { cost: 45 },
	draw: { cost: 135 },
};
function attrval(x, d) {
	x = +x;
	return x === 0 ? 0 : x || d;
}

module.exports = class Editor extends React.Component {
	constructor(props) {
		super(props);
		const aupped = props.acard && props.acard.upped;
		const baseacard = props.acard && props.acard.asUpped(false).asShiny(false);
		const pool = sock.user && {};
		function incrpool(code, count) {
			if (
				code in Cards.Codes &&
				(!props.acard ||
					(!Cards.Codes[code].isOf(baseacard) &&
						(aupped || !Cards.Codes[code].upped)))
			) {
				pool[code] = (pool[code] || 0) + count;
			}
		}
		if (sock.user && pool) {
			etgutil.iterraw(sock.user.pool, incrpool);
			etgutil.iterraw(sock.user.accountbound, incrpool);
		}
		const deckmark = this.processDeck(
			etgutil.decodedeck(
				props.startempty
					? ''
					: props.acard ? props.adeck || '' : sock.getDeck(),
			),
		);
		this.state = {
			pool: pool,
			deck: deckmark.deck,
			mark: deckmark.mark,
			deckname: sock.user && sock.user.selectedDeck,
			arattr: props.ainfo && {
				hp: attrval(props.ainfo.hp, 200),
				mark: attrval(props.ainfo.mark, 2),
				draw: attrval(props.ainfo.draw, 1),
			},
		};
	}

	processDeck(deck) {
		let mark = 0;
		for (var i = deck.length - 1; i >= 0; i--) {
			if (!(deck[i] in Cards.Codes)) {
				const index = etgutil.fromTrueMark(deck[i]);
				if (~index) {
					mark = index;
				}
				deck.splice(i, 1);
			}
		}
		return { mark: mark, deck: deck };
	}

	render() {
		const self = this,
			aupped = this.props.acard && this.props.acard.upped;
		const arpts = aupped ? 515 : 425;
		const sortedDeck = self.state.deck.slice();
		sortedDeck.sort(Cards.codeCmp);
		const cardminus = [];
		if (sock.user) {
			for (let i = sortedDeck.length - 1; i >= 0; i--) {
				var code = sortedDeck[i],
					card = Cards.Codes[code];
				if (card.type != etg.Pillar) {
					if (sumCardMinus(code) == 6) {
						sortedDeck.splice(i, 1);
						continue;
					}
				}
				if (!card.isFree()) {
					if ((cardminus[code] || 0) < (self.state.pool[code] || 0)) {
						cardminus[code] = (cardminus[code] || 0) + 1;
					} else {
						code = etgutil.asShiny(code, !card.shiny);
						card = Cards.Codes[code];
						if (card.isFree()) {
							sortedDeck[i] = code;
						} else if ((cardminus[code] || 0) < (self.state.pool[code] || 0)) {
							sortedDeck[i] = code;
							cardminus[code] = (cardminus[code] || 0) + 1;
						} else {
							sortedDeck.splice(i, 1);
						}
					}
				}
			}
		}
		if (this.props.acard) {
			const acode = this.props.acard.code;
			sortedDeck.unshift(acode, acode, acode, acode, acode);
		}
		function sumCardMinus(code) {
			var sum = 0;
			for (var i = 0; i < 4; i++) {
				sum +=
					cardminus[etgutil.asShiny(etgutil.asUpped(code, i & 1), i & 2)] || 0;
			}
			return sum;
		}
		function setCardArt(code) {
			if (!self.state.card || self.state.card.code != code)
				self.setState({ card: Cards.Codes[code] });
		}
		function quickDeck(number) {
			return e => {
				if (self.state.setQeck) {
					saveButton();
					sock.userExec('changeqeck', {
						number: number,
						name: sock.user.selectedDeck,
					});
					sock.user.qecks[number] = sock.user.selectedDeck;
					self.setState({ setQeck: false });
				} else {
					loadDeck(sock.user.qecks[number]);
				}
			};
		}
		function saveTo() {
			self.setState({ setQeck: !self.state.setQeck });
		}
		function saveDeck(force) {
			const dcode =
					etgutil.encodedeck(sortedDeck) +
					etgutil.toTrueMarkSuffix(self.state.mark),
				olddeck = sock.getDeck();
			if (sortedDeck.length == 0) {
				sock.userExec('rmdeck', { name: sock.user.selectedDeck });
			} else if (olddeck != dcode) {
				sock.userExec('setdeck', { d: dcode, name: sock.user.selectedDeck });
			} else if (force)
				sock.userExec('setdeck', { name: sock.user.selectedDeck });
		}
		function loadDeck(x) {
			if (!x) return;
			saveDeck();
			sock.user.selectedDeck = x;
			self.setState(self.processDeck(etgutil.decodedeck(sock.getDeck())));
		}
		function importDeck() {
			const dvalue = options.deck.trim();
			self.setState(
				self.processDeck(
					~dvalue.indexOf(' ') ? dvalue.split(' ') : etgutil.decodedeck(dvalue),
				),
			);
		}
		const editorui = [
			h('input', {
				type: 'button',
				value: 'Clear',
				onClick: function() {
					self.setState({ deck: [] });
				},
				style: {
					position: 'absolute',
					left: '8px',
					top: '32px',
				},
			}),
		];
		let sumscore = 0;
		if (self.state.arattr) {
			for (var k in artable) {
				sumscore += self.state.arattr[k] * artable[k].cost;
			}
		}
		function makeattrui(y, name) {
			function mkmodattr(x) {
				return () => {
					const newval = self.state.arattr[name] + x;
					if (
						newval >= (data.min || 0) &&
						(!data.max || newval <= data.max) &&
						sumscore +
							(newval - self.state.arattr[name]) * artable[name].cost <=
							arpts
					) {
						self.setState({
							arattr: Object.assign({}, self.state.arattr, { [name]: newval }),
						});
					}
				};
			}
			y = 128 + y * 20 + 'px';
			var data = artable[name];
			editorui.push(
				h(
					'div',
					{
						style: {
							position: 'absolute',
							left: '4px',
							top: y,
						},
					},
					name,
				),
				h('input', {
					type: 'button',
					value: '-',
					onClick: mkmodattr(-(data.incr || 1)),
					style: {
						position: 'absolute',
						left: '38px',
						top: y,
						width: '14px',
					},
				}),
				h('input', {
					type: 'button',
					value: '+',
					onClick: mkmodattr(data.incr || 1),
					style: {
						position: 'absolute',
						left: '82px',
						top: y,
						width: '14px',
					},
				}),
				h(
					'div',
					{
						style: {
							position: 'absolute',
							left: '56px',
							top: y,
						},
					},
					self.state.arattr[name] + '',
				),
			);
		}
		function saveButton() {
			if (self.state.deckname) {
				sock.user.selectedDeck = self.state.deckname;
				saveDeck();
				self.setState({});
			}
		}
		if (self.props.acard) {
			editorui.push(
				h('input', {
					type: 'button',
					value: 'Save & Exit',
					onClick: function() {
						if (self.state.deck.length < 30 || sumscore > arpts) {
							return chat('35 cards required before submission', 'System');
						}
						const data = Object.assign(
							{
								d:
									etgutil.encodedeck(sortedDeck.slice(5)) +
									etgutil.toTrueMarkSuffix(self.state.mark),
								lv: aupped,
							},
							self.state.arattr,
						);
						if (!self.props.startempty) {
							data.mod = true;
						}
						sock.userEmit('setarena', data);
						chat('Arena deck submitted', 'System');
						self.props.doNav(require('./MainMenu'));
					},
					style: {
						position: 'absolute',
						left: '8px',
						top: '58px',
					},
				}),
				h('input', {
					type: 'button',
					value: 'Exit',
					onClick: () => {
						sock.userEmit('arenainfo');
					},
					style: {
						position: 'absolute',
						left: '8px',
						top: '84px',
					},
				}),
				h(
					'div',
					{
						style: {
							position: 'absolute',
							left: '4px',
							top: '188px',
						},
					},
					(arpts - sumscore) / 45 + '',
				),
			);
			makeattrui(0, 'hp');
			makeattrui(1, 'mark');
			makeattrui(2, 'draw');
		} else {
			editorui.push(
				h('input', {
					type: 'button',
					value: 'Save & Exit',
					onClick: function() {
						if (sock.user) saveDeck(true);
						else
							options.deck =
								etgutil.encodedeck(self.state.deck) +
								etgutil.toTrueMarkSuffix(self.state.mark);
						self.props.doNav(require('./MainMenu'));
					},
					style: {
						position: 'absolute',
						left: '8px',
						top: '58px',
					},
				}),
			);
			editorui.push(
				h('input', {
					type: 'button',
					value: 'Import',
					onClick: importDeck,
					style: {
						position: 'absolute',
						left: '8px',
						top: '84px',
					},
				}),
			);
			if (sock.user) {
				const tname = h(
						'div',
						{
							style: {
								position: 'absolute',
								top: '8px',
								left: '100px',
							},
						},
						sock.user.selectedDeck,
					),
					buttons = [];
				for (let i = 0; i < 10; i++) {
					buttons.push(
						h('input', {
							key: i,
							type: 'button',
							value: i + 1 + '',
							className:
								'editbtn' +
								(sock.user.selectedDeck == sock.user.qecks[i]
									? ' selectedbutton'
									: ''),
							onClick: quickDeck(i),
						}),
					);
				}
				editorui.push(
					tname,
					h('input', {
						type: 'button',
						value: 'Save',
						onClick: saveButton,
						style: {
							position: 'absolute',
							left: '8px',
							top: '110px',
						},
					}),
					h('input', {
						type: 'button',
						value: 'Load',
						onClick: () => loadDeck(this.state.deckname),
						style: {
							position: 'absolute',
							left: '8px',
							top: '136px',
						},
					}),
					h('input', {
						type: 'button',
						value: 'Exit',
						onClick: function() {
							if (sock.user)
								sock.userExec('setdeck', { name: sock.user.selectedDeck });
							self.props.doNav(require('./MainMenu'));
						},
						style: {
							position: 'absolute',
							left: '8px',
							top: '162px',
						},
					}),
					h('input', {
						type: 'button',
						value: 'Save to #',
						className: self.state.setQeck && 'selectedbutton',
						onClick: saveTo,
						style: {
							position: 'absolute',
							left: '220px',
							top: '8px',
						},
					}),
					h('div', {
						children: buttons,
						style: {
							position: 'absolute',
							left: '300px',
							top: '8px',
						},
					}),
				);
			}
		}
		editorui.push(
			h('span', {
				className: 'ico e' + self.state.mark,
				style: {
					position: 'absolute',
					left: '66px',
					top: '200px',
				},
			}),
		);
		for (let i = 0; i < 13; i++) {
			editorui.push(
				h(Components.IconBtn, {
					e: 'e' + i,
					x: 100 + i * 32,
					y: 234,
					click: function() {
						self.setState({ mark: i });
					},
				}),
			);
		}
		const decksprite = h(Components.DeckDisplay, {
			onMouseOver: function(i, code) {
				return setCardArt(code);
			},
			onClick: function(_, code) {
				if (!self.props.acard || code != self.props.acard.code) {
					const newdeck = self.state.deck.slice();
					for (let i = 0; i < newdeck.length; i++) {
						if (newdeck[i] == code) {
							newdeck.splice(i, 1);
							break;
						}
					}
					self.setState({ deck: newdeck });
				}
			},
			deck: sortedDeck,
		});
		const cardsel = h(Components.CardSelector, {
			onMouseOver: setCardArt,
			onClick: function(code) {
				if (sortedDeck.length < 60) {
					const card = Cards.Codes[code];
					if (sock.user && !card.isFree()) {
						if (
							!(code in self.state.pool) ||
							(code in cardminus && cardminus[code] >= self.state.pool[code]) ||
							(card.type != etg.Pillar && sumCardMinus(code) >= 6)
						) {
							return;
						}
					}
					self.setState({ deck: self.state.deck.concat([code]) });
				}
			},
			maxedIndicator: !self.props.acard,
			filterboth: !!self.state.pool,
			cardpool: self.state.pool,
			cardminus: cardminus,
		});
		const cardArt = h(Components.Card, { x: 734, y: 8, card: this.state.card });
		editorui.push(decksprite, cardsel, cardArt);
		if (!self.props.acard) {
			if (sock.user) {
				const deckname = h('input', {
					id: 'deckname',
					placeholder: 'Name',
					value: self.state.deckname,
					onInput: e => self.setState({ deckname: e.target.value }),
					onKeyPress: e => {
						if (e.keyCode == 13) {
							loadDeck(e.target.value);
						}
					},
					onClick: (e) => {
						e.target.setSelectionRange(0, 999);
					},
					style: {
						position: 'absolute',
						left: '4px',
						top: '4px',
						width: '80px',
					},
				});
				editorui.push(deckname);
			}
			const deckimport = h('input', {
				id: 'deckimport',
				placeholder: 'Deck',
				autoFocus: true,
				value:
					etgutil.encodedeck(sortedDeck) +
					etgutil.toTrueMarkSuffix(self.state.mark),
				style: {
					position: 'absolute',
					left: '520px',
					top: '238px',
					width: '190px',
				},
				ref: (ctrl) => {
					if (ctrl) {
						options.deck = ctrl.value;
						options.register('deck', ctrl);
						if (!self.firstRender) {
							ctrl.setSelectionRange(0, 999);
							self.firstRender = true;
						}
					}
				},
				onClick: (e) => {
					e.target.setSelectionRange(0, 999);
				},
				onKeyPress: (e) => {
					if (e.keyCode == 13) {
						e.target.blur();
						importDeck();
					}
				},
			});
			editorui.push(deckimport);
		}
		px.view({
			cmds: {
				arenainfo: (data) => {
					self.props.doNav(require('./ArenaInfo'), data);
				},
			},
		});
		if (!this.props.acard && sock.user)
			editorui.push(h(tutor.Tutor, { data: tutor.Editor, x: 4, y: 220 }));
		return h('div', { children: editorui });
	}
};

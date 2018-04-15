'use strict';
const etg = require('../etg'),
	chat = require('../chat'),
	sock = require('../sock'),
	Cards = require('../Cards'),
	Tutor = require('../Tutor'),
	etgutil = require('../etgutil'),
	Components = require('../Components'),
	store = require('../store'),
	{ connect } = require('react-redux'),
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

module.exports = connect(({opts}) => ({ deck: opts.deck, deckname: opts.deckname }))(class Editor extends React.Component {
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
			arattr: props.ainfo && {
				hp: attrval(props.ainfo.hp, 200),
				mark: attrval(props.ainfo.mark, 2),
				draw: attrval(props.ainfo.draw, 1),
			},
		};
	}

	componentDidMount() {
		this.props.dispatch(store.setCmds({
			arenainfo: data => {
				this.props.dispatch(store.doNav(require('./ArenaInfo'), data));
			},
		}));
	}

	processDeck(deck) {
		let mark = 0;
		for (let i = deck.length - 1; i >= 0; i--) {
			if (!(deck[i] in Cards.Codes)) {
				const index = etgutil.fromTrueMark(deck[i]);
				if (~index) {
					mark = index;
				}
				deck.splice(i, 1);
			}
		}
		return { mark, deck };
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
				let code = sortedDeck[i],
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
			let sum = 0;
			for (let i = 0; i < 4; i++) {
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
			self.props.dispatch(store.setOptTemp('selectedDeck', sock.user.selectedDeck));
			self.props.dispatch(store.setOptTemp('deckname', sock.user.selectedDeck));
			self.props.dispatch(store.setOpt('deck', sock.getDeck()));
			self.setState(self.processDeck(etgutil.decodedeck(sock.getDeck())));
		}
		const editorui = [
			<input type='button'
				value='Clear'
				onClick={() => self.setState({ deck: [] })}
				style={{
					position: 'absolute',
					left: '8px',
					top: '32px',
				}}
			/>
		];
		let sumscore = 0;
		if (self.state.arattr) {
			for (const k in artable) {
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
			const data = artable[name];
			editorui.push(
				<div style={{
					position: 'absolute',
					left: '4px',
					top: y,
				}}>{name}</div>,
				<input type='button'
					value='-'
					onClick={mkmodattr(-(data.incr || 1))}
					style={{
						position: 'absolute',
						left: '38px',
						top: y,
						width: '14px',
					}}
				/>,
				<input type='button'
					value='+'
					onClick={mkmodattr(data.incr || 1)}
					style={{
						position: 'absolute',
						left: '82px',
						top: y,
						width: '14px',
					}}
				/>,
				<div style={{
					position: 'absolute',
					left: '56px',
					top: y,
				}}>{self.state.arattr[name] + ''}</div>,
			);
		}
		function saveButton() {
			if (self.props.deckname) {
				sock.user.selectedDeck = self.props.deckname;
				self.props.dispatch(store.setOptTemp('selectedDeck', sock.user.selectedDeck));
				saveDeck();
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
						self.props.dispatch(store.doNav(require('./MainMenu')));
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
							self.props.dispatch(store.setOpt('deck',
								etgutil.encodedeck(self.state.deck) +
								etgutil.toTrueMarkSuffix(self.state.mark)));
						self.props.dispatch(store.doNav(require('./MainMenu')));
					},
					style: {
						position: 'absolute',
						left: '8px',
						top: '58px',
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
						onClick: () => loadDeck(this.props.deckname),
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
							self.props.dispatch(store.doNav(require('./MainMenu')));
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
			<span className={'ico e' + self.state.mark}
				style={{
					position: 'absolute',
					left: '66px',
					top: '200px',
				}}
			/>,
		);
		for (let i = 0; i < 13; i++) {
			editorui.push(
				<Components.IconBtn
					e={'e' + i}
					x={100 + i * 32}
					y={234}
					click={() => self.setState({ mark: i })}
				/>,
			);
		}
		const decksprite = <Components.DeckDisplay
			onMouseOver={(_, code) => setCardArt(code)}
			onClick={(i, code) => {
				if (!self.props.acard || code != self.props.acard.code) {
					const newdeck = sortedDeck.slice();
					newdeck.splice(i, 1);
					self.setState({ deck: newdeck });
				}
			}}
			deck={sortedDeck}
		/>;
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
				editorui.push(h('input', {
					placeholder: 'Name',
					value: self.props.deckname,
					onChange: e => self.props.dispatch(store.setOptTemp('deckname', e.target.value)),
					onKeyPress: e => {
						if (e.which == 13) {
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
				}));
			}
			const deckimport = h('input', {
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
				onChange: e => {
					self.props.dispatch(store.setOptTemp('deck', e.target.value));
					self.setState(self.processDeck(etgutil.decodedeck(e.target.value)));
				},
				ref: ctrl => {
					if (ctrl) {
						self.props.dispatch(store.setOptTemp('deck', ctrl.value));
						if (!self.firstRender) {
							ctrl.setSelectionRange(0, 999);
							self.firstRender = true;
						}
					}
				},
				onClick: (e) => {
					e.target.setSelectionRange(0, 999);
				},
			});
			editorui.push(deckimport);
		}
		if (!this.props.acard && sock.user)
			editorui.push(<Tutor.Editor x={4} y={220} />);
		return h(React.Fragment, null, ...editorui);
	}
});

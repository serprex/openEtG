'use strict';
const px = require('../px'),
	chat = require('../chat'),
	sock = require('../sock'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	userutil = require('../userutil'),
	Components = require('../Components'),
	React = require('react'),
	h = React.createElement;

module.exports = class Trade extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			confirm: 0,
			code: 0,
			deck: [],
			offer: [],
			cardminus: [],
		};
	}

	componentDidMount() {
		const self = this;
		px.view({
			cmds: {
				cardchosen: function(data) {
					self.setState({ offer: etgutil.decodedeck(data.c) });
				},
				tradedone: function(data) {
					sock.user.pool = etgutil.mergedecks(sock.user.pool, data.newcards);
					sock.user.pool = etgutil.removedecks(sock.user.pool, data.oldcards);
					self.props.doNav(require('./MainMenu'));
				},
				tradecanceled: function() {
					self.props.doNav(require('./MainMenu'));
				},
			},
		});
	}

	componentWillUnmount() {
		px.view({});
	}

	render() {
		const self = this,
			cardminus = [],
			children = [];
		for (let i = 0; i < self.state.deck.length; i++) {
			cardminus[self.state.deck[i]]++;
		}
		if (self.state.confirm < 2) {
			children.push(
				h('input', {
					type: 'button',
					value: self.state.confirm ? 'Confirm' : 'Trade',
					onClick: self.state.confirm
						? function() {
								if (self.state.offer.length) {
									sock.userEmit('confirmtrade', {
										cards: etgutil.encoderaw(self.state.deck),
										oppcards: etgutil.encoderaw(self.state.offer),
									});
									self.setState({ confirm: 2 });
								} else chat('Wait for your friend to choose!', 'System');
							}
						: function() {
								if (self.state.deck.length) {
									sock.emit('cardchosen', {
										c: etgutil.encoderaw(self.state.deck),
									});
									self.setState({ confirm: 1 });
								} else chat('You have to choose at least a card!', 'System');
							},
					style: {
						position: 'absolute',
						left: '10px',
						top: self.state.confirm ? '60px' : '40px',
					},
				}),
			);
		} else {
			children.push(<span style={{
							position: 'absolute',
							left: '10px',
							top: '60px',
						}}>Confirmed!</span>);
		}
		const ownVal = h(Components.Text, {
			text: userutil.calcWealth(self.state.deck, true) + '$',
			style: {
				position: 'absolute',
				left: '100px',
				top: '235px',
			},
		});
		const foeVal = h(Components.Text, {
			text: userutil.calcWealth(self.state.offer, true) + '$',
			style: {
				position: 'absolute',
				left: '350px',
				top: '235px',
			},
		});
		const ownDeck = h(Components.DeckDisplay, {
			deck: self.state.deck,
			onMouseOver: function(i, code) {
				self.setState({ code: code });
			},
			onClick: function(i) {
				const newdeck = self.state.deck.slice();
				newdeck.splice(i, 1);
				self.setState({ deck: newdeck });
			},
		});
		const foeDeck = h(Components.DeckDisplay, {
			deck: self.state.offer,
			x: 450,
			onMouseOver: function(i, code) {
				self.setState({ code: code });
			},
		});
		children.push(
			ownDeck,
			foeDeck,
			ownVal,
			foeVal,
			h('input', {
				type: 'button',
				value: 'Cancel',
				onClick: function() {
					sock.userEmit('canceltrade');
					self.props.doNav(require('./MainMenu'));
				},
				style: {
					position: 'absolute',
					left: '10px',
					top: '10px',
				},
			}),
		);

		const cardpool = etgutil.deck2pool(sock.user.pool);
		const cardsel = h(Components.CardSelector, {
			cardpool: cardpool,
			cardminus: cardminus,
			onMouseOver: function(code) {
				self.setState({ code: code });
			},
			onClick: function(code) {
				const card = Cards.Codes[code];
				if (
					self.state.deck.length < 30 &&
					!card.isFree() &&
					code in cardpool &&
					!(code in cardminus && cardminus[code] >= cardpool[code])
				) {
					self.setState({ deck: self.state.deck.concat([code]) });
				}
			},
		});
		children.push(cardsel);
		if (self.state.code) {
			children.push(
				h(Components.Card, { x: 734, y: 8, code: self.state.code }),
			);
		}
		return h('div', { children: children });
	}
};

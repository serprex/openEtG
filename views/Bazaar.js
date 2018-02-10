'use strict';
const chat = require('../chat'),
	sock = require('../sock'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	userutil = require('../userutil'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	h = React.createElement;

module.exports = class Bazaar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			code: null,
			deck: [],
		};
	}

	render() {
		const self = this,
			children = [
				h(Components.ExitBtn, { x: 8, y: 100 }),
			],
			cost = Math.ceil(userutil.calcWealth(self.state.deck, true) * 3);

		if (self.state.deck.length > 0 && sock.user.gold >= cost) {
			children.push(
				h('input', {
					type: 'button',
					value: 'Buy',
					style: {
						position: 'absolute',
						left: '8px',
						top: '160px',
					},
					onClick: function() {
						sock.userExec('bazaar', {
							cards: etgutil.encoderaw(self.state.deck),
						});
						store.store.dispatch(store.doNav(require('./MainMenu')));
					},
				}),
			);
		}
		children.push(
			h(Components.Text, {
				text: cost + '$',
				style: {
					position: 'absolute',
					left: '100px',
					top: '235px',
					color: cost > sock.user.gold ? '#f44' : '#fff',
				},
			}),
			h(Components.Text, {
				text: sock.user.gold + '$',
				style: {
					position: 'absolute',
					left: '8px',
					top: '240px',
				},
			}),
			h(Components.DeckDisplay, {
				deck: self.state.deck,
				onMouseOver: function(i, code) {
					self.setState({ code: code });
				},
				onClick: function(i) {
					const newdeck = self.state.deck.slice();
					newdeck.splice(i, 1);
					self.setState({ deck: newdeck });
				},
			}),
			h(Components.CardSelector, {
				onMouseOver: function(code) {
					self.setState({ code: code });
				},
				onClick: function(code) {
					const card = Cards.Codes[code];
					if (
						self.state.deck.length < 60 &&
						card.rarity > 0 &&
						card.rarity < 4 &&
						!card.isFree()
					) {
						self.setState({ deck: self.state.deck.concat([code]) });
					}
				},
			}),
		);
		if (self.state.code) {
			children.push(
				h(Components.Card, { x: 734, y: 8, code: self.state.code }),
			);
		}
		return h(React.Fragment, null, ...children);
	}
};

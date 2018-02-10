'use strict';
const Cards = require('../Cards'),
	mkGame = require('../mkGame'),
	sock = require('../sock'),
	util = require('../util'),
	etgutil = require('../etgutil'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	h = React.createElement;

module.exports = function(props) {
	const children = [
		h(Components.Text, {
			style: { position: 'absolute', left: '96px', top: '576px' },
			text: 'Earn 1$ when your arena deck is faced, & another 2$ when it wins',
		}),
		h(Components.ExitBtn, { x: 8, y: 300 }),
	];
	function renderInfo(info, y) {
		if (info) {
			if (y) info.card = etgutil.asUpped(info.card, true);
			const adeck = '05' + info.card.toString(32) + info.deck;
			children.push(
				h(Components.DeckDisplay, {
					deck: etgutil.decodedeck(adeck),
					renderMark: true,
					y: y,
				}),
				h(Components.Text, {
					style: { position: 'absolute', left: '100px', top: 4 + y + 'px' },
					text:
						'W-L: ' +
						(info.win || 0) +
						' - ' +
						(info.loss || 0) +
						', Rank: ' +
						(info.rank == undefined ? 'Inactive' : info.rank + 1) +
						', ' +
						((info.win || 0) * 3 + (info.loss || 0) * 1) +
						'$',
				}),
				h(
					'span',
					{ style: { position: 'absolute', left: '330px', top: 4 + y + 'px' } },
					adeck,
				),
				h(
					'span',
					{
						style: { position: 'absolute', left: '400px', top: 224 + y + 'px' },
					},
					'Age: ' + info.day,
				),
				h(
					'span',
					{
						style: { position: 'absolute', left: '100px', top: 224 + y + 'px' },
					},
					'HP: ' + info.curhp + ' / ' + info.hp,
				),
				h(
					'span',
					{
						style: { position: 'absolute', left: '200px', top: 224 + y + 'px' },
					},
					'Mark: ' + info.mark,
				),
				h(
					'span',
					{
						style: { position: 'absolute', left: '300px', top: 224 + y + 'px' },
					},
					'Draw: ' + info.draw,
				),
				h('input', {
					type: 'button',
					value: 'Modify',
					style: {
						position: 'absolute',
						left: '500px',
						top: 224 + y + 'px',
					},
					onClick: function() {
						store.store.dispatch(store.doNav(require('./Editor'), {
							adeck: info.deck,
							acard: Cards.Codes[info.card],
							ainfo: info,
						}));
					},
				}),
				h('input', {
					type: 'button',
					value: 'Test',
					style: {
						position: 'absolute',
						left: '600px',
						top: 224 + y + 'px',
					},
					onClick: function() {
						var deck = sock.getDeck();
						if (etgutil.decklength(deck) < 9 || etgutil.decklength(adeck) < 9) {
							store.store.dispatch(store.doNav(require('./Editor')));
							return;
						}
						const gameData = mkGame({
							deck: adeck,
							urdeck: deck,
							seed: util.randint(),
							foename: 'Test',
							cardreward: '',
							p2hp: info.curhp,
							p2markpower: info.mark,
							p2drawpower: info.draw,
							ai: true,
						});
						store.store.dispatch(store.doNav(require('./Match'), gameData));
					},
				}),
			);
		}
	}
	renderInfo(props.A, 0);
	renderInfo(props.B, 300);
	if (sock.user.ocard) {
		for (let i = 0; i < 2; i++) {
			let uocard = etgutil.asUpped(sock.user.ocard, i == 1);
			children.push(
				h('input', {
					type: 'button',
					value: 'Create',
					style: {
						position: 'absolute',
						left: '734px',
						top: 268 + i * 292 + 'px',
					},
					onClick: function() {
						store.store.dispatch(store.doNav(require('./Editor'), {
							adeck: (props[uocard > 6999 ? 'B' : 'A'] || {}).deck,
							acard: Cards.Codes[uocard],
							ainfo: {},
							startempty: true,
						}));
					},
				}),
			);
			children.push(
				h(Components.Card, { x: 734, y: 8 + i * 292, code: uocard }),
			);
		}
	}
	return h(React.Fragment, null, ...children);
};

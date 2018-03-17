'use strict';
const etg = require('../etg'),
	mkAi = require('../mkAi'),
	sock = require('../sock'),
	Decks = require('../Decks.json'),
	RngMock = require('../RngMock'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	h = React.createElement;
function mkDaily(type) {
	if (type < 3) {
		return () => {
			const gamedata = mkAi.mkAi(type == 1 ? 0 : 2, type)();
			if (gamedata) {
				const dataNext =
					type == 1
						? {
								goldreward: 200,
								endurance: 2,
								cost: 0,
								daily: 1,
								cardreward: '',
								noheal: true,
							}
						: {
								goldreward: 500,
								endurance: 1,
								cost: 0,
								daily: 2,
								cardreward: '',
							};
				gamedata.game.addData(dataNext);
				gamedata.game.dataNext = dataNext;
			}
			mkAi.run(gamedata);
		};
	} else {
		return () => {
			const gamedata = mkAi.mkPremade(type == 3 ? 1 : 3, type)();
			if (gamedata) {
				gamedata.game.addonreward = type == 3 ? 90 : 200;
				sock.userExec('donedaily', { daily: type });
			}
			mkAi.run(gamedata);
		};
	}
}
module.exports = class Colosseum extends React.Component {
	render() {
		const magename = Decks.mage[sock.user.dailymage][0],
			dgname = Decks.demigod[sock.user.dailydg][0];
		const events = [
			'Novice Endurance Fight 3 Commoners in a row without healing in between. May try until you win.',
			'Expert Endurance: Fight 2 Champions in a row. May try until you win.',
			'Novice Duel: Fight ' + magename + '. Only one attempt allowed.',
			'Expert Duel: Fight ' + dgname + '. Only one attempt allowed.',
		];
		const children = [
			h(Components.ExitBtn, { x: 50, y: 50 }),
		];
		for (var i = 1; i < 5; i++) {
			const active = !(sock.user.daily & (1 << i));
			if (active) {
				children.push(
					h('input', {
						type: 'button',
						value: 'Fight!',
						style: {
							position: 'absolute',
							left: '50px',
							top: 100 + 30 * i + 'px',
						},
						onClick: mkDaily(i),
					}),
				);
			}
			children.push(
				<span style={{
					position: 'absolute',
					left: '130px',
					top: 100 + 30 * i + 'px',
				}}>
				{active ? events[i - 1]
					: i > 2 ?
						sock.user.daily & (i == 3 ? 1 : 32)
						? 'You defeated this already today.'
						: 'You failed this today. Better luck tomorrow!'
					: 'Completed.'}
				</span>
			);
		}
		if (sock.user.daily == 191) {
			children.push(
				h('input', {
					type: 'button',
					value: 'Nymph!',
					style: { position: 'absolute', left: '50px', top: '280px' },
					onClick: function() {
						const nymph = etg.NymphList[RngMock.upto(12) + 1];
						sock.userExec('donedaily', { daily: 6, c: nymph });
						store.store.dispatch(store.doNav(require('./MainMenu'), { nymph }));
					},
				}),
				<span style={{ position: 'absolute', left: '130px', top: '280px' }}>
					You successfully completed all tasks.
				</span>,
			);
		}
		return h(React.Fragment, null, ...children);
	}
};

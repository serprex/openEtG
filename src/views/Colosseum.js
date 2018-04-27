'use strict';
const etg = require('../etg'),
	mkAi = require('../mkAi'),
	sock = require('../sock'),
	Decks = require('../Decks.json'),
	RngMock = require('../RngMock'),
	Components = require('../Components'),
	store = require('../store'),
	{connect} = require('react-redux'),
	React = require('react');

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
module.exports = connect(({user})=>({user}))(function Colosseum(props) {
	const magename = Decks.mage[props.user.dailymage][0],
		dgname = Decks.demigod[props.user.dailydg][0];
	const events = [
		'Novice Endurance Fight 3 Commoners in a row without healing in between. May try until you win.',
		'Expert Endurance: Fight 2 Champions in a row. May try until you win.',
		'Novice Duel: Fight ' + magename + '. Only one attempt allowed.',
		'Expert Duel: Fight ' + dgname + '. Only one attempt allowed.',
	];
	const eventui = [];
	for (let i = 1; i < 5; i++) {
		const active = !(props.user.daily & (1 << i));
		eventui.push(<React.Fragment key={i}>
			{active &&
				<input type='button'
				value='Fight!'
				style={{
					position: 'absolute',
						left: '50px',
						top: 100 + 30 * i + 'px',
				}}
				onClick={mkDaily(i)}
				/>
			}
			<span style={{
				position: 'absolute',
					left: '130px',
					top: 100 + 30 * i + 'px',
			}}>
			{active ? events[i - 1]
				: i > 2 ?
				props.user.daily & (i == 3 ? 1 : 32)
				? 'You defeated this already today.'
				: 'You failed this today. Better luck tomorrow!'
				: 'Completed.'}
			</span>
			</React.Fragment>);
	}
	return <>
		<Components.ExitBtn x={50} y={50} />
		{eventui}
		{props.user.daily == 191 && <>
			<input type='button'
				value='Nymph!'
				style={{ position: 'absolute', left: '50px', top: '280px' }}
				onClick={() => {
					const nymph = etg.NymphList[RngMock.upto(12) + 1];
					sock.userExec('donedaily', { daily: 6, c: nymph });
					store.store.dispatch(store.doNav(require('./MainMenu'), { nymph }));
				}}
			/>
			<span style={{ position: 'absolute', left: '130px', top: '280px' }}>
				You successfully completed all tasks.
			</span>
		</>}
	</>;
});

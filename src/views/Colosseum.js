'use strict';
const etg = require('../etg'),
	mkAi = require('../mkAi'),
	sock = require('../sock'),
	Decks = require('../Decks.json'),
	RngMock = require('../RngMock'),
	Components = require('../Components'),
	store = require('../store'),
	{ connect } = require('react-redux'),
	React = require('react');

function mkDaily(type) {
	let game;
	if (type < 3) {
		game = mkAi.mkAi(type == 1 ? 0 : 2, type, data => {
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
							rematch: props =>
								!(props.user.daily & (1 << type)) && mkDaily(type),
							rematchFilter: props =>
								props.game.winner !== props.game.player1Id,
					  };
			dataNext.dataNext = dataNext;
			return Object.assign(data, dataNext);
		});
	} else {
		game = mkAi.mkPremade(type == 3 ? 1 : 3, type, data => {
			data.colobonus = type == 3 ? 4 : 1;
			data.rematch = undefined;
			sock.userExec('donedaily', { daily: type });
			return data;
		});
	}
	mkAi.run(game);
}
module.exports = connect(({ user }) => ({ user }))(function Colosseum({
	user,
}) {
	const magename = Decks.mage[user.dailymage][0],
		dgname = Decks.demigod[user.dailydg][0];
	const events = [
		'Novice Endurance Fight 3 Commoners in a row without healing in between. May try until you win.',
		'Expert Endurance: Fight 2 Champions in a row. May try until you win.',
		`Novice Duel: Fight ${magename}. Only one attempt allowed.`,
		`Expert Duel: Fight ${dgname}. Only one attempt allowed.`,
	];
	const eventui = [];
	for (let i = 1; i < 5; i++) {
		const active = !(user.daily & (1 << i));
		eventui.push(
			<React.Fragment key={i}>
				{active && (
					<input
						type="button"
						value="Fight!"
						style={{
							position: 'absolute',
							left: '50px',
							top: `${100 + 30 * i}px`,
						}}
						onClick={() => mkDaily(i)}
					/>
				)}
				<span
					style={{
						position: 'absolute',
						left: '130px',
						top: `${100 + 30 * i}px`,
					}}>
					{active
						? events[i - 1]
						: i > 2
						? user.daily & (i == 3 ? 1 : 32)
							? 'You defeated this already today.'
							: 'You failed this today. Better luck tomorrow!'
						: 'Completed.'}
				</span>
			</React.Fragment>,
		);
	}
	return (
		<>
			<Components.ExitBtn x={50} y={50} />
			{eventui}
			{user.daily == 191 ? (
				<>
					<input
						type="button"
						value="Nymph!"
						style={{ position: 'absolute', left: '50px', top: '280px' }}
						onClick={() => {
							const nymph = etg.NymphList[RngMock.upto(12) + 1];
							sock.userExec('donedaily', { daily: 6, c: nymph });
							store.store.dispatch(
								store.doNav(require('./MainMenu'), { nymph }),
							);
						}}
					/>
					<span style={{ position: 'absolute', left: '130px', top: '280px' }}>
						You successfully completed all tasks.
					</span>
				</>
			) : (
				typeof user.ostreak === 'number' && (
					<Components.Text
						style={{ position: 'absolute', left: '56px', top: '300px' }}
						text={
							'Completing any colosseum event contributes to a 5 day reward cycle.\n' +
							'At the end of the cycle, your streak is reset.\n\n' +
							`Reward Cycle: 15$, 25$, 77$, 100$, 250$\n\n${
								user.ostreak
									? `You currently have a ${user.ostreak} day colosseum streak.`
									: "You'ven't begun a streak."
							}\n${
								user.ostreakday
									? `You've redeemed ${
											[250, 15, 25, 77, 100][user.ostreak % 5]
									  }$ today.`
									: "You'ven't redeemed a colosseum streak today."
							}`
						}
					/>
				)
			)}
		</>
	);
});

import { connect } from 'react-redux';
import React from 'react';
import * as etg from '../etg.js';
import * as mkAi from '../mkAi.js';
import * as sock from '../sock.js';
import Decks from '../Decks.json';
import RngMock from '../RngMock.js';
import * as Components from '../Components/index.js';
import * as store from '../store.js';

function mkDaily(type) {
	let game;
	if (type < 3) {
		game = mkAi.mkAi(type == 1 ? 0 : 2, type, data => {
			const dataNext =
				type == 1
					? {
							goldreward: 200,
							endurance: 2,
							daily: 1,
							noheal: true,
					  }
					: {
							goldreward: 500,
							endurance: 1,
							daily: 2,
					  };
			dataNext.cost = 0;
			dataNext.cardreward = '';
			dataNext.rematch = props =>
				!(props.user.daily & (1 << type)) && mkDaily(type);
			dataNext.rematchFilter = (props, p1id) => props.game.winner !== p1id;
			dataNext.dataNext = dataNext;
			return Object.assign(data, dataNext);
		});
		if (!game) return;
	} else {
		game = mkAi.mkPremade(type == 3 ? 1 : 3, type, data => {
			data.daily = type;
			data.colobonus = type == 3 ? 4 : 1;
			data.rematch = undefined;
			return data;
		});
		if (!game) return;
		sock.userExec('donedaily', { daily: type });
	}
	mkAi.run(game);
}
export default connect(({ user }) => ({ user }))(function Colosseum({ user }) {
	const [magename, magedeck] = Decks.mage[user.dailymage],
		[dgname, dgdeck] = Decks.demigod[user.dailydg];
	const events = [
		'Novice Endurance Fight 3 Commoners in a row without healing in between. May try until you win.',
		'Expert Endurance: Fight 2 Champions in a row. May try until you win.',
		<>
			Novice Duel: Fight{' '}
			<a href={`/deck/${magedeck}`} target="_blank">
				{magename}
			</a>
			. Only one attempt allowed.
		</>,
		<>
			Expert Duel: Fight{' '}
			<a href={`/deck/${dgdeck}`} target="_blank">
				{dgname}
			</a>
			. Only one attempt allowed.
		</>,
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
						style={{
							position: 'absolute',
							left: '50px',
							top: '280px',
						}}
						onClick={() => {
							const nymph = etg.NymphList[RngMock.upto(12) + 1];
							sock.userExec('donedaily', { daily: 6, c: nymph });
							store.store.dispatch(
								store.doNav(import('./MainMenu.js'), { nymph }),
							);
						}}
					/>
					<span
						style={{
							position: 'absolute',
							left: '130px',
							top: '280px',
						}}>
						You successfully completed all tasks.
					</span>
				</>
			) : (
				typeof user.ostreak === 'number' && (
					<Components.Text
						style={{
							position: 'absolute',
							left: '56px',
							top: '300px',
						}}
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

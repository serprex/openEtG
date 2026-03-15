import { mkAi, mkPremade } from '../mkAi.js';
import * as sock from '../sock.jsx';
import Decks from '../Decks.json' with { type: 'json' };
import * as store from '../store.jsx';

const NymphList = new Uint16Array([
	0, 5120, 5220, 5320, 5420, 5520, 5620, 5720, 5820, 5920, 6020, 6120, 6220,
]);

function mkDaily(type) {
	let game;
	if (type < 3) {
		game = mkAi(type === 1 ? 0 : 2, type, data => {
			const dataNext =
				type === 1 ?
					{
						goldreward: 200,
						endurance: 2,
						daily: 1,
						noheal: true,
					}
				:	{
						goldreward: 500,
						endurance: 1,
						daily: 2,
					};
			dataNext.cost = 0;
			dataNext.rematch = () => {
				const { user } = store.state;
				return !(user.daily & (1 << type)) && mkDaily(type);
			};
			dataNext.rematchFilter = (game, p1id) => game.winner !== p1id;
			dataNext.dataNext = dataNext;
			if (store.hasflag('hardcore')) {
				dataNext.ante = ante;
				sock.userExec('rmcard', ante);
				const key = ante.bound ? 'cardreward' : 'poolreward';
				dataNext[key] = '01' + encodeCode(ante.c) + (dataNext[key] ?? '');
			}
			return Object.assign(data, dataNext);
		});
		if (!game) return;
	} else {
		game = mkPremade(type === 3 ? 1 : 3, type, data => {
			data.daily = type;
			data.colobonus = type === 3 ? 6 : 1;
			data.rematch = undefined;
			return data;
		});
		if (!game) return;
		sock.userExec('donedaily', { daily: type });
	}
	store.navGame(game);
}
export default function Colosseum() {
	const user = store.useRx(state => state.user);
	const [magename, magedeck] = Decks.mage[user.dailymage],
		[dgname, dgdeck] = Decks.demigod[user.dailydg];
	const events = [
		() =>
			'Novice Endurance\nFight 3 Commoners in a row without healing in between. May try until you win.',
		() =>
			'Expert Endurance\nFight 2 Champions in a row. May try until you win.',
		() => (
			<>
				Novice Duel{'\n'}Fight{' '}
				<a href={`/deck/${magedeck}`} target="_blank">
					{magename}
				</a>
				. Only one attempt allowed.
			</>
		),
		() => (
			<>
				Expert Duel{'\n'}Fight{' '}
				<a href={`/deck/${dgdeck}`} target="_blank">
					{dgname}
				</a>
				. Only one attempt allowed.
			</>
		),
	];
	return (
		<div style="margin-left:48px;height:600px;display:flex;flex-direction:column;justify-content:space-evenly">
			<input
				type="button"
				value="Exit"
				onClick={() => store.doNav(import('./MainMenu.jsx'))}
			/>
			{[1, 2, 3, 4].map(i => {
				const active = !(user.daily & (1 << i));
				return (
					<div style="margin-bottom:24px;min-height:36px;display:flex">
						<input
							type="button"
							value="Fight!"
							style={`margin-right:12px${active ? '' : ';visibility:hidden'}`}
							onClick={[mkDaily, i]}
						/>
						<div style="white-space:pre">
							{active ?
								events[i - 1]
							: i > 2 ?
								user.daily & (i === 3 ? 1 : 32) ?
									'You defeated this already today.'
								:	'You failed this today. Better luck tomorrow!'
							:	'Completed.'}
						</div>
					</div>
				);
			})}
			{user.daily === 191 ?
				<div>
					<input
						type="button"
						value="Nymph!"
						style="margin-right:12px"
						onClick={() => {
							const nymph = NymphList[(Math.random() * 12 + 1) | 0];
							sock.userExec('donedaily', { daily: 6, c: nymph });
							store.doNav(import('./MainMenu.jsx'), { nymph });
						}}
					/>
					You successfully completed all tasks.
				</div>
			:	<>
					<div>
						Completing any colosseum event earns 100 <span class="ico gold" />.
					</div>
					<div>
						{user.ostreak ?
							`You currently have a ${user.ostreak} day colosseum streak.`
						:	"You'ven't begun a streak."}
					</div>
					{user.ostreak && user.ostreakday ?
						<div>
							You've redeemed 100 <span ico="ico gold" /> today.
						</div>
					:	<div>You'ven't redeemed a colosseum streak today.</div>}
				</>
			}
		</div>
	);
}

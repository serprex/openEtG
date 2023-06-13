import { useMemo, useState } from 'react';

import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import * as userutil from '../userutil.js';
import * as Components from '../Components/index.jsx';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';

export default function Reward(props) {
	const reward = props.type;
	const rewardList = useMemo(() => {
		if (typeof reward === 'string') {
			const shiny = reward.charAt(0) === '!';
			if (shiny) reward = reward.slice(1);
			const upped = reward.slice(0, 5) === 'upped';
			const rarity = userutil.rewardwords[upped ? reward.slice(5) : reward];
			return Cards.filter(upped, x => x.rarity === rarity).map(
				card => card.asShiny(shiny).code,
			);
		} else if (reward instanceof Array) {
			return reward;
		} else {
			return null;
		}
	}, [reward]);
	const [chosenReward, setChosenReward] = useState(null);

	useEffect(() => {
		if (rewardList) {
			store.store.dispatch(
				store.setCmds({
					codedone: data => {
						const { user } = store.store.getState();
						store.store.dispatch(
							store.updateUser({
								pool: etgutil.addcard(user.pool, data.card),
							}),
						);
						store.store.dispatch(
							store.chatMsg(Cards.Codes[data.card].name + ' added!', 'System'),
						);
						store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
					},
				}),
			);
		} else {
			store.store.dispatch(store.chatMsg('Unknown reward ${reward}', 'System'));
			store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
		}
	}, [reward]);

	const numberofcopies = props.amount ?? 1,
		code = props.code;
	return (
		rewardList && (
			<>
				<input
					type="button"
					value="Done"
					onClick={() => {
						if (chosenReward) {
							if (code === undefined) {
								sock.userExec('addboundcards', {
									c:
										etgutil.encodeCount(numberofcopies) +
										chosenReward.toString(32),
								});
								store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
							} else {
								sock.userEmit('codesubmit2', {
									code: code,
									card: chosenReward,
								});
							}
						} else {
							store.store.dispatch(store.chatMsg('Choose a reward', 'System'));
						}
					}}
					style={{
						position: 'absolute',
						left: '10px',
						top: '40px',
					}}
				/>
				{numberofcopies > 1 && (
					<div
						style={{
							position: 'absolute',
							left: '20px',
							top: '100px',
						}}>
						You will get {numberofcopies} copies of the card you choose
					</div>
				)}
				{!!code && <Components.ExitBtn x={10} y={10} />}
				{rewardList.map((reward, i) => (
					<Components.CardImage
						key={i}
						style={{
							position: 'absolute',
							left: `${100 + ((i / 12) | 0) * 108}px`,
							top: `${272 + (i % 12) * 20}px`,
						}}
						card={Cards.Codes[reward]}
						onClick={() => setChosenReward(reward)}
					/>
				))}
				<Components.Card x={233} y={10} card={Cards.Codes[chosenReward]} />
			</>
		)
	);
}
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import Cards from '../Cards.js';
import Game from '../Game.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import { decklength, decodedeck, encodeCode, asUpped } from '../etgutil.js';
import { randint, shuffle } from '../util.js';
import * as Components from '../Components/index.jsx';

function RenderInfo(props) {
	const { info, y, name } = props;
	if (info) {
		const testDeck = () => {
			const deck = sock.getDeck();
			if (decklength(deck) < 9 || decklength(adeck) < 9) {
				store.store.dispatch(store.chatMsg('Deck too small'));
				return;
			}
			const game = new Game({
				seed: randint(),
				cardreward: '',
				rematch: testDeck,
				players: shuffle([
					{ idx: 1, name, user: name, deck },
					{
						idx: 2,
						ai: 1,
						name: 'Test',
						deck: adeck,
						hp: info.hp,
						markpower: info.mark,
						drawpower: info.draw,
					},
				]),
			});
			store.store.dispatch(store.doNav(import('./Match.jsx'), { game }));
		};
		const card = info.card && (y ? asUpped(info.card, true) : info.card);
		const adeck = card && '05' + encodeCode(card) + info.deck;
		return (
			<>
				{adeck && (
					<Components.DeckDisplay
						cards={Cards}
						deck={decodedeck(adeck)}
						renderMark
						y={y}
					/>
				)}
				<Components.Text
					style={{
						position: 'absolute',
						left: '100px',
						top: 4 + y + 'px',
					}}
					text={`W-L: ${info.win ?? 0} - ${info.loss ?? 0}, Rank: ${
						info.rank ?? 'Inactive'
					}, ${(info.win ?? 0) * 15 + (info.loss ?? 0) * 5}$`}
				/>
				<input
					readOnly
					style={{
						position: 'absolute',
						left: '330px',
						top: 4 + y + 'px',
						width: '190px',
					}}
					value={adeck ?? ''}
				/>
				<span
					style={{
						position: 'absolute',
						left: '600px',
						top: 4 + y + 'px',
					}}>
					Best Rank: {info.bestrank}
				</span>
				<span
					style={{
						position: 'absolute',
						left: '400px',
						top: 224 + y + 'px',
					}}>
					Age: {info.day}
				</span>
				<span
					style={{
						position: 'absolute',
						left: '100px',
						top: 224 + y + 'px',
					}}>
					HP: {info.hp}
				</span>
				<span
					style={{
						position: 'absolute',
						left: '200px',
						top: 224 + y + 'px',
					}}>
					Mark: {info.mark}
				</span>
				<span
					style={{
						position: 'absolute',
						left: '300px',
						top: 224 + y + 'px',
					}}>
					Draw: {info.draw}
				</span>
				<input
					type="button"
					value="Modify"
					style={{
						position: 'absolute',
						left: '500px',
						top: 224 + y + 'px',
					}}
					onClick={() => {
						store.store.dispatch(
							store.doNav(import('./ArenaEditor.jsx'), {
								adeck: info.deck,
								acard: Cards.Codes[card],
								ainfo: info,
							}),
						);
					}}
				/>
				{adeck && (
					<input
						type="button"
						value="Test"
						style={{
							position: 'absolute',
							left: '600px',
							top: 224 + y + 'px',
						}}
						onClick={testDeck}
					/>
				)}
			</>
		);
	} else {
		return null;
	}
}
function ArenaCard(props) {
	const { info, y, card } = props;
	return (
		<>
			<input
				type="button"
				value="Create"
				style={{
					position: 'absolute',
					left: '734px',
					top: 260 + y + 'px',
				}}
				onClick={() => {
					store.store.dispatch(
						store.doNav(import('./ArenaEditor.jsx'), {
							adeck: '',
							acard: card,
							ainfo: { day: info ? info.day : 0 },
							acreate: true,
						}),
					);
				}}
			/>
			<Components.Card x={734} y={y} card={card} />
		</>
	);
}

export default function ArenaInfo(props) {
	const uname = useSelector(({ user }) => user.name);
	const ocard = useSelector(({ user }) => user.ocard);
	const [{ A, B }, setAB] = useState({});
	useEffect(() => {
		store.store.dispatch(store.setCmds({ arenainfo: setAB }));
		sock.userEmit('arenainfo');
	}, []);

	return (
		<>
			<Components.Text
				style={{
					position: 'absolute',
					left: '96px',
					top: '560px',
				}}
				text={
					'Earn 5$ when your deck is faced, & 10$ more when it wins\nEarn 25$ per age of old deck when creating new deck, up to 350$'
				}
			/>
			<Components.ExitBtn x={8} y={300} />
			<RenderInfo info={A} y={0} name={props.name} />
			<RenderInfo info={B} y={300} name={props.name} />
			{!!ocard && (
				<>
					<ArenaCard info={A} y={8} card={Cards.Codes[asUpped(ocard, false)]} />
					<ArenaCard
						info={B}
						y={300}
						card={Cards.Codes[asUpped(ocard, true)]}
					/>
				</>
			)}
		</>
	);
}
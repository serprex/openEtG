import { createSignal, onMount } from 'solid-js';
import { Show } from 'solid-js/web';

import Cards from '../Cards.js';
import Game from '../Game.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import { decklength, decodedeck, encodeCode, asUpped } from '../etgutil.js';
import { randint, shuffle } from '../util.js';
import Card from '../Components/Card.jsx';
import DeckDisplay from '../Components/DeckDisplay.jsx';
import ExitBtn from '../Components/ExitBtn.jsx';
import Text from '../Components/Text.jsx';

function RenderInfo(props) {
	const testDeck = () => {
		const deck = sock.getDeck();
		if (decklength(deck) < 9 || decklength(adeck) < 9) {
			store.chatMsg('Deck too small');
			return;
		}
		const game = new Game({
			seed: randint(),
			cardreward: '',
			rematch: testDeck,
			players: shuffle([
				{ idx: 1, name: props.name, user: props.name, deck },
				{
					idx: 2,
					ai: 1,
					name: 'Test',
					deck: adeck,
					hp: props.info.hp,
					markpower: props.info.mark,
					drawpower: props.info.draw,
				},
			]),
		});
		store.doNav(import('./Match.jsx'), { game });
	};
	const card =
		props.info.card &&
		(props.y ? asUpped(props.info.card, true) : props.info.card);
	const adeck = card && '05' + encodeCode(card) + props.info.deck;
	return (
		<>
			{adeck && (
				<DeckDisplay
					cards={Cards}
					deck={decodedeck(adeck)}
					renderMark
					y={props.y}
				/>
			)}
			<Text
				style={`position:absolute;left:100px;top:${4 + props.y}px`}
				text={`W-L: ${props.info.win ?? 0} - ${props.info.loss ?? 0}, Rank: ${
					props.info.rank ?? 'Inactive'
				}, ${(props.info.win ?? 0) * 15 + (props.info.loss ?? 0) * 5}$`}
			/>
			<input
				readOnly
				style={`position:absolute;left:330px;top:${4 + props.y}px;width:190px`}
				onClick={e => e.target.setSelectionRange(0, 999)}
				value={adeck ?? ''}
			/>
			<span style={`position:absolute;left:600px;top:${4 + props.y}px`}>
				Best Rank: {props.info.bestrank}
			</span>
			<span style={`position:absolute;left:400px;top:${224 + props.y}px`}>
				Age: {props.info.day}
			</span>
			<span style={`position:absolute;left:100px;top:${224 + props.y}px`}>
				HP: {props.info.hp}
			</span>
			<span style={`position:absolute;left:200px;top:${224 + props.y}px`}>
				Mark: {props.info.mark}
			</span>
			<span style={`position:absolute;left:300px;top:${224 + props.y}px`}>
				Draw: {props.info.draw}
			</span>
			<input
				type="button"
				value="Modify"
				style={`position:absolute;left:500px;top:${224 + props.y}px`}
				onClick={() => {
					store.doNav(import('./ArenaEditor.jsx'), {
						adeck: props.info.deck,
						acard: Cards.Codes[card],
						ainfo: props.info,
					});
				}}
			/>
			{adeck && (
				<input
					type="button"
					value="Test"
					style={`position:absolute;left:600px;top:${224 + props.y}px`}
					onClick={testDeck}
				/>
			)}
		</>
	);
}
function ArenaCard(props) {
	return (
		<>
			<input
				type="button"
				value="Create"
				style={`position:absolute;left:734px;top:${260 + props.y}px`}
				onClick={() => {
					store.doNav(import('./ArenaEditor.jsx'), {
						adeck: '',
						acard: props.card,
						ainfo: { day: props.info?.day ?? 0 },
						acreate: true,
					});
				}}
			/>
			<Card x={734} y={props.y} card={props.card} />
		</>
	);
}

export default function ArenaInfo() {
	const user = store.useRx(state => state.user);
	const [AB, setAB] = createSignal({});
	onMount(() => {
		sock.setCmds({ arenainfo: setAB });
		sock.userEmit('arenainfo');
	});

	return (
		<>
			<Text
				style="position:absolute;left:96px;top:560px"
				text={
					'Earn 5$ when your deck is faced, & 10$ more when it wins\nEarn 25$ per age of old deck when creating new deck, up to 350$'
				}
			/>
			<ExitBtn x={8} y={300} />
			<Show when={AB().A}>
				<RenderInfo info={AB().A} y={0} name={user.name} />
			</Show>
			<Show when={AB().B}>
				<RenderInfo info={AB().B} y={300} name={user.name} />
			</Show>
			{!!user.ocard && (
				<>
					<ArenaCard
						info={AB().A}
						y={8}
						card={Cards.Codes[asUpped(user.ocard, false)]}
					/>
					<ArenaCard
						info={AB().B}
						y={300}
						card={Cards.Codes[asUpped(user.ocard, true)]}
					/>
				</>
			)}
		</>
	);
}

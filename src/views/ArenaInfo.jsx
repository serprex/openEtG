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

function RenderInfo(props) {
	const testDeck = () => {
		const deck = store.getDeck();
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
			<DeckDisplay
				cards={Cards}
				deck={decodedeck(adeck)}
				renderMark
				y={props.y}
			/>
			<div
				style={`position:absolute;left:100px;top:${
					4 + props.y
				}px;width:600px;display:flex;justify-content:space-between`}>
				<span>
					{props.info.win ?? 0}&ndash;{props.info.loss ?? 0}
				</span>
				<span>Rank: {props.info.rank ?? 'Inactive'}</span>
				<span>
					{(props.info.win ?? 0) * 15 + (props.info.loss ?? 0) * 5}{' '}
					<span class="ico gold" />
				</span>
				<input
					readOnly
					style="width:190px"
					onClick={e => e.target.setSelectionRange(0, 999)}
					value={adeck ?? ''}
				/>
				<span>Best Rank: {props.info.bestrank}</span>
			</div>
			<div
				style={`position:absolute;left:100px;top:${
					224 + props.y
				}px;width:600px;display:flex;justify-content:space-between`}>
				<span>HP: {props.info.hp}</span>
				<span>Mark: {props.info.mark}</span>
				<span>Draw: {props.info.draw}</span>
				<span>Age: {props.info.day}</span>
				<input
					type="button"
					value="Modify"
					onClick={() => {
						store.doNav(import('./ArenaEditor.jsx'), {
							adeck: props.info.deck,
							acard: Cards.Codes[card],
							ainfo: props.info,
						});
					}}
				/>
				<input type="button" value="Test" onClick={testDeck} />
			</div>
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
	const rx = store.useRx();
	const [AB, setAB] = createSignal({});
	onMount(() => {
		sock.setCmds({ arenainfo: setAB });
		sock.userEmit('arenainfo');
	});

	return (
		<>
			<div style="position:absolute;left:96px;top:560px">
				Earn 5<span class="ico gold" /> when your deck is faced, & 10
				<span class="ico gold" /> more when it wins
				<br />
				Earn 25
				<span class="ico gold" /> per age of old deck when creating new deck, up
				to 350
				<span class="ico gold" />
			</div>
			<ExitBtn x={8} y={300} />
			<Show when={AB().A}>
				{x => <RenderInfo info={x()} y={0} name={rx.username} />}
			</Show>
			<Show when={AB().B}>
				{x => <RenderInfo info={x()} y={300} name={rx.username} />}
			</Show>
			{!!rx.user.ocard && (
				<>
					<ArenaCard
						info={AB().A}
						y={8}
						card={Cards.Codes[asUpped(rx.user.ocard, false)]}
					/>
					<ArenaCard
						info={AB().B}
						y={300}
						card={Cards.Codes[asUpped(rx.user.ocard, true)]}
					/>
				</>
			)}
		</>
	);
}

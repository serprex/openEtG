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

function RenderInfo(props) {
	const [testPrecog, setTestPrecog] = createSignal(false);
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
		if (testPrecog()) game.enable_player_precog(game.userId(props.name));
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
				}px;width:620px;display:flex;justify-content:space-between`}>
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
				}px;width:620px;display:flex;justify-content:space-between`}>
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
				<div style="display:flex;width:108px;justify-content:space-between">
					<input type="button" value="Test" onClick={testDeck} />
					<input
						type="checkbox"
						title="Reveal AI's hand during game"
						checked={testPrecog()}
						onChange={e => setTestPrecog(e.target.checked)}
					/>
				</div>
			</div>
		</>
	);
}
function ArenaCard(props) {
	return (
		<>
			<Card card={props.card} />
			<input
				type="button"
				value="Create"
				onClick={() => {
					store.doNav(import('./ArenaEditor.jsx'), {
						adeck: '',
						acard: props.card,
						ainfo: { day: props.info?.day ?? 0 },
						acreate: true,
					});
				}}
			/>
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
			<input
				type="button"
				value="Exit"
				onClick={() => store.doNav(import('./MainMenu.jsx'))}
				style="position:absolute;left:8px;top:300px"
			/>
			<Show when={AB().A}>
				{x => <RenderInfo info={x()} y={0} name={rx.username} />}
			</Show>
			<Show when={AB().B}>
				{x => <RenderInfo info={x()} y={300} name={rx.username} />}
			</Show>
			{!!rx.user.ocard && (
				<div style="position:absolute;left:734px;height:600px;display:flex;flex-direction:column;justify-content:space-evenly">
					{['A', 'B'].map(key => (
						<ArenaCard
							info={AB()[key]}
							card={Cards.Codes[asUpped(rx.user.ocard, key === 'B')]}
						/>
					))}
				</div>
			)}
		</>
	);
}

import { useState, Component } from 'react';
import { connect } from 'react-redux';

import * as sock from '../sock.jsx';
import Cards from '../Cards.js';
import { choose, parseInput, randint, shuffle } from '../util.js';
import Game from '../Game.js';
import * as etgutil from '../etgutil.js';
import * as Components from '../Components/index.jsx';
import * as store from '../store.jsx';
import aiDecks from '../Decks.json' assert { type: 'json' };
import deckgen from '../deckgen.js';

const { mage, demigod } = aiDecks;
function PremadePicker({ onClick, onClose }) {
	const [search, setSearch] = useState('');

	const searchex = new RegExp(search, 'i');
	return (
		<div
			className="bgbox"
			style={{
				position: 'absolute',
				zIndex: '10',
				left: '75px',
				top: '100px',
				height: '400px',
				width: '750px',
				overflow: 'auto',
			}}>
			<input
				style={{ display: 'block' }}
				placeholder="Search"
				value={search}
				onChange={e => setSearch(e.target.value)}
			/>
			<input
				className="floatRight"
				type="button"
				value="Close"
				onClick={onClose}
			/>
			<div
				style={{
					display: 'inline-block',
					width: '33%',
					verticalAlign: 'top',
				}}>
				{mage
					.filter(x => searchex.test(x[0]))
					.map(([name, deck]) => (
						<div key={name} onClick={() => onClick(name, deck, false)}>
							{name}
						</div>
					))}
			</div>
			<div
				style={{
					display: 'inline-block',
					width: '33%',
					verticalAlign: 'top',
				}}>
				{demigod
					.filter(x => searchex.test(x[0]))
					.map(([name, deck]) => (
						<div key={name} onClick={() => onClick(name, deck, true)}>
							{name}
						</div>
					))}
			</div>
		</div>
	);
}

function PlayerEditor(props) {
	const [deckgen, setdeckgen] = useState(props.player.deckgen ?? '');
	const [deck, setdeck] = useState(props.player.deck ?? '');
	const [name, setname] = useState(props.player.name ?? '');
	const [hp, sethp] = useState(props.player.hp ?? '');
	const [mark, setmark] = useState(props.player.markpower ?? '');
	const [draw, setdraw] = useState(props.player.drawpower ?? '');
	const [deckpower, setdrawpower] = useState(props.player.deckpower ?? '');
	const [premade, setpremade] = useState(false);
	const [rnguprate, setrnguprate] = useState(0);
	const [rngmaxrare, setrngmaxrare] = useState(9);

	return (
		<div>
			<div>
				<input
					placeholder="HP"
					className="numput"
					value={hp}
					onChange={e => sethp(e.target.value)}
				/>
				<input
					placeholder="Mark"
					className="numput"
					value={mark}
					onChange={e => setmark(e.target.value)}
				/>
				<input
					placeholder="Draw"
					className="numput"
					value={draw}
					onChange={e => setdraw(e.target.value)}
				/>
				<input
					placeholder="Deck"
					className="numput"
					value={deckpower}
					onChange={e => setdeckpower(e.target.value)}
				/>
				&emsp;
				<input
					type="button"
					value="Ok"
					onClick={() => {
						const data = {};
						parseInput(data, 'hp', hp);
						parseInput(data, 'markpower', mark, 1188);
						parseInput(data, 'drawpower', draw, 8);
						parseInput(data, 'deckpower', deckpower);
						let newdeck;
						switch (deckgen) {
							case 'mage':
							case 'demigod':
								[data.name, deck] = choose(aiDecks[deckgen]);
								newdeck = Promise.resolve(deck);
								break;
							case 'rng':
								newdeck = deckgen(
									rnguprate * 100,
									data.markpower,
									rngmaxrare | 0,
								);
								break;
							default:
								newdeck = Promise.resolve(deck);
						}
						if (name) data.name = name;
						newdeck.then(x => {
							data.deck = x;
							props.updatePlayer(data);
						});
					}}
				/>
			</div>
			<div>
				Deck:{' '}
				<select value={deckgen} onChange={e => setdeckgen(e.target.value)}>
					<option value="">Explicit</option>
					<option value="mage">Random Mage</option>
					<option value="demigod">Random Demigod</option>
					<option value="rng">Random</option>
				</select>
			</div>
			{deckgen === '' && (
				<div>
					<input
						placeholder="Deck"
						value={deck}
						onChange={e => setdeck(e.target.value)}
					/>
					&emsp;
					<input
						type="button"
						value="Premade"
						onClick={() => setpremade(true)}
					/>
				</div>
			)}
			{deckgen === 'rng' && (
				<div>
					<input
						placeholder="Upgrade %"
						value={rnguprate}
						onChange={e => setrnguprate(e.target.value)}
					/>
					&emsp;
					<input
						placeholder="Max Rarity"
						value={rngmaxrare}
						onChange={e => setrngmaxrare(e.target.value)}
					/>
				</div>
			)}
			<div>
				<input
					placeholder="Name"
					value={name}
					onChange={e => setname(e.target.value)}
				/>
			</div>
			{premade && (
				<PremadePicker
					onClose={() => setpremade(false)}
					onClick={(name, deck, isdg) => {
						setpremade(false);
						setname(name);
						setdeck(deck);
						if (isdg) {
							sethp(200);
							setdraw(2);
							setmark(3);
						} else {
							sethp(125);
						}
					}}
				/>
			)}
		</div>
	);
}

function Group(props) {
	return (
		<div className="bgbox" style={{ width: '300px', marginBottom: '8px' }}>
			{props.players.map((pl, i) => (
				<div key={pl.idx} style={{ minHeight: '24px' }}>
					<span onClick={() => this.props.toggleEditing(pl.idx)}>
						{pl.name || ''} <i>{pl.user || 'AI'}</i>
						{pl.pending === 2 && '...'}
					</span>
					{props.addEditing && pl.user !== props.host && (
						<input
							type="button"
							value="-"
							className="editbtn"
							style={{ float: 'right' }}
							onClick={() => {
								const players = props.players.slice(),
									[pl] = players.splice(i, 1);
								props.updatePlayers(players);
								props.removeEditing(pl.idx);
							}}
						/>
					)}
					{props.editing.has(pl.idx) && (
						<PlayerEditor
							player={pl}
							updatePlayer={pl => {
								const players = props.players.slice(),
									{ idx } = players[i];
								players[i] = { ...props.players[i], ...pl };
								props.updatePlayers(players);
								props.removeEditing(idx);
							}}
						/>
					)}
				</div>
			))}
			{props.addEditing && (
				<div>
					<input
						type="button"
						value="+Player"
						onClick={() => {
							const idx = props.getNextIdx();
							props.updatePlayers(props.players.concat([{ idx }]));
							props.addEditing(idx);
						}}
					/>
					{props.removeGroup && (
						<input
							type="button"
							value="-"
							className="editbtn"
							style={{ float: 'right' }}
							onClick={props.removeGroup}
						/>
					)}
				</div>
			)}
		</div>
	);
}

export default connect(({ user, opts }) => ({
	username: user.name,
}))(
	class Challenge extends Component {
		constructor(props) {
			super(props);

			this.nextIdx = 2;
			this.state = {
				groups: props.groups || [
					[{ user: props.username, idx: 1, pending: 1 }],
					[],
				],
				set: props.set || '',
				editing: [new Set(), new Set()],
				replay: '',
				mydeck: sock.getDeck(),
			};
		}

		getNextIdx = () => this.nextIdx++;

		playersAsData = deck => {
			const players = [];
			let idx = 1;
			for (const group of this.state.groups) {
				if (!group.length) continue;
				const leader = idx;
				for (const player of group) {
					const data = {
						idx: idx++,
						name: player.name,
						user: player.user,
						leader: leader,
						hp: player.hp,
						deck: player.deck || deck,
						markpower: player.markpower,
						deckpower: player.deckpower,
						drawpower: player.drawpower,
					};
					if (!player.user) data.ai = 1;
					players.push(data);
				}
			}
			return players;
		};
		allReady = () => this.state.groups.every(g => g.every(p => !p.pending));

		aiClick = () => {
			const deck = this.state.groups[0][0].deck || this.state.mydeck;
			if (etgutil.decklength(deck) < 9) {
				this.props.dispatch(store.doNav(import('./DeckEditor.jsx')));
				return;
			}
			const gameData = {
				seed: randint(),
				cardreward: '',
				rematch: this.aiClick,
				players: this.playersAsData(deck),
			};
			shuffle(gameData.players);
			const game = new Game(gameData);
			this.props.dispatch(store.doNav(import('./Match.jsx'), { game }));
		};

		replayClick = () => {
			let replay;
			try {
				replay = JSON.parse(this.state.replay);
				if (!replay || typeof replay !== 'object') {
					return console.log('Invalid object');
				}
				if (!Array.isArray(replay.players)) {
					return console.log('Replay players are not an array');
				}
				if (!Array.isArray(replay.moves)) {
					return console.log('Replay moves are not an array');
				}
			} catch {
				return console.log('Invalid JSON');
			}
			const game = new Game({
				seed: replay.seed,
				set: replay.set,
				cardreward: '',
				goldreward: 0,
				players: replay.players,
			});
			this.props.dispatch(
				store.doNav(import('./Match.jsx'), {
					replay,
					game,
				}),
			);
		};

		exitClick = () => {
			this.toMainMenu();
		};

		toMainMenu = () =>
			this.props.dispatch(store.doNav(import('./MainMenu.jsx')));

		addGroup = () => {
			this.setState(state => ({
				groups: state.groups.concat([[]]),
				editing: state.editing.concat([new Set()]),
			}));
		};

		updatePlayers = (i, p) =>
			this.setState(state => {
				const newgroups = state.groups.slice();
				newgroups[i] = p;
				return { groups: newgroups };
			});

		removeGroup = i => {
			this.setState(state => {
				const newgroups = state.groups.slice(),
					newediting = state.editing.slice();
				newgroups.splice(i, 1);
				newediting.splice(i, 1);
				return { groups: newgroups, editing: newediting };
			});
		};

		loadMyData = () => {
			for (const group of this.state.groups) {
				for (const player of group) {
					if (player.user === this.props.username) {
						return player;
					}
				}
			}
			return null;
		};

		isMultiplayer = () =>
			this.state.groups.some(g =>
				g.some(p => p.user && p.user !== this.props.username),
			);

		render() {
			const mydata = this.loadMyData(),
				amhost = this.props.username === this.state.groups[0][0].user,
				isMultiplayer = this.isMultiplayer(),
				allReady = amhost && (!isMultiplayer || this.allReady());
			return (
				<>
					<div
						style={{
							position: 'absolute',
							left: '320px',
							top: '200px',
						}}>
						Warning: Lobby feature is still in development
					</div>
					{mydata?.deck && 'You have been assigned a deck'}
					<input
						value={this.state.mydeck}
						onChange={e => this.setState({ mydeck: e.target.value })}
						style={{
							position: 'absolute',
							left: '306px',
							top: '380px',
						}}
					/>
					<Components.DeckDisplay
						cards={Cards}
						x={206}
						y={377}
						deck={
							(mydata && mydata.deck) || etgutil.decodedeck(this.state.mydeck)
						}
						renderMark
					/>
					<input
						type="button"
						value="Replay"
						onClick={this.replayClick}
						style={{
							position: 'absolute',
							left: '540px',
							top: '8px',
						}}
					/>
					<textarea
						className="chatinput"
						placeholder="Replay"
						value={this.state.replay || ''}
						onChange={e => this.setState({ replay: e.target.value })}
						style={{
							position: 'absolute',
							left: '540px',
							top: '32px',
						}}
					/>
					{this.state.groups.map((players, i) => (
						<Group
							key={i}
							players={players}
							host={this.props.username}
							hasUserAsPlayer={name =>
								this.state.groups.some(g => g.some(p => p.user === name))
							}
							updatePlayers={p => this.updatePlayers(i, p)}
							removeGroup={i > 0 && (() => this.removeGroup(i))}
							getNextIdx={this.getNextIdx}
							editing={this.state.editing[i]}
							addEditing={
								amhost &&
								(idx =>
									this.setState(state => {
										const newediting = state.editing.slice();
										newediting[i] = new Set(newediting[i]).add(idx);
										return { editing: newediting };
									}))
							}
							toggleEditing={idx =>
								this.setState(state => {
									const newediting = state.editing.slice();
									newediting[i] = new Set(newediting[i]);
									if (newediting[i].has(idx)) {
										newediting[i].delete(idx);
									} else {
										newediting[i].add(idx);
									}
									return { editing: newediting };
								})
							}
							removeEditing={idx =>
								this.setState(state => {
									const newediting = state.editing.slice();
									newediting[i] = new Set(newediting[i]);
									newediting[i].delete(idx);
									return { editing: newediting };
								})
							}
						/>
					))}
					<div style={{ width: '300px' }}>
						{amhost && (
							<input type="button" value="+Group" onClick={this.addGroup} />
						)}
						{allReady
							? this.state.groups.length > 1 &&
							  this.state.groups.every(x => x.length) &&
							  this.state.editing.every(x => !x.size) && (
									<input
										style={{ float: 'right' }}
										type="button"
										value="Start"
										onClick={() => this.aiClick()}
									/>
							  )
							: null}
					</div>
					<input
						style={{
							position: 'absolute',
							left: '800px',
							top: '8px',
						}}
						type="button"
						value="Exit"
						onClick={this.exitClick}
					/>
				</>
			);
		}
	},
);
import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

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
					<span onClick={() => props.toggleEditing(pl.idx)}>
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

function toMainMenu() {
	store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
}

export default function Challenge(props) {
	const username = useSelector(({ user }) => user.name),
		nextIdx = useRef(2);

	const [groups, setGroups] = useState(
		() => props.groups ?? [[{ user: username, idx: 1, pending: 1 }], []],
	);
	const [set, setSet] = useState(props.set ?? '');
	const [editing, setEditing] = useState(() => [new Set(), new Set()]);
	const [replay, setReplay] = useState('');
	const [mydeck, setMyDeck] = useState(() => sock.getDeck());

	const getNextIdx = useCallback(() => nextIdx.current++, []);

	const playersAsData = deck => {
		const players = [];
		let idx = 1;
		for (const group of groups) {
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
	const aiClick = () => {
		const deck = groups[0][0].deck || mydeck;
		if (etgutil.decklength(deck) < 9) {
			store.store.dispatch(store.doNav(import('./DeckEditor.jsx')));
			return;
		}
		const gameData = {
			seed: randint(),
			cardreward: '',
			rematch: aiClick,
			players: playersAsData(deck),
		};
		shuffle(gameData.players);
		const game = new Game(gameData);
		store.store.dispatch(store.doNav(import('./Match.jsx'), { game }));
	};

	const replayClick = () => {
		let play;
		try {
			play = JSON.parse(replay);
			if (!play || typeof play !== 'object') {
				return console.log('Invalid object');
			}
			if (!Array.isArray(play.players)) {
				return console.log('Replay players are not an array');
			}
			if (!Array.isArray(play.moves)) {
				return console.log('Replay moves are not an array');
			}
		} catch {
			return console.log('Invalid JSON');
		}
		const game = new Game({
			seed: play.seed,
			set: play.set,
			cardreward: '',
			goldreward: 0,
			players: play.players,
		});
		store.store.dispatch(
			store.doNav(import('./Match.jsx'), {
				replay: play,
				game,
			}),
		);
	};

	const addGroup = () => {
		setGroups(groups => groups.concat([[]]));
		setEditing(editing => editing.concat([new Set()]));
	};

	const updatePlayers = (i, p) =>
		setGroups(groups => {
			const newgroups = groups.slice();
			newgroups[i] = p;
			return newgroups;
		});

	const removeGroup = i => {
		setGroups(groups => {
			const newgroups = groups.slice();
			newgroups.splice(i, 1);
			return newgroups;
		});
		setEditing(editing => {
			const newediting = editing.slice();
			newediting.splice(i, 1);
			return newediting;
		});
	};

	const loadMyData = () => {
		for (const group of groups) {
			for (const player of group) {
				if (player.user === username) {
					return player;
				}
			}
		}
		return null;
	};

	const mydata = loadMyData(),
		amhost = username === groups[0][0].user;
	const isMultiplayer = groups.some(g =>
		g.some(p => p.user && p.user !== username),
	);
	const allReady =
		amhost && (!isMultiplayer || groups.every(g => g.every(p => !p.pending)));

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
				value={mydeck}
				onChange={e => setMyDeck(e.target.value)}
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
				deck={(mydata && mydata.deck) || etgutil.decodedeck(mydeck)}
				renderMark
			/>
			<input
				type="button"
				value="Replay"
				onClick={replayClick}
				style={{
					position: 'absolute',
					left: '540px',
					top: '8px',
				}}
			/>
			<textarea
				className="chatinput"
				placeholder="Replay"
				value={replay || ''}
				onChange={e => setReplay(e.target.value)}
				style={{
					position: 'absolute',
					left: '540px',
					top: '32px',
				}}
			/>
			{groups.map((players, i) => (
				<Group
					key={i}
					players={players}
					host={username}
					hasUserAsPlayer={name =>
						groups.some(g => g.some(p => p.user === name))
					}
					updatePlayers={p => updatePlayers(i, p)}
					removeGroup={i > 0 && (() => removeGroup(i))}
					getNextIdx={getNextIdx}
					editing={editing[i]}
					addEditing={
						amhost &&
						(idx =>
							setEditing(state => {
								const newediting = editing.slice();
								newediting[i] = new Set(newediting[i]).add(idx);
								return newediting;
							}))
					}
					toggleEditing={idx =>
						setEditing(state => {
							const newediting = editing.slice();
							newediting[i] = new Set(newediting[i]);
							if (newediting[i].has(idx)) {
								newediting[i].delete(idx);
							} else {
								newediting[i].add(idx);
							}
							return newediting;
						})
					}
					removeEditing={idx =>
						setEditing(editing => {
							const newediting = editing.slice();
							newediting[i] = new Set(newediting[i]);
							newediting[i].delete(idx);
							return newediting;
						})
					}
				/>
			))}
			<div style={{ width: '300px' }}>
				{amhost && <input type="button" value="+Group" onClick={addGroup} />}
				{allReady
					? groups.length > 1 &&
					  groups.every(x => x.length) &&
					  editing.every(x => !x.size) && (
							<input
								style={{ float: 'right' }}
								type="button"
								value="Start"
								onClick={() => aiClick()}
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
				onClick={toMainMenu}
			/>
		</>
	);
}
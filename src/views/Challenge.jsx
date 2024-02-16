import { createMemo, createSignal } from 'solid-js';

import Cards from '../Cards.js';
import { choose, randint, shuffle } from '../util.js';
import Game from '../Game.js';
import * as etgutil from '../etgutil.js';
import DeckDisplay from '../Components/DeckDisplay.jsx';
import * as store from '../store.jsx';
import aiDecks from '../Decks.json' assert { type: 'json' };
import { deckgen } from '../deckgen.js';

const { mage, demigod } = aiDecks;
function PremadePicker({ onClick, onClose }) {
	const [search, setSearch] = createSignal('');
	const searchex = createMemo(() => new RegExp(search(), 'i'));
	return (
		<div
			class="bgbox"
			style="position:absolute;z-index:10;left:75px;top:100px;height:400px;width:750px;overflow:auto">
			<input
				style="display:block"
				placeholder="Search"
				value={search()}
				onInput={e => setSearch(e.target.value)}
			/>
			<input class="floatRight" type="button" value="Close" onClick={onClose} />
			<div style="display:inline-block;width:33%;vertical-align:top">
				<For each={mage.filter(x => searchex().test(x[0]))}>
					{([name, deck]) => (
						<div onClick={() => onClick(name, deck, false)}>{name}</div>
					)}
				</For>
			</div>
			<div style="display:inline-block;width:33%;vertical-align:top">
				<For each={demigod.filter(x => searchex().test(x[0]))}>
					{([name, deck]) => (
						<div onClick={() => onClick(name, deck, true)}>{name}</div>
					)}
				</For>
			</div>
		</div>
	);
}

function PlayerEditor(props) {
	const [pdeckgen, setdeckgen] = createSignal(props.player.deckgen ?? '');
	const [premade, setpremade] = createSignal(false);
	let hp, mark, draw, deck, deckpower, name, rnguprate, rngmaxrare;

	return (
		<div>
			<div>
				<input placeholder="HP" class="numput" max="500" ref={hp} />
				<input placeholder="Mark" class="numput" max="1188" ref={mark} />
				<input placeholder="Draw" class="numput" max="8" ref={draw} />
				<input placeholder="Deck" class="numput" ref={deckpower} />
				&emsp;
				<input
					type="button"
					value="Ok"
					onClick={() => {
						const data = {};
						if (hp.value && !Number.isNaN(+hp.value)) data.hp = hp.value | 0;
						if (mark.value && !Number.isNaN(+mark.value))
							data.markpower = mark.value | 0;
						if (draw.value && !Number.isNaN(+draw.value))
							data.drawpower = draw.value | 0;
						if (deckpower.value && !Number.isNaN(+deckpower))
							data.deckpower = deckpower.value | 0;
						let newdeck;
						switch (pdeckgen()) {
							case 'mage':
							case 'demigod':
								[data.name, newdeck] = choose(aiDecks[pdeckgen()]);
								newdeck = Promise.resolve(newdeck);
								break;
							case 'rng':
								[data.name, newdeck] = deckgen(
									(rnguprate.value * 100) | 0,
									data.markpower,
									rngmaxrare.value | 0,
								);
								break;
							default:
								newdeck = Promise.resolve(deck.value);
						}
						if (name.value) data.name = name.value;
						newdeck.then(x => {
							data.deck = x;
							props.updatePlayer(data);
						});
					}}
				/>
			</div>
			<div>
				Deck:{' '}
				<select value={pdeckgen()} onChange={e => setdeckgen(e.target.value)}>
					<option value="">Explicit</option>
					<option value="mage">Random Mage</option>
					<option value="demigod">Random Demigod</option>
					<option value="rng">Random</option>
				</select>
			</div>
			{pdeckgen() === '' && (
				<div>
					<input placeholder="Deck" ref={deck} />
					&emsp;
					<input
						type="button"
						value="Premade"
						onClick={() => setpremade(true)}
					/>
				</div>
			)}
			{pdeckgen() === 'rng' && (
				<div>
					<input placeholder="Upgrade %" ref={rnguprate} />
					&emsp;
					<input placeholder="Max Rarity" ref={rngmaxrare} value="9" />
				</div>
			)}
			<div>
				<input placeholder="Name" ref={name} />
			</div>
			{premade() && (
				<PremadePicker
					onClose={() => setpremade(false)}
					onClick={(dname, dcode, isdg) => {
						setpremade(false);
						name.value = dname;
						deck.value = dcode;
						draw.value = '';
						if (isdg) {
							hp.value = 200;
							draw.value = 2;
							mark.value = 3;
						} else {
							hp.value = 125;
							draw.value = '';
							mark.value = '';
						}
					}}
				/>
			)}
		</div>
	);
}

function Group(props) {
	return (
		<div class="bgbox" style="width:300px;margin-bottom:8px">
			<For each={props.players}>
				{(pl, i) => (
					<div style="min-height:24px">
						<span onClick={() => props.toggleEditing(pl.idx)}>
							{pl.name || ''} <i>{pl.user || 'AI'}</i>
							{pl.pending === 2 && '...'}
						</span>
						{props.addEditing && pl.user !== props.host && (
							<input
								type="button"
								value="-"
								class="editbtn"
								style="float:right"
								onClick={() => {
									const players = props.players.slice(),
										[pl] = players.splice(i(), 1);
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
										{ idx } = players[i()];
									players[i()] = { ...props.players[i()], ...pl };
									props.updatePlayers(players);
									props.removeEditing(idx);
								}}
							/>
						)}
					</div>
				)}
			</For>
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
							class="editbtn"
							style="float:right"
							onClick={props.removeGroup}
						/>
					)}
				</div>
			)}
		</div>
	);
}

function toMainMenu() {
	store.doNav(import('./MainMenu.jsx'));
}

export default function Challenge(props) {
	const rx = store.useRx();

	const [groups, setGroups] = createSignal(
		props.groups ?? [
			[{ user: rx.username, name: rx.username, idx: 1, pending: 1 }],
			[],
		],
	);
	const [editing, setEditing] = createSignal([new Set(), new Set()]);
	const [replay, setReplay] = createSignal('');
	const [mydeck, setMyDeck] = createSignal(store.getDeck());

	let nextIdx = 2;
	const getNextIdx = () => nextIdx++;

	const playersAsData = deck => {
		const players = [];
		let idx = 1;
		for (const group of groups()) {
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
		const deck = groups()[0][0].deck || mydeck();
		if (etgutil.decklength(deck) < 9) {
			store.doNav(import('./DeckEditor.jsx'));
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
		store.doNav(import('./Match.jsx'), { game });
	};

	const replayClick = () => {
		let play;
		try {
			play = JSON.parse(replay());
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
		store.doNav(import('./Match.jsx'), {
			replay: play,
			game,
		});
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

	const mydata = createMemo(() => {
		for (const group of groups()) {
			for (const player of group) {
				if (player.user === rx.username) {
					return player;
				}
			}
		}
		return null;
	});

	const amhost = () => rx.username === groups()[0][0].user;
	const isMultiplayer = () =>
		groups().some(g => g.some(p => p.user && p.user !== rx.username));
	const allReady = () =>
		amhost() &&
		(!isMultiplayer() || groups().every(g => g.every(p => !p.pending)));

	return (
		<>
			<div style="position:absolute;left:320px;top:200px">
				Warning: Lobby feature is still in development
			</div>
			{mydata()?.deck && 'You have been assigned a deck'}
			<input
				value={mydeck()}
				onChange={e => setMyDeck(e.target.value)}
				style="position:absolute;left:306px;top:380px"
			/>
			<DeckDisplay
				cards={Cards}
				x={206}
				y={377}
				deck={mydata()?.deck || etgutil.decodedeck(mydeck())}
				renderMark
			/>
			<input
				type="button"
				value="Replay"
				onClick={replayClick}
				style="position:absolute;left:540px;top:8px"
			/>
			<textarea
				class="chatinput"
				placeholder="Replay"
				value={replay()}
				onChange={e => setReplay(e.target.value)}
				style="position:absolute;left:540px;top:32px;width:350px"
			/>
			<For each={groups()}>
				{(players, i) => (
					<Group
						players={players}
						host={rx.username}
						hasUserAsPlayer={name =>
							groups().some(g => g.some(p => p.user === name))
						}
						updatePlayers={p => updatePlayers(i(), p)}
						removeGroup={i() > 0 && (() => removeGroup(i()))}
						getNextIdx={getNextIdx}
						editing={editing()[i()]}
						addEditing={
							amhost() &&
							(idx =>
								setEditing(editing => {
									const newediting = editing.slice();
									newediting[i()] = new Set(newediting[i()]).add(idx);
									return newediting;
								}))
						}
						toggleEditing={idx =>
							setEditing(editing => {
								const newediting = editing.slice();
								newediting[i()] = new Set(newediting[i()]);
								if (newediting[i()].has(idx)) {
									newediting[i()].delete(idx);
								} else {
									newediting[i()].add(idx);
								}
								return newediting;
							})
						}
						removeEditing={idx =>
							setEditing(editing => {
								const newediting = editing.slice();
								newediting[i()] = new Set(newediting[i()]);
								newediting[i()].delete(idx);
								return newediting;
							})
						}
					/>
				)}
			</For>
			<div style="width:300px">
				{amhost() && <input type="button" value="+Group" onClick={addGroup} />}
				{allReady() &&
					groups().length > 1 &&
					groups().every(x => x.length) &&
					editing().every(x => !x.size) && (
						<input
							style="float:right"
							type="button"
							value="Start"
							onClick={() => aiClick()}
						/>
					)}
			</div>
			<input
				style="position:absolute;left:800px;top:8px"
				type="button"
				value="Exit"
				onClick={toMainMenu}
			/>
		</>
	);
}

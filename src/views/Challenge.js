import React from 'react';
import { connect } from 'react-redux';

import * as sock from '../sock.js';
import { parseInput, randint } from '../util.js';
import Game from '../Game.js';
import * as etgutil from '../etgutil.js';
import * as Components from '../Components/index.js';
import * as store from '../store.js';
import RngMock from '../RngMock.js';
import aiDecks from '../Decks.json';
import deckgen from '../deckgen/index.js';

class PremadePicker extends React.Component {
	constructor(props) {
		super(props);
		this.state = { search: '' };
	}

	render() {
		const { onClick, onClose } = this.props;
		const { mage, demigod, falsegod } = aiDecks;
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
					value={this.state.search}
					onChange={e => this.setState({ search: e.target.value })}
				/>
				<input
					className="floatRight"
					type="button"
					value="Close"
					onChange={onClose}
				/>
				<div
					style={{
						display: 'inline-block',
						width: '33%',
						verticalAlign: 'top',
					}}>
					{mage
						.filter(x => !this.state.search || ~x[0].indexOf(this.state.search))
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
						.filter(x => !this.state.search || ~x[0].indexOf(this.state.search))
						.map(([name, deck]) => (
							<div key={name} onClick={() => onClick(name, deck, true)}>
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
					{falsegod
						.filter(x => !this.state.search || ~x[0].indexOf(this.state.search))
						.map(([name, deck]) => (
							<div key={name} onClick={() => onClick(name, deck, true)}>
								{name}
							</div>
						))}
				</div>
			</div>
		);
	}
}

class PlayerEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			deckgen: props.player.deckgen || '',
			deck: props.player.deck || '',
			name: props.player.name || '',
			hp: props.player.hp || '',
			mark: props.player.markpower || '',
			draw: props.player.drawpower || '',
			deckpower: props.player.deckpower || '',
			premade: false,
		};
	}

	render() {
		const { props, state } = this;
		return (
			<div>
				<div>
					<input
						placeholder="HP"
						className="numput"
						value={state.hp}
						onChange={e => this.setState({ hp: e.target.value })}
					/>
					<input
						placeholder="Mark"
						className="numput"
						value={state.mark}
						onChange={e => this.setState({ mark: e.target.value })}
					/>
					<input
						placeholder="Draw"
						className="numput"
						value={state.draw}
						onChange={e => this.setState({ draw: e.target.value })}
					/>
					<input
						placeholder="Deck"
						className="numput"
						value={state.deckpower}
						onChange={e => this.setState({ deckpower: e.target.value })}
					/>
					&emsp;
					<input
						type="button"
						value="Ok"
						onClick={() => {
							const data = {};
							parseInput(data, 'hp', state.hp);
							parseInput(data, 'markpower', state.mark, 1188);
							parseInput(data, 'drawpower', state.draw, 8);
							parseInput(data, 'deckpower', state.deckpower);
							switch (state.deckgen) {
								case 'mage':
								case 'demigod':
								case 'falsegod':
									[data.name, data.deck] = RngMock.choose(
										aiDecks[state.deckgen],
									);
									break;
								case 'rng':
									data.deck = deckgen(
										state.rnguprate * 100 || 0,
										data.markpower,
										state.rngmaxrare | 0 || 9,
									);
									break;
								default:
									if (state.deck) data.deck = state.deck;
							}
							if (state.name) data.name = state.name;
							props.updatePlayer(data);
						}}
					/>
				</div>
				<div>
					Deck:{' '}
					<select
						value={this.state.deckgen}
						onChange={e => this.setState({ deckgen: e.target.value })}>
						<option value="">Explicit</option>
						<option value="mage">Random Mage</option>
						<option value="demigod">Random Demigod</option>
						<option value="falsegod">Random False God</option>
						<option value="rng">Random</option>
					</select>
				</div>
				{this.state.deckgen === '' && (
					<div>
						<input
							placeholder="Deck"
							value={state.deck}
							onChange={e => this.setState({ deck: e.target.value })}
						/>
						&emsp;
						<input
							type="button"
							value="Premade"
							onClick={() => this.setState({ premade: true })}
						/>
					</div>
				)}
				{this.state.deckgen === 'rng' && (
					<div>
						<input
							placeholder="Upgrade %"
							value={this.state.rnguprate}
							onChange={e => this.setState({ rnguprate: e.target.value })}
						/>
						&emsp;
						<input
							placeholder="Max Rarity"
							value={this.state.rngmaxrare}
							onChange={e => this.setState({ rngmaxrare: e.target.value })}
						/>
					</div>
				)}
				<div>
					<input
						placeholder="Name"
						value={state.name}
						onChange={e => this.setState({ name: e.target.value })}
					/>
				</div>
				{this.state.premade && (
					<PremadePicker
						onClose={() => this.setState({ premade: false })}
						onClick={(name, deck, isdg) => {
							const state = { name, deck, premade: false };
							if (isdg) {
								state.hp = 200;
								state.draw = 2;
								state.mark = 3;
							} else {
								state.hp = 125;
							}
							this.setState(state);
						}}
					/>
				)}
			</div>
		);
	}
}

class Group extends React.Component {
	constructor(props) {
		super(props);
		this.state = { invite: '' };
	}

	updatePlayer = (i, pl) => {
		const players = this.props.players.slice(),
			{ idx } = players[i];
		players[i] = { ...this.props.players[i], ...pl };
		this.props.updatePlayers(players);
		this.props.removeEditing(idx);
	};

	render() {
		const { props, state } = this;
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
								updatePlayer={pl => this.updatePlayer(i, pl)}
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
								const { invite } = this.state;
								const idx = props.getNextIdx();
								if (!invite) {
									props.updatePlayers(props.players.concat([{ idx }]));
									props.addEditing(idx);
								} else {
									if (!props.hasUserAsPlayer(invite)) {
										props.updatePlayers(
											props.players.concat([
												{
													idx,
													user: invite,
													pending: 2,
												},
											]),
										);
									}
									props.invitePlayer(invite);
								}
								this.setState({ invite: '' });
							}}
						/>
						<input
							style={{ marginLeft: '8px' }}
							value={this.state.invite}
							onChange={e => this.setState({ invite: e.target.value })}
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
}

export default connect(({ user, opts }) => ({
	username: user.name,
}))(
	class Challenge extends React.Component {
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

		componentDidMount() {
			this.props.dispatch(
				store.setCmds({
					matchbegin: data => {
						this.props.dispatch(
							store.doNav(import('./Match.js'), {
								game: new Game(data.data),
							}),
						);
					},
					matchcancel: () => {
						console.log('Match cancelled');
						this.toMainMenu();
					},
					foeleft: data => {
						if (data.name === this.props.username) {
							console.log('You have been removed');
							this.toMainMenu();
						}
						const groups = this.state.groups.slice();
						for (let j = 0; j < groups.length; j++) {
							let group = groups[j],
								g = group;
							for (let i = group.length - 1; ~i; i--) {
								const player = group[i];
								if (player.user === data.name) {
									if (g === group) {
										groups[j] = g = group.slice();
									}
									g.splice(i, 1);
								}
							}
						}
						this.setState({ groups });
					},
					matchready: data => {
						const groups = this.state.groups.slice();
						for (let j = 0; j < groups.length; j++) {
							let group = groups[j],
								g = group;
							for (let i = group.length - 1; ~i; i--) {
								const player = group[i];
								if (player.user === data.name) {
									if (g === group) {
										groups[j] = g = group.slice();
									}
									g[i] = { ...player, pending: data.pending };
								}
							}
						}
						this.setState({ groups });
					},
					matchconfig: data => {
						this.setState({ groups: data.data, set: data.set });
					},
				}),
			);
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
				this.props.dispatch(store.doNav(import('./DeckEditor.js')));
				return;
			}
			const gameData = {
				seed: randint(),
				cardreward: '',
				rematch: this.aiClick,
				players: this.playersAsData(deck),
			};
			RngMock.shuffle(gameData.players);
			this.props.dispatch(
				store.doNav(import('./Match.js'), { game: new Game(gameData) }),
			);
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
			const data = {
				seed: replay.seed,
				cardreward: '',
				goldreward: 0,
				players: replay.players,
			};
			this.props.dispatch(
				store.doNav(import('./Match.js'), {
					replay,
					game: new Game(data),
				}),
			);
		};

		exitClick = () => {
			if (this.isMultiplayer()) {
				if (this.props.username === this.state.groups[0][0].user) {
					sock.userEmit('matchcancel');
				} else {
					sock.userEmit('foeleft');
				}
			}
			this.toMainMenu();
		};

		toMainMenu = () =>
			this.props.dispatch(store.doNav(import('./MainMenu.js')));

		sendConfig = () => {
			if (this.props.username === this.state.groups[0][0].user) {
				sock.userEmit('matchconfig', {
					data: this.state.groups,
					set: this.state.set,
				});
			}
		};

		addGroup = () => {
			this.setState(
				state => ({
					groups: state.groups.concat([[]]),
					editing: state.editing.concat([new Set()]),
				}),
				this.sendConfig,
			);
		};

		updatePlayers = (i, p) =>
			this.setState(state => {
				const newgroups = state.groups.slice();
				newgroups[i] = p;
				return { groups: newgroups };
			}, this.sendConfig);

		invitePlayer = u => {
			sock.userEmit('matchconfig', {
				data: this.state.groups,
				set: this.state.set,
			});
			sock.userEmit('matchinvite', { invite: u });
		};

		removeGroup = i => {
			this.setState(state => {
				const newgroups = state.groups.slice(),
					newediting = state.editing.slice();
				newgroups.splice(i, 1);
				newediting.splice(i, 1);
				return { groups: newgroups, editing: newediting };
			}, this.sendConfig);
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
					{mydata && mydata.deck && 'You have been assigned a deck'}
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
							invitePlayer={this.invitePlayer}
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
										onClick={() => {
											if (isMultiplayer) {
												sock.userEmit('matchbegin');
											} else {
												this.aiClick();
											}
										}}
									/>
							  )
							: mydata &&
							  mydata.pending && (
									<input
										style={{ float: 'right' }}
										type="button"
										value="Ready"
										onClick={() => {
											sock.userEmit('matchready', {
												data: {
													deck: this.state.mydeck,
												},
											});
										}}
									/>
							  )}
					</div>
					{amhost ? (
						<select
							value={this.state.set}
							style={{
								position: 'absolute',
								left: '350px',
								top: '8px',
							}}
							onChange={e =>
								this.setState({ set: e.target.value }, this.sendConfig)
							}>
							<option value="">Standard</option>
							<option value="Original">Original</option>
						</select>
					) : (
						<div
							style={{
								position: 'absolute',
								left: '350px',
								top: '8px',
							}}>
							{this.state.set || 'Standard'}
						</div>
					)}
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

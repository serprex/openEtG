import React from 'react';
import { connect } from 'react-redux';

import * as sock from '../sock.js';
import { parseInput, randint } from '../util.js';
import Game from '../Game.js';
import * as etgutil from '../etgutil.js';
import * as Components from '../Components/index.js';
import * as store from '../store.js';
import RngMock from '../RngMock.js';

class PlayerEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			deck: props.player.deck,
			hp: props.player.hp,
			mark: props.player.markpower,
			draw: props.player.drawpower,
			deckpower: props.player.deckpower,
		};
	}

	render() {
		const { props, state } = this;
		return (
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
				<input
					type="button"
					value="Ok"
					className="editbtn"
					onClick={() => {
						const data = {};
						if (state.deck) data.deck = state.deck;
						parseInput(data, 'hp', state.hp);
						parseInput(data, 'markpower', state.mark, 1188);
						parseInput(data, 'drawpower', state.draw, 8);
						parseInput(data, 'deckpower', state.deckpower);
						props.updatePlayer(data);
					}}
				/>
				<input
					style={{ display: 'block' }}
					placeholder="Deck"
					value={state.deck}
					onChange={e => this.setState({ deck: e.target.value })}
				/>
			</div>
		);
	}
}

class Group extends React.Component {
	constructor(props) {
		super(props);
		this.state = { invite: '', editing: new Set() };
	}

	updatePlayer = (i, pl) => {
		const players = this.props.players.slice(),
			{ idx } = players[i];
		players[i] = { ...this.props.players[i], ...pl };
		this.props.updatePlayers(players);
		this.setState(state => {
			const editing = new Set(state.editing);
			editing.delete(idx);
			return { editing };
		});
	};

	render() {
		const { props, state } = this;
		return (
			<div className="bgbox" style={{ width: '300px', marginBottom: '8px' }}>
				{props.players.map((pl, i) => (
					<div key={pl.idx} style={{ minHeight: '24px' }}>
						<span
							onClick={() => {
								this.setState(state => {
									const editing = new Set(state.editing);
									if (editing.has(pl.idx)) {
										editing.delete(pl.idx);
									} else {
										editing.add(pl.idx);
									}
									return { editing };
								});
							}}>
							{pl.user || 'AI'}
							{pl.pending === 2 && '...'}
						</span>
						{pl.user !== props.host && (
							<input
								type="button"
								value="-"
								className="editbtn"
								style={{ float: 'right' }}
								onClick={() => {
									const players = props.players.slice(),
										[pl] = players.splice(i, 1);
									props.updatePlayers(players);
									this.setState(state => {
										const editing = new Set(state.editing);
										editing.delete(pl.idx);
										return { editing };
									});
								}}
							/>
						)}
						{state.editing.has(pl.idx) && (
							<PlayerEditor
								player={pl}
								updatePlayer={pl => this.updatePlayer(i, pl)}
							/>
						)}
					</div>
				))}
				<div>
					<input
						type="button"
						value="+Player"
						onClick={() => {
							const { invite } = this.state;
							const idx = props.getNextIdx();
							if (!invite) {
								this.setState(state => {
									const editing = new Set(state.editing).add(idx);
									return { editing };
								});
								props.updatePlayers(props.players.concat([{ idx }]));
							} else {
								if (!props.hasUserAsPlayer(invite)) {
									props.updatePlayers(
										props.players.concat([{ idx, user: invite, pending: 2 }]),
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
					{(!props.players.length || props.players[0].user !== props.host) && (
						<input
							type="button"
							value="-"
							className="editbtn"
							style={{ float: 'right' }}
							onClick={props.removeGroup}
						/>
					)}
				</div>
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
				groups: [[{ user: props.username, idx: 1, pending: 1 }], []],
				replay: '',
			};
		}

		componentDidMount() {
			this.props.dispatch(
				store.setCmds({
					matchbegin: data => {
						this.props.dispatch(
							store.doNav(import('./Match'), { game: new Game(data.data) }),
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
						this.setState({ groups: data.data });
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
						name: player.user || 'AI',
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
			const deck = this.state.groups[0][0].deck || sock.getDeck();
			if (etgutil.decklength(deck) < 9) {
				this.props.dispatch(store.doNav(import('./DeckEditor')));
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
				store.doNav(import('./Match'), { game: new Game(gameData) }),
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
				store.doNav(import('./Match'), {
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
		toMainMenu = () => this.props.dispatch(store.doNav(import('./MainMenu')));
		sendConfig = () => {
			if (this.props.username === this.state.groups[0][0].user) {
				sock.userEmit('matchconfig', { data: this.state.groups });
			}
		};
		addGroup = () => {
			this.setState(
				state => ({ groups: state.groups.concat([[]]) }),
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
			sock.userEmit('matchinvite', { invite: u });
		};
		removeGroup = i => {
			this.setState(state => {
				const newgroups = state.groups.slice();
				newgroups.splice(i, 1);
				return { groups: newgroups };
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
					<div style={{ position: 'absolute', left: '320px', top: '200px' }}>
						Warning: Lobby feature is still in development
					</div>
					{mydata && mydata.deck && (
						<Components.DeckDisplay
							x={206}
							y={377}
							deck={mydata.deck || sock.getDeck()}
							renderMark
						/>
					)}
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
							removeGroup={() => this.removeGroup(i)}
							getNextIdx={this.getNextIdx}
						/>
					))}
					<div style={{ width: '300px' }}>
						<input type="button" value="+Group" onClick={this.addGroup} />
						{allReady ? (
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
						) : (
							mydata &&
							mydata.pending && (
								<input
									style={{ float: 'right' }}
									type="button"
									value="Ready"
									onClick={() => {
										sock.userEmit('matchready', {
											data: { deck: sock.getDeck() },
										});
									}}
								/>
							)
						)}
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

import React from 'react';
import { connect } from 'react-redux';
import { Motion, spring } from 'react-motion';
import * as imm from '../immutable.js';

import Effect from '../Effect.js';
import * as sfx from '../audio.js';
import * as ui from '../ui.js';
import * as etg from '../etg.js';
import * as mkAi from '../mkAi.js';
import * as sock from '../sock.js';
import * as Cards from '../Cards.js';
import Skills from '../Skills.js';
import aiSearch from '../ai/search.js';
import aiMulligan from '../ai/mulligan.js';
import * as Components from '../Components/index.js';
import * as store from '../store.js';
import { mkQuestAi } from '../Quest.js';

const svgbg = (() => {
	const redhor = new Uint16Array([
			12,
			0,
			900,
			144,
			145,
			796,
			301,
			103,
			796,
			459,
			103,
			754,
		]),
		redver = new Uint16Array([
			103,
			301,
			600,
			144,
			12,
			301,
			275,
			12,
			144,
			624,
			459,
			600,
			754,
			301,
			600,
			796,
			12,
			301,
		]);
	const redren = [];
	for (let j = 0; j < 3; j++) {
		let path = '';
		for (let i = 0; i < redhor.length; i += 3) {
			path += `M${redhor[i + 1]} ${redhor[i] - j}L${redhor[i + 2]} ${redhor[i] -
				j}`;
		}
		for (let i = 0; i < redver.length; i += 3) {
			path += `M${redver[i] + j} ${redver[i + 1]}L${redver[i] + j} ${
				redver[i + 2]
			}`;
		}
		redren.push(
			<path
				key={j}
				d={path}
				stroke={['#111', '#6a2e0d', '#8a3e1d'][j]}
				strokeWidth="3"
			/>,
		);
	}
	return (
		<svg
			width="900"
			height="600"
			style={{
				position: 'absolute',
				left: '0',
				top: '0',
				zIndex: '-8',
				pointerEvents: 'none',
			}}>
			{redren}
		</svg>
	);
})();

const floodsvg = (
	<svg
		width="900"
		height="600"
		style={{
			position: 'absolute',
			left: '0',
			top: '0',
			zIndex: '1',
			pointerEvents: 'none',
			opacity: '.4',
		}}>
		<path
			d="M149 146l644 0l0 64l-400 0l0 64l-244 0zM107 454l644 0l0-128l-244 0l0 64l-400 0z"
			fill="#048"
		/>
	</svg>
);

const cloaksvg = (
	<div
		style={{
			position: 'absolute',
			left: '130px',
			top: '20px',
			width: '660px',
			height: '280px',
			backgroundColor: '#000',
			zIndex: '1',
			pointerEvents: 'none',
		}}
	/>
);

const activeInfo = {
	firebolt: (c, t) =>
		3 + Math.floor((c.owner.quanta[etg.Fire] - c.card.cost) / 4),
	drainlife: (c, t) =>
		2 + Math.floor((c.owner.quanta[etg.Darkness] - c.card.cost) / 5),
	icebolt: (c, t) => {
		const bolts = Math.floor((c.owner.quanta[etg.Water] - c.card.cost) / 5);
		return `${2 + bolts} ${35 + bolts * 5}%`;
	},
	catapult: (c, t) =>
		Math.ceil(
			(t.truehp() * (t.getStatus('frozen') ? 150 : 100)) / (t.truehp() + 100),
		),
	adrenaline: (c, t) => `Extra: ${etg.getAdrenalRow(t.trueatk())}`,
	fractal: (c, t) =>
		`Copies: ${Math.min(
			6 + Math.floor((c.owner.quanta[etg.Aether] - c.card.cost) / 2),
			9 - c.owner.handIds.length,
		)}`,
};
const TrackIdCtx = React.createContext({
	value: new imm.Map(),
	update: (id, pos) => {},
});
class IdTracker extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			value: new imm.Map(),
			update: (id, pos) =>
				this.setState(state => ({
					value: state.value.set(id, pos),
				})),
		};
	}

	render() {
		return (
			<TrackIdCtx.Provider value={this.state}>
				{this.props.children}
			</TrackIdCtx.Provider>
		);
	}
}
function TrackIdPos({ id, pos, children }) {
	const { value, update } = React.useContext(TrackIdCtx);
	const v = value.get(id);
	if (!v || (v.x !== pos.x && v.y !== pos.y)) {
		update(id, pos);
	}
	return children || null;
}
function GetIdPos(props) {
	const { value } = React.useContext(TrackIdCtx);
	return props.children(value.get(props.id, null));
}

const ThingInstCore = connect(({ opts }) => ({ lofiArt: opts.lofiArt }))(
	function ThingInstCore(props) {
		const { obj, player1, pos } = props,
			isSpell = obj.type === etg.Spell,
			scale =
				obj.type === etg.Weapon || obj.type === etg.Shield
					? 1.2
					: isSpell
					? 0.85
					: 1;
		if (
			isSpell &&
			obj.ownerId !== player1.id &&
			!player1.getStatus('precognition')
		) {
			return (
				<div
					style={{
						position: 'absolute',
						left: `${pos.x - 32}px`,
						top: `${pos.y - 38}px`,
						width: '68px',
						height: '80px',
						border: 'transparent 2px solid',
					}}
					className={tgtclass(player1, obj, props.targeting)}
					onMouseOut={props.onMouseOut}
					onClick={() => props.onClick(obj)}>
					<div
						className="ico cback"
						style={{
							left: '2px',
							top: '2px',
						}}
					/>
				</div>
			);
		}
		const children = [];
		let statText, topText;
		if (!isSpell) {
			const visible = [
				obj.getStatus('psionic'),
				obj.getStatus('aflatoxin'),
				!obj.getStatus('aflatoxin') && obj.getStatus('poison') > 0,
				obj.getStatus('airborne') || obj.getStatus('ranged'),
				obj.getStatus('momentum'),
				obj.getStatus('adrenaline'),
				obj.getStatus('poison') < 0,
			];
			const bordervisible = [
				obj.getStatus('delayed'),
				obj.id === obj.owner.gpull,
				obj.getStatus('frozen'),
			];
			for (let k = 0; k < 7; k++) {
				if (visible[k]) {
					children.push(
						<div
							className={`ico s${k}`}
							key={k}
							style={{
								position: 'absolute',
								top: 64 * scale + 10 + 'px',
								left: [32, 8, 8, 0, 24, 16, 8][k] + 'px',
								opacity: '.6',
							}}
						/>,
					);
				}
			}
			for (let k = 0; k < 3; k++) {
				if (bordervisible[k]) {
					children.push(
						<div
							className={`ico sborder${k}`}
							key={7 + k}
							style={{
								position: 'absolute',
								left: '0',
								top: '0',
								transform: scale === 1 ? undefined : `scale(${scale})`,
							}}
						/>,
					);
				}
			}
			const charges = obj.getStatus('charges');
			topText = obj.activetext();
			if (obj.type === etg.Creature) {
				statText = `${obj.trueatk()} | ${obj.truehp()}${
					charges ? ` x${charges}` : ''
				}`;
			} else if (obj.type === etg.Permanent) {
				if (obj.card.type === etg.Pillar) {
					statText = `1:${
						obj.getStatus('pendstate') ? obj.owner.mark : obj.card.element
					} x${charges}`;
					topText = '';
				} else if (obj.active.get('ownattack') === Skills.locket) {
					statText = `1:${obj.getStatus('mode') || obj.owner.mark}`;
				} else {
					statText = (charges || '').toString();
				}
			} else if (obj.type === etg.Weapon) {
				statText = `${obj.trueatk()}${charges ? ` x${charges}` : ''}`;
			} else if (obj.type === etg.Shield) {
				statText = charges ? 'x' + charges : obj.truedr().toString();
			}
		} else {
			statText = `${obj.card.cost}:${obj.card.costele}`;
		}
		return (
			<div
				style={{
					position: 'absolute',
					left: pos.x - 32 * scale + 'px',
					top: pos.y - 36 * scale + 'px',
					width: 64 * scale + 4 + 'px',
					height: (isSpell ? 64 : 72) * scale + 4 + 'px',
					opacity: obj.isMaterial() ? '1' : '.7',
					color: obj.card.upped ? '#000' : '#fff',
					fontSize: '10px',
					border: 'transparent 2px solid',
					zIndex: !isSpell && obj.getStatus('cloak') ? '2' : undefined,
				}}
				onMouseOver={props.setInfo && (e => props.setInfo(e, obj, pos.x))}
				className={tgtclass(player1, obj, props.targeting)}
				onMouseOut={props.onMouseOut}
				onClick={() => props.onClick(obj)}>
				{props.lofiArt ? (
					<div
						key={0}
						className={obj.card.shiny ? 'shiny' : undefined}
						style={{
							position: 'absolute',
							left: '0',
							top: isSpell ? '0' : '10px',
							width: 64 * scale + 'px',
							height: 64 * scale + 'px',
							backgroundColor: ui.maybeLightenStr(obj.card),
							pointerEvents: 'none',
						}}>
						{obj.card.name}
					</div>
				) : (
					<img
						key={0}
						className={obj.card.shiny ? 'shiny' : undefined}
						src={`/Cards/${obj.card.code.toString(32)}.png`}
						style={{
							position: 'absolute',
							left: '0',
							top: isSpell ? '0' : '10px',
							width: 64 * scale + 'px',
							height: 64 * scale + 'px',
							backgroundColor: ui.maybeLightenStr(obj.card),
							pointerEvents: 'none',
						}}
					/>
				)}
				{children}
				{topText && (
					<Components.Text
						text={topText}
						icoprefix="te"
						style={{
							position: 'absolute',
							left: '0',
							top: '-8px',
							width: 64 * scale + 'px',
							overflow: 'hidden',
							backgroundColor: ui.maybeLightenStr(obj.card),
						}}
					/>
				)}
				{statText && (
					<Components.Text
						text={statText}
						icoprefix="te"
						style={{
							fontSize: '12px',
							position: 'absolute',
							top: isSpell ? '0' : '10px',
							right: '0',
							paddingLeft: '2px',
							backgroundColor: ui.maybeLightenStr(obj.card),
						}}
					/>
				)}
				{obj.hasactive('prespell', 'protectonce') && (
					<div
						className="ico protection"
						style={{
							position: 'absolute',
							left: '0',
							top: isSpell ? '0' : '10px',
							width: 64 * scale + 'px',
							height: 64 * scale + 'px',
						}}
					/>
				)}
			</div>
		);
	},
);
function ThingInst(props) {
	const idtrack = React.useContext(TrackIdCtx).value,
		pos = ui.tgtToPos(props.obj, props.player1.id);
	return (
		<TrackIdPos id={props.obj.id} pos={pos}>
			<Motion
				defaultStyle={idtrack.get(props.startpos)}
				style={{ x: spring(pos.x), y: spring(pos.y) }}>
				{pos => <ThingInstCore {...props} pos={pos} />}
			</Motion>
		</TrackIdPos>
	);
}

function addNoHealData(game, newdata) {
	const dataNext = {
		...game.data.dataNext
	};
	if (dataNext.endurance) dataNext.endurance--;
	if (dataNext.noheal) {
		for (const { user } of game.data.players) {
			if (user) {
				for (let i = 0; i < newdata.players.length; i++) {
					const pldata = newdata.players[i];
					if (pldata.user === user) {
						const pl = game.byUser(user);
						pldata.hp = Math.max(pl.hp, 1);
						pldata.maxhp = pl.maxhp;
					}
				}
			}
		}
	}
	dataNext.dataNext = dataNext;
	return Object.assign(newdata, dataNext);
}

function tgtclass(p1, obj, targeting) {
	if (targeting) {
		if (targeting.filter(obj)) return 'ants-red';
	} else if (obj.ownerId === p1.id && obj.canactive()) return 'canactive';
}

function FoePlays({ foeplays, setCard, setLine, clearCard }) {
	const idtrack = React.useContext(TrackIdCtx).value;
	return foeplays.map((play, i) => (
		<Components.CardImage
			key={i}
			x={(i & 7) * 99}
			y={(i >> 3) * 19}
			card={play}
			onMouseOver={e => {
				setCard(e, play.card);
				if (play.t) {
					setLine(idtrack.get(play.c), idtrack.get(play.t));
				}
			}}
			onMouseOut={clearCard}
		/>
	));
}

export default connect(({ user }) => ({ user }))(
	class Match extends React.Component {
		constructor(props) {
			super(props);
			this.aiState = null;
			this.aiDelay = 0;
			this.streakback = 0;
			const player1 = props.replay
				? props.game.byId(props.game.turn)
				: props.game.byUser(props.user ? props.user.name : '');
			this.state = {
				tooltip: null,
				foeplays: [],
				resigning: false,
				gameProps: null,
				expectedDamage: new Int16Array(2),
				replayindex: 0,
				replayhistory: [props.game],
				player1,
				player2: player1.foe,
				fxid: 0,
				startPos: new imm.Map(),
				fxTextPos: new imm.Map(),
				fxStatChange: new imm.Map(),
				effects: new Set(),
			};
		}

		Text = (state, newstate, { id, text, onRest }) => {
			let offset;
			const { fxid } = newstate;
			newstate.fxTextPos = (newstate.fxTextPos || state.fxTextPos).update(
				id,
				(pos = 0) => (offset = pos) + 16,
			);
			return (
				<GetIdPos id={id} key={fxid}>
					{pos =>
						pos && (
							<Motion
								defaultStyle={{ fade: 1, x: pos.x, y: pos.y + offset }}
								style={{
									x: pos.x,
									y: spring(pos.y - 36, { stiffness: 84, dampen: 12 }),
									fade: spring(0, { stiffness: 108, dampen: 12 }),
								}}
								onRest={() => {
									this.setState(state => {
										const effects = new Set(state.effects);
										effects.delete(Text);
										const st = {
											fxTextPos: state.fxTextPos.update(
												id,
												pos => pos && pos - 16,
											),
											effects,
										};
										return onRest ? onRest(state, st) : st;
									});
								}}>
								{pos => (
									<Components.Text
										text={text}
										style={{
											position: 'absolute',
											left: `${pos.x}px`,
											top: `${pos.y}px`,
											opacity: `${pos.fade}`,
											transform: 'translate(-50%,-50%)',
											textAlign: 'center',
											pointerEvents: 'none',
											textShadow: '1px 1px 2px #000',
										}}
									/>
								)}
							</Motion>
						)
					}
				</GetIdPos>
			);
		};

		StatChange = (state, newstate, id, hp, atk) => {
			if (!newstate.fxStatChange) newstate.fxStatChange = state.fxStatChange;
			let oldentry, newentry;
			newstate.fxStatChange = newstate.fxStatChange.update(id, e => {
				oldentry = e;
				newentry = e ? { ...e } : { atk: 0, hp: 0, dom: null };
				newentry.hp += hp;
				newentry.atk += atk;
				newentry.dom = this.Text(state, newstate, {
					id: id,
					text: `${newentry.atk > 0 ? '+' : ''}${newentry.atk}|${
						newentry.hp > 0 ? '+' : ''
					}${newentry.hp}`,
					onRest: (state, st) => {
						st.fxStatChange = state.fxStatChange.delete(id);
						return st;
					},
				});
				return newentry;
			});
			if (!newstate.effects) newstate.effects = new Set(state.effects);
			if (oldentry) {
				newstate.effects.delete(oldentry.dom);
			}
			newstate.effects.add(newentry.dom);
		};

		applyNext = (data, iscmd) => {
			const { game } = this.props;
			if (
				!iscmd &&
				game.data.players.some(
					pl => pl.user && pl.user !== this.props.user.name,
				)
			)
				sock.emit({ x: 'move', data });
			if (data.x === 'cast' && game.turn === this.state.player2.id) {
				const c = game.byId(data.c),
					isSpell = c.type === etg.Spell;
				const play = {
					card: c.card,
					element: c.card.element,
					costele: isSpell ? c.card.costele : c.castele,
					cost: isSpell ? c.card.cost : c.cast,
					name: isSpell ? c.card.name : c.active.get('cast').toString(),
					upped: c.card.upped,
					shiny: c.card.shiny,
					c: data.c,
					t: data.t,
				};
				this.setState(state => ({ foeplays: state.foeplays.concat([play]) }));
			}
			if (data.x === 'mulligan') {
				sfx.playSound('mulligan');
			}
			game.next(data);
			this.setState(state => {
				if (!game.effects || !game.effects.length) return {};
				const newstate = {};
				for (const effect of game.effects) {
					switch (effect.x) {
						case 'StartPos':
							newstate.startPos = (newstate.startPos || state.startPos).set(
								effect.id,
								effect.src,
							);
							break;
						case 'Poison':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(state, newstate, {
									id: effect.id,
									text: `Poison ${effect.amt}`,
								}),
							);
							break;
						case 'Death':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(state, newstate, {
									id: effect.id,
									text: 'Death',
								}),
							);
							break;
						case 'Delay':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(state, newstate, {
									id: effect.id,
									text: `Delay ${effect.amt}`,
								}),
							);
							break;
						case 'Dive':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(state, newstate, {
									id: effect.id,
									text: 'Dive',
								}),
							);
							break;
						case 'Free':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(state, newstate, {
									id: effect.id,
									text: 'Free',
								}),
							);
							break;
						case 'Freeze':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(state, newstate, {
									id: effect.id,
									text: `Freeze ${effect.amt}`,
								}),
							);
							break;
						case 'Text':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(this.Text(state, newstate, effect));
							break;
						case 'Dmg':
							this.StatChange(state, newstate, effect.id, -effect.amt, 0);
							break;
						case 'Atk':
							this.StatChange(state, newstate, effect.id, 0, effect.amt);
							break;
						case 'LastCard':
							newstate.fxid = (newstate.fxid || state.fxid) + 1;
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								<Motion
									key={newstate.fxid}
									defaultStyle={{ fade: 1 }}
									style={{ fade: spring(0) }}
									onRest={() => {
										this.setState(state => {
											const effects = new Set(state.effects);
											effects.delete(Text);
											return { effects };
										});
									}}>
									{({ fade }) => (
										<div
											style={{
												position: 'absolute',
												left: '450px',
												top: '300px',
												transform: 'translate(-50%,-50%)',
												fontSize: '16px',
												color: '#fff',
												backgroundColor: '#000',
												padding: '18px',
												opacity: `${fade}`,
											}}>
											Last card for {game.byId(effect.id).name}
										</div>
									)}
								</Motion>,
							);
							break;
						default:
							console.log('Unknown effect', effect.x);
					}
				}
				game.effects.length = 0;
				return newstate;
			});
		};

		static getDerivedStateFromProps(props, state) {
			if (state.resetInterval && props.game !== state._game) {
				state.resetInterval(props);
				const player1 = props.game.byUser(props.user ? props.user.name : '');
				return {
					_game: props.game,
					gameProps: props.game.props,
					expectedDamage: props.game.expectedDamage(),
					replayhistory: [props.game],
					player1,
					player2: player1.foe,
				};
			} else if (props.game.props !== state.gameProps) {
				const player1 = props.replay
					? props.game.byId(props.game.turn)
					: props.game.byUser(props.user ? props.user.name : '');
				return {
					gameProps: props.game.props,
					expectedDamage: props.game.expectedDamage(),
					player1,
					player2: player1.foe,
				};
			}
			return null;
		}

		setReplayIndex = (state, idx) => {
			const newstate = { replayindex: idx };
			if (idx >= state.replayhistory.length) {
				const history = state.replayhistory.slice();
				newstate.replayhistory = history;
				while (idx >= history.length) {
					const gclone = history[history.length - 1].clone();
					gclone.next(this.props.replay.moves[history.length - 1]);
					history.push(gclone);
				}
			}
			const game = (newstate.replayhistory || state.replayhistory)[idx];
			newstate.player1 = game.byId(game.turn);
			newstate.player2 = newstate.player1.foe;
			return newstate;
		};

		replayNext = () =>
			this.setState(state => this.setReplayIndex(state, state.replayindex + 1));
		replayPrev = () =>
			this.setState(state => this.setReplayIndex(state, state.replayindex - 1));
		replayNextPly = () =>
			this.setState(state => {
				const len = this.props.replay.moves.length;
				let idx = state.replayindex + 1;
				for (; idx < len; idx++) {
					const { x } = this.props.replay.moves[idx];
					if (x === 'end' || x === 'mulligan') break;
				}
				return this.setReplayIndex(state, Math.min(idx, len));
			});
		replayPrevPly = () =>
			this.setState(state => {
				let idx = state.replayindex - 1;
				for (; idx >= 1; idx--) {
					const { x } = this.props.replay.moves[idx - 1];
					if (x === 'end' || x === 'mulligan') break;
				}
				return this.setReplayIndex(state, Math.max(idx, 0));
			});

		getGame = () =>
			this.props.replay
				? this.state.replayhistory[this.state.replayindex]
				: this.props.game;

		endClick = (discard = 0) => {
			const { game, user } = this.props;
			if (
				game.turn === this.state.player1.id &&
				game.phase === etg.MulliganPhase
			) {
				this.applyNext({ x: 'accept' });
			} else if (game.winner) {
				if (user) {
					if (game.data.arena) {
						sock.userEmit('modarena', {
							aname: game.data.arena,
							won: game.winner !== this.state.player1.id,
							lv: game.level - 4,
						});
					}
					if (game.winner === this.state.player1.id) {
						if (game.data.quest !== undefined) {
							if (game.data.quest.autonext) {
								mkAi.run(
									mkQuestAi(game.data.quest.autonext, qdata =>
										addNoHealData(game, qdata),
									),
								);
								return;
							} else if (!user.quests[game.data.quest.key]) {
								sock.userExec('setquest', {
									quest: game.data.quest.key,
								});
							}
						} else if (game.data.daily) {
							const endurance = game.data.endurance;
							if (endurance !== undefined && endurance > 0) {
								mkAi.run(
									mkAi.mkAi(game.data.level, true, gdata =>
										addNoHealData(game, gdata),
									),
								);
								return;
							} else {
								const daily = game.data.daily;
								sock.userExec('donedaily', {
									daily: daily === 4 ? 5 : daily === 3 ? 0 : daily,
								});
							}
						}
					}
				}
				this.props.dispatch(
					store.doNav(import('./Result'), {
						game: game,
						streakback: this.streakback,
					}),
				);
			} else if (game.turn === this.state.player1.id) {
				if (discard === 0 && this.state.player1.handIds.length === 8) {
					this.setState({
						targeting: {
							filter: obj =>
								obj.type === etg.Spell && obj.ownerId === this.state.player1.id,
							cb: tgt => {
								this.endClick(tgt.id);
								this.setState({ targeting: null });
							},
							text: 'Discard',
							src: null,
						},
					});
				} else {
					this.applyNext({
						x: 'end',
						t: discard || undefined,
					});
					this.setState({ targeting: null, foeplays: [] });
				}
			}
		};

		cancelClick = () => {
			const { game } = this.props;
			if (this.state.resigning) {
				this.setState({ resigning: false });
			} else if (game.turn === this.state.player1.id) {
				if (
					game.phase === etg.MulliganPhase &&
					this.state.player1.handIds.length
				) {
					sfx.playSound('mulligan');
					this.applyNext({ x: 'mulligan' });
				} else if (this.state.targeting) {
					this.setState({ targeting: null });
				}
			}
		};

		resignClick = () => {
			if (this.props.replay) {
				this.props.dispatch(store.doNav(import('./Challenge'), {}));
				return;
			}
			if (this.state.resigning) {
				this.applyNext({ x: 'resign', c: this.state.player1.id });
				this.endClick();
			} else {
				this.setState({ resigning: true });
			}
		};

		thingClick = obj => {
			const { game } = this.props;
			this.clearCard();
			if (this.props.replay || game.phase !== etg.PlayPhase) return;
			if (this.state.targeting) {
				if (this.state.targeting.filter(obj)) {
					this.state.targeting.cb(obj);
				}
			} else if (obj.ownerId === this.state.player1.id && obj.canactive()) {
				const cb = tgt => {
					this.applyNext({ x: 'cast', c: obj.id, t: tgt && tgt.id });
				};
				if (obj.type === etg.Spell && obj.card.type !== etg.Spell) {
					cb();
				} else {
					const active = obj.active.get('cast'),
						targetFilter = game.targetFilter(obj, active);
					if (!targetFilter) {
						cb();
					} else {
						this.setState({
							targeting: {
								filter: targetFilter,
								cb: tgt => {
									cb(tgt);
									this.setState({ targeting: null });
								},
								text: active.toString(),
								src: obj,
							},
						});
					}
				}
			}
		};

		gameStep() {
			const { game } = this.props,
				turn = game.byId(game.turn);
			if (turn.data.ai === 1) {
				if (game.phase === etg.PlayPhase) {
					let now;
					if (!this.aiState || !this.aiState.cmd) {
						Effect.disable = true;
						if (this.aiState) {
							this.aiState.step(game);
						} else {
							this.aiState = new aiSearch(game);
						}
						Effect.disable = false;
					}
					if (
						this.aiState &&
						this.aiState.cmd &&
						(now = Date.now()) > this.aiDelay
					) {
						this.applyNext(this.aiState.cmd, true);
						this.aiState = null;
						this.aiDelay =
							now + (game.turn === this.state.player1.id ? 2000 : 200);
					}
				} else if (game.phase === etg.MulliganPhase) {
					this.applyNext(
						{
							x: aiMulligan(turn) ? 'accept' : 'mulligan',
						},
						true,
					);
				}
			} else if (turn.data.ai === 2) {
				this.setState({
					player1: turn,
					player2: turn.foe,
				});
			}
		}

		onkeydown = e => {
			if (e.target.tagName === 'TEXTAREA') return;
			const kc = e.which,
				ch = String.fromCharCode(kc);
			let chi;
			if (kc === 27) {
				this.resignClick();
			} else if (ch === ' ' || kc === 13) {
				this.endClick();
			} else if (ch === '\b' || ch === '0') {
				this.cancelClick();
			} else if (~(chi = 'SW'.indexOf(ch))) {
				this.thingClick(chi ? this.state.player2 : this.state.player1);
			} else if (~(chi = 'QA'.indexOf(ch))) {
				const { shield } = chi ? this.state.player2 : this.state.player1;
				if (shield) this.thingClick(shield);
			} else if (~(chi = 'ED'.indexOf(ch))) {
				const { weapon } = chi ? this.state.player2 : this.state.player1;
				if (weapon) this.thingClick(weapon);
			} else if (~(chi = '12345678'.indexOf(ch))) {
				const card = this.state.player1.hand[chi];
				if (card) this.thingClick(card);
			} else return;
			e.preventDefault();
		};

		startMatch({ user, game, dispatch }) {
			const wasPvP = game.data.players.every(pd => !pd.ai);
			if (
				user &&
				!game.data.endurance &&
				(game.data.level !== undefined || wasPvP)
			) {
				sock.userExec('addloss', {
					pvp: wasPvP,
					l: game.data.level,
					g: -(game.data.cost | 0),
				});
				this.streakback = user.streak[game.data.level];
			}
			this.gameStep();
			this.gameInterval = setInterval(() => this.gameStep(), 30);
			this.setState({
				_game: game,
				resetInterval: props => {
					clearInterval(this.gameInterval);
					this.startMatch(props);
				},
			});
			dispatch(
				store.setCmds({
					move: ({ data }) => this.applyNext(data, true),
					foeleft: ({ data }) => {
						const players = game.data.players;
						for (let i = 0; i < players.length; i++) {
							if (players[i].user === data.name) {
								game.byId(game.players[i]).die();
							}
						}
					},
				}),
			);
		}

		componentDidMount() {
			if (sock.trade) {
				sock.userEmit('canceltrade');
				delete sock.trade;
			}
			if (!this.props.replay) {
				if (!this.props.game.data.spectate) {
					document.addEventListener('keydown', this.onkeydown);
				}
				this.startMatch(this.props);
			}
		}

		componentWillUnmount() {
			clearInterval(this.gameInterval);
			document.removeEventListener('keydown', this.onkeydown);
			this.props.dispatch(store.setCmds({}));
		}

		setInfo(e, obj, x) {
			const actinfo =
				this.state.targeting &&
				this.state.targeting.filter(obj) &&
				activeInfo[this.state.targeting.text];
			this.setState({
				tooltip: (
					<Components.Text
						className="infobox"
						text={`${obj.info()}${
							actinfo ? '\n' + actinfo(this.state.targeting.src, obj) : ''
						}`}
						icoprefix="te"
						style={{
							position: 'absolute',
							left: `${e.pageX}px`,
							top: `${e.pageY}px`,
						}}
					/>
				),
			});
			if (obj.type !== etg.Player) {
				this.setCard(e, obj.card, x);
			}
		}

		clearCard = () => {
			this.setState({ hovercode: 0, tooltip: null, line0: null, line1: null });
		};

		setCard(e, card, x) {
			this.setState({
				hovercode: card.code,
				hoverx: x - 64,
				hovery: e.pageY > 300 ? 44 : 300,
			});
		}

		render() {
			const game = this.getGame(),
				children = [];
			let turntell, endText, cancelText;
			const cloaked = this.state.player2.isCloaked();

			if (game.phase !== etg.EndPhase) {
				turntell = this.state.targeting
					? this.state.targeting.text
					: `${game.turn === this.state.player1.id ? 'Your' : 'Their'} Turn${
							game.phase > etg.MulliganPhase
								? ''
								: game.players[0] === this.state.player1.id
								? ', First'
								: ', Second'
					  }`;
				if (game.turn === this.state.player1.id) {
					endText = this.state.targeting
						? ''
						: game.phase === etg.PlayPhase
						? 'End Turn'
						: game.turn === this.state.player1.id
						? 'Accept Hand'
						: '';
					if (game.phase != etg.PlayPhase) {
						cancelText = game.turn === this.state.player1.id ? 'Mulligan' : '';
					} else {
						cancelText =
							this.state.targeting || this.state.resigning ? 'Cancel' : '';
					}
				} else cancelText = endText = '';
			} else {
				turntell = `${
					game.turn === this.state.player1.id ? 'Your' : 'Their'
				} Turn, ${game.winner === this.state.player1.id ? 'Won' : 'Lost'}`;
				endText = 'Continue';
				cancelText = '';
			}
			let floodvisible = false;
			const things = [];
			for (let j = 0; j < 2; j++) {
				const pl = j ? this.state.player2 : this.state.player1,
					plpos = ui.tgtToPos(pl, this.state.player1.id),
					handOverlay = pl.usedactive
						? 'ico silence'
						: pl.getStatus('sanctuary')
						? 'ico sanctuary'
						: pl.getStatus('nova') >= 3 &&
						  pl.hand.some(c => c.card.isOf(Cards.Names.Nova))
						? 'ico singularity'
						: '';
				children.push(
					<TrackIdPos id={pl.id} pos={plpos}>
						<div
							className={tgtclass(this.state.player1, pl, this.state.targeting)}
							style={{
								position: 'absolute',
								left: `${plpos.x - 48}px`,
								top: `${plpos.y - 40}px`,
								width: '96px',
								height: '80px',
								border: 'transparent 2px solid',
							}}
							onClick={() => this.thingClick(pl)}
							onMouseOver={e => this.setInfo(e, pl)}
						/>
					</TrackIdPos>,
					<span
						className={'ico e' + pl.mark}
						style={{
							position: 'absolute',
							left: j ? '160px' : '740px',
							top: j ? '130px' : '470px',
							transform: 'translate(-50%,-50%)',
							textAlign: 'center',
							pointerEvents: 'none',
							fontSize: '18px',
							textShadow: '2px 2px 1px #000,2px 2px 2px #000',
						}}>
						{pl.markpower !== 1 && pl.markpower}
					</span>,
					!!pl.getStatus('sosa') && (
						<div
							className={'ico sacrifice'}
							style={{
								position: 'absolute',
								left: j ? '800px' : '0',
								top: j ? '7px' : '502px',
								pointerEvents: 'none',
							}}
						/>
					),
					!!pl.getStatus('flatline') && (
						<span
							className="ico sabbath"
							style={{
								position: 'absolute',
								left: j ? '792px' : '0',
								top: j ? '80px' : '288px',
							}}
						/>
					),
					handOverlay && (
						<span
							className={handOverlay}
							style={{
								position: 'absolute',
								left: j ? '3px' : '759px',
								top: j ? '75px' : '305px',
							}}
						/>
					),
				);
				const creatures = [],
					perms = [];
				for (let i = 0; i < pl.handIds.length; i++) {
					const inst = pl.hand[i];
					things.push(
						<ThingInst
							key={inst.id}
							obj={inst}
							player1={this.state.player1}
							startpos={this.state.startPos.get(inst.id)}
							setInfo={(e, obj, x) => this.setCard(e, obj.card, x)}
							onMouseOut={this.clearCard}
							onClick={this.thingClick}
							targeting={this.state.targeting}
						/>,
					);
				}
				for (let i = 0; i < 23; i++) {
					const cr = pl.creatures[i];
					if (cr && !(j === 1 && cloaked)) {
						creatures.push(
							<ThingInst
								key={cr.id}
								obj={cr}
								player1={this.state.player1}
								startpos={this.state.startPos.get(cr.id)}
								setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
								onMouseOut={this.clearCard}
								onClick={this.thingClick}
								targeting={this.state.targeting}
							/>,
						);
					}
				}
				for (let i = 0; i < 16; i++) {
					const pr = pl.permanents[i];
					if (pr && pr.getStatus('flooding')) floodvisible = true;
					if (pr && !(j === 1 && cloaked && !pr.getStatus('cloak'))) {
						perms.push(
							<ThingInst
								key={pr.id}
								obj={pr}
								player1={this.state.player1}
								startpos={this.state.startPos.get(pr.id)}
								setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
								onMouseOut={this.clearCard}
								onClick={this.thingClick}
								targeting={this.state.targeting}
							/>,
						);
					}
				}
				if (j === 1) {
					creatures.reverse();
					perms.reverse();
				}
				things.push(...creatures);
				things.push(...perms);
				const wp = pl.weapon,
					sh = pl.shield;
				things.push(
					wp && !(j === 1 && cloaked) && (
						<ThingInst
							key={wp.id}
							obj={wp}
							player1={this.state.player1}
							startpos={this.state.startPos.get(wp.id)}
							setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
							onMouseOut={this.clearCard}
							onClick={this.thingClick}
							targeting={this.state.targeting}
						/>
					),
					sh && !(j === 1 && cloaked) && (
						<ThingInst
							key={sh.id}
							obj={sh}
							player1={this.state.player1}
							startpos={this.state.startPos.get(sh.id)}
							setInfo={(e, obj, x) => this.setInfo(e, obj, x)}
							onMouseOut={this.clearCard}
							onClick={this.thingClick}
							targeting={this.state.targeting}
						/>
					),
				);
				const qx = j ? 792 : 0,
					qy = j ? 106 : 308;
				for (let k = 1; k < 13; k++) {
					children.push(
						<span
							className={'ico e' + k}
							style={{
								position: 'absolute',
								left: `${qx + (k & 1 ? 0 : 54)}px`,
								top: `${qy + Math.floor((k - 1) / 2) * 32}px`,
							}}
						/>,
						<span
							style={{
								position: 'absolute',
								left: `${qx + (k & 1 ? 32 : 86)}px`,
								top: `${qy + Math.floor((k - 1) / 2) * 32 + 4}px`,
								fontSize: '16px',
								pointerEvents: 'none',
							}}>
							{pl.quanta[k] || ''}
						</span>,
					);
				}
				children.push(
					<div
						style={{
							backgroundColor: '#000',
							position: 'absolute',
							left: `${plpos.x - 41}px`,
							top: j ? '36px' : '531px',
							width: '82px',
							height: '16px',
							pointerEvents: 'none',
						}}
					/>,
				);
				const expectedDamage = this.state.expectedDamage[pl.getIndex()];
				const x1 = Math.max(80 * (pl.hp / pl.maxhp), 0);
				const x2 = Math.max(x1 - 80 * (expectedDamage / pl.maxhp), 0);
				const poison = pl.getStatus('poison'),
					poisoninfo = `${
						poison > 0 ? poison + ' 1:2' : poison < 0 ? -poison + ' 1:7' : ''
					} ${pl.getStatus('neuro') ? ' 1:10' : ''}`;
				const hptext = `${pl.hp}/${pl.maxhp}\n${pl.deckIds.length}cards${
					!cloaked && expectedDamage ? `\nDmg: ${expectedDamage}` : ''
				} ${poisoninfo ? `\n${poisoninfo}` : ''}`;
				children.push(
					<Motion style={{ x1: spring(x1), x2: spring(x2) }}>
						{({ x1, x2 }) => (
							<>
								<div
									style={{
										backgroundColor: ui.strcols[etg.Life],
										position: 'absolute',
										left: `${plpos.x - 40}px`,
										top: j ? '37px' : '532px',
										width: `${x1}px`,
										height: '14px',
										pointerEvents: 'none',
									}}
								/>
								{!cloaked && expectedDamage !== 0 && (
									<div
										style={{
											backgroundColor:
												ui.strcols[
													expectedDamage >= pl.hp
														? etg.Fire
														: expectedDamage > 0
														? etg.Time
														: etg.Water
												],
											position: 'absolute',
											left: plpos.x - 40 + Math.min(x1, x2),
											top: j ? '37px' : '532px',
											width: Math.max(x1, x2) - Math.min(x1, x2) + 'px',
											height: '14px',
											pointerEvents: 'none',
										}}
									/>
								)}
							</>
						)}
					</Motion>,
					<Components.Text
						text={hptext}
						style={{
							textAlign: 'center',
							width: '100px',
							pointerEvents: 'none',
							fontSize: '12px',
							lineHeight: '1.1',
							position: 'absolute',
							left: j ? '800px' : '0px',
							top: j ? '36px' : '531px',
						}}
					/>,
				);
			}
			return (
				<IdTracker>
					{svgbg}
					{cloaked ? (
						cloaksvg
					) : (
						<FoePlays
							foeplays={this.state.foeplays}
							setCard={(e, play) => this.setCard(e, play, e.pageX)}
							setLine={(line0, line1) => this.setState({ line0, line1 })}
							clearCard={this.clearCard}
						/>
					)}
					{children}
					{things}
					{floodvisible && floodsvg}
					<div
						style={{
							whiteSpace: 'pre-wrap',
							textAlign: 'center',
							position: 'absolute',
							left: '0px',
							top: '40px',
							width: '140px',
						}}>
						{`${[
							'Commoner\n',
							'Mage\n',
							'Champion\n',
							'Demigod\n',
							'Arena1\n',
							'Arena2\n',
						][game.data.level] || ''}${this.state.player2.data.name || '-'}`}
					</div>
					<span
						style={{
							position: 'absolute',
							left: '762px',
							top: '580px',
							pointerEvents: 'none',
						}}>
						{turntell}
					</span>
					{this.state.effects}
					{this.state.line0 && this.state.line1 && (
						<svg
							width="900"
							height="600"
							style={{
								position: 'absolute',
								left: '0',
								top: '0',
								zIndex: '3',
								pointerEvents: 'none',
							}}>
							<path
								d={`M${this.state.line0.x} ${this.state.line0.y}L${this.state.line1.x} ${this.state.line1.y}`}
								stroke="#f84"
								strokeWidth="8"
							/>
						</svg>
					)}
					<Components.Card
						x={this.state.hoverx}
						y={this.state.hovery}
						code={this.state.hovercode}
					/>
					{this.state.tooltip}
					<input
						type="button"
						value={this.state.resigning ? 'Confirm' : 'Resign'}
						onClick={this.resignClick}
						style={{
							position: 'absolute',
							left: '8px',
							top: '20px',
						}}
					/>
					{!this.props.replay &&
						!game.data.spectate &&
						(game.turn === this.state.player1.id || game.winner) && (
							<>
								{cancelText && (
									<input
										type="button"
										value={cancelText}
										onClick={this.cancelClick}
										style={{
											position: 'absolute',
											left: '800px',
											top: '560px',
										}}
									/>
								)}
								{endText && (
									<input
										type="button"
										value={endText}
										onClick={() => this.endClick()}
										style={{
											position: 'absolute',
											left: '800px',
											top: '530px',
										}}
									/>
								)}
							</>
						)}
					{this.props.replay && (
						<>
							<span
								style={{
									position: 'absolute',
									left: '760px',
									top: '520px',
								}}>
								{this.state.replayindex}
							</span>
							<span
								style={{
									position: 'absolute',
									left: '860px',
									top: '520px',
								}}>
								{this.props.replay.moves.length}
							</span>
							<span
								style={{
									position: 'absolute',
									left: '760px',
									top: '540px',
								}}>
								{game.bonusstats.get('ply')}
							</span>
							{!!this.state.replayindex && (
								<input
									type="button"
									value="<"
									onClick={() => this.replayPrev()}
									style={{
										position: 'absolute',
										left: '800px',
										top: '520px',
										width: '20px',
									}}
								/>
							)}
							{!game.winner && (
								<input
									type="button"
									value=">"
									onClick={() => this.replayNext()}
									style={{
										position: 'absolute',
										left: '830px',
										top: '520px',
										width: '20px',
									}}
								/>
							)}
							{!!this.state.replayindex && (
								<input
									type="button"
									value="<<"
									onClick={() => this.replayPrevPly()}
									style={{
										position: 'absolute',
										left: '800px',
										top: '540px',
										width: '20px',
									}}
								/>
							)}
							{!game.winner && (
								<input
									type="button"
									value=">>"
									onClick={() => this.replayNextPly()}
									style={{
										position: 'absolute',
										left: '830px',
										top: '540px',
										width: '20px',
									}}
								/>
							)}
						</>
					)}
				</IdTracker>
			);
		}
	},
);

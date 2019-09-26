import React from 'react';
import { connect } from 'react-redux';
import { Motion, TransitionMotion, spring } from 'react-motion';
import * as imm from '../immutable.js';

import Effect from '../Effect.js';
import * as sfx from '../audio.js';
import * as ui from '../ui.js';
import * as etg from '../etg.js';
import * as mkAi from '../mkAi.js';
import * as sock from '../sock.js';
import Skills from '../Skills.js';
import aiSearch from '../ai/search.js';
import aiMulligan from '../ai/mulligan.js';
import * as Components from '../Components/index.js';
import * as store from '../store.js';
import { mkQuestAi } from '../Quest.js';

const svgbg = (() => {
	// prettier-ignore
	const redhor = new Uint16Array([
			140, 172, 900,
			300, 172, 900,
			460, 172, 900,
		]),
		redver = new Uint16Array([
			170, 0, 600,
			246, 0, 139,
			246, 459, 600,
		]),
		redren = [];
	for (let j = 0; j < 2; j++) {
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
			<path key={j} d={path} stroke={['#421', '#842'][j]} strokeWidth="1" />,
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
			d="M900 141v317h-700Q162 416 200 375h395Q615 300 595 226h-395Q162 191 200 141"
			fill="#048"
		/>
	</svg>
);

const cloaksvg = (
	<div
		style={{
			position: 'absolute',
			left: '0',
			top: '0',
			width: '900px',
			height: '299px',
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
	corpseexplosion: (c, t) => 1 + Math.floor(c.truehp() / 8),
	adrenaline: (c, t) => `Extra: ${etg.getAdrenalRow(t.trueatk())}`,
	fractal: (c, t) =>
		`Copies: ${Math.min(
			6 + Math.floor((c.owner.quanta[etg.Aether] - c.card.cost) / 2),
			9 - c.owner.handIds.length,
		)}`,
};

const activetexts = [
	'hit',
	'death',
	'owndeath',
	'buff',
	'destroy',
	'draw',
	'play',
	'spell',
	'dmg',
	'shield',
	'postauto',
];
const activetextsRename = {
	quanta: (c, x) => ui.eleNames[x[1]].toLowerCase(),
	burrow: (c, x) => (c.getStatus('burrowed') ? 'unburrow' : 'burrow'),
};
function skillName(c, sk) {
	const namelist = [];
	for (const name of sk.name) {
		const nsplit = name.split(' ');
		const rename = activetextsRename[nsplit[0]];
		if (rename === null) continue;
		namelist.push(rename ? rename(c, nsplit) : name);
	}
	return namelist.join(' ');
}
function activeText(c) {
	const acast = c.active.get('cast');
	if (acast) return `${c.cast}:${c.castele}${skillName(c, acast)}`;
	for (const akey of activetexts) {
		const a = c.active.get(akey);
		if (a) return `${akey} ${skillName(c, a)}`;
	}
	const aauto = c.active.get('ownattack');
	return aauto ? skillName(c, aauto) : '';
}

function PagedModal(props) {
	return (
		<div
			className="bgbox"
			style={{
				whiteSpace: 'pre-wrap',
				zIndex: '9',
				position: 'absolute',
				left: '450px',
				top: '300px',
				maxWidth: '900px',
				transform: 'translate(-50%,-50%)',
			}}>
			<div>
				<input
					value="Prev"
					type="button"
					style={{ visibility: props.idx > 0 ? 'visible' : 'hidden' }}
					onClick={() => props.setPage(props.idx - 1)}
				/>
				&emsp;
				{props.idx < props.pages.length - 1 && (
					<>
						<input
							value="Next"
							type="button"
							onClick={() => props.setPage(props.idx + 1)}
						/>
						&emsp;
					</>
				)}
				<input
					value={props.idx < props.pages.length - 1 ? 'Skip' : 'Okay'}
					type="button"
					onClick={props.onClose}
				/>
				<span className="floatRight">
					{`${props.idx + 1} / ${props.pages.length}`}
				</span>
			</div>
			{props.pages[props.idx]}
		</div>
	);
}

class ThingInst extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			gameProps: null,
			instdom: null,
		};
	}

	static getDerivedStateFromProps(props, state) {
		const { game, obj, p1id } = props,
			gameProps = game.props;
		if (gameProps !== state.gameProps) {
			const children = [],
				isSpell = obj.type === etg.Spell,
				{ card } = obj,
				bgcolor = ui.maybeLightenStr(card);
			const faceDown =
				isSpell &&
				obj.ownerId !== p1id &&
				!game.getStatus(p1id, 'precognition');
			if (faceDown) {
				return {
					gameProps,
					faceDown: true,
					instdom: (
						<div
							className="ico cback"
							style={{
								left: '2px',
								top: '2px',
							}}
						/>
					),
				};
			}
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
									bottom: '-8px',
									left: [32, 8, 8, 0, 24, 16, 8][k] + 'px',
									opacity: '.6',
									zIndex: '1',
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
									width: '64px',
									height: '64px',
								}}
							/>,
						);
					}
				}
				const charges = obj.getStatus('charges');
				topText = activeText(obj);
				if (obj.type === etg.Creature) {
					statText = `${obj.trueatk()} | ${obj.truehp()}${
						charges ? ` \u00d7${charges}` : ''
					}`;
				} else if (obj.type === etg.Permanent) {
					if (card.type === etg.Pillar) {
						statText = `1:${
							obj.getStatus('pendstate') ? obj.owner.mark : card.element
						}\u00d7${charges}`;
						topText = '';
					} else if (obj.active.get('ownattack') === Skills.locket) {
						statText = `1:${obj.getStatus('mode') || obj.owner.mark}`;
					} else {
						statText = (charges || '').toString();
					}
				} else if (obj.type === etg.Weapon) {
					statText = `${obj.trueatk()}${charges ? ` \u00d7${charges}` : ''}`;
				} else if (obj.type === etg.Shield) {
					statText = charges ? '\u00d7' + charges : obj.truedr().toString();
				}
			} else {
				topText = card.name;
				statText = `${card.cost}:${card.costele}`;
			}
			return {
				gameProps,
				faceDown: false,
				instdom: (
					<div
						style={{
							width: '64px',
							height: '64px',
							backgroundColor: bgcolor,
							backgroundSize: 'contain',
							backgroundImage: props.lofiArt
								? undefined
								: `url(/Cards/${card.code.toString(32)}.png)`,
						}}>
						{children}
						{obj.hasactive('prespell', 'protectonce') && (
							<div
								className="ico protection"
								style={{
									position: 'absolute',
									left: '0',
									top: '0',
									width: '64px',
									height: '64px',
								}}
							/>
						)}
						<div
							style={{
								position: 'absolute',
								top: '0',
								width: '64px',
							}}>
							{topText && (
								<Components.Text
									text={topText}
									icoprefix="se"
									style={{
										width: '64px',
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										backgroundColor: bgcolor,
									}}
								/>
							)}
							{statText && (
								<Components.Text
									text={statText}
									icoprefix="se"
									style={{
										float: 'right',
										backgroundColor: bgcolor,
									}}
								/>
							)}
							{!isSpell && (
								<Components.Text
									text={card.name}
									icoprefix="se"
									style={{
										position: 'absolute',
										top: '54px',
										height: '10px',
										width: '64px',
										overflow: 'hidden',
										whiteSpace: 'nowrap',
										backgroundColor: bgcolor,
									}}
								/>
							)}
						</div>
					</div>
				),
			};
		}
		return null;
	}

	render() {
		const { props } = this,
			{ game, obj, p1id, pos } = props,
			isSpell = obj.type === etg.Spell,
			{ faceDown } = this.state;

		return (
			<div
				className={`inst ${isSpell ? 'handinst ' : ''}
					${tgtclass(p1id, obj, props.targeting)}`}
				style={{
					position: 'absolute',
					left: `${pos.x - 32}px`,
					top: `${pos.y - 32}px`,
					opacity: faceDown
						? props.opacity
						: (obj.isMaterial() ? 1 : 0.7) * props.opacity,
					color: faceDown ? undefined : obj.card.upped ? '#000' : '#fff',
					zIndex:
						!faceDown && !isSpell && obj.getStatus('cloak') ? '2' : undefined,
					pointerEvents: ~obj.getIndex() ? undefined : 'none',
				}}
				onMouseOver={
					!faceDown && props.setInfo
						? e => props.setInfo(e, obj, pos.x)
						: undefined
				}
				onMouseLeave={props.onMouseOut}
				onClick={() => props.onClick(obj)}>
				{this.state.instdom}
			</div>
		);
	}
}

function addNoHealData(game, newdata) {
	const dataNext = {
		...game.data.dataNext,
	};
	if (dataNext.endurance) dataNext.endurance--;
	if (dataNext.noheal) {
		for (let gi = 0; gi < game.data.players.length; gi++) {
			const { user } = game.data.players[gi];
			if (user) {
				for (let i = 0; i < newdata.players.length; i++) {
					const pldata = newdata.players[i];
					if (pldata.user === user) {
						const pl = game.byId(game.players[gi]);
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

function tgtclass(p1id, obj, targeting) {
	if (targeting) {
		if (targeting.filter(obj)) return 'cantarget';
	} else if (obj.ownerId === p1id && obj.canactive()) return 'canactive';
	return '';
}

function FoePlays({
	idtrack,
	foeplays,
	setCard,
	setLine,
	clearCard,
	showGame,
}) {
	return (
		!!foeplays && (
			<div
				style={{
					position: 'absolute',
					left: '8px',
					top: '300px',
					zIndex: '6',
				}}>
				{foeplays.map((play, i) => (
					<Components.CardImage
						key={i}
						card={play}
						onMouseOver={e => {
							if (play.card) setCard(e, play.card);
							else clearCard();
							if (play.t) {
								setLine(idtrack.get(play.c), idtrack.get(play.t));
							} else {
								setLine(null, null);
							}
						}}
						onClick={() => showGame(play.game)}
						onMouseOut={clearCard}
					/>
				))}
			</div>
		)
	);
}

export default connect(({ user, opts }) => ({ user, lofiArt: opts.lofiArt }))(
	class Match extends React.Component {
		constructor(props) {
			super(props);
			this.aiState = null;
			this.aiDelay = 0;
			this.streakback = 0;
			this.idtrack = new Map();
			const player1 = props.replay
				? props.game.byId(props.game.turn)
				: props.game.byUser(props.user ? props.user.name : '');
			this.state = {
				game: null,
				tooltip: null,
				showFoeplays: false,
				foeplays: new Map(),
				resigning: false,
				gameProps: null,
				expectedDamage: new Int16Array(2),
				replayindex: 0,
				replayhistory: [props.game],
				player1: player1.id,
				player2: player1.foeId,
				fxid: 0,
				startPos: new Map(),
				endPos: new Map(),
				fxTextPos: new imm.Map(),
				fxStatChange: new imm.Map(),
				effects: new Set(),
				hovercode: 0,
				hoverx: null,
				hovery: null,
				line0: null,
				line1: null,
				popup: props.game.data.quest && props.game.data.quest.opentext,
				popupidx: 0,
			};
		}

		Text = (state, newstate, { id, text, onRest }) => {
			let offset;
			const { fxid } = newstate;
			newstate.fxTextPos = (newstate.fxTextPos || state.fxTextPos).update(
				id,
				(pos = 0) => (offset = pos) + 16,
			);
			const pos = this.idtrack.get(id);
			return (
				pos && (
					<Motion
						defaultStyle={{
							fade: 1,
							x: pos.x,
							y: pos.y + offset,
						}}
						style={{
							x: spring(pos.x),
							y: spring(pos.y - 36, {
								stiffness: 84,
								dampen: 12,
							}),
							fade: spring(0, {
								stiffness: 108,
								dampen: 12,
							}),
						}}
						onRest={() => {
							this.setState(state => {
								const effects = new Set(state.effects);
								effects.delete(Text);
								const st = {
									fxTextPos: state.fxTextPos.update(id, pos => pos && pos - 16),
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
			const { game } = this.props,
				{ turn } = game;
			if (
				!iscmd &&
				game.data.players.some(
					pl => pl.user && pl.user !== this.props.user.name,
				)
			) {
				sock.userEmit('move', { data });
			}
			if (data.x === 'cast' || data.x === 'end') {
				let play;
				if (data.x === 'cast') {
					const c = game.byId(data.c),
						isSpell = c.type === etg.Spell;
					play = {
						card: c.card,
						element: c.card.element,
						costele: isSpell ? c.card.costele : c.castele,
						cost: isSpell ? c.card.cost : c.cast,
						name: isSpell ? c.card.name : c.active.get('cast').toString(),
						upped: c.card.upped,
						shiny: c.card.shiny,
						c: data.c,
						t: data.t,
						game: game.clone(),
					};
				} else {
					play = {
						card: null,
						element: 0,
						costele: 0,
						cost: 0,
						name: 'endturn',
						upped: false,
						shiny: false,
						c: 0,
						t: 0,
						game: game.clone(),
					};
				}
				this.setState(state => {
					const foeplays = new Map(state.foeplays);
					if (!foeplays.has(turn)) foeplays.set(turn, []);
					foeplays.set(turn, foeplays.get(turn).concat([play]));
					return { foeplays };
				});
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
							newstate.startPos = (
								newstate.startPos || new Map(state.startPos)
							).set(effect.id, effect.src);
							break;
						case 'EndPos':
							if (!newstate.startPos)
								newstate.startPos = new Map(state.startPos);
							newstate.startPos.delete(effect.id);
							newstate.endPos = (newstate.endPos || new Map(state.endPos)).set(
								effect.id,
								effect.tgt,
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
							console.log('Unknown effect', effect);
					}
				}
				game.effects.length = 0;
				return newstate;
			});
			const newTurn = game.turn;
			if (newTurn !== turn) {
				const pl = game.byId(newTurn);
				if (pl.data.user === (this.props.user ? this.props.user.name : '')) {
					this.setState({ player1: newTurn });
				}
				this.setState(state => ({
					foeplays: new Map(state.foeplays).set(newTurn, []),
				}));
			}
		};

		static getDerivedStateFromProps(props, state) {
			if (props.game.props !== state.gameProps) {
				const player1 = props.game.byId(
					props.replay ? props.game.turn : state.player1,
				);
				return {
					gameProps: props.game.props,
					expectedDamage: props.game.expectedDamage(),
					player1: player1.id,
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
			newstate.player1 = game.turn;
			newstate.player2 = game.get(game.turn).get('foe');
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
				: this.state.game || this.props.game;

		gotoResult = () => {
			const { game, user } = this.props;
			if (user) {
				if (game.data.arena) {
					sock.userEmit('modarena', {
						aname: game.data.arena,
						won: game.winner !== this.state.player1,
						lv: game.data.level - 4,
					});
				}
				if (game.winner === this.state.player1) {
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
				store.doNav(import('./Result.js'), {
					game: game,
					streakback: this.streakback,
				}),
			);
		};

		endClick = (discard = 0) => {
			const { game } = this.props;
			if (
				game.turn === this.state.player1 &&
				game.phase === etg.MulliganPhase
			) {
				this.applyNext({ x: 'accept' });
			} else if (game.winner) {
				this.gotoResult();
			} else if (game.turn === this.state.player1) {
				if (
					discard === 0 &&
					game.get(this.state.player1).get('hand').length === 8
				) {
					this.setState({
						targeting: {
							filter: obj =>
								obj.type === etg.Spell && obj.ownerId === this.state.player1,
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
					this.setState({ targeting: null });
				}
			}
		};

		cancelClick = () => {
			const { game } = this.props;
			if (this.state.resigning) {
				this.setState({ resigning: false });
			} else if (game.turn === this.state.player1) {
				if (
					game.phase === etg.MulliganPhase &&
					game.get(this.state.player1).get('hand').length
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
				this.props.dispatch(store.doNav(import('./Challenge.js'), {}));
				return;
			}
			if (this.state.resigning) {
				if (this.props.game.get(this.state.player1).get('resigning')) {
					this.gotoResult();
				} else {
					this.applyNext({ x: 'resign', c: this.state.player1 });
					if (this.props.game.winner) {
						this.gotoResult();
					}
				}
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
			} else if (obj.ownerId === this.state.player1 && obj.canactive()) {
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
							now + (game.turn === this.state.player1 ? 2000 : 200);
					}
				} else if (game.phase === etg.MulliganPhase) {
					this.applyNext(
						{
							x: aiMulligan(turn) ? 'accept' : 'mulligan',
						},
						true,
					);
				}
			}
		}

		onkeydown = e => {
			if (e.target.tagName === 'TEXTAREA') return;
			const kc = e.which,
				ch = e.key || String.fromCharCode(kc);
			let chi;
			if (kc === 27) {
				this.resignClick();
			} else if (ch === ' ' || kc === 13) {
				this.endClick();
			} else if (ch === '\b' || ch === '0') {
				this.cancelClick();
			} else if (~(chi = 'sw'.indexOf(ch))) {
				this.thingClick(
					this.props.game.byId(chi ? this.state.player2 : this.state.player1),
				);
			} else if (~(chi = 'qa'.indexOf(ch))) {
				const { shield } = this.props.game.byId(
					chi ? this.state.player2 : this.state.player1,
				);
				if (shield) this.thingClick(shield);
			} else if (~(chi = 'ed'.indexOf(ch))) {
				const { weapon } = this.props.game.byId(
					chi ? this.state.player2 : this.state.player1,
				);
				if (weapon) this.thingClick(weapon);
			} else if (~(chi = '12345678'.indexOf(ch))) {
				const card = this.props.game.byId(this.state.player1).hand[chi];
				if (card) this.thingClick(card);
			} else if (ch === 'p') {
				if (
					this.props.game.turn === this.state.player1.id &&
					this.state.player2.id !== this.state.player1.foeId
				) {
					this.applyNext({ x: 'foe', t: this.state.player2.id });
				}
			} else if (~(chi = '[]'.indexOf(ch))) {
				this.setState(state => {
					const { players } = this.props.game,
						dir = chi ? players.length + 1 : 1;
					let nextId,
						i = 1;
					for (; i < players.length; i++) {
						nextId =
							players[
								(players.indexOf(state.player2) + i * dir) % players.length
							];
						if (
							nextId !== this.state.player1 &&
							!this.props.game.get(nextId).get('out')
						) {
							break;
						}
					}
					return i === players.length ? null : { player2: nextId };
				});
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
			dispatch(
				store.setCmds({
					move: ({ data }) => this.applyNext(data, true),
					foeleft: ({ data }) => {
						const { players } = game.data;
						for (let i = 0; i < players.length; i++) {
							if (players[i].user === data.name) {
								this.applyNext({ x: 'resign', c: game.players[i] }, true);
							}
						}
					},
				}),
			);
		}

		componentDidMount() {
			sock.cancelTrade();
			if (!this.props.replay) {
				if (!this.props.game.data.spectate) {
					document.addEventListener('keydown', this.onkeydown);
					window.addEventListener('beforeunload', this.onbeforeunload);
				}
				this.startMatch(this.props);
			}
		}

		componentWillUnmount() {
			clearInterval(this.gameInterval);
			document.removeEventListener('keydown', this.onkeydown);
			window.removeEventListener('beforeunload', this.onbeforeunload);
			this.props.dispatch(store.setCmds({}));
		}

		onbeforeunload = e => {
			if (
				this.props.game.data.players.some(
					pl => pl.user && pl.user !== this.props.user.name,
				)
			) {
				e.preventDefault();
				e.returnValue = '';
			}
		};

		setInfo = (e, obj, x) => {
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
							zIndex: '5',
						}}
					/>
				),
			});
			if (obj.type !== etg.Player) {
				this.setCard(e, obj.card, x);
			}
		};

		clearCard = () => {
			this.setState({
				hovercode: 0,
				tooltip: null,
				line0: null,
				line1: null,
			});
		};

		setCard(e, card, x) {
			this.setState({
				hovercode: card.code,
				hoverx: 734,
				hovery: e.pageY > 300 ? 44 : 300,
			});
		}

		render() {
			const { props } = this,
				game = this.getGame(),
				children = [],
				player1 = game.byId(this.state.player1),
				player2 = game.byId(this.state.player2);
			let turntell, endText, cancelText;
			const cloaked = player2.isCloaked();

			if (game.phase !== etg.EndPhase) {
				turntell = this.state.targeting
					? this.state.targeting.text
					: `${game.turn === player1.id ? 'Your' : 'Their'} turn${
							game.phase > etg.MulliganPhase
								? ''
								: game.players[0] === player1.id
								? "\nYou're first"
								: "\nYou're second"
					  }`;
				if (game.turn === player1.id) {
					endText = this.state.targeting
						? ''
						: game.phase === etg.PlayPhase
						? 'End Turn'
						: game.turn === player1.id
						? 'Accept'
						: '';
					if (game.phase != etg.PlayPhase) {
						cancelText = game.turn === player1.id ? 'Mulligan' : '';
					} else {
						cancelText =
							this.state.targeting || this.state.resigning ? 'Cancel' : '';
					}
				} else cancelText = endText = '';
			} else {
				turntell = `${game.turn === player1.id ? 'Your' : 'Their'} Turn\n${
					game.winner === player1.id ? 'Won' : 'Lost'
				}`;
				endText = 'Continue';
				cancelText = '';
			}
			let floodvisible = false;
			const things = [];
			for (let j = 0; j < 2; j++) {
				const pl = j ? player2 : player1,
					plpos = ui.tgtToPos(pl, player1.id),
					handOverlay = pl.usedactive
						? 12
						: pl.getStatus('sanctuary')
						? 8
						: pl.getStatus('nova') >= 3 &&
						  (pl.id !== player1.id ||
								pl.hand.some(c => c.card.isOf(game.Cards.Names.Nova)))
						? 1
						: null;
				this.idtrack.set(pl.id, plpos);
				children.push(
					<div
						className={tgtclass(player1.id, pl, this.state.targeting)}
						style={{
							position: 'absolute',
							left: `${plpos.x - 48}px`,
							top: `${plpos.y - 40}px`,
							width: '96px',
							height: '80px',
							border: 'transparent 2px solid',
							zIndex: '4',
						}}
						onClick={() => this.thingClick(pl)}
						onMouseOver={e => this.setInfo(e, pl)}
					/>,
					<span
						className={'ico e' + pl.mark}
						style={{
							position: 'absolute',
							left: '32px',
							top: j ? '228px' : '430px',
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
								left: '0',
								top: j ? '96px' : '300px',
							}}
						/>
					),
					handOverlay && (
						<span
							style={{
								zIndex: '1',
								position: 'absolute',
								left: '101px',
								top: j ? '0px' : '300px',
								width: '66px',
								height: '263px',
								backgroundColor: ui.strcols[handOverlay],
								opacity: '.3',
								borderRadius: '4px',
								pointerEvents: 'none',
							}}
						/>
					),
				);
				things.push(...pl.handIds);
				for (let i = j ? 22 : 0; i >= 0 && i < 23; i += j ? -1 : 1) {
					const cr = pl.creatureIds[i];
					if (cr && !(j === 1 && cloaked)) {
						things.push(cr);
					}
				}
				for (let i = 0; i < 16; i++) {
					const pr = pl.permanentIds[i];
					if (pr && game.getStatus(pr, 'flooding')) floodvisible = true;
					if (pr && !(j === 1 && cloaked && !game.getStatus(pr, 'cloak'))) {
						things.push(pr);
					}
				}
				const wp = pl.weaponId,
					sh = pl.shieldId;
				if (wp && !(j === 1 && cloaked)) {
					things.push(wp);
				}
				if (sh && !(j === 1 && cloaked)) {
					things.push(sh);
				}
				const qx = 0,
					qy = j ? 106 : 308;
				for (let k = 1; k < 13; k++) {
					children.push(
						<span
							className={'ico ce' + k}
							style={{
								position: 'absolute',
								left: `${qx + (k & 1 ? 2 : 48)}px`,
								top: `${qy + Math.floor((k - 1) / 2) * 18}px`,
							}}
						/>,
						<span
							style={{
								position: 'absolute',
								left: `${qx + (k & 1 ? 20 : 66)}px`,
								top: `${qy + Math.floor((k - 1) / 2) * 18 - 2}px`,
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
							left: '2px',
							top: j ? '36px' : '531px',
							width: '98px',
							height: '22px',
							pointerEvents: 'none',
						}}
					/>,
				);
				const expectedDamage = this.state.expectedDamage[pl.getIndex()];
				const x1 = Math.max(Math.round(96 * (pl.hp / pl.maxhp)), 0),
					x2 = Math.max(x1 - Math.round(96 * (expectedDamage / pl.maxhp)), 0);
				const poison = pl.getStatus('poison'),
					poisoninfo = `${
						poison > 0 ? poison + ' 1:2' : poison < 0 ? -poison + ' 1:7' : ''
					} ${pl.getStatus('neuro') ? ' 1:10' : ''}`;
				const hptext = `${pl.hp}/${pl.maxhp} ${
					!cloaked && expectedDamage ? `(${expectedDamage})` : ''
				}\n${poisoninfo ? `\n${poisoninfo}` : ''}${
					pl.id !== player1.id && pl.id !== player1.foeId
						? '\n(Not targetted)'
						: ''
				}`;
				children.push(
					<Motion style={{ x1: spring(x1), x2: spring(x2) }}>
						{({ x1, x2 }) => (
							<>
								<div
									style={{
										backgroundColor: ui.strcols[etg.Life],
										position: 'absolute',
										left: '3px',
										top: j ? '37px' : '532px',
										width: `${x1}px`,
										height: '20px',
										pointerEvents: 'none',
										zIndex: '2',
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
											left: `${3 + Math.min(x1, x2)}px`,
											top: j ? '37px' : '532px',
											width: Math.max(x1, x2) - Math.min(x1, x2) + 'px',
											height: '20px',
											pointerEvents: 'none',
											zIndex: '2',
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
							left: '0',
							top: j ? '40px' : '535px',
							textShadow: '1px 1px 1px #000,2px 2px 2px #000',
							zIndex: '2',
						}}
					/>,
					<div
						className={pl.deckIds.length ? 'ico ccback' : ''}
						style={{
							position: 'absolute',
							left: '103px',
							top: j ? '258px' : '551px',
							textAlign: 'center',
							paddingTop: '7px',
							pointerEvents: 'none',
							fontSize: '18px',
							textShadow: '2px 2px 1px #000,2px 2px 2px #000',
							zIndex: '2',
						}}>
						{pl.deckIds.length || '0!!'}
					</div>,
				);
			}
			return (
				<>
					{this.state.popup && (
						<PagedModal
							pages={this.state.popup}
							idx={this.state.popupidx}
							setPage={idx => this.setState({ popupidx: idx })}
							onClose={() => this.setState({ popup: null })}
						/>
					)}
					{svgbg}
					{cloaked
						? cloaksvg
						: this.state.showFoeplays && (
								<FoePlays
									idtrack={this.idtrack}
									foeplays={this.state.foeplays.get(player2.id)}
									setCard={(e, play) => this.setCard(e, play, e.pageX)}
									setLine={(line0, line1) => this.setState({ line0, line1 })}
									clearCard={this.clearCard}
									showGame={game => this.setState({ game })}
								/>
						  )}
					{children}
					<TransitionMotion
						styles={things.map(id => {
							const obj = game.byId(id),
								pos = ui.tgtToPos(obj, player1.id);
							const style = { opacity: spring(1) };
							if (pos) {
								style.x = spring(pos.x);
								style.y = spring(pos.y);
							}
							return {
								key: `${id}`,
								style,
								data: obj,
							};
						})}
						willEnter={item => {
							const startpos = this.state.startPos.get(item.data.id);
							let pos;
							if (startpos < 0) {
								pos = {
									x: 103,
									y:
										(item.data.ownerId === player1.id) === (startpos === -1)
											? 551
											: 258,
								};
							} else if (startpos) {
								pos = this.idtrack.get(startpos);
							}
							return {
								x: item.style.x.val || 0,
								y: item.style.y.val || 0,
								opacity: 0,
								...pos,
							};
						}}
						willLeave={item => {
							const endpos = this.state.endPos.get(item.data.id);
							let pos;
							if (endpos < 0) {
								pos = {
									x: 103,
									y:
										(item.data.ownerId === player1.id) === (endpos === -1)
											? 551
											: 258,
								};
							} else if (endpos) {
								pos = this.idtrack.get(endpos);
							}
							return pos && pos.x !== undefined && pos.y !== undefined
								? {
										x: spring(pos.x),
										y: spring(pos.y),
										opacity: spring(0),
								  }
								: {
										opacity: spring(0),
								  };
						}}>
						{interpStyles => (
							<>
								{interpStyles.map(item => {
									this.idtrack.set(item.data.id, item.style);
									return (
										<ThingInst
											key={item.key}
											lofiArt={props.lofiArt}
											game={game}
											id={item.data.id}
											obj={item.data}
											p1id={player1.id}
											setInfo={this.setInfo}
											onMouseOut={this.clearCard}
											onClick={this.thingClick}
											targeting={this.state.targeting}
											pos={item.style}
											opacity={item.style.opacity}
										/>
									);
								})}
							</>
						)}
					</TransitionMotion>
					{floodvisible && floodsvg}
					<div
						style={{
							whiteSpace: 'pre-wrap',
							textAlign: 'center',
							position: 'absolute',
							left: '780px',
							top: '40px',
							width: '120px',
							zIndex: '3',
						}}>
						{`${[
							'Commoner\n',
							'Mage\n',
							'Champion\n',
							'Demigod\n',
							'Arena1\n',
							'Arena2\n',
						][game.data.level] ||
							(player2.data.leader !== undefined
								? `${game.playerDataByIdx(player2.data.leader).name ||
										player2.data.leader}\n`
								: '')}${player2.data.name || '-'}`}
					</div>
					<span
						style={{
							position: 'absolute',
							left: '780px',
							top: '560px',
							width: '120px',
							textAlign: 'center',
							pointerEvents: 'none',
							whiteSpace: 'pre',
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
								zIndex: '4',
								pointerEvents: 'none',
							}}>
							<defs>
								<marker
									id="h"
									orient="auto"
									markerWidth="3"
									markerHeight="4"
									refX="0.1"
									refY="2">
									<path d="M0 0L1 2L0 4L3 2Z" fill="#f84" />
								</marker>
							</defs>
							<path
								markerEnd="url(#h)"
								d={`M${this.state.line0.x} ${this.state.line0.y}L${this.state.line1.x} ${this.state.line1.y}`}
								stroke="#f84"
								strokeWidth="4"
								opacity="0.7"
							/>
						</svg>
					)}
					<Components.Card
						x={this.state.hoverx}
						y={this.state.hovery}
						code={this.state.hovercode}
					/>
					{this.state.tooltip}
					{this.state.foeplays.has(player2.id) &&
						!!this.state.foeplays.get(player2.id).length && (
							<input
								type="button"
								value={`History ${this.state.foeplays.get(player2.id).length}`}
								style={{
									position: 'absolute',
									left: '2px',
									top: '270px',
								}}
								onClick={() =>
									this.setState(state => ({
										game: null,
										showFoeplays: !state.showFoeplays,
									}))
								}
							/>
						)}
					<input
						type="button"
						value={this.state.resigning ? 'Confirm' : 'Resign'}
						onClick={this.resignClick}
						style={{
							position: 'absolute',
							left: '816px',
							top: '15px',
							zIndex: '4',
						}}
					/>
					{!props.replay &&
						!game.data.spectate &&
						(game.turn === player1.id || game.winner) && (
							<>
								{endText && (
									<input
										type="button"
										value={endText}
										onClick={() => this.endClick()}
										style={{
											position: 'absolute',
											left: '10px',
											top: '460px',
										}}
									/>
								)}
								{cancelText && (
									<input
										type="button"
										value={cancelText}
										onClick={this.cancelClick}
										style={{
											position: 'absolute',
											left: '10px',
											top: '490px',
										}}
									/>
								)}
							</>
						)}
					{props.replay && (
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
								{props.replay.moves.length}
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
				</>
			);
		}
	},
);

import { Component } from 'react';
import { connect } from 'react-redux';

import { playSound } from '../audio.js';
import * as ui from '../ui.js';
import * as etg from '../etg.js';
import { encodeCode, asShiny } from '../etgutil.js';
import * as mkAi from '../mkAi.js';
import * as sock from '../sock.jsx';
import * as Components from '../Components/index.jsx';
import * as store from '../store.jsx';
import { mkQuestAi } from '../Quest.js';
import enums from '../enum.json';
import wasm from '../wasm.js';
import AiWorker from '../AiWorker.js';

const aiWorker = new AiWorker();

function updateMap(map, k, f) {
	return new Map(map).set(k, f(map.get(k)));
}

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
			path += `M${redhor[i + 1]} ${redhor[i] - j}L${redhor[i + 2]} ${
				redhor[i] - j
			}`;
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

const instimgstyle = {
	position: 'absolute',
	width: '64px',
	height: '64px',
	pointerEvents: 'none',
};

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
	adrenaline: (c, t) => `Extra: ${wasm.getAdrenalRow(t.trueatk()).join(',')}`,
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
	burrow: (c, x) => (c.getStatus('burrowed') ? 'unburrow' : 'burrow'),
	quanta: (c, x) => ui.eleNames[x[1]].toLowerCase(),
	summon: (c, x) => c.game.Cards.Codes[x[1] & 0xffff].name.toLowerCase(),
};
function skillName(c, sk) {
	const namelist = [];
	for (const name of sk) {
		const nsplit = name.split(' ');
		const rename = activetextsRename[nsplit[0]];
		if (rename === null) continue;
		namelist.push(rename ? rename(c, nsplit) : name);
	}
	return namelist.join(' ');
}
function activeText(c) {
	const skills = c.active;
	const acast = skills.get('cast');
	if (acast) return `${c.cast}:${c.castele}${skillName(c, acast)}`;
	for (const akey of activetexts) {
		const a = skills.get(akey);
		if (a) return `${akey} ${skillName(c, a)}`;
	}
	const aauto = skills.get('ownattack');
	return aauto ? skillName(c, aauto) : '';
}

class Tween extends Component {
	wait = false;
	ms0 = 0;
	_mounted = false;

	state = {
		next: null,
		state: null,
		prev: null,
	};

	step = ts => {
		if (this._mounted) {
			this.setState(
				state => {
					const newstate = this.props.proc(
						ts - this.ms0,
						this.state.prev,
						this.state.next,
					);
					if (newstate !== this.state.next) {
						requestAnimationFrame(this.step);
					}
					return { state: newstate, start: false };
				},
				() => {
					this.wait = false;
				},
			);
		}
	};

	static getDerivedStateFromProps(props, state) {
		return !state.next
			? props.initial
				? {
						next: props,
						state: props.initial,
						prev: props.initial,
						start: true,
				  }
				: { next: props, state: props, prev: props, start: true }
			: (state.state && props.compare(state.state, props)) ||
			  props.compare(state.next, props)
			? null
			: { next: props, prev: state.state, start: true };
	}

	componentDidMount() {
		this._mounted = true;
	}

	componentWillUnmount() {
		this._mounted = false;
	}

	componentDidUpdate() {
		if (!this.wait && this.state.start) {
			this.ms0 = performance.now();
			this.wait = true;
			requestAnimationFrame(this.step);
		}
	}

	render() {
		return this.props.children(this.state.state);
	}
}

class Animation extends Component {
	_mounted = false;
	start = 0;
	state = {};

	step = ts => {
		if (this._mounted) {
			this.setState(state =>
				this.props.proc(ts - this.start, state, this.props),
			);
			requestAnimationFrame(this.step);
		}
	};

	componentDidMount() {
		this.start = performance.now();
		this._mounted = true;
		requestAnimationFrame(this.step);
	}

	componentWillUnmount() {
		this._mounted = false;
	}

	render() {
		for (const key in this.state) {
			return this.props.children(this.state);
		}
		return null;
	}
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

function LastCard({ opacity, name }) {
	return (
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
				opacity: opacity,
				zIndex: '8',
				pointerEvents: 'none',
			}}>
			Last card for {name}
		</div>
	);
}

function SpellDisplay(props) {
	return props.spells.map(({ id, spell, t }, i) => {
		const p1 = props.idtrack.get(spell.t);
		const y = 540 - (props.spells.length - i) * 20;
		return (
			<Animation
				key={id}
				proc={ms => {
					let yc, opacity;
					if (ms < 50 * Math.PI) {
						yc = y * Math.sin(ms / 100);
						opacity = 1 - Math.cos(ms / 100);
					} else if (ms > 1984) {
						yc = y + ms - 1980;
						opacity = 1 - (ms - 1980) / (600 - y);
					} else {
						yc = y;
						opacity = 1;
					}
					if (yc > 600) {
						props.removeSpell(id);
						return null;
					}
					return { y: yc, opacity };
				}}>
				{item => (
					<>
						<Components.CardImage
							card={spell}
							style={{
								position: 'absolute',
								left: '800px',
								top: `${item.y}px`,
								opacity: item.opacity,
								zIndex: '3',
								pointerEvents: 'none',
							}}
						/>
						{p1 && props.playByPlayMode !== 'noline' && (
							<ArrowLine
								opacity={item.opacity}
								x0={800}
								y0={item.y + 10}
								x1={p1.x}
								y1={p1.y}
							/>
						)}
					</>
				)}
			</Animation>
		);
	});
}

function ArrowLine({ x0, y0, x1, y1, opacity }) {
	return (
		<svg
			width="900"
			height="600"
			style={{
				position: 'absolute',
				left: '0',
				top: '0',
				zIndex: '4',
				pointerEvents: 'none',
				opacity,
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
				d={`M${x0} ${y0}L${x1} ${y1}`}
				stroke="#f84"
				strokeWidth="4"
				opacity="0.7"
			/>
		</svg>
	);
}

class ThingInst extends Component {
	state = {
		gameHash: null,
		dom: null,
	};

	setInfo = e =>
		this.props.setInfo(
			e,
			this.props.game.byId(this.props.id),
			this.props.pos.x,
		);

	onClick = () => this.props.onClick(this.props.id);

	static getDerivedStateFromProps(props, state) {
		const { game, p1id, id } = props,
			gameHash = game.replay.length,
			obj = game.byId(id);
		if (gameHash !== state.gameHash) {
			if (!game.has_id(id)) {
				return { gameHash, dom: null };
			}
			const children = [],
				isSpell = obj.type === etg.Spell,
				{ card } = obj,
				bgcolor = ui.maybeLightenStr(card);
			const faceDown =
				isSpell && obj.ownerId !== p1id && !game.get(p1id, 'precognition');
			if (faceDown) {
				return {
					gameHash,
					faceDown: true,
					dom: (
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
					id === obj.owner.gpull,
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
					if (card.getStatus('pillar')) {
						statText = `1:${
							obj.getStatus('pendstate') ? obj.owner.mark : card.element
						}\u00d7${charges}`;
						topText = '';
					} else {
						const ownattack = obj.getSkill('ownattack');
						if (ownattack?.length === 1 && ownattack[0] === 'locket') {
							const mode = obj.getStatus('mode');
							statText = `1:${~mode ? mode : obj.owner.mark}`;
						} else {
							statText = `${charges || ''}`;
						}
					}
				} else if (obj.type === etg.Weapon) {
					statText = `${obj.trueatk()}${charges ? ` \u00d7${charges}` : ''}`;
				} else if (obj.type === etg.Shield) {
					statText = charges ? '\u00d7' + charges : obj.truedr().toString();
				}
			} else {
				topText = card.name;
				statText = `${obj.cost}:${obj.costele}`;
			}
			return {
				gameHash,
				faceDown: false,
				dom: (
					<div
						style={{
							width: '64px',
							height: '64px',
							backgroundColor: bgcolor,
						}}>
						{!props.lofiArt && (
							<img
								className={card.shiny ? 'shiny' : ''}
								src={`/Cards/${encodeCode(
									card.code + (asShiny(card.code, false) < 5000 ? 4000 : 0),
								)}.webp`}
								style={instimgstyle}
							/>
						)}
						{children}
						{game.game.has_protectonce(id) && (
							<div
								className="ico protection"
								style={{
									position: 'absolute',
									width: '64px',
									height: '64px',
								}}
							/>
						)}
						<div
							style={{
								position: 'absolute',
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
		if (this.state.dom === null) return null;
		const { props } = this,
			{ game, p1id, pos, setInfo } = props,
			obj = game.byId(props.id),
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
					zIndex: '2',
					pointerEvents: ~obj.getIndex() ? undefined : 'none',
				}}
				onMouseMove={!faceDown && setInfo ? this.setInfo : undefined}
				onMouseOver={!faceDown && setInfo ? this.setInfo : undefined}
				onMouseLeave={props.onMouseOut}
				onClick={this.onClick}>
				{this.state.dom}
			</div>
		);
	}
}

class Things extends Component {
	constructor(props) {
		super(props);

		this.state = {
			things: new Set(props.things),
			death: new Map(),
			birth: new Map(),
		};
	}

	static getDerivedStateFromProps(props, state) {
		if (
			props.things.length === state.things.length &&
			props.things.every(id => state.things.has(id))
		) {
			return null;
		}
		const things = new Set(props.things),
			death = new Map(state.death),
			birth = new Map(state.birth);
		for (const id of death.keys()) {
			if (things.has(id)) {
				death.delete(id);
			}
		}
		for (const id of things) {
			if (!state.things.has(id)) {
				const start = props.startPos.get(id);
				let pos;
				if (start < 0) {
					pos = {
						x: 103,
						y: -start === props.p1id ? 551 : 258,
					};
				} else if (start) {
					pos = { x: -99, y: -99, ...props.idtrack.get(start) };
				}
				if (!pos) {
					pos = ui.tgtToPos(props.game.byId(id), props.p1id);
				}
				if (pos) {
					pos.opacity = 0;
					birth.set(id, pos);
				}
			}
		}
		for (const id of state.things) {
			if (!things.has(id) && props.game.has_id(id)) {
				const endpos = props.endPos.get(id);
				let pos;
				if (endpos < 0) {
					pos = {
						x: 103,
						y: -endpos === props.p1id ? 551 : 258,
					};
				} else {
					pos = props.idtrack.get(endpos || id);
				}
				if (pos) death.set(id, pos);
			}
		}
		return {
			things,
			death,
			birth,
		};
	}

	makeThing(id, obj, pos, opacity) {
		const props = this.props;
		return (
			<Tween
				key={id}
				initial={this.state.birth.get(id)}
				x={pos.x}
				y={pos.y}
				opacity={opacity}
				compare={(prev, next) =>
					prev.x === next.x &&
					prev.y === next.y &&
					prev.opacity === next.opacity
				}
				proc={(ms, prev, next) => {
					if (ms > 96 * Math.PI) {
						if (next.opacity === 0) {
							const death = new Set(this.state.death),
								birth = new Map(this.state.birth);
							death.delete(id);
							birth.delete(id);
							this.setState({ death, birth });
						}
						return next;
					}
					const pos = {
						x: prev.x + (next.x - prev.x) * Math.sin(ms / 192),
						y: prev.y + (next.y - prev.y) * Math.sin(ms / 192),
						opacity:
							prev.opacity + (next.opacity - prev.opacity) * Math.sin(ms / 192),
					};
					props.idtrack.set(id, { x: pos.x, y: pos.y });
					return pos;
				}}>
				{pos => (
					<ThingInst
						lofiArt={props.lofiArt}
						game={props.game}
						id={id}
						p1id={props.p1id}
						setInfo={props.setInfo}
						onMouseOut={props.onMouseOut}
						onClick={props.onClick}
						targeting={props.targeting}
						pos={pos}
						opacity={pos.opacity}
					/>
				)}
			</Tween>
		);
	}

	render() {
		const props = this.props,
			children = [];
		for (const id of props.things) {
			const obj = props.game.byId(id),
				pos = ui.tgtToPos(obj, props.p1id);
			children.push(this.makeThing(id, obj, pos, 1));
		}
		for (const [id, pos] of this.state.death) {
			const obj = props.game.byId(id);
			children.push(this.makeThing(id, obj, pos, 0));
		}
		return children;
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
					left: '800px',
					top: `${540 - foeplays.length * 20}px`,
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

const MatchView = connect(({ user, opts, nav }) => ({
	user,
	lofiArt: opts.lofiArt ?? false,
	playByPlayMode: opts.playByPlayMode,
	expectedDamageSamples: opts.expectedDamageSamples || '4',
	navProps: nav.props,
}))(
	class Match extends Component {
		constructor(props) {
			super(props);
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
				gameHash: null,
				expectedDamage: new Int16Array(2),
				replayindex: 0,
				replayhistory: [props.game],
				player1: player1.id,
				player2: player1.foeId,
				fxid: 0,
				startPos: new Map(),
				endPos: new Map(),
				fxTextPos: new Map(),
				fxStatChange: new Map(),
				effects: new Set(),
				effectId: 0,
				hovercard: null,
				hoverx: null,
				hovery: null,
				line0: null,
				line1: null,
				spellid: 0,
				spells: [],
				popup: props.game.data.quest?.opentext,
				popupidx: 0,
			};
		}

		Text = (key, state, newstate, id, text, onRest) => {
			let offset;
			const { fxid } = newstate;
			newstate.fxTextPos = updateMap(
				newstate.fxTextPos ?? state.fxTextPos,
				id,
				(pos = 0) => (offset = pos) + 16,
			);
			const pos = this.idtrack.get(id) ?? { x: -99, y: -99 };
			const y0 = pos.y + offset;
			const TextEffect = pos && (
				<Animation
					key={key}
					proc={ms => {
						if (ms > 360) {
							this.setState(state => {
								const effects = new Set(state.effects);
								effects.delete(TextEffect);
								const st = {
									fxTextPos: updateMap(
										state.fxTextPos,
										id,
										pos => pos && pos - 16,
									),
									effects,
								};
								return onRest ? onRest(state, st) : st;
							});
							return null;
						}
						const yy = ms / 5;
						return {
							y: y0 + yy,
							fade: 1 - Math.tan(yy / 91),
						};
					}}>
					{state => (
						<Components.Text
							text={text}
							style={{
								position: 'absolute',
								left: `${pos.x}px`,
								top: `${state.y}px`,
								opacity: `${state.fade}`,
								zIndex: '5',
								transform: 'translate(-50%,-50%)',
								textAlign: 'center',
								pointerEvents: 'none',
								textShadow: '1px 1px 2px #000',
							}}
						/>
					)}
				</Animation>
			);
			return TextEffect;
		};

		StatChange = (key, state, newstate, id, hp, atk) => {
			if (!newstate.fxStatChange) newstate.fxStatChange = state.fxStatChange;
			let oldentry, newentry;
			newstate.fxStatChange = updateMap(newstate.fxStatChange, id, e => {
				oldentry = e;
				newentry = e ? { ...e } : { atk: 0, hp: 0, dom: null };
				newentry.hp += hp;
				newentry.atk += atk;
				newentry.dom = this.Text(
					key,
					state,
					newstate,
					id,
					`${newentry.atk > 0 ? '+' : ''}${newentry.atk}|${
						newentry.hp > 0 ? '+' : ''
					}${newentry.hp}`,
					(state, st) => {
						st.fxStatChange = new Map(state.fxStatChange);
						st.fxStatChange.delete(id);
						return st;
					},
				);
				return newentry;
			});
			if (!newstate.effects) newstate.effects = new Set(state.effects);
			if (oldentry) {
				newstate.effects.delete(oldentry.dom);
			}
			newstate.effects.add(newentry.dom);
		};

		applyNext = (cmd, iscmd) => {
			const { game } = this.props,
				{ turn } = game,
				prehash = iscmd || game.hash();
			if (cmd.x === 'cast' || cmd.x === 'end') {
				let play;
				if (cmd.x === 'cast') {
					const c = game.byId(cmd.c),
						isSpell = c.type === etg.Spell;
					play = {
						card: c.card,
						element: c.card.element,
						costele: isSpell ? c.costele : c.castele,
						cost: isSpell ? c.cost : c.cast,
						name: isSpell ? c.card.name : skillName(c, c.getSkill('cast')),
						upped: c.card.upped,
						shiny: c.card.shiny,
						c: cmd.c,
						t: cmd.t,
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
					const c = cmd.x === 'cast' && cmd.c && game.byId(cmd.c),
						t = cmd.x === 'cast' && cmd.t && game.byId(cmd.t);
					if (c && c.ownerId !== this.state.player1 && c.owner.isCloaked()) {
						return null;
					}
					const foeplays = new Map(state.foeplays),
						delta = { foeplays };
					foeplays.set(turn, (foeplays.get(turn) ?? []).concat([play]));
					if (
						cmd.x === 'cast' &&
						iscmd &&
						this.props.playByPlayMode !== 'disabled'
					) {
						delta.spells = state.spells.concat([
							{ id: state.spellid, spell: play },
						]);
						delta.spellid = state.spellid + 1;
					}
					return delta;
				});
			}
			const effects = game.next(cmd);
			if (
				!iscmd &&
				game.data.players.some(
					pl => pl.user && pl.user !== this.props.user.name,
				)
			) {
				sock.userEmit('move', {
					id: this.props.gameid,
					prehash,
					hash: game.hash(),
					cmd,
				});
			}
			this.gameStep(game);
			this.setState(state => {
				const newstate = {};
				let { effectId } = state;
				for (let idx = 0; idx < effects.length; idx += 3) {
					const kind = enums.Fx[effects[idx]],
						id = effects[idx + 1],
						param = effects[idx + 2];
					effectId++;
					switch (kind) {
						case 'StartPos':
							newstate.startPos = (
								newstate.startPos ?? new Map(state.startPos)
							).set(id, param);
							break;
						case 'EndPos':
							if (!newstate.startPos)
								newstate.startPos = new Map(state.startPos);
							newstate.startPos.delete(id);
							newstate.endPos = (newstate.endPos ?? new Map(state.endPos)).set(
								id,
								param,
							);
							break;
						case 'Card':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(
									effectId,
									state,
									newstate,
									id,
									game.Cards.Codes[param].name,
								),
							);
							break;
						case 'Poison':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(effectId, state, newstate, id, `Poison ${param}`),
							);
							break;
						case 'Delay':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(effectId, state, newstate, id, `Delay ${param}`),
							);
							break;
						case 'Freeze':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(effectId, state, newstate, id, `Freeze ${param}`),
							);
							break;
						case 'Dmg':
							this.StatChange(effectId, state, newstate, id, -param, 0);
							break;
						case 'Atk':
							this.StatChange(effectId, state, newstate, id, 0, param);
							break;
						case 'LastCard':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							const playerName =
								game.data.players[game.byId(id).getIndex()].name;
							const LastCardEffect = (
								<Animation
									key={effectId}
									proc={ms => {
										if (ms > 864 * Math.PI) {
											this.setState(state => {
												const effects = new Set(state.effects);
												effects.delete(LastCardEffect);
												return { effects };
											});
											return null;
										}
										return { opacity: Math.min(Math.sin(ms / 864) * 1.25, 1) };
									}}>
									{({ opacity }) => (
										<LastCard opacity={opacity} name={playerName} />
									)}
								</Animation>
							);
							newstate.effects.add(LastCardEffect);
							break;
						case 'Heal':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(effectId, state, newstate, id, `+${param}`),
							);
							break;
						case 'Lives':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(effectId, state, newstate, id, `${param} lives`),
							);
							break;
						case 'Quanta':
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(
									effectId,
									state,
									newstate,
									id,
									`${param & 255}:${param >> 8}`,
								),
							);
							break;
						case 'Sfx':
							playSound(wasm.Sfx[param]);
							break;
						default:
							if (!newstate.effects) newstate.effects = new Set(state.effects);
							newstate.effects.add(
								this.Text(effectId, state, newstate, id, kind),
							);
							break;
					}
				}
				newstate.effectId = effectId;
				return newstate;
			});
			const newTurn = game.turn;
			if (newTurn !== turn) {
				const pl = game.byId(newTurn);
				if (pl.data.user === this.props.user.name) {
					this.setState({ player1: newTurn });
				}
				this.setState(state => ({
					foeplays: new Map(state.foeplays).set(newTurn, []),
				}));
			}
		};

		static getDerivedStateFromProps(props, state) {
			if (props.game.replay.length !== state.gameHash) {
				const player1 = props.game.byId(
					props.replay ? props.game.turn : state.player1,
				);
				return {
					gameHash: props.game.replay.length,
					expectedDamage: props.game.expectedDamage(
						props.expectedDamageSamples | 0 || 4,
					),
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
					gclone.next(this.props.replay.moves[history.length - 1], false);
					history.push(gclone);
				}
			}
			const game = (newstate.replayhistory ?? state.replayhistory)[idx];
			newstate.player1 = game.turn;
			newstate.player2 = game.get_foe(game.turn);
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
				: this.state.game ?? this.props.game;

		gotoResult = () => {
			const { game, user } = this.props;
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
			if (game.Cards.Names.Relic) {
				this.props.dispatch(
					store.doNav(import('../vanilla/views/Result.jsx'), {
						game: game,
					}),
				);
			} else {
				this.props.dispatch(
					store.doNav(import('./Result.jsx'), {
						game: game,
						streakback: this.streakback,
					}),
				);
			}
		};

		endClick = (discard = 0) => {
			const { game } = this.props;
			if (
				game.turn === this.state.player1 &&
				game.phase === wasm.Phase.Mulligan
			) {
				this.applyNext({ x: 'accept' });
			} else if (game.winner) {
				this.gotoResult();
			} else if (game.turn === this.state.player1) {
				if (discard === 0 && game.full_hand(this.state.player1)) {
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
					game.phase === wasm.Phase.Mulligan &&
					!game.empty_hand(this.state.player1)
				) {
					this.applyNext({ x: 'mulligan' });
				} else if (this.state.targeting) {
					this.setState({ targeting: null });
				}
			}
		};

		resignClick = () => {
			if (this.props.replay) {
				this.props.dispatch(store.doNav(import('./Challenge.jsx'), {}));
			} else if (
				this.props.game.winner ||
				this.props.game.get(this.state.player1, 'resigned')
			) {
				this.gotoResult();
			} else if (!this.state.resigning) {
				this.setState({ resigning: true });
			} else {
				this.applyNext({ x: 'resign', c: this.state.player1 });
				if (this.props.game.winner) this.gotoResult();
			}
		};

		thingClick = id => {
			const { game } = this.props;
			this.clearCard();
			if (this.props.replay || game.phase !== wasm.Phase.Play) return;
			const obj = game.byId(id);
			if (this.state.targeting) {
				if (this.state.targeting.filter(obj)) {
					this.state.targeting.cb(obj);
				}
			} else if (obj.ownerId === this.state.player1 && obj.canactive()) {
				const cb = tgt => this.applyNext({ x: 'cast', c: obj.id, t: tgt?.id });
				if (obj.type === etg.Spell && obj.card.type !== etg.Spell) {
					cb();
				} else {
					const requiresTarget = game.requiresTarget(obj.id);
					if (!requiresTarget) {
						cb();
					} else {
						this.setState({
							targeting: {
								filter: tgt => game.canTarget(obj.id, tgt.id),
								cb: tgt => {
									cb(tgt);
									this.setState({ targeting: null });
								},
								text: skillName(obj, obj.getSkill('cast')),
								src: obj,
							},
						});
					}
				}
			}
		};

		gameStep(game) {
			const turn = game.byId(game.turn);
			if (turn.data.ai === 1) {
				if (game.phase <= wasm.Phase.Play) {
					aiWorker
						.send({
							data: {
								seed: game.data.seed,
								set: game.data.set,
								players: game.data.players,
							},
							moves: game.replay,
						})
						.then(e => {
							const now = Date.now();
							if (game.phase === wasm.Phase.Play && now < this.aiDelay) {
								return new Promise(resolve =>
									setTimeout(() => resolve(e), this.aiDelay - now),
								);
							} else {
								return Promise.resolve(e);
							}
						})
						.then(e => {
							this.aiDelay =
								Date.now() + (game.turn === this.state.player1 ? 2000 : 200);
							this.applyNext(e.data.cmd, true);
						});
				}
			}
		}

		onkeydown = e => {
			if (e.target.tagName === 'TEXTAREA') return;
			const kc = e.which,
				ch = e.key ?? String.fromCharCode(kc);
			let chi;
			if (kc === 27) {
				this.resignClick();
			} else if (ch === ' ' || kc === 13) {
				this.endClick();
			} else if (ch === '\b' || ch === '0') {
				this.cancelClick();
			} else if (~(chi = 'sw'.indexOf(ch))) {
				this.thingClick(chi ? this.state.player2 : this.state.player1);
			} else if (~(chi = 'qa'.indexOf(ch))) {
				const { shieldId } = this.props.game.byId(
					chi ? this.state.player2 : this.state.player1,
				);
				if (shieldId !== 0) this.thingClick(shieldId);
			} else if (~(chi = 'ed'.indexOf(ch))) {
				const { weaponId } = this.props.game.byId(
					chi ? this.state.player2 : this.state.player1,
				);
				if (weaponId !== 0) this.thingClick(weaponId);
			} else if (~(chi = '12345678'.indexOf(ch))) {
				const card = this.props.game.byId(this.state.player1).handIds[chi];
				if (card) this.thingClick(card);
			} else if (ch === 'p') {
				if (
					this.props.game.turn === this.state.player1.id &&
					this.state.player2.id !== this.state.player1.foeId
				) {
					this.applyNext({ x: 'foe', t: this.state.player2.id });
				}
			} else if (ch === 'l' && this.props.gameid) {
				sock.userEmit('reloadmoves', { id: this.props.gameid });
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
							!this.props.game.get(nextId, 'out')
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
				!this.props.noloss &&
				!game.data.endurance &&
				!game.Cards.Names.Relic &&
				(game.data.level !== undefined || wasPvP)
			) {
				sock.userExec('addloss', {
					pvp: wasPvP,
					l: game.data.level,
					g: -(game.data.cost | 0),
				});
				this.streakback = user.streak[game.data.level];
			}
			dispatch(
				store.setCmds({
					move: ({ cmd, hash }) => {
						const { game } = this.props;
						if (
							(!cmd.c || game.has_id(cmd.c)) &&
							(!cmd.t || game.has_id(cmd.t))
						) {
							this.applyNext(cmd, true);
							if (game.hash() === hash) return;
						}
						sock.userEmit('reloadmoves', { id: this.props.gameid });
					},
					reloadmoves: ({ moves }) => {
						this.props.dispatch(
							store.doNav(Promise.resolve({ default: MatchView }), {
								...this.props.navProps,
								game: game.withMoves(moves),
								noloss: true,
							}),
						);
					},
				}),
			);
			this.gameStep(game);
		}

		componentDidMount() {
			if (!this.props.replay) {
				if (!this.props.game.data.spectate) {
					document.addEventListener('keydown', this.onkeydown);
					window.addEventListener('beforeunload', this.onbeforeunload);
				}
				this.startMatch(this.props);
			}
		}

		componentWillUnmount() {
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
				hovercard: null,
				tooltip: null,
				line0: null,
				line1: null,
			});
		};

		setCard(e, card, x) {
			this.setState({
				hovercard: card,
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

			if (game.phase !== wasm.Phase.End) {
				turntell = this.state.targeting
					? this.state.targeting.text
					: `${game.turn === player1.id ? 'Your' : 'Their'} turn${
							game.phase > wasm.Phase.Mulligan
								? ''
								: game.players[0] === player1.id
								? "\nYou're first"
								: "\nYou're second"
					  }`;
				if (game.turn === player1.id) {
					endText = this.state.targeting
						? ''
						: game.phase === wasm.Phase.Play
						? 'End Turn'
						: game.turn === player1.id
						? 'Accept'
						: '';
					if (game.phase !== wasm.Phase.Play) {
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
			const things = [];
			for (let j = 0; j < 2; j++) {
				const pl = j ? player2 : player1,
					plpos = ui.tgtToPos(pl, player1.id),
					handOverlay =
						pl.casts === 0
							? 12
							: pl.getStatus('sanctuary')
							? 8
							: (pl.getStatus('nova') >= 2 || pl.getStatus('nova2') >= 1) &&
							  (pl.id !== player1.id ||
									pl.handIds.some(id => {
										const card = game.Cards.Codes[game.get(id, 'card')];
										return card && card.isOf(game.Cards.Names.Nova);
									}))
							? 1
							: null;
				this.idtrack.set(pl.id, plpos);
				children.push(
					<div
						key={j}
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
						onClick={() => this.thingClick(pl.id)}
						onMouseOver={e => this.setInfo(e, pl)}
						onMouseMove={e => this.setInfo(e, pl)}
					/>,
					<span
						key={`${j}mark`}
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
				);
				if (pl.getStatus('sosa')) {
					children.push(
						<div
							key={`${j}sosa`}
							className={'ico sacrifice'}
							style={{
								position: 'absolute',
								left: '0',
								top: j ? '7px' : '502px',
								pointerEvents: 'none',
							}}
						/>,
					);
				}
				if (pl.getStatus('sabbath')) {
					children.push(
						<span
							key={`${j}sabbath`}
							className="ico sabbath"
							style={{
								position: 'absolute',
								left: '0',
								top: j ? '96px' : '300px',
							}}
						/>,
					);
				}
				if (pl.getStatus('drawlock')) {
					children.push(
						<span
							key={`${j}drawlock`}
							style={{
								position: 'absolute',
								left: '95px',
								top: j ? '250px' : '543px',
								width: '48px',
								height: '48px',
								backgroundColor: '#931',
							}}
						/>,
					);
				} else if (pl.getStatus('protectdeck')) {
					children.push(
						<span
							key={`${j}protectdeck`}
							style={{
								position: 'absolute',
								left: '95px',
								top: j ? '250px' : '543px',
								width: '48px',
								height: '48px',
								backgroundColor: '#ede',
							}}
						/>,
					);
				}
				if (handOverlay) {
					children.push(
						<span
							key={`${j}handOverlay`}
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
						/>,
					);
				}
				things.push(...game.game.visible_instances(pl.id, j === 0, cloaked));
				const qx = 0,
					qy = j ? 106 : 308,
					plquanta = pl.quanta;
				for (let k = 1; k < 13; k++) {
					children.push(
						<span
							key={`${j}q${k}`}
							className={'ico ce' + k}
							style={{
								position: 'absolute',
								left: `${qx + (k & 1 ? 2 : 48)}px`,
								top: `${qy + Math.floor((k - 1) / 2) * 18}px`,
								fontSize: '16px',
								pointerEvents: 'none',
								paddingLeft: '16px',
							}}>
							&nbsp;
							{plquanta[k] || ''}
						</span>,
					);
				}
				children.push(
					<div
						key={`${j}hpbg`}
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
						? '\n(Not targeted)'
						: ''
				}`;
				children.push(
					<Tween
						key={`${j}hp`}
						x1={x1}
						x2={x2}
						compare={(prev, next) => prev.x1 === next.x1 && prev.x2 === next.x2}
						proc={(ms, prev, next) => {
							if (ms > 96 * Math.PI) return next;
							return {
								x1: prev.x1 + (next.x1 - prev.x1) * Math.sin(ms / 192),
								x2: prev.x2 + (next.x2 - prev.x2) * Math.sin(ms / 192),
							};
						}}>
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
					</Tween>,
					<Components.Text
						key={`${j}hptext`}
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
						key={`${j}deck`}
						className={pl.deck_length ? 'ico ccback' : ''}
						style={{
							position: 'absolute',
							left: '103px',
							top: j ? '258px' : '551px',
							textAlign: 'center',
							paddingTop: '7px',
							pointerEvents: 'none',
							fontSize: '18px',
							textShadow: '2px 2px 1px #000,2px 2px 2px #000',
							zIndex: '3',
						}}>
						{pl.deck_length || '0!!'}
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
					{cloaked && cloaksvg}
					{this.state.showFoeplays ? (
						<FoePlays
							idtrack={this.idtrack}
							foeplays={this.state.foeplays.get(player2.id)}
							setCard={(e, play) => this.setCard(e, play, e.pageX)}
							setLine={(line0, line1) => this.setState({ line0, line1 })}
							clearCard={this.clearCard}
							showGame={game => this.setState({ game })}
						/>
					) : (
						this.props.playByPlayMode !== 'disabled' && (
							<SpellDisplay
								playByPlayMode={this.props.playByPlayMode}
								idtrack={this.idtrack}
								game={game}
								spells={this.state.spells}
								removeSpell={id => {
									this.setState(state => ({
										spells: state.spells.filter(x => x.id !== id),
									}));
								}}
							/>
						)
					)}
					{children}
					<Things
						startPos={this.state.startPos}
						endPos={this.state.endPos}
						idtrack={this.idtrack}
						lofiArt={props.lofiArt}
						game={game}
						p1id={player1.id}
						setInfo={this.setInfo}
						onMouseOut={this.clearCard}
						onClick={this.thingClick}
						targeting={this.state.targeting}
						things={things}
					/>
					{game.game.has_flooding() && floodsvg}
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
						{`${
							[
								'Commoner\n',
								'Mage\n',
								'Champion\n',
								'Demigod\n',
								'Arena1\n',
								'Arena2\n',
							][game.data.level] ||
							(player2.data.leader !== undefined
								? `${
										game.playerDataByIdx(player2.data.leader).name ||
										player2.data.leader
								  }\n`
								: '')
						}${player2.data.name || '-'}`}
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
						<ArrowLine
							x0={this.state.line0.x}
							y0={this.state.line0.y}
							x1={this.state.line1.x}
							y1={this.state.line1.y}
						/>
					)}
					<Components.Card
						x={this.state.hoverx}
						y={this.state.hovery}
						card={this.state.hovercard}
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
									zIndex: '2',
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
						value={
							props.replay
								? 'Exit'
								: this.state.resigning
								? 'Confirm'
								: 'Resign'
						}
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
						(game.turn === player1.id || !!game.winner) && (
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
									top: '560px',
								}}>
								{game.game.aieval().toFixed(2)}
							</span>
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
								{game.countPlies()}
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
export default MatchView;

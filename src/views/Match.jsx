import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react';
import { useSelector } from 'react-redux';

import { playSound } from '../audio.js';
import * as ui from '../ui.js';
import * as etg from '../etg.js';
import { encodeCode, asShiny } from '../etgutil.js';
import * as mkAi from '../mkAi.js';
import * as sock from '../sock.jsx';
import * as Components from '../Components/index.jsx';
import * as store from '../store.jsx';
import { mkQuestAi } from '../Quest.js';
import enums from '../enum.json' assert { type: 'json' };
import * as wasm from '../rs/pkg/etg.js';
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
	firebolt: (c, t) => 3 + (((c.owner.quanta[etg.Fire] - c.card.cost) / 4) | 0),
	drainlife: (c, t) =>
		2 + (((c.owner.quanta[etg.Darkness] - c.card.cost) / 5) | 0),
	icebolt: (c, t) => {
		const bolts = ((c.owner.quanta[etg.Water] - c.card.cost) / 5) | 0;
		return `${2 + bolts} ${35 + bolts * 5}%`;
	},
	catapult: (c, t) =>
		Math.ceil(
			(t.truehp() * (t.getStatus('frozen') ? 150 : 100)) / (t.truehp() + 100),
		),
	corpseexplosion: (c, t) => 1 + ((c.truehp() / 8) | 0),
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

function Tween(props) {
	const start = useRef(null),
		raf = useRef(null),
		[state, setState] = useState(props.initial ?? props),
		next = useRef(props),
		prev = useRef(props.initial ?? props);

	if (!props.compare(next.current, props)) {
		start.current = null;
		next.current = props;
		prev.current = state;
	}

	useEffect(() => {
		const step = ts => {
			start.current ??= ts;
			const newstate = props.proc(
				ts - start.current,
				prev.current,
				next.current,
			);
			setState(newstate);
			if (newstate !== next.current) raf.current = requestAnimationFrame(step);
		};
		raf.current = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf.current);
	}, [next.current, props.proc]);

	return props.children(state);
}

function Animation({ proc }) {
	const [child, setChild] = useState(null);
	useEffect(() => {
		let start = null,
			raf = null;
		const step = ts => {
			start ??= ts;
			setChild(proc(ts - start));
			raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, []);
	return child;
}

function PagedModal(props) {
	const [idx, setIdx] = useState(0);
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
					style={{ visibility: idx > 0 ? 'visible' : 'hidden' }}
					onClick={() => setIdx(idx - 1)}
				/>
				&emsp;
				{idx < props.pages.length - 1 && (
					<>
						<input value="Next" type="button" onClick={() => setIdx(idx + 1)} />
						&emsp;
					</>
				)}
				<input
					value={idx < props.pages.length - 1 ? 'Skip' : 'Okay'}
					type="button"
					onClick={props.onClose}
				/>
				<span className="floatRight">
					{`${idx + 1} / ${props.pages.length}`}
				</span>
			</div>
			{props.pages[idx]}
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
	return useMemo(
		() =>
			props.spells.map(({ id, spell, t }, i) => {
				const p1 = props.getIdTrack(spell.t);
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
							return (
								<>
									<Components.CardImage
										card={spell}
										style={{
											position: 'absolute',
											left: '800px',
											top: `${yc}px`,
											opacity: opacity,
											zIndex: '3',
											pointerEvents: 'none',
										}}
									/>
									{p1 && props.playByPlayMode !== 'noline' && (
										<ArrowLine
											opacity={opacity}
											x0={800}
											y0={yc + 10}
											x1={p1.x}
											y1={p1.y}
										/>
									)}
								</>
							);
						}}
					/>
				);
			}),
		[props.spells, props.getIdTrack],
	);
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

function ThingInst(props) {
	const setInfo = e => props.setInfo(e, props.game.byId(props.id), props.pos.x);

	const onClick = () => props.onClick(props.id);

	const { dom, faceDown } = useMemo(() => {
		const { game, p1id, id } = props,
			obj = game.byId(id);
		if (!game.has_id(id)) {
			return { faceDown: false, dom: null };
		}
		const children = [],
			isSpell = obj.type === etg.Spell,
			{ card } = obj,
			bgcolor = ui.maybeLightenStr(card);
		const faceDown =
			isSpell && obj.ownerId !== p1id && !game.get(p1id, 'precognition');
		if (faceDown) {
			return {
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
	}, [props.game.replay.length, props.id, props.p1id]);

	if (dom === null) return null;
	const { game, p1id, pos } = props,
		obj = game.byId(props.id),
		isSpell = obj.type === etg.Spell;

	return (
		<div
			className={`inst ${isSpell ? 'handinst ' : ''}${tgtclass(
				p1id,
				obj,
				props.targeting,
			)}`}
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
			onMouseMove={!faceDown && props.setInfo ? setInfo : undefined}
			onMouseOver={!faceDown && props.setInfo ? setInfo : undefined}
			onMouseLeave={props.onMouseOut}
			onClick={onClick}>
			{dom}
		</div>
	);
}

function thingTweenCompare(prev, next) {
	return (
		prev.x === next.x && prev.y === next.y && prev.opacity === next.opacity
	);
}
function makeThing(props, state, id, thingTweenProc, obj, pos, opacity) {
	return (
		<Tween
			key={id}
			id={id}
			initial={state.current.birth.get(id)}
			x={pos.x}
			y={pos.y}
			opacity={opacity}
			compare={thingTweenCompare}
			proc={thingTweenProc}>
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

function Things(props) {
	const state = useRef(null);
	if (
		state.current &&
		(props.things.length !== state.current.things.length ||
			!props.things.every(id => state.current.things.has(id)))
	) {
		const things = new Set(props.things),
			{ birth, death } = state.current;
		for (const id of death.keys()) {
			if (things.has(id)) {
				death.delete(id);
			}
		}
		for (const id of things) {
			if (!state.current.things.has(id)) {
				const start = props.startPos.get(id);
				let pos;
				if (start < 0) {
					pos = {
						x: 103,
						y: -start === props.p1id ? 551 : 258,
					};
				} else if (start) {
					pos = { x: -99, y: -99, ...props.getIdTrack(start) };
				} else {
					pos = ui.tgtToPos(props.game.byId(id), props.p1id);
				}
				if (pos) {
					pos.opacity = 0;
					birth.set(id, pos);
				}
			}
		}
		for (const id of state.current.things) {
			if (!things.has(id) && props.game.has_id(id)) {
				const endpos = props.endPos.get(id);
				let pos;
				if (endpos < 0) {
					pos = {
						x: 103,
						y: -endpos === props.p1id ? 551 : 258,
					};
				} else {
					pos = props.getIdTrack(endpos || id);
				}
				if (pos) death.set(id, pos);
			}
		}
		state.current.things = things;
	} else {
		state.current = {
			things: new Set(props.things),
			death: new Map(),
			birth: new Map(),
		};
	}

	const thingTweenProc = useCallback(
		(ms, prev, next) => {
			const id = next.id;
			if (ms > 96 * Math.PI) {
				if (next.opacity === 0) {
					state.current.birth.delete(id);
					state.current.death.delete(id);
				}
				return next;
			}
			const pos = {
				x: prev.x + (next.x - prev.x) * Math.sin(ms / 192),
				y: prev.y + (next.y - prev.y) * Math.sin(ms / 192),
				opacity:
					prev.opacity + (next.opacity - prev.opacity) * Math.sin(ms / 192),
			};
			props.setIdTrack(id, { x: pos.x, y: pos.y });
			return pos;
		},
		[props.setIdTrack],
	);

	const children = [];
	for (const id of props.things) {
		const obj = props.game.byId(id),
			pos = ui.tgtToPos(obj, props.p1id);
		children.push(makeThing(props, state, id, thingTweenProc, obj, pos, 1));
	}
	for (const [id, pos] of state.current.death) {
		const obj = props.game.byId(id);
		children.push(makeThing(props, state, id, thingTweenProc, obj, pos, 0));
	}
	return children;
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

function FoePlays({ getIdTrack, foeplays, setCard, clearCard, showGame }) {
	const [line, setLine] = useState(null);
	return (
		!!foeplays && (
			<>
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
									const line0 = getIdTrack(play.c),
										line1 = getIdTrack(play.t);
									setLine(
										<ArrowLine
											x0={line0.x}
											y0={line0.y}
											x1={line1.x}
											y1={line1.y}
										/>,
									);
								} else {
									setLine(null);
								}
							}}
							onClick={() => showGame(play.game)}
							onMouseOut={() => {
								clearCard();
								setLine(null);
							}}
						/>
					))}
				</div>
				{line}
			</>
		)
	);
}
function hpTweenProc(ms, prev, next) {
	if (ms > 96 * Math.PI) return next;
	return {
		x1: prev.x1 + (next.x1 - prev.x1) * Math.sin(ms / 192),
		x2: prev.x2 + (next.x2 - prev.x2) * Math.sin(ms / 192),
	};
}
function hpTweenCompare(prev, next) {
	return prev.x1 === next.x1 && prev.x2 === next.x2;
}

const initialSpells = { spellid: 0, spells: [] };
function spellsReducer(state, action) {
	if (typeof action === 'number') {
		return {
			spellid: state.spellid,
			spells: state.spells.filter(x => x.id !== action.id),
		};
	} else {
		return {
			spellid: state.spellid + 1,
			spells: state.spells.concat([
				{
					id: state.spellid,
					spell: action,
				},
			]),
		};
	}
}

const initialEffects = {
	effects: new Set(),
	startPos: new Map(),
	endPos: new Map(),
	fxTextPos: new Map(),
	fxStatChange: new Map(),
	effectId: 0,
};
function effectsReducer(state, action) {
	if (typeof action === 'function') {
		return {
			...state,
			...action(state),
		};
	} else if (action.cmd === 'rm') {
		const neweffects = new Set(state.effects);
		neweffects.delete(action.fx);
		return {
			...state,
			effects: neweffects,
		};
	} else if (action.cmd === 'tpos-16') {
		return {
			...state,
			fxTextPos: updateMap(state.fxTextPos, action.id, pos => pos && pos - 16),
		};
	} else if (action.cmd === 'rmstat') {
		const fxStatChange = new Map(state.fxStatChange);
		fxStatChange.delete(action.id);
		return {
			...state,
			fxStatChange,
		};
	}
}

export default function Match(props) {
	const user = useSelector(({ user }) => user),
		opts = useSelector(({ opts }) => opts),
		navProps = useSelector(({ nav }) => nav.props),
		lofiArt = opts.lofiArt ?? false,
		playByPlayMode = opts.playByPlayMode,
		expectedDamageSamples = opts.expectedDamageSamples | 0 || 4;
	const aiDelay = useRef(0);
	const streakback = useRef(0);
	const [tempgame, setTempgame] = useState(null);
	const [replayhistory, setReplayHistory] = useState([props.game]);
	const [replayindex, setreplayindex] = useState(0);
	const game = props.replay
		? replayhistory[replayindex]
		: tempgame ?? props.game;

	const [p1id, setPlayer1] = useState(() =>
			props.replay
				? props.game.turn
				: props.game.byUser(user ? user.name : '').id,
		),
		player1 = game.byId(p1id);
	const [p2id, setPlayer2] = useState(player1.foeId),
		player2 = game.byId(p2id);

	const idtrackref = useRef(null);
	if (!idtrackref.current) {
		const idtrack = new Map();
		idtrackref.current = {
			idtrack,
			setIdTrack: (id, pos) => idtrack.set(id, pos),
		};
	}
	const { setIdTrack } = idtrackref.current;
	const getIdTrack = useCallback(
		id =>
			id === p1id
				? ui.tgtToPos(game.byId(p1id), p1id)
				: id === p2id
				? ui.tgtToPos(game.byId(p2id), p1id)
				: idtrackref.current.idtrack.get(id),
		[p1id, p2id],
	);
	const [showFoeplays, setShowFoeplays] = useState(false);
	const [resigning, setResigning] = useState(false);
	const [hovercard, setHoverCard] = useState(null);
	const [hovery, setHovery] = useState(null);
	const [tooltip, setTooltip] = useState(null);
	const [foeplays, setFoeplays] = useState(new Map());
	const [spells, spellsDispatch] = useReducer(spellsReducer, initialSpells);
	const [targeting, setTargeting] = useState(null);
	const [effects, effectsDispatch] = useReducer(effectsReducer, initialEffects);
	const [popup, setPopup] = useState(props.game.data.quest?.opentext);

	const Text = (key, state, newstate, id, text, onRest) => {
		let offset;
		newstate.fxTextPos = updateMap(
			newstate.fxTextPos ?? state.fxTextPos,
			id,
			(pos = 0) => (offset = pos) + 16,
		);
		const pos = getIdTrack(id) ?? { x: -99, y: -99 };
		const y0 = pos.y + offset;
		const TextEffect = pos && (
			<Animation
				key={key}
				proc={ms => {
					if (ms > 360) {
						effectsDispatch({ cmd: 'rm', fx: TextEffect });
						effectsDispatch({ cmd: 'tpos-16', id });
						if (onRest) effectsDispatch(onRest);
						return null;
					}
					const yy = ms / 5,
						y = y0 + yy,
						fade = 1 - Math.tan(yy / 91);
					return (
						<Components.Text
							text={text}
							style={{
								position: 'absolute',
								left: `${pos.x}px`,
								top: `${y}px`,
								opacity: `${fade}`,
								zIndex: '5',
								transform: 'translate(-50%,-50%)',
								textAlign: 'center',
								pointerEvents: 'none',
								textShadow: '1px 1px 2px #000',
							}}
						/>
					);
				}}
			/>
		);
		return TextEffect;
	};

	const StatChange = (key, state, newstate, id, hp, atk) => {
		newstate.fxStatChange ??= state.fxStatChange;
		let oldentry, newentry;
		newstate.fxStatChange = updateMap(newstate.fxStatChange, id, e => {
			oldentry = e;
			newentry = e ? { ...e } : { atk: 0, hp: 0, dom: null };
			newentry.hp += hp;
			newentry.atk += atk;
			newentry.dom = Text(
				key,
				state,
				newstate,
				id,
				`${newentry.atk > 0 ? '+' : ''}${newentry.atk}|${
					newentry.hp > 0 ? '+' : ''
				}${newentry.hp}`,
				{ cmd: 'rmstat', id },
			);
			return newentry;
		});
		newstate.effects ??= new Set(state.effects);
		if (oldentry) newstate.effects.delete(oldentry.dom);
		newstate.effects.add(newentry.dom);
	};

	const applyNext = useCallback(
		(cmd, iscmd) => {
			const { game } = props,
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
				const c = cmd.x === 'cast' && cmd.c && game.byId(cmd.c),
					t = cmd.x === 'cast' && cmd.t && game.byId(cmd.t);
				if (c && c.ownerId !== p1id && c.owner.isCloaked()) {
					return null;
				}
				setFoeplays(foeplays =>
					new Map(foeplays).set(
						turn,
						(foeplays.get(turn) ?? []).concat([play]),
					),
				);
				if (cmd.x === 'cast' && iscmd && playByPlayMode !== 'disabled') {
					spellsDispatch(play);
				}
			}
			const effects = game.next(cmd);
			if (
				!iscmd &&
				game.data.players.some(pl => pl.user && pl.user !== user.name)
			) {
				sock.userEmit('move', {
					id: props.gameid,
					prehash,
					hash: game.hash(),
					cmd,
				});
			}
			gameStep(game);
			effectsDispatch(state => {
				const newstate = {};
				let { effectId } = state;
				for (let idx = 0; idx < effects.length; idx += 3) {
					const kind = enums.Fx[effects[idx]],
						id = effects[idx + 1],
						param = effects[idx + 2];
					effectId++;
					switch (kind) {
						case 'StartPos':
							newstate.startPos ??= new Map(state.startPos);
							newstate.startPos.set(id, param);
							break;
						case 'EndPos':
							newstate.startPos ??= new Map(state.startPos);
							newstate.endPos ??= new Map(state.endPos);
							newstate.startPos.delete(id);
							newstate.endPos.set(id, param);
							break;
						case 'Bolt': {
							newstate.effects ??= new Set(state.effects);
							const pos = getIdTrack(id) ?? { x: -99, y: -99 },
								color = ui.strcols[param & 255],
								upcolor = ui.strcols[(param & 255) + 13],
								bolts = (param >> 8) + 1,
								duration = 96 + bolts * 32;
							const BoltEffect = (
								<Animation
									key={effectId}
									proc={ms => {
										if (ms > duration) {
											effectsDispatch({ cmd: 'rm', fx: BoltEffect });
											return null;
										}
										const circles = [];
										for (let i = 0; i < bolts; i++) {
											const r =
												Math.sin((ms / duration) * Math.PI) *
												(12 + Math.sqrt(i));
											for (let j = 0; j < 3; j++) {
												const a = ms / 256 + i / 3 + j * ((Math.PI * 2) / 3);
												circles.push(
													<circle
														key={i * 3 + j}
														cx={64 + Math.cos(a) * (9 + i * 2)}
														cy={64 + Math.sin(a) * (9 + i * 2)}
														r={r}
														fill="url('#g')"
													/>,
												);
											}
										}
										return (
											<svg
												height="128"
												width="128"
												style={{
													position: 'absolute',
													left: `${pos.x - 64}px`,
													top: `${pos.y - 64}px`,
													pointerEvents: 'none',
													zIndex: '4',
												}}>
												<defs>
													<radialGradient id="g">
														<stop
															offset="10%"
															stopColor={upcolor}
															stopOpacity="1"
														/>
														<stop
															offset="60%"
															stopColor={color}
															stopOpacity="0"
														/>
													</radialGradient>
												</defs>
												{circles}
											</svg>
										);
									}}
								/>
							);
							newstate.effects.add(BoltEffect);
							break;
						}
						case 'Card':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(
									effectId,
									state,
									newstate,
									id,
									game.Cards.Codes[param].name,
								),
							);
							break;
						case 'Poison':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(effectId, state, newstate, id, `Poison ${param}`),
							);
							break;
						case 'Delay':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(effectId, state, newstate, id, `Delay ${param}`),
							);
							break;
						case 'Freeze':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(effectId, state, newstate, id, `Freeze ${param}`),
							);
							break;
						case 'Dmg':
							StatChange(effectId, state, newstate, id, -param, 0);
							break;
						case 'Atk':
							StatChange(effectId, state, newstate, id, 0, param);
							break;
						case 'LastCard':
							newstate.effects ??= new Set(state.effects);
							const playerName =
								game.data.players[game.byId(id).getIndex()].name;
							const LastCardEffect = (
								<Animation
									key={effectId}
									proc={ms => {
										if (ms > 864 * Math.PI) {
											effectsDispatch({ cmd: 'rm', fx: LastCardEffect });
											return null;
										}
										return (
											<LastCard
												opacity={Math.min(Math.sin(ms / 864) * 1.25, 1)}
												name={playerName}
											/>
										);
									}}
								/>
							);
							newstate.effects.add(LastCardEffect);
							break;
						case 'Heal':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(effectId, state, newstate, id, `+${param}`),
							);
							break;
						case 'Lightning': {
							newstate.effects ??= new Set(state.effects);
							const pos = getIdTrack(id) ?? { x: -99, y: -99 };
							const LightningEffect = (
								<Animation
									key={effectId}
									proc={ms => {
										if (ms > 128) {
											effectsDispatch({ cmd: 'rm', fx: LightningEffect });
											return null;
										}
										const path = ['M 32 0'];
										for (let i = 1; i < ms; i += 20 * Math.random()) {
											const r = Math.log(i) * 8;
											path.push(
												` L ${
													32 - Math.round(Math.random() * r - r / 2)
												} ${Math.round(i / 2)}`,
											);
										}
										return (
											<svg
												height="64"
												width="64"
												style={{
													position: 'absolute',
													left: `${pos.x - 32}px`,
													top: `${pos.y - 32}px`,
													pointerEvents: 'none',
													zIndex: '4',
												}}>
												<path
													d={path.join('')}
													stroke="#fff"
													strokeWidth="2"
													fill="none"
												/>
											</svg>
										);
									}}
								/>
							);
							newstate.effects.add(LightningEffect);
							break;
						}
						case 'Lives':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(effectId, state, newstate, id, `${param} lives`),
							);
							break;
						case 'Quanta':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(
									effectId,
									state,
									newstate,
									id,
									`${param >> 8}:${param & 255}`,
								),
							);
							break;
						case 'Sfx':
							playSound(wasm.Sfx[param]);
							break;
						default:
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(Text(effectId, state, newstate, id, kind));
							break;
					}
				}
				newstate.effectId = effectId;
				return newstate;
			});
			const newTurn = game.turn;
			if (newTurn !== turn) {
				const pl = game.byId(newTurn);
				if (pl.data.user === user.name) {
					setPlayer1(newTurn);
				}
				setFoeplays(foeplays => new Map(foeplays).set(newTurn, []));
			}
		},
		[props.game, getIdTrack],
	);

	const expectedDamages = useMemo(
		() => props.game.expectedDamage(expectedDamageSamples),
		[props.game, props.game.replay.length, expectedDamageSamples],
	);

	const setReplayIndex = (history, idx) => {
		if (idx >= history.length) {
			history = history.slice();
			setReplayHistory(history);
			while (idx >= history.length) {
				const gclone = history[history.length - 1].clone();
				gclone.next(props.replay.moves[history.length - 1], false);
				history.push(gclone);
			}
		}
		const game = history[idx];
		setreplayindex(idx);
		setPlayer1(game.turn);
		setPlayer2(game.get_foe(game.turn));
	};

	const gotoResult = useCallback(() => {
		const { game } = props;
		if (game.data.arena) {
			sock.userEmit('modarena', {
				aname: game.data.arena,
				won: game.winner !== p1id,
				lv: game.data.level - 4,
			});
		}
		if (game.winner === p1id) {
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
			store.store.dispatch(
				store.doNav(import('../vanilla/views/Result.jsx'), { game }),
			);
		} else {
			store.store.dispatch(
				store.doNav(import('./Result.jsx'), {
					game,
					streakback: streakback.current,
				}),
			);
		}
	}, [props.game]);

	const endClick = useCallback(
		(discard = 0) => {
			const { game } = props;
			if (game.turn === p1id && game.phase === wasm.Phase.Mulligan) {
				applyNext({ x: 'accept' });
			} else if (game.winner) {
				gotoResult();
			} else if (game.turn === p1id) {
				if (discard === 0 && game.full_hand(p1id)) {
					setTargeting({
						filter: obj => obj.type === etg.Spell && obj.ownerId === p1id,
						cb: tgt => {
							endClick(tgt.id);
							setTargeting(null);
						},
						text: 'Discard',
						src: null,
					});
				} else {
					applyNext({
						x: 'end',
						t: discard || undefined,
					});
					setTargeting(null);
				}
			}
		},
		[props.game],
	);

	const cancelClick = useCallback(() => {
		const { game } = props;
		if (resigning) {
			setResigning(false);
		} else if (game.turn === p1id) {
			if (game.phase === wasm.Phase.Mulligan && !game.empty_hand(p1id)) {
				applyNext({ x: 'mulligan' });
			} else {
				setTargeting(null);
			}
		}
	}, [props.game, p1id, resigning]);

	const resignClick = useCallback(() => {
		if (props.replay) {
			store.store.dispatch(store.doNav(import('./Challenge.jsx')));
		} else if (props.game.winner || props.game.get(p1id, 'resigned')) {
			gotoResult();
		} else if (!resigning) {
			setResigning(true);
		} else {
			applyNext({ x: 'resign', c: p1id });
			if (props.game.winner) gotoResult();
		}
	}, [props.game, props.replay, resigning]);

	const thingClick = useCallback(
		id => {
			const { game } = props;
			clearCard();
			if (props.replay || game.phase !== wasm.Phase.Play) return;
			const obj = game.byId(id);
			if (targeting) {
				if (targeting.filter(obj)) {
					targeting.cb(obj);
				}
			} else if (obj.ownerId === p1id && obj.canactive()) {
				const cb = tgt => applyNext({ x: 'cast', c: obj.id, t: tgt?.id });
				if (obj.type === etg.Spell && obj.card.type !== etg.Spell) {
					cb();
				} else {
					const requiresTarget = game.requiresTarget(obj.id);
					if (!requiresTarget) {
						cb();
					} else {
						setTargeting({
							filter: tgt => game.canTarget(obj.id, tgt.id),
							cb: tgt => {
								cb(tgt);
								setTargeting(null);
							},
							text: skillName(obj, obj.getSkill('cast')),
							src: obj,
						});
					}
				}
			}
		},
		[props.game, props.replay, targeting],
	);

	const gameStep = useCallback(
		game => {
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
							if (game.phase === wasm.Phase.Play && now < aiDelay.current) {
								return new Promise(resolve =>
									setTimeout(() => resolve(e), aiDelay.current - now),
								);
							} else {
								return Promise.resolve(e);
							}
						})
						.then(e => {
							aiDelay.current = Date.now() + (game.turn === p1id ? 2000 : 200);
							applyNext(e.data.cmd, true);
						});
				}
			}
		},
		[game],
	);

	const isMultiplayer = game.data.players.some(
		pl => pl.user && pl.user !== user.name,
	);

	const onkeydown = useCallback(
		e => {
			if (e.target.tagName === 'TEXTAREA') return;
			const kc = e.which,
				ch = e.key ?? String.fromCharCode(kc);
			let chi;
			if (kc === 27) {
				resignClick();
			} else if (ch === ' ' || kc === 13) {
				endClick();
			} else if (ch === '\b' || ch === '0') {
				cancelClick();
			} else if (~(chi = 'sw'.indexOf(ch))) {
				thingClick(chi ? p2id : p1id);
			} else if (~(chi = 'qa'.indexOf(ch))) {
				const { shieldId } = props.game.byId(chi ? p2id : p1id);
				if (shieldId !== 0) thingClick(shieldId);
			} else if (~(chi = 'ed'.indexOf(ch))) {
				const { weaponId } = props.game.byId(chi ? p2id : p1id);
				if (weaponId !== 0) thingClick(weaponId);
			} else if (~(chi = '12345678'.indexOf(ch))) {
				const card = props.game.byId(p1id).handIds[chi];
				if (card) thingClick(card);
			} else if (ch === 'p') {
				if (props.game.turn === p1id && p2id !== player1.foeId) {
					applyNext({ x: 'foe', t: p2id });
				}
			} else if (ch === 'l' && props.gameid) {
				sock.userEmit('reloadmoves', { id: props.gameid });
			} else if (~(chi = '[]'.indexOf(ch))) {
				const { players } = props.game,
					dir = chi ? players.length + 1 : 1;
				let nextId,
					i = 1;
				for (; i < players.length; i++) {
					nextId = players[(players.indexOf(p2id) + i * dir) % players.length];
					if (nextId !== p1id && !props.game.get(nextId, 'out')) {
						break;
					}
				}
				if (i !== players.length) {
					setPlayer2(nextId);
				}
			} else return;
			e.preventDefault();
		},
		[props.game, thingClick, resignClick, cancelClick],
	);

	const onbeforeunload = useCallback(
		e => {
			if (isMultiplayer) {
				e.preventDefault();
				e.returnValue = '';
			}
		},
		[isMultiplayer],
	);

	useEffect(() => {
		if (!props.replay && !props.game.data.spectate) {
			document.addEventListener('keydown', onkeydown);
			window.addEventListener('beforeunload', onbeforeunload);
			return () => {
				document.removeEventListener('keydown', onkeydown);
				window.removeEventListener('beforeunload', onbeforeunload);
			};
		}
	}, [onkeydown, onbeforeunload]);

	useEffect(() => {
		const { game } = props;
		if (
			!props.noloss &&
			!game.data.endurance &&
			!game.Cards.Names.Relic &&
			(game.data.level !== undefined || isMultiplayer)
		) {
			sock.userExec('addloss', {
				pvp: isMultiplayer,
				l: game.data.level,
				g: -(game.data.cost | 0),
			});
			streakback.current = user.streak[game.data.level];
		}
		store.store.dispatch(
			store.setCmds({
				move: ({ cmd, hash }) => {
					const { game } = props;
					if (
						(!cmd.c || game.has_id(cmd.c)) &&
						(!cmd.t || game.has_id(cmd.t))
					) {
						applyNext(cmd, true);
						if (game.hash() === hash) return;
					}
					sock.userEmit('reloadmoves', { id: props.gameid });
				},
				reloadmoves: ({ moves }) => {
					store.store.dispatch(
						store.doNav(Promise.resolve({ default: MatchView }), {
							...navProps,
							game: game.withMoves(moves),
							noloss: true,
						}),
					);
				},
			}),
		);
		gameStep(game);
		return () => store.store.dispatch(store.setCmds({}));
	}, []);

	const setCard = (e, card) => {
		setHoverCard(card);
		setHovery(e.pageY > 300 ? 44 : 300);
	};

	const setInfo = (e, obj, x) => {
		const actinfo =
			targeting && targeting.filter(obj) && activeInfo[targeting.text];
		setTooltip(
			<Components.Text
				className="infobox"
				text={`${obj.info()}${
					actinfo ? '\n' + actinfo(targeting.src, obj) : ''
				}`}
				icoprefix="te"
				style={{
					position: 'absolute',
					left: `${e.pageX}px`,
					top: `${e.pageY}px`,
					zIndex: '5',
				}}
			/>,
		);
		if (obj.type !== etg.Player) {
			setCard(e, obj.card);
		}
	};

	const clearCard = () => {
		setHoverCard(null);
		setTooltip(null);
	};

	const children = [];
	let turntell, endText, cancelText;
	const cloaked = player2.isCloaked();

	if (game.phase !== wasm.Phase.End) {
		turntell = targeting
			? targeting.text
			: `${game.turn === player1.id ? 'Your' : 'Their'} turn${
					game.phase > wasm.Phase.Mulligan
						? ''
						: game.players[0] === player1.id
						? "\nYou're first"
						: "\nYou're second"
			  }`;
		if (game.turn === player1.id) {
			endText = targeting
				? ''
				: game.phase === wasm.Phase.Play
				? 'End Turn'
				: game.turn === player1.id
				? 'Accept'
				: '';
			if (game.phase !== wasm.Phase.Play) {
				cancelText = game.turn === player1.id ? 'Mulligan' : '';
			} else {
				cancelText = targeting || resigning ? 'Cancel' : '';
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
		children.push(
			<div
				key={j}
				className={tgtclass(player1.id, pl, targeting)}
				style={{
					position: 'absolute',
					left: `${plpos.x - 48}px`,
					top: `${plpos.y - 40}px`,
					width: '96px',
					height: '80px',
					border: 'transparent 2px solid',
					zIndex: '4',
				}}
				onClick={() => thingClick(pl.id)}
				onMouseOver={e => setInfo(e, pl)}
				onMouseMove={e => setInfo(e, pl)}
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
						top: `${qy + (((k - 1) / 2) | 0) * 18}px`,
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
		const expectedDamage = expectedDamages[pl.getIndex()];
		const x1 = Math.max(Math.round(96 * (pl.hp / pl.maxhp)), 0),
			x2 = Math.max(x1 - Math.round(96 * (expectedDamage / pl.maxhp)), 0);
		const poison = pl.getStatus('poison'),
			poisoninfo = `${
				poison > 0 ? poison + ' 1:2' : poison < 0 ? -poison + ' 1:7' : ''
			} ${pl.getStatus('neuro') ? ' 1:10' : ''}`;
		const hptext = `${pl.hp}/${pl.maxhp} ${
			!cloaked && expectedDamage ? `(${expectedDamage})` : ''
		}\n${poisoninfo ? `\n${poisoninfo}` : ''}${
			pl.id !== player1.id && pl.id !== player1.foeId ? '\n(Not targeted)' : ''
		}`;
		children.push(
			<Tween
				key={`${j}hp`}
				x1={x1}
				x2={x2}
				compare={hpTweenCompare}
				proc={hpTweenProc}>
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
			{popup && <PagedModal pages={popup} onClose={() => setPopup(null)} />}
			{svgbg}
			{cloaked && cloaksvg}
			{showFoeplays ? (
				<FoePlays
					getIdTrack={getIdTrack}
					foeplays={foeplays.get(p2id)}
					setCard={setCard}
					clearCard={clearCard}
					showGame={setTempgame}
				/>
			) : (
				props.playByPlayMode !== 'disabled' && (
					<SpellDisplay
						playByPlayMode={props.playByPlayMode}
						getIdTrack={getIdTrack}
						game={game}
						spells={spells.spells}
						removeSpell={spellsDispatch}
					/>
				)
			)}
			{children}
			<Things
				startPos={effects.startPos}
				endPos={effects.endPos}
				getIdTrack={getIdTrack}
				setIdTrack={setIdTrack}
				lofiArt={props.lofiArt}
				game={game}
				p1id={player1.id}
				setInfo={setInfo}
				onMouseOut={clearCard}
				onClick={thingClick}
				targeting={targeting}
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
					][game.data.level] ??
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
			{effects.effects}
			<Components.Card x={734} y={hovery} card={hovercard} />
			{tooltip}
			{!!foeplays.get(p2id)?.length && (
				<input
					type="button"
					value={`History ${foeplays.get(p2id).length}`}
					style={{
						position: 'absolute',
						left: '2px',
						top: '270px',
						zIndex: '2',
					}}
					onClick={() => {
						setTempgame(null);
						setShowFoeplays(!showFoeplays);
					}}
				/>
			)}
			<input
				type="button"
				value={props.replay ? 'Exit' : resigning ? 'Confirm' : 'Resign'}
				onClick={resignClick}
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
								onClick={() => endClick()}
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
								onClick={cancelClick}
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
						{replayindex}
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
					{!!replayindex && (
						<input
							type="button"
							value="<"
							onClick={() => setReplayIndex(replayhistory, replayindex - 1)}
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
							onClick={() => setReplayIndex(replayhistory, replayindex + 1)}
							style={{
								position: 'absolute',
								left: '830px',
								top: '520px',
								width: '20px',
							}}
						/>
					)}
					{!!replayindex && (
						<input
							type="button"
							value="<<"
							onClick={() => {
								let idx = replayindex - 1;
								for (; idx >= 1; idx--) {
									const { x } = props.replay.moves[idx - 1];
									if (x === 'end' || x === 'mulligan') break;
								}
								setReplayIndex(replayhistory, Math.max(idx, 0));
							}}
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
							onClick={() => {
								const len = props.replay.moves.length;
								let idx = replayindex + 1;
								for (; idx < len; idx++) {
									const { x } = props.replay.moves[idx];
									if (x === 'end' || x === 'mulligan') break;
								}
								setReplayIndex(replayhistory, Math.min(idx, len));
							}}
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
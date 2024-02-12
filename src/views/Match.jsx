import {
	batch,
	untrack,
	createComputed,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from 'solid-js';
import { Index, For, Show } from 'solid-js/web';

import { playSound } from '../audio.js';
import { strcols, maybeLightenStr } from '../ui.js';
import { encodeCode, asShiny } from '../etgutil.js';
import { mkAi } from '../mkAi.js';
import { userEmit, userExec, setCmds } from '../sock.jsx';
import Card from '../Components/Card.jsx';
import CardImage from '../Components/CardImage.jsx';
import Text from '../Components/Text.jsx';
import * as store from '../store.jsx';
import { mkQuestAi } from '../Quest.js';
import enums from '../enum.json' assert { type: 'json' };
import { Kind, Phase, Sfx } from '../rs/pkg/etg.js';
import AiWorker from '../AiWorker.js';

const Chroma = 0;
const Entropy = 1;
const Death = 2;
const Gravity = 3;
const Earth = 4;
const Life = 5;
const Fire = 6;
const Water = 7;
const Light = 8;
const Air = 9;
const Time = 10;
const Darkness = 11;
const Aether = 12;

const aiWorker = new AiWorker();

function updateMap(map, k, f) {
	return new Map(map).set(k, f(map.get(k)));
}

const redhor = new Uint16Array([140, 172, 900, 300, 172, 900, 460, 172, 900]),
	redver = new Uint16Array([170, 0, 600, 246, 0, 139, 246, 459, 600]),
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
	redren.push([path, ['#421', '#842'][j]]);
}
function svgbg() {
	return (
		<svg
			width="900"
			height="600"
			style="position:absolute;left:0;top:0;z-index:-8;pointer-events:none">
			<path d={redren[0][0]} stroke={redren[0][1]} strokeWidth="1" />
			<path d={redren[1][0]} stroke={redren[1][1]} strokeWidth="1" />
		</svg>
	);
}

function floodsvg() {
	return (
		<svg
			width="900"
			height="600"
			style="position:absolute;left:0;top:0;z-index:1;pointer-events:none;opacity:.4">
			<path
				d="M900 141v317h-700Q162 416 200 375h395Q615 300 595 226h-395Q162 191 200 141"
				fill="#048"
			/>
		</svg>
	);
}

function cloaksvg() {
	return (
		<div style="position:absolute;left:0;top:0;width:900px;height:299px;background-color:#000;z-index:1;pointer-events:none" />
	);
}

function Tween(props) {
	let start = null,
		raf = null,
		prevState = props.initial ?? props.state,
		nextState = props.state;
	const [state, setState] = createSignal(prevState);
	const step = ts => {
		start ??= ts;
		const newState = untrack(() =>
			props.proc(ts - start, prevState, nextState),
		);
		setState(newState);
		if (newState !== nextState) raf &&= requestAnimationFrame(step);
	};
	createEffect(() => {
		if (!props.compare(nextState, props.state)) {
			start = null;
			nextState = props.state;
			prevState = untrack(state);
			if (raf) cancelAnimationFrame(raf);
			raf = requestAnimationFrame(step);
		}
	});
	onCleanup(() => {
		props.unregister?.();
		if (raf) {
			cancelAnimationFrame(raf);
			raf = null;
		}
	});
	if (props.initial) {
		raf = requestAnimationFrame(step);
	}
	return props.children(state);
}

function useAnimation() {
	const [time, setTime] = createSignal(0);
	let raf = null;
	onMount(() => {
		let start = null;
		const step = ts => {
			start ??= ts;
			setTime(ts - start);
			raf &&= requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
	});
	onCleanup(() => {
		if (raf) {
			cancelAnimationFrame(raf);
			raf = null;
		}
	});
	return time;
}

function PagedModal(props) {
	const [idx, setIdx] = createSignal(0);
	return (
		<div
			class="bgbox"
			style="white-space:pre-wrap;z-index:9;position:absolute;left:450px;top:300px;max-width:900px;transform:translate(-50%,-50%)">
			<div>
				<input
					value="Prev"
					type="button"
					style={idx() > 0 ? 'visibility:visible' : 'visibility:hidden'}
					onClick={() => setIdx(idx => idx - 1)}
				/>
				&emsp;
				{idx() < props.pages.length - 1 && (
					<>
						<input
							value="Next"
							type="button"
							onClick={() => setIdx(idx => idx + 1)}
						/>
						&emsp;
					</>
				)}
				<input
					value={idx() < props.pages.length - 1 ? 'Skip' : 'Okay'}
					type="button"
					onClick={props.onClose}
				/>
				<span class="floatRight">{`${idx() + 1} / ${props.pages.length}`}</span>
			</div>
			{props.pages[idx()]}
		</div>
	);
}

function LastCardFx(props) {
	const ms = useAnimation();
	let div;
	createEffect(() => {
		div.style.opacity = Math.sin(ms() / 864) * 1.25;
		if (ms() > 864 * Math.PI) props.setEffects(removeFx(props.self));
	});
	return (
		<div
			ref={div}
			style="position:absolute;left:450px;top:300px;transform:translate(-50%,-50%);font-size:16px;color:#fff;background-color:#000;padding:18px;opacity:0;z-index:8;pointer-events:none">
			{`Last card for ${props.name}`}
		</div>
	);
}

function TextFx(props) {
	const ms = useAnimation();
	createEffect(() => {
		if (ms() > 360) {
			batch(() => {
				props.setEffects(removeFx(props.self));
				props.setEffects(state => ({
					...state,
					fxTextPos: updateMap(
						state.fxTextPos,
						props.id,
						pos => pos && pos - 16,
					),
				}));
				if (props.onRest) props.setEffects(props.onRest);
			});
		}
	});
	const y = () => props.y0 + ms() / 5;
	const fade = () => 1 - Math.tan(ms() / 451);
	return (
		<div
			style={{
				position: 'absolute',
				left: `${props.pos.x}px`,
				top: `${y()}px`,
				opacity: `${fade()}`,
				'z-index': '5',
				transform: 'translate(-50%,-50%)',
				'text-align': 'center',
				'pointer-events': 'none',
				'text-shadow': '1px 1px 2px #000',
			}}>
			<Text text={props.text} />
		</div>
	);
}

function LightningFx(props) {
	const time = useAnimation();
	createEffect(() => {
		if (time() > 128) props.setEffects(removeFx(props.self));
	});
	const path = () => {
		const ms = time();
		let path = 'M 32 0';
		for (let i = 1; i < ms; i += 20 * Math.random()) {
			const r = Math.log(i) * 8;
			path += ` L ${32 - Math.round(Math.random() * r - r / 2)} ${Math.round(
				i / 2,
			)}`;
		}
		return path;
	};
	return (
		<svg
			height="64"
			width="64"
			style={`position:absolute;left:${props.pos.x - 32}px;top:${
				props.pos.y - 32
			}px;pointer-events:none;z-index:4`}>
			<path d={path()} stroke="#fff" strokeWidth="2" fill="none" />
		</svg>
	);
}

function SilenceFx(props) {
	const time = useAnimation();
	createEffect(() => {
		if (time() > 512) props.setEffects(removeFx(props.self));
	});
	return (
		<svg
			height={time() / 4}
			width={time() / 4}
			viewBox="0 0 64 64"
			style={`position:absolute;left:${props.pos.x}px;top:${
				props.pos.y
			}px;transform:translate(-50%,-50%);opacity:${(
				1 -
				time() ** 1.5 / 11584
			).toFixed(2)};pointer-events:none;z-index:4`}>
			<rect x="24" y="16" width="16" height="32" rx="8" fill="#048" />
			<rect x="30" y="48" width="4" height="8" fill="#048" />
			<rect x="26" y="56" width="12" height="2" rx="1" fill="#048" />
			<line x1="20" y1="56" x2="44" y2="8" stroke="#048" />
		</svg>
	);
}

function BoltFx(props) {
	const time = useAnimation();
	createEffect(() => {
		if (time() > props.duration) props.setEffects(removeFx(props.self));
	});
	const circles = () => {
		const ms = time();
		const circles = [];
		for (let i = 0; i < props.bolts; i++) {
			const r = Math.sin((ms / props.duration) * Math.PI) * (12 + Math.sqrt(i));
			for (let j = 0; j < 3; j++) {
				const a = ms / 256 + i / 3 + j * ((Math.PI * 2) / 3);
				circles.push(() => (
					<circle
						cx={64 + Math.cos(a) * (9 + i * 2)}
						cy={64 + Math.sin(a) * (9 + i * 2)}
						r={r}
						fill="url('#g')"
					/>
				));
			}
		}
		return circles;
	};
	return (
		<svg
			height="128"
			width="128"
			style={`position:absolute;left:${props.pos.x - 64}px;top:${
				props.pos.y - 64
			}px;pointer-events:none;z-index:4`}>
			<defs>
				<radialGradient id="g">
					<stop offset="10%" stop-color={props.upcolor} stop-opacity="1" />
					<stop offset="60%" stop-color={props.color} stop-opacity="0" />
				</radialGradient>
			</defs>
			{circles}
		</svg>
	);
}

function SpellDisplayChild(props) {
	const time = useAnimation();
	const p1 = props.getIdTrack(props.spell.t);
	const state = createMemo(() => {
		const ms = time();
		return (
			ms < 50 * Math.PI ?
				{
					yc: props.y * Math.sin(ms / 100),
					opacity: 1 - Math.cos(ms / 100),
				}
			: ms > 1984 ?
				{
					yc: props.y + ms - 1980,
					opacity: 1 - (ms - 1980) / (600 - props.y),
				}
			:	{ yc: props.y, opacity: 1 }
		);
	});
	createEffect(() => {
		if (state().yc > 600) {
			props.setSpells(spells => spells.filter(x => x !== props.spell));
		}
	});
	return (
		<>
			<CardImage
				card={props.spell}
				style={{
					position: 'absolute',
					left: '800px',
					top: `${state().yc}px`,
					opacity: state().opacity,
					'z-index': '3',
					'pointer-events': 'none',
				}}
			/>
			<Show when={p1 && props.playByPlayMode !== 'noline'}>
				<ArrowLine
					opacity={state().opacity}
					x0={800}
					y0={state().yc + 10}
					x1={p1.x}
					y1={p1.y}
				/>
			</Show>
		</>
	);
}

function SpellDisplay(props) {
	return (
		<For each={props.spells}>
			{(spell, i) => (
				<SpellDisplayChild
					{...props}
					spell={spell}
					y={untrack(() => 540 - (props.spells.length - i()) * 20)}
				/>
			)}
		</For>
	);
}

function ArrowLine(props) {
	return (
		<svg
			width="900"
			height="600"
			style={`position:absolute;left:0;top:0;z-index:4;pointer-events:none;opacity:${props.opacity}`}>
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
				marker-end="url(#h)"
				d={`M${props.x0} ${props.y0}L${props.x1} ${props.y1}`}
				stroke="#f84"
				stroke-width="4"
				opacity="0.7"
			/>
		</svg>
	);
}

function Thing(props) {
	const isSpell = () => props.game.get_kind(props.id) === Kind.Spell,
		bgcolor = () => maybeLightenStr(props.game.getCard(props.id)),
		faceDown = () =>
			isSpell() &&
			props.game.get_owner(props.id) !== props.p1id &&
			!props.game.get(props.p1id, 'precognition'),
		setInfo = e => {
			if (!faceDown() && props.setInfo) props.setInfo(e, props.id);
		};

	const visible_status = createMemo(() => {
		const v = props.game.visible_status(props.id);
		const res = [];
		for (let i = 0; i < 11; i++) {
			res.push(!!(v & (1 << i)));
		}
		return res;
	});

	const memo = createMemo(() => {
		if (faceDown()) return {};
		const [topText, statText] = props.game.instance_text(props.id).split('\n');
		return { topText, statText };
	});

	return (
		<div
			class={`${isSpell() ? 'inst handinst' : 'inst'}${tgtclass(
				props.game,
				props.p1id,
				props.id,
				props.targeting,
			)}`}
			style={{
				position: 'absolute',
				left: `${props.pos.x - 32}px`,
				top: `${props.pos.y - 32}px`,
				opacity:
					faceDown() ?
						props.pos.opacity
					:	(props.game.material(props.id) ? 1 : 0.7) * props.pos.opacity,
				color:
					faceDown() ? undefined
					: props.game.getCard(props.id).upped ? '#000'
					: '#fff',
				'z-index': '2',
				'pointer-events': ~props.game.getIndex(props.id) ? undefined : 'none',
			}}
			onMouseMove={e => {
				e.preventDefault();
				if (
					e.buttons & 1 &&
					!props.targeting &&
					(props.opts.shiftDrag || e.shiftKey) &&
					props.game.get_kind(props.id) !== Kind.Spell
				) {
					props.onClick(props.id);
				} else {
					setInfo(e);
				}
			}}
			onMouseOver={setInfo}
			onMouseLeave={props.onMouseOut}
			onClick={[props.onClick, props.id]}>
			<Show
				when={!faceDown()}
				fallback={<div class="ico cback" style="left:2px;top:2px" />}>
				<div
					style={`width:64px;height:64px;pointer-events:none;background-color:${bgcolor()}`}>
					<Show when={!props.opts.lofiArt}>
						<img
							class={props.game.getCard(props.id).shiny ? 'shiny' : ''}
							src={`/Cards/${encodeCode(
								props.game.get(props.id, 'card') +
									(asShiny(props.game.get(props.id, 'card'), false) < 5000 ?
										4000
									:	0),
							)}.webp`}
							style="position:absolute;width:64px;height:64px;pointer-events:none"
						/>
					</Show>
					<Index each={visible_status().slice(0, 8)}>
						{(v, k) => (
							<Show when={v()}>
								<div
									class={`ico s${k}`}
									style={`position:absolute;bottom:-8px;left:${
										[32, 8, 8, 0, 0, 24, 16, 8][k]
									}px;opacity:.6;z-index:1`}
								/>
							</Show>
						)}
					</Index>
					<Index each={visible_status().slice(8)}>
						{(v, k) => (
							<Show when={v()}>
								<div
									class={`ico sborder${k}`}
									style="position:absolute;left:0;top:0;width:64px;height:64px"
								/>
							</Show>
						)}
					</Index>
					<Show when={props.game.has_protectonce(props.id)}>
						<div
							class="ico protection"
							style="position:absolute;width:64px;height:64px"
						/>
					</Show>
					<div style="position:absolute;width:64px">
						<div
							style={`width:64px;white-space:nowrap;overflow:hidden;background-color:${bgcolor()}`}>
							<Text text={memo().topText} icoprefix="se" />
						</div>
						<div style={`float:right;background-color:${bgcolor()}`}>
							<Text text={memo().statText} icoprefix="se" />
						</div>
						<Show when={!isSpell()}>
							<div
								style={`position:absolute;top:54px;height:10px;width:64px;overflow:hidden;white-space:nowrap;background-color:${bgcolor()}`}>
								{props.game.getCard(props.id).name}
							</div>
						</Show>
					</div>
				</div>
			</Show>
		</div>
	);
}

function thingTweenCompare(prev, next) {
	return (
		prev.x === next.x && prev.y === next.y && prev.opacity === next.opacity
	);
}

function Things(props) {
	const birth = id =>
		untrack(() => {
			const start = props.startPos.get(id);
			return (
				start < 0 ? { opacity: 0, x: 103, y: -start === props.p1id ? 551 : 258 }
				: start ? { opacity: 0, x: -99, y: -99, ...props.getIdTrack(start) }
				: { opacity: 0, ...props.game.tgtToPos(id, props.p1id) }
			);
		});
	const [getDeath, setDeath] = createSignal(new Map()),
		[allthings, setAll] = createSignal([]),
		banned = new Set();
	createComputed(oldthings => {
		untrack(() => {
			const death = getDeath();
			let newDeath = null;
			for (const id of props.things) {
				if (death.has(id)) {
					newDeath = newDeath ?? new Map(death);
					newDeath.delete(id);
				} else if (banned.has(id)) banned.delete(id);
			}
			const newthings = new Set(props.things);
			for (const id of oldthings) {
				if (!newthings.has(id) && !banned.has(id) && props.game.has_id(id)) {
					const endpos = props.endPos.get(id) ?? id;
					const pos =
						endpos < 0 ?
							{ x: 103, y: ~endpos === props.p1id ? 551 : 258 }
						:	props.getIdTrack(endpos);
					if (pos) {
						newDeath = newDeath ?? new Map(death);
						newDeath.set(id, { opacity: 0, ...pos });
					}
				}
			}
			if (newDeath) setDeath(newDeath);
		});
		setAll(props.things.concat(Array.from(getDeath().keys())));
		return props.things;
	}, props.things);
	const unregister = id => {
		const death = getDeath();
		if (death.has(id)) {
			banned.add(id);
			const newdeath = new Map(death);
			newdeath.delete(id);
			setDeath(newdeath);
		}
	};
	return (
		<For each={allthings()}>
			{id => (
				<Show when={props.game && props.game.has_id(id)}>
					<Tween
						initial={birth(id)}
						state={
							getDeath().get(id) ?? {
								opacity: 1,
								...props.game.tgtToPos(id, props.p1id),
							}
						}
						compare={thingTweenCompare}
						unregister={() => unregister(id)}
						proc={(ms, prev, next) => {
							if (ms > 96 * Math.PI) {
								if (next.opacity === 0) unregister(id);
								return next;
							}
							const pos = {
								x: prev.x + (next.x - prev.x) * Math.sin(ms / 192),
								y: prev.y + (next.y - prev.y) * Math.sin(ms / 192),
							};
							props.setIdTrack(id, pos);
							return {
								opacity:
									prev.opacity +
									(next.opacity - prev.opacity) * Math.sin(ms / 192),
								...pos,
							};
						}}>
						{pos => (
							<Thing
								opts={props.opts}
								game={props.game}
								p1id={props.p1id}
								setInfo={props.setInfo}
								onMouseOut={props.onMouseOut}
								onClick={props.onClick}
								targeting={props.targeting}
								id={id}
								pos={pos()}
							/>
						)}
					</Tween>
				</Show>
			)}
		</For>
	);
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
						const pl = gi + 1;
						pldata.hp = Math.max(game.get(pl, 'hp'), 1);
						pldata.maxhp = game.get(pl, 'maxhp');
					}
				}
			}
		}
	}
	dataNext.dataNext = dataNext;
	return Object.assign(newdata, dataNext);
}

function tgtclass(game, p1id, id, targeting) {
	if (targeting) {
		if (targeting.filter(id)) return ' cantarget';
	} else if (game.get_owner(id) === p1id && game.canactive(id))
		return ' canactive';
	return '';
}

function FoePlays(props) {
	const [line, setLine] = createSignal(null);
	return (
		<Show when={props.foeplays}>
			<div
				style={`position:absolute;left:800px;top:${
					540 - props.foeplays.length * 20
				}px;z-index:6`}>
				<For each={props.foeplays}>
					{play => (
						<CardImage
							card={play}
							onMouseOver={e => {
								if (play.card) props.setCard(e, play.card);
								else props.clearCard();
								if (play.t) {
									const line0 = props.getIdTrack(play.c),
										line1 = props.getIdTrack(play.t);
									if (line0 && line1) {
										setLine({
											x0: line0.x,
											y0: line0.y,
											x1: line1.x,
											y1: line1.y,
										});
										return;
									}
								}
								setLine(null);
							}}
							onClick={[props.showGame, play.game]}
							onMouseOut={() => {
								props.clearCard();
								setLine(null);
							}}
						/>
					)}
				</For>
			</div>
			<Show when={line()}>{line => <ArrowLine {...line()} />}</Show>
		</Show>
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

function removeFx(fx) {
	return state => {
		const neweffects = new Set(state.effects);
		neweffects.delete(fx);
		return {
			...state,
			effects: neweffects,
		};
	};
}

export default function Match(props) {
	const rx = store.useRx();
	const playByPlayMode = rx.opts.playByPlayMode,
		expectedDamageSamples = rx.opts.expectedDamageSamples | 0 || 4;
	let aiDelay = 0,
		streakback = 0,
		hardcoreback = null,
		hardcorebound = false;
	if (props.game.data.ante) {
		hardcoreback = props.game.data.ante.c;
		hardcorebound = props.game.data.ante.bound;
	}
	const [pgame, setGame] = createSignal(props.game);
	const [tempgame, setTempgame] = createSignal(null);
	const [replayhistory, setReplayHistory] = createSignal([props.game]);
	const [replayindex, setreplayindex] = createSignal(0);
	const game = () =>
		props.replay ? replayhistory()[replayindex()] : tempgame() ?? pgame();

	const [p1id, setPlayer1] = createSignal(
		props.replay ? game().turn : game().userId(rx.username),
	);
	const [p2id, setPlayer2] = createSignal(game().get_foe(p1id()));

	const idtrack = new Map(),
		setIdTrack = (id, pos) => idtrack.set(id, pos),
		getIdTrack = id =>
			id === p1id() || id === p2id() ?
				game().tgtToPos(id, p1id())
			:	idtrack.get(id);
	const [showFoeplays, setShowFoeplays] = createSignal(false);
	const [resigning, setResigning] = createSignal(false);
	const [hovercard, setHoverCard] = createSignal(null);
	const [hovery, setHovery] = createSignal(null);
	const [tooltip, setTooltip] = createSignal({});
	const [foeplays, setFoeplays] = createSignal(new Map());
	const [spells, setSpells] = createSignal([]);
	const [targeting, setTargeting] = createSignal(null);
	const [effects, setEffects] = createSignal({
		effects: new Set(),
		startPos: new Map(),
		endPos: new Map(),
		fxTextPos: new Map(),
		fxStatChange: new Map(),
	});
	const [popup, setPopup] = createSignal(props.game.data.quest?.opentext);

	const mkText = (state, newstate, id, text, onRest) => {
		let offset;
		newstate.fxTextPos = updateMap(
			newstate.fxTextPos ?? state.fxTextPos,
			id,
			(pos = 0) => (offset = pos) + 16,
		);
		const pos = getIdTrack(id) ?? { x: -99, y: -99 };
		const y0 = pos.y + offset;
		const TextEffect = () =>
			pos && (
				<TextFx
					setEffects={setEffects}
					id={id}
					y0={y0}
					pos={pos}
					text={text}
					onRest={onRest}
					self={TextEffect}
				/>
			);
		return TextEffect;
	};

	const StatChange = (state, newstate, id, hp, atk) => {
		newstate.fxStatChange ??= state.fxStatChange;
		let oldentry, newentry;
		newstate.fxStatChange = updateMap(newstate.fxStatChange, id, e => {
			oldentry = e;
			newentry = e ? { ...e } : { atk: 0, hp: 0, dom: null };
			newentry.hp += hp;
			newentry.atk += atk;
			newentry.dom = mkText(
				state,
				newstate,
				id,
				`${newentry.atk > 0 ? '+' : ''}${newentry.atk}|${
					newentry.hp > 0 ? '+' : ''
				}${newentry.hp}`,
				state => {
					const fxStatChange = new Map(state.fxStatChange);
					fxStatChange.delete(id);
					return {
						...state,
						fxStatChange,
					};
				},
			);
			return newentry;
		});
		newstate.effects ??= new Set(state.effects);
		if (oldentry) newstate.effects.delete(oldentry.dom);
		newstate.effects.add(newentry.dom);
	};

	const applyNext = (cmd, iscmd) =>
		batch(() => {
			const game = pgame(),
				{ turn } = game,
				prehash = iscmd || game.hash();
			if (cmd.x === 'cast' || cmd.x === 'end') {
				let play;
				if (cmd.x === 'cast') {
					const id = cmd.c,
						isSpell = game.get_kind(id) === Kind.Spell,
						card = game.getCard(id);
					play = {
						card: card,
						element: card.element,
						costele: game.get(id, isSpell ? 'costele' : 'castele'),
						cost: game.get(id, isSpell ? 'cost' : 'cast'),
						name: isSpell ? card.name : game.get_cast_skill(id),
						upped: card.upped,
						shiny: card.shiny,
						c: id,
						t: cmd.t,
						game,
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
						game,
					};
				}
				const c = cmd.x === 'cast' && cmd.c;
				if (
					!c ||
					game.get_owner(c) === p1id() ||
					!game.is_cloaked(game.get_owner(c))
				) {
					setFoeplays(foeplays =>
						new Map(foeplays).set(
							turn,
							(foeplays.get(turn) ?? []).concat([play]),
						),
					);
					if (cmd.x === 'cast' && iscmd && playByPlayMode !== 'disabled') {
						setSpells(spells => spells.concat([play]));
					}
				}
			}
			const [ng, effects] = game.nextClone(cmd);
			setGame(ng);
			if (!iscmd && isMultiplayer(ng)) {
				userEmit('move', {
					id: props.gameid,
					prehash,
					hash: ng.hash(),
					cmd,
				});
			}
			gameStep(ng);
			setEffects(state => {
				const newstate = {};
				for (let idx = 0; idx < effects.length; idx += 4) {
					const kind = enums.Fx[effects[idx]],
						id = effects[idx + 1],
						param = effects[idx + 2],
						param2 = effects[idx + 3];
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
							const pos = getIdTrack(id);
							if (pos) {
								const color = strcols[param2],
									upcolor = strcols[param2 + 13],
									bolts = param + 1,
									duration = 96 + bolts * 32;
								const BoltEffect = () => (
									<BoltFx
										self={BoltEffect}
										setEffects={setEffects}
										duration={duration}
										bolts={bolts}
										color={color}
										upcolor={upcolor}
										pos={pos}
									/>
								);
								newstate.effects.add(BoltEffect);
							}
							break;
						}
						case 'Card':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								mkText(state, newstate, id, ng.Cards.Codes[param].name),
							);
							break;
						case 'Delay':
						case 'Freeze':
						case 'Poison':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								mkText(state, newstate, id, `${kind} ${param}`),
							);
							break;
						case 'Dmg':
							StatChange(state, newstate, id, -param, 0);
							break;
						case 'Atk':
							StatChange(state, newstate, id, 0, param);
							break;
						case 'LastCard':
							newstate.effects ??= new Set(state.effects);
							const playerName = ng.data.players[id - 1].name;
							const LastCardEffect = () => (
								<LastCardFx
									self={LastCardEffect}
									setEffects={setEffects}
									name={playerName}
								/>
							);
							newstate.effects.add(LastCardEffect);
							break;
						case 'Heal':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(mkText(state, newstate, id, `+${param}`));
							break;
						case 'Lightning': {
							newstate.effects ??= new Set(state.effects);
							const pos = getIdTrack(id);
							if (pos) {
								const LightningEffect = () => (
									<LightningFx
										pos={pos}
										setEffects={setEffects}
										self={LightningEffect}
									/>
								);
								newstate.effects.add(LightningEffect);
							}
							break;
						}
						case 'Lives':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								mkText(state, newstate, id, `${param} lives`),
							);
							break;
						case 'Quanta':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								mkText(state, newstate, id, `${param}:${param2}`),
							);
							break;
						case 'Silence':
							newstate.effects ??= new Set(state.effects);
							const pos = getIdTrack(id);
							if (pos) {
								const SilenceEffect = () => (
									<SilenceFx
										pos={pos}
										setEffects={setEffects}
										self={SilenceEffect}
									/>
								);
								newstate.effects.add(SilenceEffect);
							}
							break;
						case 'Sfx':
							playSound(Sfx[param]);
							break;
						default:
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(mkText(state, newstate, id, kind));
							break;
					}
				}
				return { ...state, ...newstate };
			});
			const newTurn = ng.turn;
			if (newTurn !== turn) {
				if (ng.data.players[newTurn - 1].user === rx.username) {
					setPlayer1(newTurn);
				}
				setFoeplays(foeplays => new Map(foeplays).set(newTurn, []));
			}
			return ng;
		});

	const setReplayIndex = idx =>
		batch(() => {
			let history = replayhistory();
			idx = Math.min(idx, props.replay.moves.length);
			if (idx >= history.length) {
				history = history.slice();
				while (idx >= history.length) {
					const g = history[history.length - 1];
					const [gnext, _] = g.nextClone(
						props.replay.moves[history.length - 1],
						false,
					);
					history.push(gnext);
				}
				setReplayHistory(history);
			}
			const game = history[idx];
			setreplayindex(idx);
			setPlayer1(game.turn);
			setPlayer2(game.get_foe(game.turn));
		});

	const gotoResult = () => {
		const game = pgame();
		if (game.data.arena) {
			userEmit('modarena', {
				aname: game.data.arena,
				won: game.winner !== p1id(),
				lv: game.data.level - 4,
			});
		}
		if (game.winner === p1id()) {
			if (game.data.quest !== undefined) {
				if (game.data.quest.autonext) {
					store.navGame(
						mkQuestAi(game.data.quest.autonext, qdata =>
							addNoHealData(game, qdata),
						),
					);
					return;
				} else if (!rx.user.quests[game.data.quest.key]) {
					userExec('setquest', {
						quest: game.data.quest.key,
					});
				}
			} else if (game.data.daily) {
				const endurance = game.data.endurance;
				if (endurance !== undefined && endurance > 0) {
					store.navGame(
						mkAi(game.data.level, true, gdata => addNoHealData(game, gdata)),
					);
					return;
				} else {
					const { daily } = game.data;
					userExec('donedaily', {
						daily:
							daily === 4 ? 5
							: daily === 3 ? 0
							: daily,
					});
				}
			}
		}
		if (game.Cards.cardSet === 'Open') {
			store.doNav(import('./Result.jsx'), {
				game,
				streakback,
				hardcoreback,
				hardcorebound,
			});
		} else {
			store.doNav(import('../vanilla/views/Result.jsx'), { game });
		}
	};

	const endClick = (discard = 0) => {
		const game = pgame();
		if (game.turn === p1id() && game.phase === Phase.Mulligan) {
			applyNext({ x: 'accept' });
		} else if (game.winner) {
			gotoResult();
		} else if (game.turn === p1id()) {
			if (discard === 0 && game.full_hand(p1id())) {
				setTargeting({
					filter: id =>
						game.get_kind(id) === Kind.Spell && game.get_owner(id) === p1id(),
					cb: endClick,
					text: 'Discard',
					src: null,
				});
			} else {
				setTargeting(null);
				applyNext({
					x: 'end',
					t: discard || undefined,
				});
			}
		}
	};

	const cancelClick = () => {
		const game = pgame();
		if (resigning()) {
			setResigning(false);
		} else if (game.turn === p1id()) {
			if (game.phase === Phase.Mulligan && !game.empty_hand(p1id())) {
				applyNext({ x: 'mulligan' });
			} else {
				setTargeting(null);
			}
		}
	};

	const resignClick = () => {
		if (props.replay) {
			store.doNav(import('./Challenge.jsx'));
		} else if (pgame().winner || pgame().get(p1id(), 'resigned')) {
			gotoResult();
		} else if (!resigning()) {
			setResigning(true);
		} else if (applyNext({ x: 'resign', c: p1id() }).winner) {
			gotoResult();
		}
	};

	const thingClick = id => {
		const game = pgame();
		clearCard();
		if (props.replay || game.phase !== Phase.Play) return;
		const tgting = targeting();
		if (tgting) {
			if (tgting.filter(id)) {
				setTargeting(null);
				tgting.cb(id);
			}
		} else if (game.get_owner(id) === p1id() && game.canactive(id)) {
			const cb = tgt => applyNext({ x: 'cast', c: id, t: tgt });
			if (
				(game.get_kind(id) === Kind.Spell &&
					game.getCard(id).type !== Kind.Spell) ||
				!game.requires_target(id)
			) {
				cb();
			} else {
				setTargeting({
					filter: tgt => game.can_target(id, tgt),
					cb,
					text: game.get_cast_skill(id),
					src: id,
				});
			}
		}
	};

	const gameStep = game => {
		if (game.data.players[game.turn - 1].ai === 1 && game.phase <= Phase.Play) {
			aiWorker
				.send({
					data: {
						seed: game.data.seed,
						set: game.data.set,
						players: game.data.players,
					},
					moves: game.replay,
				})
				.then(async e => {
					const now = Date.now();
					if (
						now < aiDelay &&
						game.phase === Phase.Play &&
						e.data.cmd.x !== 'end'
					) {
						await new Promise(resolve => setTimeout(resolve, aiDelay - now));
					}
					aiDelay = Date.now() + (e.data.cmd.x === 'end' ? 1728 : 216);
					applyNext(e.data.cmd, true);
				});
		}
	};

	const isMultiplayer = game =>
		game.data.players.some(pl => pl.user && pl.user !== rx.username);

	const onkeydown = e => {
		if (e.target.tagName === 'TEXTAREA') return;
		let chi;
		if (e.key === 'Escape') {
			resignClick();
		} else if (e.key === ' ' || e.key === 'Enter') {
			endClick();
		} else if (e.key === 'Backspace' || e.key === '0') {
			cancelClick();
		} else if (~(chi = 'sw'.indexOf(e.key))) {
			thingClick(chi ? p2id() : p1id());
		} else if (~(chi = 'qa'.indexOf(e.key))) {
			const shieldId = pgame().get_shield(chi ? p2id() : p1id());
			if (shieldId !== 0) thingClick(shieldId);
		} else if (~(chi = 'ed'.indexOf(e.key))) {
			const weaponId = pgame().get_weapon(chi ? p2id() : p1id());
			if (weaponId !== 0) thingClick(weaponId);
		} else if (~(chi = '12345678'.indexOf(e.key))) {
			const card = pgame().get_hand(p1id())[chi];
			if (card) thingClick(card);
		} else if (e.key === 'p') {
			if (pgame().turn === p1id() && p2id() !== pgame().get_foe(p1id())) {
				applyNext({ x: 'foe', t: p2id() });
			}
		} else if (e.key === 'l' && props.gameid) {
			userEmit('reloadmoves', { id: props.gameid });
		} else if (~(chi = '[]'.indexOf(e.key))) {
			const { players } = pgame(),
				dir = chi ? players.length + 1 : 1;
			let nextId,
				i = 1;
			for (; i < players.length; i++) {
				nextId = players[(players.indexOf(p2id()) + i * dir) % players.length];
				if (nextId !== p1id() && !pgame().get(nextId, 'out')) {
					break;
				}
			}
			if (i !== players.length) {
				setPlayer2(nextId);
			}
		} else return;
		e.preventDefault();
	};

	const onbeforeunload = e => {
		if (isMultiplayer(game())) {
			e.preventDefault();
			e.returnValue = '';
		}
	};

	onMount(() => {
		if (props.replay) return;
		if (!props.game.data.spectate) {
			document.addEventListener('keydown', onkeydown);
			window.addEventListener('beforeunload', onbeforeunload);
		}

		const { game } = props;
		if (
			!props.noloss &&
			!game.data.endurance &&
			game.Cards.cardSet === 'Open' &&
			(game.data.level !== undefined || isMultiplayer(game))
		) {
			const msg = {};
			if (isMultiplayer(game)) {
				msg.pvp = true;
			} else {
				streakback = rx.user.streak[game.data.level];
				msg.l = game.data.level;
				msg.g = -(game.data.cost | 0);
				if (store.hasflag(rx.user, 'hardcore')) {
					const pl = game.data.players.find(p => p.user === rx.username);
					if (pl) {
						const ante = store.hardcoreante(game.Cards, pl.deck);
						Object.assign(msg, ante);
						if (ante) {
							hardcoreback = msg.c;
							hardcorebound = msg.bound;
						}
					}
				}
			}
			userExec('addloss', msg);
		}
		setCmds({
			move: ({ cmd, hash }) => {
				const game = pgame();
				if ((!cmd.c || game.has_id(cmd.c)) && (!cmd.t || game.has_id(cmd.t))) {
					if (applyNext(cmd, true).hash() === hash) return;
				}
				userEmit('reloadmoves', { id: props.gameid });
			},
			reloadmoves: ({ moves }) => {
				store.doNav(Promise.resolve({ default: Match }), {
					...rx.nav.props,
					game: game.withMoves(moves),
					noloss: true,
				});
			},
		});
		gameStep(game);
	});

	onCleanup(() => {
		setCmds({});
		document.removeEventListener('keydown', onkeydown);
		window.removeEventListener('beforeunload', onbeforeunload);
	});

	const setCard = (e, card) => {
		setHoverCard(card);
		setHovery(e.pageY > 300 ? 44 : 300);
	};

	const setInfo = (e, id) => {
		const actinfo =
			targeting() &&
			targeting().src &&
			targeting().filter(id) &&
			game().actinfo(targeting().src, id);
		setTooltip({
			text: `${game().thingText(id)}${actinfo ? '\n' + actinfo : ''}`,
			style: `position:absolute;left:${e.pageX}px;top:${e.pageY}px;z-index:5`,
		});
		if (game().get_kind(id) !== Kind.Player) setCard(e, game().getCard(id));
	};

	const clearCard = () => {
		setHoverCard(null);
		setTooltip(null);
	};

	const expectedDamages = createMemo(prev =>
		prev && pgame().replay.length === prev.replaylength ?
			prev
		:	{
				expectedDamage: pgame().expected_damage(expectedDamageSamples),
				replaylength: pgame().replay.length,
			},
	);
	const cloaked = () => game().is_cloaked(p2id());

	const texts = createMemo(() => {
		const g = game(),
			p1 = p1id();
		let turntell, endText, cancelText;
		if (g.phase !== Phase.End) {
			turntell =
				targeting() ?
					targeting().text
				:	`${g.turn === p1 ? 'Your' : 'Their'} turn${
						g.phase > Phase.Mulligan ? ''
						: p1 === 1 ? "\nYou're first"
						: "\nYou're second"
					}`;
			if (g.turn === p1) {
				endText =
					targeting() ? ''
					: g.phase === Phase.Play ? 'End Turn'
					: g.turn === p1 ? 'Accept'
					: '';
				if (g.phase !== Phase.Play) {
					cancelText = g.turn === p1 ? 'Mulligan' : '';
				} else {
					cancelText = targeting() || resigning() ? 'Cancel' : '';
				}
			} else cancelText = endText = '';
		} else {
			turntell = `${g.turn === p1 ? 'Your' : 'Their'} Turn\n${
				g.winner === p1 ? 'Won' : 'Lost'
			}`;
			endText = 'Continue';
			cancelText = '';
		}
		return { turntell, endText, cancelText };
	});

	const things = createMemo(() =>
		Array.from(game().visible_instances(p1id(), p2id())),
	);

	return (
		<>
			{popup() && <PagedModal pages={popup()} onClose={() => setPopup(null)} />}
			{svgbg}
			<Show when={cloaked()}>{cloaksvg}</Show>
			{showFoeplays() ?
				<FoePlays
					getIdTrack={getIdTrack}
					foeplays={foeplays().get(p2id())}
					setCard={setCard}
					clearCard={clearCard}
					showGame={game => {
						setTargeting(null);
						setTempgame(game);
					}}
				/>
			:	playByPlayMode !== 'disabled' && (
					<SpellDisplay
						playByPlayMode={playByPlayMode}
						getIdTrack={getIdTrack}
						spells={spells()}
						setSpells={setSpells}
					/>
				)
			}
			{[0, 1].map(j => {
				const pl = j ? p2id : p1id,
					plpos = () => game().tgtToPos(pl(), p1id()),
					handOverlay = () => game().hand_overlay(pl(), p1id());
				const expectedDamage = () => expectedDamages().expectedDamage[pl() - 1];
				const x1 = () =>
						Math.max(
							Math.round(
								(96 * game().get(pl(), 'hp')) / game().get(pl(), 'maxhp'),
							),
							0,
						),
					x2 = () =>
						Math.max(
							x1() -
								Math.round((96 * expectedDamage()) / game().get(pl(), 'maxhp')),
							0,
						);
				const hptext = () =>
					game().hp_text(pl(), p1id(), p2id(), expectedDamage());
				return (
					<>
						<div
							class={tgtclass(game(), p1id(), pl(), targeting())}
							style={`position:absolute;left:${plpos().x - 48}px;top:${
								plpos().y - 40
							}px;width:96px;height:80px;border:transparent 2px solid;z-index:4`}
							onClick={[thingClick, pl()]}
							onMouseOver={e => setInfo(e, pl())}
							onMouseMove={e => setInfo(e, pl())}
						/>
						<span
							class={'ico e' + game().get_mark(pl())}
							style={`position:absolute;left:32px;top:${
								j ? 228 : 430
							}px;transform:translate(-50%,-50%);text-align:center;pointer-events:none;font-size:18px;text-shadow:2px 2px 1px #000,2px 2px 2px #000`}>
							{game().get_markpower(pl()) !== 1 && game().get_markpower(pl())}
						</span>
						<Show when={game().get(pl(), 'sosa')}>
							<div
								class="ico sacrifice"
								style={`position:absolute;left:0;top:${
									j ? 7 : 502
								}px;pointer-events:none`}
							/>
						</Show>
						<Show when={game().get(pl(), 'sabbath')}>
							<span
								class="ico sabbath"
								style={`position:absolute;left:0;top:${j ? 96 : 300}px`}
							/>
						</Show>
						<Show
							when={
								game().get(pl(), 'drawlock') || game().get(pl(), 'protectdeck')
							}>
							<span
								style={`position:absolute;left:95px;top:${
									j ? 250 : 543
								}px;width:48px;height:48px;background-color:#${
									game().get(pl(), 'drawlock') ? '931' : 'ede'
								}`}
							/>
						</Show>
						<Show when={handOverlay()}>
							<span
								style={`z-index:1;position:absolute;left:101px;top:${
									j ? 0 : 300
								}px;width:66px;height:263px;background-color:${
									strcols[handOverlay()]
								};opacity:.3;border-radius:4px;pointer-events:none`}
							/>
						</Show>
						<div
							style={`display:grid;grid-template-columns:48px 48px;position:absolute;left:2;top:${
								j ? 106 : 308
							}px`}>
							{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(k => (
								<span class={'quantapool ico ce' + k}>
									&nbsp;
									{game().get_quanta(pl(), k) || ''}
								</span>
							))}
						</div>
						<div
							style={`background-color:#000;position:absolute;left:2px;top:${
								j ? 36 : 531
							}px;width:98px;height:22px;pointer-events:none`}
						/>
						<Tween
							state={{ x1: x1(), x2: x2() }}
							proc={hpTweenProc}
							compare={hpTweenCompare}>
							{state => (
								<>
									<div
										style={`background-color:${
											strcols[Life]
										};position:absolute;left:3px;top:${j ? 37 : 532}px;width:${
											state().x1
										}px;height:20px;pointer-events:none;z-index:2`}
									/>
									<Show when={!cloaked() && expectedDamage() !== 0}>
										<div
											style={`background-color:${
												strcols[
													expectedDamage() >= game().get(pl(), 'hp') ? Fire
													: expectedDamage() > 0 ? Time
													: Water
												]
											};position:absolute;left:${
												3 + Math.min(state().x1, state().x2)
											}px;top:${j ? 37 : 532}px;width:${
												Math.max(state().x1, state().x2) -
												Math.min(state().x1, state().x2)
											}px;height:20px;pointer-events:none;z-index:2`}
										/>
									</Show>
								</>
							)}
						</Tween>
						<div
							style={`text-align:center;width:100px;pointer-events:none;font-size:12px;line-height:1.1;position:absolute;left:0;top:${
								j ? 40 : 535
							}px;text-shadow:1px 1px 1px #000,2px 2px 2px #000;z-index:2`}>
							<Text text={hptext()} />
						</div>
						<div
							class={game().deck_length(pl()) ? 'ico ccback' : ''}
							style={`position:absolute;left:103px;top:${
								j ? 258 : 551
							}px;text-align:center;padding-top:7px;pointer-events:none;font-size:18px;text-shadow:2px 2px 1px #000,2px 2px 2px #000;z-index:3`}>
							{game().deck_length(pl()) || '0!!'}
						</div>
					</>
				);
			})}
			<Things
				startPos={effects().startPos}
				endPos={effects().endPos}
				getIdTrack={getIdTrack}
				setIdTrack={setIdTrack}
				opts={rx.opts}
				game={game()}
				p1id={p1id()}
				setInfo={setInfo}
				onMouseOut={clearCard}
				onClick={thingClick}
				targeting={targeting()}
				things={things()}
			/>
			{game().has_flooding() && floodsvg}
			<div style="white-space:pre-wrap;text-align:center;position:absolute;left:780px;top:40px;width:120px;z-index:3">
				{`${
					[
						'Commoner\n',
						'Mage\n',
						'Champion\n',
						'Demigod\n',
						'Arena1\n',
						'Arena2\n',
					][game().data.level] ??
					(game().data.players[p2id() - 1].leader !== undefined ?
						`${
							game().playerDataByIdx(game().data.players[p2id() - 1].leader)
								.name || game().data.players[p2id() - 1].leader
						}\n`
					:	'')
				}${game().data.players[p2id() - 1].name || '-'}`}
			</div>
			<span style="position:absolute;left:780px;top:560px;width:120px;text-align:center;pointer-events:none;white-space:pre">
				{texts().turntell}
			</span>
			<For each={Array.from(effects().effects)}>{fx => untrack(fx)}</For>
			<Card x={734} y={hovery()} card={hovercard()} />
			<Show when={tooltip()}>
				{tooltip => (
					<div class="infobox" style={tooltip().style}>
						<Text icoprefix="te" text={tooltip().text} />
					</div>
				)}
			</Show>
			{!!foeplays().get(p2id())?.length && (
				<input
					type="button"
					value={`History ${foeplays().get(p2id()).length}`}
					style="position:absolute;left:2px;top:270px;z-index:2"
					onClick={() => {
						setTempgame(null);
						setShowFoeplays(showFoeplays => !showFoeplays);
					}}
				/>
			)}
			<input
				type="button"
				value={
					props.replay ? 'Exit'
					: resigning() ?
						'Confirm'
					:	'Resign'
				}
				onClick={resignClick}
				style="position:absolute;left:816px;top:15px;z-index:4"
			/>
			{!props.replay &&
				!game().data.spectate &&
				(game().turn === p1id() || !!game().winner) && (
					<>
						{texts().endText && (
							<input
								type="button"
								value={texts().endText}
								onClick={() => endClick()}
								style="position:absolute;left:10px;top:460px"
							/>
						)}
						{texts().cancelText && (
							<input
								type="button"
								value={texts().cancelText}
								onClick={cancelClick}
								style="position:absolute;left:10px;top:490px"
							/>
						)}
					</>
				)}
			{props.replay && (
				<>
					<span style="position:absolute;left:760px;top:560px">
						{game().aieval().toFixed(2)}
					</span>
					<span style="position:absolute;left:760px;top:520px">
						{replayindex()}
					</span>
					<span style="position:absolute;left:860px;top:520px">
						{props.replay.moves.length}
					</span>
					<span style="position:absolute;left:760px;top:540px">
						{game().countPlies()}
					</span>
					{!!replayindex() && (
						<input
							type="button"
							value="<"
							onClick={() => setReplayIndex(replayindex() - 1)}
							style="position:absolute;left:800px;top:520px;width:20px"
						/>
					)}
					{!game().winner && (
						<input
							type="button"
							value=">"
							onClick={() => setReplayIndex(replayindex() + 1)}
							style="position:absolute;left:830px;top:520px;width:20px"
						/>
					)}
					{!!replayindex() && (
						<input
							type="button"
							value="<<"
							onClick={() => {
								let idx = replayindex() - 1;
								for (; idx >= 1; idx--) {
									const { x } = props.replay.moves[idx - 1];
									if (x === 'end' || x === 'mulligan') break;
								}
								setReplayIndex(Math.max(idx, 0));
							}}
							style="position:absolute;left:800px;top:540px;width:20px"
						/>
					)}
					{!game().winner && (
						<input
							type="button"
							value=">>"
							onClick={() => {
								const len = props.replay.moves.length;
								let idx = replayindex() + 1;
								for (; idx < len; idx++) {
									const { x } = props.replay.moves[idx];
									if (x === 'end' || x === 'mulligan') break;
								}
								setReplayIndex(idx);
							}}
							style="position:absolute;left:830px;top:540px;width:20px"
						/>
					)}
				</>
			)}
		</>
	);
}

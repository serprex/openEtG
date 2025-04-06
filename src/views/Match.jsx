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
import enums from '../enum.json' with { type: 'json' };
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

function gridLinePaths(hor, ver) {
	const ren = [];
	for (let j = 0; j < 2; j++) {
		let path = '';
		for (let i = 0; i < hor.length; i += 3) {
			path += `M${hor[i + 1]} ${hor[i] - j}L${hor[i + 2]} ${hor[i] - j}`;
		}
		for (let i = 0; i < ver.length; i += 3) {
			path += `M${ver[i] + j} ${ver[i + 1]}L${ver[i] + j} ${ver[i + 2]}`;
		}
		ren.push(path, ['#421', '#842'][j]);
	}
	return ren;
}

// prettier-ignore
const landscapeGrid = gridLinePaths(
		new Uint16Array([140, 172, 900, 300, 172, 900, 460, 172, 900,
			70, 160, 172,
			102, 160, 172,
			134, 160, 172,
			166, 160, 172,
			198, 160, 172,
			230, 160, 172,
			262, 160, 172,
			294, 160, 172,
			370, 160, 172,
			402, 160, 172,
			434, 160, 172,
			466, 160, 172,
			498, 160, 172,
			530, 160, 172,
			562, 160, 172,
			594, 160, 172,
		]),
		new Uint16Array([170, 0, 600, 246, 0, 139, 246, 459, 600]),
	),
	portraitGrid = gridLinePaths(
		new Uint16Array([
			260, 0, 750, 450, 0, 750, 640, 0, 750, 120, 150, 750, 780, 150, 750,
		]),
		new Uint16Array([150, 0, 260, 150, 640, 900, 218, 120, 260, 218, 640, 780]),
	);
function SvgBg(props) {
	const ren = x => (props.landscape ? landscapeGrid : portraitGrid)[x];
	return (
		<svg style="position:absolute;width:100%;height:100%;z-index:-8;pointer-events:none">
			<path d={ren(0)} stroke={ren(1)} strokeWidth="1" />
			<path d={ren(2)} stroke={ren(3)} strokeWidth="1" />
		</svg>
	);
}

function FloodSvg(props) {
	return (
		<svg style="position:absolute;width:100%;height:100%;z-index:1;pointer-events:none;opacity:.4">
			<path
				d={
					props.landscape ?
						'M900 141v317h-700q-38 -35 0 -85h395q38 -72.5 0 -145h-395q-38 -35 0 -85'
					:	'M750 261v377h-720q-38 -58 0 -116h395q38 -72.5 0 -145h-395q-38 -58 0 -116'
				}
				fill="#048"
			/>
		</svg>
	);
}

function CloakSvg(props) {
	return (
		<div
			style={`position:absolute;left:0;top:0;width:900px;height:${
				props.landscape ? 299 : 449
			}px;background-color:#000;z-index:1;pointer-events:none`}
		/>
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
	return (
		<div
			class="lastcard"
			onAnimationEnd={() => props.setEffects(removeFx(props.self))}>
			{`Last card for ${props.name}`}
		</div>
	);
}

function TextFx(props) {
	return (
		<div
			class="textfx"
			style={`position:absolute;left:${props.x}px;top:${props.y}px`}
			onAnimationEnd={e => {
				if (e.animationName === 'textfx') {
					props.setEffects(state => {
						const newstate = {
							...removeFx(props.self)(state),
							fxTextPos: updateMap(
								state.fxTextPos,
								props.id,
								pos => pos && pos - 16,
							),
						};
						return props.onRest ? props.onRest(newstate) : newstate;
					});
				}
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
		const offset = props.landscape ? 0 : 300;
		return (
			ms < 50 * Math.PI ?
				{
					yc: props.y * Math.sin(ms / 100) + offset,
					opacity: 1 - Math.cos(ms / 100),
				}
			: ms > 1984 ?
				{
					yc: props.y + ms - 1980 + offset,
					opacity: 1 - (ms - 1980) / (600 - props.y),
				}
			:	{ yc: props.y + offset, opacity: 1 }
		);
	});
	createEffect(() => {
		if (state().yc > (props.landscape ? 600 : 900)) {
			props.setSpells(spells => spells.filter(x => x !== props.spell));
		}
	});
	return (
		<>
			<CardImage
				card={props.spell}
				style={{
					position: 'absolute',
					right: '2px',
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
		<svg class="arrow" style={`opacity:${props.opacity}`}>
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

const statusMask = [];
for (let i = 0; i < 12; i++) {
	statusMask.push(1 << i);
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

	const memo = createMemo(() => {
		if (faceDown()) return {};
		const status = props.game.visible_status(props.id);
		const [topText, statText] = props.game.instance_text(props.id).split('\n');
		return { topText, statText, status };
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
			onClick={() => props.onClick(props.id)}>
			<Show when={!faceDown()} fallback={<div class="ico cback" />}>
				<div class="inner" style={`background-color:${bgcolor()}`}>
					<Show when={!props.opts.lofiArt}>
						<img
							class={`art${props.game.getCard(props.id).shiny ? ' shiny' : ''}`}
							src={`/Cards/${encodeCode(
								props.game.get(props.id, 'card') +
									(asShiny(props.game.get(props.id, 'card'), false) < 5000 ?
										4000
									:	0),
							)}.webp`}
						/>
					</Show>
					<Index each={statusMask}>
						{(v, k) => (
							<Show when={memo().status & v()}>
								{k < 8 ?
									<div
										class={`status ico s${k}`}
										style={`left:${[32, 8, 8, 0, 0, 24, 16, 8][k]}px`}
									/>
								:	<div class={`fullstatus ico sborder${k - 8}`} />}
							</Show>
						)}
					</Index>
					<div class="text">
						<div class="top-text" style={`background-color:${bgcolor()}`}>
							<Text text={memo().topText} icoprefix="se" />
						</div>
						<div class="stat-text" style={`background-color:${bgcolor()}`}>
							<Text text={memo().statText} icoprefix="se" />
						</div>
						<Show when={!isSpell()}>
							<div class="name" style={`background-color:${bgcolor()}`}>
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
	const portraitoffset = () => (props.landscape ? 0 : 333);
	const birth = id =>
		untrack(() => {
			const start = props.startPos.get(id);
			return (
				start < 0 ?
					{
						opacity: 0,
						x: 103,
						y: -start === props.p1id ? 551 + portraitoffset() : 258,
					}
				: start ? { opacity: 0, x: -99, y: -99, ...props.getIdTrack(start) }
				: {
						opacity: 0,
						...props.game.tgtToPos(id, props.p1id, props.landscape),
					}
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
							{
								x: 103,
								y: ~endpos === props.p1id ? 551 + portraitoffset() : 258,
							}
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
								...props.game.tgtToPos(id, props.p1id, props.landscape),
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
				style={`position:absolute;right:2px;top:${
					(props.landscape ? 540 : 840) - props.foeplays.length * 20
				}px;z-index:6;width:100px`}>
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
	const [landscape, setLandscape] = createSignal(
		typeof screen === 'undefined' ||
			!screen.orientation?.type?.startsWith?.('portrait'),
	);
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
				game().tgtToPos(id, p1id(), landscape())
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
			pos => (offset = pos ?? 0) + 16,
		);
		const pos = getIdTrack(id) ?? { x: -99, y: -99 };
		const TextEffect = () => (
			<TextFx
				setEffects={setEffects}
				id={id}
				y={pos.y + offset}
				x={pos.x}
				text={text}
				onRest={onRest}
				self={TextEffect}
			/>
		);
		return TextEffect;
	};

	const StatChange = (state, newstate, id, hp, atk) => {
		let oldentry, newentry;
		newstate.fxStatChange = updateMap(
			newstate.fxStatChange ?? state.fxStatChange,
			id,
			e => {
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
			},
		);
		newstate.effects ??= new Set(state.effects);
		if (oldentry) {
			newstate.fxTextPos = updateMap(
				newstate.fxTextPos ?? state.fxTextPos,
				id,
				pos => pos && pos - 16,
			);
			newstate.effects.delete(oldentry.dom);
		}
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
			if (game.tax_left(p1id()) === 0) {
				applyNext({ x: 'accept' });
			}
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

	const shuffleClick = t => {
		applyNext({ x: 'shuffle', t });
		const game = pgame(),
			tax_left = game.tax_left(p1id());
		setTargeting(
			tax_left === 0 ? null : (
				{
					filter: id =>
						game.get_kind(id) === Kind.Spell && game.get_owner(id) === p1id(),
					cb: shuffleClick,
					text: 'Shuffle ' + tax_left,
					src: null,
				}
			),
		);
	};

	const cancelClick = () => {
		let game = pgame();
		if (resigning()) {
			setResigning(false);
		} else if (game.turn === p1id()) {
			if (game.phase === Phase.Mulligan && !game.empty_hand(p1id())) {
				applyNext({ x: 'mulligan' });
				game = pgame();
				const tax_left = game.tax_left(p1id());
				setTargeting(
					tax_left === 0 ? null : (
						{
							filter: id =>
								game.get_kind(id) === Kind.Spell &&
								game.get_owner(id) === p1id(),
							cb: shuffleClick,
							text: 'Shuffle ' + tax_left,
							src: null,
						}
					),
				);
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
		if (props.replay || game.phase === Phase.End) return;
		const tgting = targeting();
		if (tgting) {
			if (tgting.filter(id)) {
				setTargeting(null);
				tgting.cb(id);
			}
		} else if (
			game.phase === Phase.Play &&
			game.get_owner(id) === p1id() &&
			game.canactive(id)
		) {
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
	const setlandscape = e => setLandscape(!e.target.type.startsWith('portrait'));
	onMount(() => {
		if (typeof screen !== 'undefined' && screen.orientation)
			screen.orientation.addEventListener('change', setlandscape);
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
		if (typeof screen !== 'undefined' && screen.orientation)
			screen.orientation.removeEventListener('change', setlandscape);
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
			style: `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:5`,
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
				targeting()?.text ??
				`${g.turn === p1 ? 'Your' : 'Their'} turn${
					g.phase > Phase.Mulligan ? ''
					: p1 === 1 ? "\nYou're first"
					: "\nYou're second"
				}`;
			if (g.turn === p1) {
				if (g.phase !== Phase.Play) {
					cancelText = 'Mulligan';
					const tax_left = g.tax_left(p1);
					if (tax_left === 0) {
						endText = 'Accept';
					} else {
						endText = '';
						turntell += `\nYou're ${p1 === 1 ? 'first' : 'second'}`;
					}
				} else {
					cancelText = targeting() || resigning() ? 'Cancel' : '';
					endText = targeting() ? '' : 'End Turn';
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
			<SvgBg landscape={landscape()} />
			<Show when={cloaked()}>
				<CloakSvg landscape={landscape()} />
			</Show>
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
					landscape={landscape()}
				/>
			:	playByPlayMode !== 'disabled' && (
					<SpellDisplay
						playByPlayMode={playByPlayMode}
						getIdTrack={getIdTrack}
						spells={spells()}
						setSpells={setSpells}
						landscape={landscape()}
					/>
				)
			}
			{[0, 1].map(j => {
				const pl = j ? p2id : p1id,
					plpos = () => game().tgtToPos(pl(), p1id(), landscape()),
					handOverlay = () => game().hand_overlay(pl(), p1id());
				const expectedDamage = () => expectedDamages().expectedDamage[pl() - 1];
				const x1 = () =>
						Math.max(
							Math.round(
								(90 * game().get(pl(), 'hp')) / game().get(pl(), 'maxhp'),
							),
							0,
						),
					x2 = () =>
						Math.max(
							x1() -
								Math.round((90 * expectedDamage()) / game().get(pl(), 'maxhp')),
							0,
						);
				const hptext = () =>
					game().hp_text(pl(), p1id(), p2id(), expectedDamage());
				const quantaoffset = () => (landscape() || j ? 0 : 333);
				return (
					<>
						<div
							class={tgtclass(game(), p1id(), pl(), targeting())}
							style={`position:absolute;left:${plpos().x - 48}px;top:${
								plpos().y - 48
							}px;width:96px;height:96px;border:transparent 2px solid;z-index:4`}
							onClick={[thingClick, pl()]}
							onMouseOver={e => setInfo(e, pl())}
							onMouseMove={e => setInfo(e, pl())}>
							<div class="hpbar">
								<div class="hpval life" style={`width:${x1()}px`} />
								<Show when={!cloaked()}>
									<div
										class="hpval"
										style={`background-color:${
											strcols[
												expectedDamage() >= game().get(pl(), 'hp') ? Fire
												: expectedDamage() > 0 ? Time
												: Water
											]
										};width:1px;transform:scaleX(${x2() - x1()})`}
									/>
								</Show>
							</div>
							<div class="hptext">
								<Text text={hptext()} />
							</div>
						</div>
						<Show when={game().get(pl(), 'sosa')}>
							<div
								class="ico sacrifice"
								style={`position:absolute;left:0;top:${
									j ? 7
									: landscape() ? 502
									: 777
								}px;pointer-events:none`}
							/>
						</Show>
						<Show when={handOverlay()}>
							<span
								style={`z-index:1;position:absolute;left:${
									landscape() ?
										`100px;top:${j ? 0 : 300}px;width:70px;height:300`
									:	`152px;top:${j ? 21 : 796}px;width:563px;height:84`
								}px;background-color:${
									strcols[handOverlay()]
								};opacity:.3;border-radius:2px;pointer-events:none`}
							/>
						</Show>
						<div
							style={`display:grid;grid-template-columns:48px 48px;position:absolute;left:2;top:${
								(j ? 106 : 308) + quantaoffset()
							}px`}>
							<Show when={game().get(pl(), 'sabbath')}>
								<span class="ico sabbath" style="position:absolute" />
							</Show>
							{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(k => (
								<span class={'quantapool ico ce' + k}>
									&nbsp;
									{game().get_quanta(pl(), k) || ''}
								</span>
							))}
							<span class={'quantamark ico e' + game().get_mark(pl())}>
								{game().get_markpower(pl()) !== 1 && game().get_markpower(pl())}
							</span>
							<span
								class={`deckpool${
									game().deck_length(pl()) ? ' ico ccback' : ''
								}${
									(
										game().get(pl(), 'drawlock') ||
										game().get(pl(), 'protectdeck')
									) ?
										' deckfx'
									:	''
								}`}
								style={`border-color:#${
									game().get(pl(), 'drawlock') ? '931' : 'ede'
								}`}>
								{game().deck_length(pl()) || '0!!'}
							</span>
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
				landscape={landscape()}
			/>
			{game().has_flooding() && <FloodSvg landscape={landscape()} />}
			<div style="white-space:pre-wrap;text-align:center;position:absolute;right:0px;top:30px;width:120px;z-index:3;overflow:hidden;text-overflow:ellipsis">
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
			<span id="turntell">{texts().turntell}</span>
			<For each={Array.from(effects().effects)}>{fx => untrack(fx)}</For>
			<Card
				style={`position:absolute;right:2px;top:${hovery()}px`}
				card={hovercard()}
			/>
			<Show when={tooltip()}>
				{tooltip => (
					<div class="infobox" style={tooltip().style}>
						<Text icoprefix="te" text={tooltip().text} />
					</div>
				)}
			</Show>
			<Show when={foeplays().get(p2id())?.length}>
				{plays => (
					<input
						type="button"
						value={`History ${plays()}`}
						style={
							landscape() ?
								'position:absolute;left:2px;top:270px;z-index:2'
							:	'position:absolute;left:500px;top:4px;z-index:2'
						}
						onClick={() => {
							setTempgame(null);
							setShowFoeplays(showFoeplays => !showFoeplays);
						}}
					/>
				)}
			</Show>
			<input
				type="button"
				value={
					props.replay ? 'Exit'
					: resigning() ?
						'Confirm'
					:	'Resign'
				}
				onClick={resignClick}
				style="position:absolute;right:4px;top:4px;z-index:4"
			/>
			{!props.replay &&
				!game().data.spectate &&
				(game().turn === p1id() || !!game().winner) && (
					<div
						style={
							landscape() ?
								'position:absolute;left:10px;top:460px;display:flex;flex-direction:column;gaps:10px'
							:	'position:absolute;left:400px;top:876px;width:200px;display:flex;gaps:18px;justify-content:space-between'
						}>
						{texts().endText && (
							<input
								type="button"
								value={texts().endText}
								style={texts().endText ? '' : 'visibility:hidden'}
								onClick={() => endClick()}
							/>
						)}
						{texts().cancelText && (
							<input
								type="button"
								value={texts().cancelText}
								style={texts().cancelText ? '' : 'visibility:hidden'}
								onClick={cancelClick}
							/>
						)}
					</div>
				)}
			{props.replay && (
				<>
					<span style="position:absolute;left:740px;top:560px">
						{game().aieval()}
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

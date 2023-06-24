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
import { For, Index, Show } from 'solid-js/web';

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

function svgbg() {
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
		redren.push(<path d={path} stroke={['#421', '#842'][j]} strokeWidth="1" />);
	}
	return (
		<svg
			width="900"
			height="600"
			style="position:absolute;left:0;top:0;z-index:-8;pointer-events:none">
			{redren}
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
		<div
			style={{
				position: 'absolute',
				left: '0',
				top: '0',
				width: '900px',
				height: '299px',
				'background-color': '#000',
				'z-index': '1',
				'pointer-events': 'none',
			}}
		/>
	);
}

const instimgstyle = {
	position: 'absolute',
	width: '64px',
	height: '64px',
	'pointer-events': 'none',
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
	let start = null,
		raf = null,
		prevState = props.initial ?? props.state,
		nextState = props.state;
	const [state, setState] = createSignal(prevState);
	const step = ts => {
		start ??= ts;
		setState(props.proc(ts - start, prevState, nextState));
		if (state() !== nextState) {
			raf &&= requestAnimationFrame(step);
		}
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
			style={{
				'white-space': 'pre-wrap',
				'z-index': '9',
				position: 'absolute',
				left: '450px',
				top: '300px',
				'max-width': '900px',
				transform: 'translate(-50%,-50%)',
			}}>
			<div>
				<input
					value="Prev"
					type="button"
					style={{ visibility: idx() > 0 ? 'visible' : 'hidden' }}
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
	createEffect(() => {
		if (ms() > 864 * Math.PI) props.setEffects(removeFx(props.self));
	});
	return (
		<div
			style={{
				position: 'absolute',
				left: '450px',
				top: '300px',
				transform: 'translate(-50%,-50%)',
				'font-size': '16px',
				color: '#fff',
				'background-color': '#000',
				padding: '18px',
				opacity: Math.min(Math.sin(ms() / 864) * 1.25, 1),
				'z-index': '8',
				'pointer-events': 'none',
			}}>
			Last card for {props.name}
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
	const yy = () => ms() / 5;
	const y = () => props.y0 + yy();
	const fade = () => 1 - Math.tan(yy() / 91);
	return (
		<Components.Text
			text={props.text}
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
			}}
		/>
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
			style={{
				position: 'absolute',
				left: `${props.pos.x - 32}px`,
				top: `${props.pos.y - 32}px`,
				'pointer-events': 'none',
				'z-index': '4',
			}}>
			<path d={path()} stroke="#fff" strokeWidth="2" fill="none" />
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
			style={{
				position: 'absolute',
				left: `${props.pos.x - 64}px`,
				top: `${props.pos.y - 64}px`,
				'pointer-events': 'none',
				'z-index': '4',
			}}>
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
		return ms < 50 * Math.PI
			? {
					yc: props.y * Math.sin(ms / 100),
					opacity: 1 - Math.cos(ms / 100),
			  }
			: ms > 1984
			? { yc: props.y + ms - 1980, opacity: 1 - (ms - 1980) / (600 - props.y) }
			: { yc: props.y, opacity: 1 };
	});
	createEffect(() => {
		if (state().yc > 600) {
			props.setSpells(spells => spells.filter(x => x !== props.spell));
		}
	});
	return (
		<>
			<Components.CardImage
				card={props.spell.card}
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
			style={{
				position: 'absolute',
				left: '0',
				top: '0',
				'z-index': '4',
				'pointer-events': 'none',
				opacity: props.opacity,
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
				marker-end="url(#h)"
				d={`M${props.x0} ${props.y0}L${props.x1} ${props.y1}`}
				stroke="#f84"
				stroke-width="4"
				opacity="0.7"
			/>
		</svg>
	);
}

function ThingInst(props) {
	const obj = () => props.game.byId(props.id),
		isSpell = () => obj()?.type === etg.Spell,
		card = () => obj().card,
		bgcolor = () => ui.maybeLightenStr(card()),
		faceDown = () =>
			isSpell() &&
			obj().ownerId !== props.p1id &&
			!props.game.get(props.p1id, 'precognition'),
		setInfo = e => {
			if (!faceDown() && props.setInfo)
				props.setInfo(e, props.game.byId(props.id));
		};

	const visible = [
		() => obj().getStatus('psionic'),
		() => obj().getStatus('aflatoxin'),
		() => !obj().getStatus('aflatoxin') && obj().getStatus('poison') > 0,
		() => obj().getStatus('airborne') || obj().getStatus('ranged'),
		() => obj().getStatus('momentum'),
		() => obj().getStatus('adrenaline'),
		() => obj().getStatus('poison') < 0,
	];
	const bordervisible = [
		() => obj().getStatus('delayed'),
		() => props.id === obj().owner.gpull,
		() => obj().getStatus('frozen'),
	];

	const memo = createMemo(() => {
		if (faceDown()) return {};
		let statText, topText;
		if (!isSpell()) {
			const charges = obj().getStatus('charges');
			topText = activeText(obj());
			if (obj().type === etg.Creature) {
				statText = `${obj().trueatk()} | ${obj().truehp()}${
					charges ? ` \u00d7${charges}` : ''
				}`;
			} else if (obj().type === etg.Permanent) {
				if (card().getStatus('pillar')) {
					statText = `1:${
						obj().getStatus('pendstate') ? obj().owner.mark : card().element
					}\u00d7${charges}`;
					topText = '';
				} else {
					const ownattack = obj().getSkill('ownattack');
					if (ownattack?.length === 1 && ownattack[0] === 'locket') {
						const mode = obj().getStatus('mode');
						statText = `1:${~mode ? mode : obj().owner.mark}`;
					} else {
						statText = `${charges || ''}`;
					}
				}
			} else if (obj().type === etg.Weapon) {
				statText = `${obj().trueatk()}${charges ? ` \u00d7${charges}` : ''}`;
			} else if (obj().type === etg.Shield) {
				statText = charges ? '\u00d7' + charges : obj().truedr().toString();
			}
		} else {
			topText = card().name;
			statText = `${obj().cost}:${obj().costele}`;
		}
		return {
			topText,
			statText,
		};
	});

	return (
		<Show when={props.game.has_id(props.id)}>
			<div
				class={`${
					obj().type === etg.Spell ? 'inst handinst ' : 'inst '
				}${tgtclass(props.p1id, obj(), props.targeting)}`}
				style={{
					position: 'absolute',
					left: `${props.pos.x - 32}px`,
					top: `${props.pos.y - 32}px`,
					opacity: faceDown()
						? props.pos.opacity
						: (obj().isMaterial() ? 1 : 0.7) * props.pos.opacity,
					color: faceDown() ? undefined : card().upped ? '#000' : '#fff',
					'z-index': '2',
					'pointer-events': ~obj().getIndex() ? undefined : 'none',
				}}
				onMouseMove={setInfo}
				onMouseOver={setInfo}
				onMouseLeave={props.onMouseOut}
				onClick={[props.onClick, props.id]}>
				<Show
					when={!faceDown()}
					fallback={<div class="ico cback" style="left:2px;top:2px" />}>
					<div
						style={{
							width: '64px',
							height: '64px',
							'background-color': bgcolor(),
							'pointer-events': 'none',
						}}>
						<Show when={!props.lofiArt}>
							<img
								class={card.shiny ? 'shiny' : ''}
								src={`/Cards/${encodeCode(
									card().code + (asShiny(card().code, false) < 5000 ? 4000 : 0),
								)}.webp`}
								style={instimgstyle}
							/>
						</Show>
						<Show when={!isSpell()}>
							<Index each={visible}>
								{(v, k) => (
									<Show when={v()()}>
										<div
											class={`ico s${k}`}
											style={{
												position: 'absolute',
												bottom: '-8px',
												left: [
													'32px',
													'8px',
													'8px',
													'0px',
													'24px',
													'16px',
													'8px',
												][k],
												opacity: '.6',
												'z-index': '1',
											}}
										/>
									</Show>
								)}
							</Index>
							<Index each={bordervisible}>
								{(v, k) => (
									<Show when={v()()}>
										<div
											class={`ico sborder${k}`}
											style="position:absolute;left:0;top:0;width:64px;height:64px"
										/>
									</Show>
								)}
							</Index>
						</Show>
						<Show when={props.game.game.has_protectonce(props.id)}>
							<div
								class="ico protection"
								style="position:absolute;width:64px;height:64px"
							/>
						</Show>
						<div style="position:absolute;width:64px">
							<Components.Text
								text={memo().topText}
								icoprefix="se"
								style={{
									width: '64px',
									'white-space': 'nowrap',
									overflow: 'hidden',
									'background-color': bgcolor(),
								}}
							/>
							<Components.Text
								text={memo().statText}
								icoprefix="se"
								style={{
									float: 'right',
									'background-color': bgcolor(),
								}}
							/>
							<Show when={!isSpell()}>
								<Components.Text
									text={card().name}
									icoprefix="se"
									style={{
										position: 'absolute',
										top: '54px',
										height: '10px',
										width: '64px',
										overflow: 'hidden',
										'white-space': 'nowrap',
										'background-color': bgcolor(),
									}}
								/>
							</Show>
						</div>
					</div>
				</Show>
			</div>
		</Show>
	);
}

function thingTweenCompare(prev, next) {
	return (
		prev.x === next.x && prev.y === next.y && prev.opacity === next.opacity
	);
}

function Thing(props) {
	return (
		<Tween
			initial={props.pos0}
			state={props.pos}
			compare={thingTweenCompare}
			unregister={() => props.unregister(props.id)}
			proc={(ms, prev, next) => {
				if (ms > 96 * Math.PI) {
					if (next.opacity === 0) props.unregister(props.id);
					return next;
				}
				const pos = {
					x: prev.x + (next.x - prev.x) * Math.sin(ms / 192),
					y: prev.y + (next.y - prev.y) * Math.sin(ms / 192),
				};
				props.setIdTrack(props.id, pos);
				return {
					opacity:
						prev.opacity + (next.opacity - prev.opacity) * Math.sin(ms / 192),
					...pos,
				};
			}}>
			{pos => (
				<ThingInst
					lofiArt={props.lofiArt}
					game={props.game}
					id={props.id}
					p1id={props.p1id}
					setInfo={props.setInfo}
					onMouseOut={props.onMouseOut}
					onClick={props.onClick}
					targeting={props.targeting}
					pos={pos()}
				/>
			)}
		</Tween>
	);
}

function Things(props) {
	const birth = id =>
		untrack(() => {
			const start = props.startPos.get(id);
			return start < 0
				? { opacity: 0, x: 103, y: -start === props.p1id ? 551 : 258 }
				: start
				? { opacity: 0, x: -99, y: -99, ...props.getIdTrack(start) }
				: { opacity: 0, ...ui.tgtToPos(props.game.byId(id), props.p1id) };
		});
	const death = new Map(),
		[getDeath, updateDeath] = createSignal(death, { equals: false }),
		banned = new Set();
	const [allthings, setAll] = createSignal(props.things);
	createComputed(oldthings => {
		untrack(() => {
			const newthings = new Set(props.things);
			let updated = false;
			for (const id of newthings) {
				if (death.has(id)) death.delete(id);
				else if (banned.has(id)) banned.delete(id);
			}
			for (const id of oldthings) {
				if (!newthings.has(id) && !banned.has(id) && props.game.has_id(id)) {
					const endpos = props.endPos.get(id);
					const pos =
						endpos < 0
							? { x: 103, y: -endpos === props.p1id ? 551 : 258 }
							: props.getIdTrack(endpos || id);
					if (pos) {
						death.set(id, { opacity: 0, ...pos });
						updated = true;
					}
				}
			}
			setAll(props.things.concat(Array.from(death.keys())));
			if (updated) updateDeath(death);
		});
		return props.things;
	}, props.things);
	const unregister = id => {
		if (death.has(id)) {
			banned.add(id);
			death.delete(id);
		}
	};
	return (
		<For each={allthings()}>
			{id => (
				<Thing
					{...props}
					unregister={unregister}
					id={id}
					obj={props.game.byId(id)}
					pos0={birth(id)}
					pos={
						getDeath().get(id) ?? {
							opacity: 1,
							...ui.tgtToPos(props.game.byId(id), props.p1id),
						}
					}
				/>
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

function FoePlays(props) {
	const [line, setLine] = createSignal(null);
	return (
		<Show when={props.foeplays}>
			<div
				style={{
					position: 'absolute',
					left: '800px',
					top: `${540 - props.foeplays.length * 20}px`,
					'z-index': '6',
				}}>
				<For each={props.foeplays}>
					{play => (
						<Components.CardImage
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
			<Show when={line()}>
				<ArrowLine {...line()} />
			</Show>
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

const initialSpells = [];
const initialEffects = {
	effects: new Set(),
	startPos: new Map(),
	endPos: new Map(),
	fxTextPos: new Map(),
	fxStatChange: new Map(),
};
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
	const lofiArt = rx.opts.lofiArt ?? false,
		playByPlayMode = rx.opts.playByPlayMode,
		expectedDamageSamples = rx.opts.expectedDamageSamples | 0 || 4;
	let aiDelay = 0,
		streakback = 0;
	const [tempgame, setTempgame] = createSignal(null);
	const [replayhistory, setReplayHistory] = createSignal([props.game]);
	const [replayindex, setreplayindex] = createSignal(0);
	const [depend, forceUpdate] = createSignal(undefined, { equals: false });
	const pgame = () => {
		depend();
		return props.game;
	};
	const game = () =>
		props.replay ? replayhistory()[replayindex()] : tempgame() ?? pgame();

	const [p1id, setPlayer1] = createSignal(
			props.replay
				? pgame().turn
				: pgame().byUser(rx.user ? rx.user.name : '').id,
		),
		player1 = () => game().byId(p1id());
	const [p2id, setPlayer2] = createSignal(player1().foeId),
		player2 = () => game().byId(p2id());

	const idtrack = new Map(),
		setIdTrack = (id, pos) => idtrack.set(id, pos),
		getIdTrack = id =>
			id === p1id()
				? ui.tgtToPos(player1(), p1id())
				: id === p2id()
				? ui.tgtToPos(player2(), p1id())
				: idtrack.get(id);
	const [showFoeplays, setShowFoeplays] = createSignal(false);
	const [resigning, setResigning] = createSignal(false);
	const [hovercard, setHoverCard] = createSignal(null);
	const [hovery, setHovery] = createSignal(null);
	const [tooltip, setTooltip] = createSignal({});
	const [foeplays, setFoeplays] = createSignal(new Map());
	const [spells, setSpells] = createSignal(initialSpells);
	const [targeting, setTargeting] = createSignal(null);
	const [effects, setEffects] = createSignal(initialEffects);
	const [popup, setPopup] = createSignal(props.game.data.quest?.opentext);

	const Text = (state, newstate, id, text, onRest) => {
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
			newentry.dom = Text(
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
				const c = cmd.x === 'cast' && cmd.c && game.byId(cmd.c);
				if (!c || c.ownerId === p1id() || !c.owner.isCloaked()) {
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
			const effects = game.next(cmd);
			forceUpdate();
			if (
				!iscmd &&
				game.data.players.some(pl => pl.user && pl.user !== rx.user.name)
			) {
				sock.userEmit('move', {
					id: props.gameid,
					prehash,
					hash: game.hash(),
					cmd,
				});
			}
			gameStep(game);
			setEffects(state => {
				const newstate = {};
				for (let idx = 0; idx < effects.length; idx += 3) {
					const kind = enums.Fx[effects[idx]],
						id = effects[idx + 1],
						param = effects[idx + 2];
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
							break;
						}
						case 'Card':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(state, newstate, id, game.Cards.Codes[param].name),
							);
							break;
						case 'Poison':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(state, newstate, id, `Poison ${param}`),
							);
							break;
						case 'Delay':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(Text(state, newstate, id, `Delay ${param}`));
							break;
						case 'Freeze':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(state, newstate, id, `Freeze ${param}`),
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
							const playerName =
								game.data.players[game.byId(id).getIndex()].name;
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
							newstate.effects.add(Text(state, newstate, id, `+${param}`));
							break;
						case 'Lightning': {
							newstate.effects ??= new Set(state.effects);
							const pos = getIdTrack(id) ?? { x: -99, y: -99 };
							const LightningEffect = () => (
								<LightningFx
									pos={pos}
									setEffects={setEffects}
									self={LightningEffect}
								/>
							);
							newstate.effects.add(LightningEffect);
							break;
						}
						case 'Lives':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(Text(state, newstate, id, `${param} lives`));
							break;
						case 'Quanta':
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(
								Text(state, newstate, id, `${param >> 8}:${param & 255}`),
							);
							break;
						case 'Sfx':
							playSound(wasm.Sfx[param]);
							break;
						default:
							newstate.effects ??= new Set(state.effects);
							newstate.effects.add(Text(state, newstate, id, kind));
							break;
					}
				}
				return { ...state, ...newstate };
			});
			const newTurn = game.turn;
			if (newTurn !== turn) {
				const pl = game.byId(newTurn);
				if (pl.data.user === rx.user.name) {
					setPlayer1(newTurn);
				}
				setFoeplays(foeplays => new Map(foeplays).set(newTurn, []));
			}
		});

	const setReplayIndex = idx => {
		const history = replayhistory();
		if (idx >= history.length) {
			history = history.slice();
			while (idx >= history.length) {
				const gclone = history[history.length - 1].clone();
				gclone.next(props.replay.moves[history.length - 1], false);
				history.push(gclone);
			}
			setReplayHistory(history);
		}
		const game = history[idx];
		batch(() => {
			setreplayindex(idx);
			setPlayer1(game.turn);
			setPlayer2(game.get_foe(game.turn));
		});
	};

	const gotoResult = () => {
		const { game } = props;
		if (game.data.arena) {
			sock.userEmit('modarena', {
				aname: game.data.arena,
				won: game.winner !== p1id(),
				lv: game.data.level - 4,
			});
		}
		if (game.winner === p1id()) {
			if (game.data.quest !== undefined) {
				if (game.data.quest.autonext) {
					mkAi.run(
						mkQuestAi(game.data.quest.autonext, qdata =>
							addNoHealData(game, qdata),
						),
					);
					return;
				} else if (!rx.user.quests[game.data.quest.key]) {
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
			store.doNav(import('../vanilla/views/Result.jsx'), { game });
		} else {
			store.doNav(import('./Result.jsx'), { game, streakback });
		}
	};

	const endClick = (discard = 0) => {
		const { game } = props;
		if (game.turn === p1id() && game.phase === wasm.Phase.Mulligan) {
			applyNext({ x: 'accept' });
		} else if (game.winner) {
			gotoResult();
		} else if (game.turn === p1id()) {
			if (discard === 0 && game.full_hand(p1id())) {
				setTargeting({
					filter: obj => obj.type === etg.Spell && obj.ownerId === p1id(),
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
	};

	const cancelClick = () => {
		const { game } = props;
		if (resigning()) {
			setResigning(false);
		} else if (game.turn === p1id()) {
			if (game.phase === wasm.Phase.Mulligan && !game.empty_hand(p1id())) {
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
		} else {
			applyNext({ x: 'resign', c: p1id() });
			if (pgame().winner) gotoResult();
		}
	};

	const thingClick = id => {
		const { game } = props;
		clearCard();
		if (props.replay || game.phase !== wasm.Phase.Play) return;
		const obj = game.byId(id);
		if (targeting()) {
			if (targeting().filter(obj)) {
				targeting().cb(obj);
			}
		} else if (obj.ownerId === p1id() && obj.canactive()) {
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
	};

	const gameStep = game => {
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
						if (game.phase === wasm.Phase.Play && now < aiDelay) {
							return new Promise(resolve =>
								setTimeout(() => resolve(e), aiDelay - now),
							);
						} else {
							return Promise.resolve(e);
						}
					})
					.then(e => {
						aiDelay = Date.now() + (game.turn === p1id() ? 2000 : 200);
						applyNext(e.data.cmd, true);
					});
			}
		}
	};

	const isMultiplayer = game =>
		game.data.players.some(pl => pl.user && pl.user !== rx.user.name);

	const onkeydown = e => {
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
			thingClick(chi ? p2id() : p1id());
		} else if (~(chi = 'qa'.indexOf(ch))) {
			const { shieldId } = pgame().byId(chi ? p2id() : p1id());
			if (shieldId !== 0) thingClick(shieldId);
		} else if (~(chi = 'ed'.indexOf(ch))) {
			const { weaponId } = pgame().byId(chi ? p2id() : p1id());
			if (weaponId !== 0) thingClick(weaponId);
		} else if (~(chi = '12345678'.indexOf(ch))) {
			const card = pgame().byId(p1id()).handIds[chi];
			if (card) thingClick(card);
		} else if (ch === 'p') {
			if (pgame().turn === p1id() && p2id() !== player1().foeId) {
				applyNext({ x: 'foe', t: p2id() });
			}
		} else if (ch === 'l' && props.gameid) {
			sock.userEmit('reloadmoves', { id: props.gameid });
		} else if (~(chi = '[]'.indexOf(ch))) {
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
		if (!props.replay && !pgame().data.spectate) {
			document.addEventListener('keydown', onkeydown);
			window.addEventListener('beforeunload', onbeforeunload);
		}

		const { game } = props;
		if (
			!props.noloss &&
			!game.data.endurance &&
			!game.Cards.Names.Relic &&
			(game.data.level !== undefined || isMultiplayer(game))
		) {
			sock.userExec('addloss', {
				pvp: isMultiplayer(game),
				l: game.data.level,
				g: -(game.data.cost | 0),
			});
			streakback = rx.user.streak[game.data.level];
		}
		store.setCmds({
			move: ({ cmd, hash }) => {
				const { game } = props;
				if ((!cmd.c || game.has_id(cmd.c)) && (!cmd.t || game.has_id(cmd.t))) {
					applyNext(cmd, true);
					if (game.hash() === hash) return;
				}
				sock.userEmit('reloadmoves', { id: props.gameid });
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
		store.setCmds({});
		document.removeEventListener('keydown', onkeydown);
		window.removeEventListener('beforeunload', onbeforeunload);
	});

	const setCard = (e, card) => {
		setHoverCard(card);
		setHovery(e.pageY > 300 ? 44 : 300);
	};

	const setInfo = (e, obj) => {
		const actinfo =
			targeting() && targeting().filter(obj) && activeInfo[targeting().text];
		setTooltip({
			text: `${obj.info()}${
				actinfo ? '\n' + actinfo(targeting().src, obj) : ''
			}`,
			style: {
				position: 'absolute',
				left: `${e.pageX}px`,
				top: `${e.pageY}px`,
				'z-index': '5',
			},
		});
		if (obj.type !== etg.Player) {
			setCard(e, obj.card);
		}
	};

	const clearCard = () => {
		setHoverCard(null);
		setTooltip(null);
	};

	const expectedDamages = createMemo(prev =>
		prev && pgame().replay.length === prev.replaylength
			? prev
			: {
					expectedDamage: pgame().expectedDamage(expectedDamageSamples),
					replaylength: pgame().replay.length,
			  },
	);
	const cloaked = () => player2().isCloaked();

	const texts = createMemo(() => {
		const g = game();
		let turntell, endText, cancelText;
		if (g.phase !== wasm.Phase.End) {
			turntell = targeting()
				? targeting().text
				: `${g.turn === p1id() ? 'Your' : 'Their'} turn${
						g.phase > wasm.Phase.Mulligan
							? ''
							: g.players[0] === p1id()
							? "\nYou're first"
							: "\nYou're second"
				  }`;
			if (g.turn === p1id()) {
				endText = targeting()
					? ''
					: g.phase === wasm.Phase.Play
					? 'End Turn'
					: g.turn === p1id()
					? 'Accept'
					: '';
				if (g.phase !== wasm.Phase.Play) {
					cancelText = g.turn === p1id() ? 'Mulligan' : '';
				} else {
					cancelText = targeting() || resigning() ? 'Cancel' : '';
				}
			} else cancelText = endText = '';
		} else {
			turntell = `${g.turn === p1id() ? 'Your' : 'Their'} Turn\n${
				g.winner === p1id() ? 'Won' : 'Lost'
			}`;
			endText = 'Continue';
			cancelText = '';
		}
		return { turntell, endText, cancelText };
	});

	const things = createMemo(() => [
		...game().game.visible_instances(p1id(), true, cloaked()),
		...game().game.visible_instances(p2id(), false, cloaked()),
	]);

	return (
		<>
			{popup() && <PagedModal pages={popup()} onClose={() => setPopup(null)} />}
			{svgbg}
			<Show when={cloaked()}>{cloaksvg}</Show>
			{showFoeplays() ? (
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
			) : (
				playByPlayMode !== 'disabled' && (
					<SpellDisplay
						playByPlayMode={playByPlayMode}
						getIdTrack={getIdTrack}
						spells={spells()}
						setSpells={setSpells}
					/>
				)
			)}
			<For each={[0, 1]}>
				{j => {
					const pl = j ? player2 : player1,
						plpos = () => ui.tgtToPos(pl(), p1id()),
						handOverlay = () =>
							pl().casts === 0
								? 12
								: pl().getStatus('sanctuary')
								? 8
								: (pl().getStatus('nova') >= 2 ||
										pl().getStatus('nova2') >= 1) &&
								  (pl().id !== p1id() ||
										pl().handIds.some(id => {
											const card = game().Cards.Codes[game().get(id, 'card')];
											return card && card.isOf(game().Cards.Names.Nova);
										}))
								? 1
								: null;
					const expectedDamage = () =>
						expectedDamages().expectedDamage[pl().getIndex()];
					const x1 = () => Math.max(Math.round(96 * (pl().hp / pl().maxhp)), 0),
						x2 = () =>
							Math.max(
								x1() - Math.round(96 * (expectedDamage() / pl().maxhp)),
								0,
							);
					const poison = () => pl().getStatus('poison'),
						poisoninfo = () =>
							`${
								poison() > 0
									? poison() + ' 1:2'
									: poison() < 0
									? -poison() + ' 1:7'
									: ''
							} ${pl().getStatus('neuro') ? ' 1:10' : ''}`;
					const hptext = () =>
						`${pl().hp}/${pl().maxhp} ${
							!cloaked() && expectedDamage() ? `(${expectedDamage()})` : ''
						}\n${poisoninfo() ? `\n${poisoninfo()}` : ''}${
							pl().id !== p1id() && pl().id !== player1().foeId
								? '\n(Not targeted)'
								: ''
						}`;
					return (
						<>
							<div
								class={tgtclass(p1id(), pl(), targeting())}
								style={{
									position: 'absolute',
									left: `${plpos().x - 48}px`,
									top: `${plpos().y - 40}px`,
									width: '96px',
									height: '80px',
									border: 'transparent 2px solid',
									'z-index': '4',
								}}
								onClick={[thingClick, pl().id]}
								onMouseOver={e => setInfo(e, pl())}
								onMouseMove={e => setInfo(e, pl())}
							/>
							<span
								class={'ico e' + pl().mark}
								style={{
									position: 'absolute',
									left: '32px',
									top: j ? '228px' : '430px',
									transform: 'translate(-50%,-50%)',
									'text-align': 'center',
									'pointer-events': 'none',
									'font-size': '18px',
									'text-shadow': '2px 2px 1px #000,2px 2px 2px #000',
								}}>
								{pl().markpower !== 1 && pl().markpower}
							</span>
							<Show when={pl().getStatus('sosa')}>
								<div
									class={'ico sacrifice'}
									style={{
										position: 'absolute',
										left: '0',
										top: j ? '7px' : '502px',
										'pointer-events': 'none',
									}}
								/>
							</Show>
							<Show when={pl().getStatus('sabbath')}>
								<span
									class="ico sabbath"
									style={{
										position: 'absolute',
										left: '0',
										top: j ? '96px' : '300px',
									}}
								/>
							</Show>
							<Show
								when={
									pl().getStatus('drawlock') || pl().getStatus('protectdeck')
								}>
								<span
									style={{
										position: 'absolute',
										left: '95px',
										top: j ? '250px' : '543px',
										width: '48px',
										height: '48px',
										'background-color': pl().getStatus('drawlock')
											? '#931'
											: '#ede',
									}}
								/>
							</Show>
							<Show when={handOverlay()}>
								<span
									style={{
										'z-index': '1',
										position: 'absolute',
										left: '101px',
										top: j ? '0px' : '300px',
										width: '66px',
										height: '263px',
										'background-color': ui.strcols[handOverlay()],
										opacity: '.3',
										'border-radius': '4px',
										'pointer-events': 'none',
									}}
								/>
							</Show>
							<For each={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}>
								{k => (
									<span
										class={'ico ce' + k}
										style={{
											position: 'absolute',
											left: `${k & 1 ? 2 : 48}px`,
											top: `${(j ? 106 : 308) + (((k - 1) / 2) | 0) * 18}px`,
											'font-size': '16px',
											'pointer-events': 'none',
											'padding-left': '16px',
										}}>
										&nbsp;
										{pl().quanta[k] || ''}
									</span>
								)}
							</For>
							<div
								style={{
									'background-color': '#000',
									position: 'absolute',
									left: '2px',
									top: j ? '36px' : '531px',
									width: '98px',
									height: '22px',
									'pointer-events': 'none',
								}}
							/>
							<Tween
								state={{ x1: x1(), x2: x2() }}
								proc={hpTweenProc}
								compare={hpTweenCompare}>
								{state => (
									<>
										<div
											style={{
												'background-color': ui.strcols[etg.Life],
												position: 'absolute',
												left: '3px',
												top: j ? '37px' : '532px',
												width: `${state().x1}px`,
												height: '20px',
												'pointer-events': 'none',
												'z-index': '2',
											}}
										/>
										<Show when={!cloaked() && expectedDamage() !== 0}>
											<div
												style={{
													'background-color':
														ui.strcols[
															expectedDamage() >= pl().hp
																? etg.Fire
																: expectedDamage() > 0
																? etg.Time
																: etg.Water
														],
													position: 'absolute',
													left: `${3 + Math.min(state().x1, state().x2)}px`,
													top: j ? '37px' : '532px',
													width:
														Math.max(state().x1, state().x2) -
														Math.min(state().x1, state().x2) +
														'px',
													height: '20px',
													'pointer-events': 'none',
													'z-index': '2',
												}}
											/>
										</Show>
									</>
								)}
							</Tween>
							<Components.Text
								text={hptext()}
								style={{
									'text-align': 'center',
									width: '100px',
									'pointer-events': 'none',
									'font-size': '12px',
									'line-height': '1.1',
									position: 'absolute',
									left: '0',
									top: j ? '40px' : '535px',
									'text-shadow': '1px 1px 1px #000,2px 2px 2px #000',
									'z-index': '2',
								}}
							/>
							<div
								class={pl().deck_length ? 'ico ccback' : ''}
								style={{
									position: 'absolute',
									left: '103px',
									top: j ? '258px' : '551px',
									'text-align': 'center',
									'padding-top': '7px',
									'pointer-events': 'none',
									'font-size': '18px',
									'text-shadow': '2px 2px 1px #000,2px 2px 2px #000',
									'z-index': '3',
								}}>
								{pl().deck_length || '0!!'}
							</div>
						</>
					);
				}}
			</For>
			<Things
				startPos={effects().startPos}
				endPos={effects().endPos}
				getIdTrack={getIdTrack}
				setIdTrack={setIdTrack}
				lofiArt={props.lofiArt}
				game={game()}
				p1id={p1id()}
				setInfo={setInfo}
				onMouseOut={clearCard}
				onClick={thingClick}
				targeting={targeting()}
				things={things()}
			/>
			{game().game.has_flooding() && floodsvg}
			<div
				style={{
					'white-space': 'pre-wrap',
					'text-align': 'center',
					position: 'absolute',
					left: '780px',
					top: '40px',
					width: '120px',
					'z-index': '3',
				}}>
				{`${
					[
						'Commoner\n',
						'Mage\n',
						'Champion\n',
						'Demigod\n',
						'Arena1\n',
						'Arena2\n',
					][game().data.level] ??
					(player2().data.leader !== undefined
						? `${
								game().playerDataByIdx(player2().data.leader).name ||
								player2().data.leader
						  }\n`
						: '')
				}${player2().data.name || '-'}`}
			</div>
			<span
				style={{
					position: 'absolute',
					left: '780px',
					top: '560px',
					width: '120px',
					'text-align': 'center',
					'pointer-events': 'none',
					'white-space': 'pre',
				}}>
				{texts().turntell}
			</span>
			<For each={Array.from(effects().effects)}>{fx => untrack(fx)}</For>
			<Components.Card x={734} y={hovery()} card={hovercard()} />
			<Components.Text class="infobox" icoprefix="te" {...tooltip()} />
			{!!foeplays().get(p2id())?.length && (
				<input
					type="button"
					value={`History ${foeplays().get(p2id()).length}`}
					style={{
						position: 'absolute',
						left: '2px',
						top: '270px',
						'z-index': '2',
					}}
					onClick={() => {
						setTempgame(null);
						setShowFoeplays(showFoeplays => !showFoeplays);
					}}
				/>
			)}
			<input
				type="button"
				value={props.replay ? 'Exit' : resigning() ? 'Confirm' : 'Resign'}
				onClick={resignClick}
				style={{
					position: 'absolute',
					left: '816px',
					top: '15px',
					'z-index': '4',
				}}
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
								style={{
									position: 'absolute',
									left: '10px',
									top: '460px',
								}}
							/>
						)}
						{texts().cancelText && (
							<input
								type="button"
								value={texts().cancelText}
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
						{game().game.aieval().toFixed(2)}
					</span>
					<span
						style={{
							position: 'absolute',
							left: '760px',
							top: '520px',
						}}>
						{replayindex()}
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
						{game().countPlies()}
					</span>
					{!!replayindex() && (
						<input
							type="button"
							value="<"
							onClick={() => setReplayIndex(replayindex() - 1)}
							style={{
								position: 'absolute',
								left: '800px',
								top: '520px',
								width: '20px',
							}}
						/>
					)}
					{!game().winner && (
						<input
							type="button"
							value=">"
							onClick={() => setReplayIndex(replayindex() + 1)}
							style={{
								position: 'absolute',
								left: '830px',
								top: '520px',
								width: '20px',
							}}
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
							style={{
								position: 'absolute',
								left: '800px',
								top: '540px',
								width: '20px',
							}}
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
								setReplayIndex(Math.min(idx, len));
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
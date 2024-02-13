import { onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';

import * as usercmd from './usercmd.js';
import { changeMusic, changeSound } from './audio.js';
import { iterraw, mergedecks, removedecks } from './etgutil.js';

export const Login =
	typeof kongregateAPI === 'undefined' ?
		import('./views/Login.jsx')
	:	import('./views/KongLogin.jsx');

const opts = { channel: 'Main' };
let hasLocalStorage = true;
try {
	for (const key in localStorage)
		if (localStorage.hasOwnProperty(key)) opts[key] = localStorage[key];
} catch (e) {
	hasLocalStorage = false;
}
changeSound(opts.enableSound);
changeMusic(opts.enableMusic);

const listeners = new Set();
export let state = {
	nav: { view: () => null, props: undefined, key: 0 },
	opts,
	alts: {},
	chat: new Map(),
	muted: new Set(),
};

function dispatch(newstate) {
	state = newstate;
	for (const listener of listeners) listener(state);
}

function subscribe(cb) {
	listeners.add(cb);
	return () => listeners.delete(cb);
}

export function doNav(view, props = {}) {
	view.then(view =>
		dispatch({
			...state,
			nav: { view: view.default, props, key: state.nav.key + 1 },
		}),
	);
}

export function navGame(game) {
	if (game) doNav(import('./views/Match.jsx'), { game });
}

export function getDeck() {
	return state.user.decks[state.user.selectedDeck] ?? '';
}

export function setOptTemp(key, val) {
	if (hasLocalStorage && !val) delete localStorage[key];
	dispatch({ ...state, opts: { ...state.opts, [key]: val } });
}

export function setOpt(key, val) {
	if (hasLocalStorage && val) localStorage[key] = val;
	setOptTemp(key, val);
}

export function mute(name) {
	const muted = new Set(state.muted);
	muted.add(name);
	dispatch({ ...state, muted });
}
export function unmute(name) {
	const muted = new Set(state.muted);
	muted.delete(name);
	dispatch({ ...state, muted });
}
export function clearChat(name) {
	const chat = new Map(state.chat);
	chat.delete(name);
	dispatch({ ...state, chat });
}
export function chat(span, name = state.opts.channel) {
	const chat = new Map(state.chat);
	chat.set(name, (chat.get(name) ?? []).concat([span]));
	if (name === 'System')
		chat.set('Main', (chat.get('Main') ?? []).concat([span]));
	dispatch({ ...state, chat });
}
export function chatMsg(msg, name) {
	chat(() => <div>{msg}</div>, name);
}
export function requiresGold(gold) {
	chat(
		() => (
			<div>
				{`Requires ${gold}`}
				<span class="ico gold" />
			</div>
		),
		'System',
	);
}
export function setAlt(uname) {
	const newalts = {
		...state.alts,
		[state.uname ?? '']: state.user,
	};
	dispatch({ ...state, alts: newalts, user: newalts[uname ?? ''], uname });
}
export function addAlt(uname, data) {
	dispatch({ ...state, alts: { ...state.alts, [uname]: data } });
}
export function rmAlt(uname) {
	const alts = { ...state.alts };
	delete alts[uname];
	dispatch({ ...state, alts });
}
export function setUser(username, auth, alts) {
	dispatch({
		...state,
		user: alts[''] ?? {},
		alts,
		username,
		auth,
		uname: null,
	});
}
export function logout() {
	dispatch({
		...state,
		user: null,
		alts: {},
		username: null,
		auth: null,
		uname: null,
	});
}
export function userCmd(cmd, data) {
	dispatch({
		...state,
		user: { ...state.user, ...usercmd[cmd](data, state.user) },
	});
}
export function setAuth(auth) {
	dispatch({ ...state, auth });
}
export function updateUser(data) {
	dispatch({ ...state, user: { ...state.user, ...data } });
}
export function setOrig(orig) {
	dispatch({ ...state, orig });
}
export function updateOrig(data) {
	dispatch({ ...state, orig: { ...state.orig, ...data } });
}
export function addOrig(update) {
	let pool = state.orig.pool;
	if (update.pool) pool = mergedecks(pool, update.pool);
	if (update.rmpool) pool = removedecks(pool, update.rmpool);
	dispatch({
		...state,
		orig: {
			...state.orig,
			electrum: state.orig.electrum + (update.electrum | 0),
			pool,
			oracle: update.oracle ?? state.orig.oracle,
			fg:
				typeof update.fg !== 'number' ? state.orig.fg
				: update.fg === -1 ? null
				: update.fg,
		},
	});
}

export function hasflag(user, flag) {
	return user?.flags?.includes?.(flag);
}

export function hardcoreante(Cards, deck) {
	let sum = 0;
	const groups = [];
	for (const [code, count] of iterraw(deck)) {
		const card = Cards.Codes[code];
		if (card && !card.pillar) {
			sum += count;
			groups.push([sum, code]);
		}
	}
	const pick = (Math.random() * sum) | 0;
	for (const [gsum, gcode] of groups) {
		if (pick < gsum) {
			for (const [code, _count] of iterraw(state.user.accountbound)) {
				if (code === gcode) {
					return { c: gcode, bound: true };
				}
			}
			return { c: gcode, bound: false };
		}
	}

	return null;
}

export function useRx(cb = x => x) {
	const [signal, setState] = createStore(cb(state));
	onCleanup(subscribe(state => setState(cb(state))));
	return signal;
}

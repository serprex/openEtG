import { onCleanup } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';

import * as usercmd from './usercmd.js';
import * as sfx from './audio.js';
import * as etgutil from './etgutil.js';
import Login from './views/Login.jsx';

const opts = { channel: 'Main' };
let hasLocalStorage = true;
try {
	for (const key in localStorage)
		if (localStorage.hasOwnProperty(key)) opts[key] = localStorage[key];
} catch (e) {
	hasLocalStorage = false;
}
sfx.changeSound(opts.enableSound);
sfx.changeMusic(opts.enableMusic);

const listeners = new Set();
export let state = {
	nav: { view: Login, props: undefined, key: 0 },
	opts,
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
export function setUser(user) {
	dispatch({ ...state, user });
}
export function userCmd(cmd, data) {
	dispatch({
		...state,
		user: { ...state.user, ...usercmd[cmd](data, state.user) },
	});
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
	if (update.pool) pool = etgutil.mergedecks(pool, update.pool);
	if (update.rmpool) pool = etgutil.removedecks(pool, update.rmpool);
	dispatch({
		...state,
		orig: {
			...state.orig,
			electrum: state.orig.electrum + (update.electrum | 0),
			pool,
			oracle: update.oracle ?? state.orig.oracle,
			fg:
				typeof update.fg !== 'number'
					? state.orig.fg
					: update.fg === -1
					? null
					: update.fg,
		},
	});
}

export function useRx(cb = x => x) {
	const [signal, setState] = createStore(cb(state));
	onCleanup(subscribe(state => setState(cb(state))));
	return signal;
}

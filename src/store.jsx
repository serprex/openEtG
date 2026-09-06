import { createStore, snapshot } from 'solid-js';

import * as usercmd from './usercmd.js';
import { changeMusic, changeSound, musicList } from './audio.js';
import { iterraw, mergedecks, removedecks } from './etgutil.js';
import { playMusic } from './audio.js';
import { choose } from './util.js';

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

export const [appState, setAppState] = createStore({
	nav: { view: { default: () => null }, props: undefined, key: 0 },
	opts,
	alts: {},
	legacy: {},
	islegacy: false,
	chat: {},
	muted: {},
});

export function doNav(view, props = {}) {
	setAppState(s => {
		s.nav = { view, props, key: s.nav.key + 1 };
	});
}

export function navGame(game) {
	if (game) doNav(import('./views/Match.jsx'), { game });
}

export function deckOf(user) {
	return user.decks[user.selectedDeck] ?? '';
}

export function getDeck() {
	return deckOf(appState.user);
}

export function setOptTemp(key, val) {
	if (hasLocalStorage && !val) delete localStorage[key];
	setAppState(s => {
		s.opts[key] = val;
	});
}

export function setOpt(key, val) {
	if (hasLocalStorage && val) localStorage[key] = val;
	setOptTemp(key, val);
}

export function mute(name) {
	setAppState(s => {
		s.muted[name] = true;
	});
}
export function unmute(name) {
	setAppState(s => {
		delete s.muted[name];
	});
}
export function clearChat(name) {
	setAppState(s => {
		delete s.chat[name];
	});
}
export function chat(span, name = appState.opts.channel) {
	setAppState(s => {
		(s.chat[name] ??= []).push(span);
		if (name === 'System') (s.chat.Main ??= []).push(span);
	});
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
	setAppState(s => {
		s.alts[s.uname ?? ''] = snapshot(s.user);
		s.user = snapshot(s.alts[uname ?? '']);
		s.uname = uname;
	});
}
export function addAlt(uname, data) {
	setAppState(s => {
		s.alts[uname] = data;
	});
}
export function rmAlt(uname) {
	setAppState(s => {
		delete s.alts[uname];
	});
}
export function stopLegacy() {
	if (!appState.islegacy) return;
	setAppState(s => {
		s.legacy[s.uname] = snapshot(s.user);
		s.user = snapshot(s.alts['']);
		s.islegacy = false;
		s.uname = null;
	});
}
export function setLegacy(uname) {
	if (appState.islegacy) return;
	setAppState(s => {
		s.alts[s.uname ?? ''] = snapshot(s.user);
		s.user = snapshot(s.legacy[uname ?? '']);
		s.islegacy = true;
		s.uname = uname;
	});
}
export function addLegacy(name, data) {
	setAppState(s => {
		s.legacy[name] = data;
	});
}
export function setUser({ name, auth, data, legacy }) {
	setAppState(s => {
		s.user = data[''] ?? {};
		s.alts = data;
		s.legacy = legacy;
		s.username = name;
		s.auth = auth;
		s.uname = null;
	});
}
export function logout() {
	setAppState(s => {
		s.user = null;
		s.alts = {};
		s.username = null;
		s.auth = null;
		s.uname = null;
	});
}
export function userCmd(cmd, data) {
	setAppState(s => {
		s.user ??= {};
		Object.assign(s.user, usercmd[cmd](data, s.user));
	});
}
export function setAuth(auth) {
	setAppState(s => {
		s.auth = auth;
	});
}
// data may be a function of the user, to read it after a write earlier in the tick
export function updateUser(data) {
	setAppState(s => {
		s.user ??= {};
		Object.assign(s.user, typeof data === 'function' ? data(s.user) : data);
	});
}
export function setOrig(orig) {
	setAppState(s => {
		s.orig = orig;
	});
}
export function updateOrig(data) {
	updateUser(data);
}
export function addOrig(update) {
	setAppState(s => {
		const user = s.user;
		let pool = user.pool;
		if (update.pool) pool = mergedecks(pool, update.pool);
		if (update.rmpool) pool = removedecks(pool, update.rmpool);
		user.electrum += update.electrum | 0;
		user.pool = pool;
		if (update.oracle !== undefined) user.oracle = update.oracle;
		if (typeof update.fg === 'number')
			user.fg = update.fg === -1 ? null : update.fg;
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
			for (const [code, _count] of iterraw(appState.user.accountbound)) {
				if (code === gcode) {
					return { c: gcode, bound: true };
				}
			}
			return { c: gcode, bound: false };
		}
	}

	return null;
}

var cooldown = 0,
	cooldownPrefix = '';
export function loadMusic(prefix) {
	if (
		appState.opts.enableMusic &&
		(prefix != cooldownPrefix ||
			Date.now() - cooldown > (+appState.opts.musicCooldown || 300) * 1000)
	) {
		cooldownPrefix = prefix;
		const candidates = [];
		for (const [id, opus, _] of musicList) {
			if (appState.opts[`music${prefix}_${id}`]) {
				candidates.push(opus);
			}
		}
		if (prefix !== 'main' && prefix !== 'match' && candidates.length === 0) {
			return loadMusic('match');
		}
		const candidate =
			candidates.length === 0 ? musicList[1][1] : choose(candidates);
		playMusic(candidate);
	}
}

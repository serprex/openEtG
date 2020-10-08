import { Fragment } from 'react';
import { createStore, applyMiddleware } from 'redux';

import * as usercmd from './usercmd.js';
import * as sfx from './audio.js';
import * as etgutil from './etgutil.js';

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

export function doNav(view, props) {
	return dispatch =>
		view.then(view => dispatch({ type: 'NAV', view: view.default, props }));
}

export function setOptTemp(key, val) {
	return dispatch => {
		if (hasLocalStorage && !val) delete localStorage[key];
		dispatch({
			type: 'OPT',
			key,
			val,
		});
	};
}

export const setOpt = hasLocalStorage
	? (key, val) => dispatch => {
			if (hasLocalStorage) {
				if (val) localStorage[key] = val;
				else delete localStorage[key];
			}
			dispatch(setOptTemp(key, val));
	  }
	: setOptTemp;

export function setCmds(cmds) {
	return { type: 'CMD', cmds };
}
export function mute(name) {
	return { type: 'MUTE', name };
}
export function unmute(name) {
	return { type: 'UNMUTE', name };
}
export function clearChat(name) {
	return { type: 'CHAT_CLEAR', name };
}
export function chat(span, name) {
	return { type: 'CHAT', span, name };
}
export function chatMsg(msg, name) {
	return {
		type: 'CHAT',
		span: <div>{msg}</div>,
		name,
	};
}
export function setUser(user) {
	return { type: 'USER_SET', user };
}
export function userCmd(cmd, data) {
	return { type: 'USER_CMD', cmd, data };
}
export function updateUser(data) {
	return { type: 'USER_UPDATE', data };
}
export function setOrig(user) {
	return { type: 'ORIG_SET', user };
}
export function updateOrig(data) {
	return { type: 'ORIG_UPDATE', data };
}
export function addOrig(update) {
	return { type: 'ORIG_ADD', ...update };
}

export const store = createStore(
	(state, action) => {
		switch (action.type) {
			case 'NAV':
				return {
					...state,
					nav: {
						view: action.view,
						props: { ...action.props, key: state.nav.key + 1 },
						key: state.nav.key + 1,
					},
				};
			case 'OPT':
				return {
					...state,
					opts: { ...state.opts, [action.key]: action.val },
				};
			case 'CMD':
				return { ...state, cmds: action.cmds };
			case 'USER_SET':
				return { ...state, user: action.user };
			case 'USER_CMD':
				return {
					...state,
					user: {
						...state.user,
						...usercmd[action.cmd](action.data, state.user),
					},
				};
			case 'USER_UPDATE':
				return {
					...state,
					user: {
						...state.user,
						...action.data,
					},
				};
			case 'ORIG_SET':
				return { ...state, orig: action.user };
			case 'ORIG_UPDATE':
				return {
					...state,
					orig: {
						...state.orig,
						...action.data,
					},
				};
			case 'ORIG_ADD': {
				let pool = state.orig.pool;
				if (action.pool) pool = etgutil.mergedecks(pool, action.pool);
				if (action.rmpool) pool = etgutil.removedecks(pool, action.rmpool);
				return {
					...state,
					orig: {
						...state.orig,
						electrum: state.orig.electrum + (action.electrum | 0),
						pool,
					},
				};
			}
			case 'MUTE': {
				const muted = new Set(state.muted);
				muted.add(action.name);
				return { ...state, muted };
			}
			case 'UNMUTE': {
				const muted = new Set(state.muted);
				muted.delete(action.name);
				return { ...state, muted };
			}
			case 'CHAT_CLEAR': {
				const chat = new Map(state.chat);
				chat.delete(action.name);
				return { ...state, chat };
			}
			case 'CHAT': {
				const chat = new Map(state.chat),
					name = action.name ?? state.opts.channel,
					span = <Fragment key={state.chatid}>{action.span}</Fragment>;
				chat.set(name, (chat.get(name) || []).concat([span]));
				if (action.name === 'System')
					chat.set('Main', (chat.get('Main') || []).concat([span]));
				return { ...state, chat, chatid: state.chatid + 1 };
			}
		}
		return state;
	},
	{
		nav: { key: 0 },
		opts,
		cmds: {},
		chat: new Map(),
		chatid: 1,
		muted: new Set(),
	},
	applyMiddleware(({ dispatch, getState }) => next => action =>
		typeof action === 'function' ? action(dispatch, getState) : next(action),
	),
);

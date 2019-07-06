import * as redux from 'redux';
import React from 'react';

export function doNav(view, props) {
	return { type: 'NAV', view, props };
}

export function setCmds(cmds) {
	return { type: 'CMD', cmds };
}

export function setOptTemp(key, val) {
	return {
		type: 'OPT',
		key,
		val,
	};
}
export const setOpt = setOptTemp;

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

export const store = redux.createStore(
	(state, action) => {
		switch (action.type) {
			case 'NAV':
				return Object.assign({}, state, {
					nav: { view: action.view, props: action.props },
				});
			case 'OPT':
				return Object.assign({}, state, {
					opts: Object.assign({}, state.opts, { [action.key]: action.val }),
				});
			case 'CMD':
				return Object.assign({}, state, { cmds: action.cmds });
			case 'MUTE': {
				const muted = new Set(state.muted);
				muted.add(action.name);
				return Object.assign({}, state, { muted });
			}
			case 'UNMUTE': {
				const muted = new Set(state.muted);
				muted.delete(action.name);
				return Object.assign({}, state, { muted });
			}
			case 'CHAT_CLEAR': {
				const chat = new Map(state.chat);
				chat.delete(action.name);
				return Object.assign({}, state, { chat });
			}
			case 'CHAT': {
				const chat = new Map(state.chat);
				const name = action.name || state.opts.channel;
				chat.set(name, (chat.get(name) || []).concat([action.span]));
				if (action.name === 'System')
					chat.set('Main', (chat.get('Main') || []).concat([action.span]));
				return Object.assign({}, state, { chat });
			}
		}
		return state;
	},
	{
		nav: {},
		opts: { channel: 'Main', deck: '' },
		cmds: {},
		chat: new Map(),
		muted: new Set(),
	},
	redux.applyMiddleware(({ dispatch, getState }) => next => action => {
		if (typeof action === 'function') {
			return action(dispatch, getState);
		} else {
			return next(action);
		}
	}),
);

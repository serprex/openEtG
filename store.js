'use strict';
const redux = require('redux'),
	React = require('react'),
	opts = { channel: 'Main' };

let hasLocalStorage = true;
try {
	for (const key in localStorage)
		if (localStorage.hasOwnProperty(key)) opts[key] = localStorage[key];
} catch (e) {
	hasLocalStorage = false;
}

exports.doNav = (view, props) => ({ type: 'NAV', view, props });

exports.setOptTemp = (key, val) => (dispatch) => {
	if (hasLocalStorage && !val) delete localStorage[key];
	dispatch({
		type: 'OPT',
		key,
		val,
	});
};

exports.setOpt = hasLocalStorage ? (key, val) => (dispatch) => {
	if (hasLocalStorage) {
		if (val) localStorage[key] = val;
		else delete localStorage[key];
	}
	dispatch(exports.setOptTemp(key, val));
} : exports.setOptTemp;

exports.setCmds = cmds => ({ type: 'CMD', cmds });

exports.mute = name => ({ type: 'MUTE', name });
exports.unmute = name => ({ type: 'UNMUTE', name });
exports.clearChat = name => ({ type: 'CHAT_CLEAR', name });
exports.chat = (span, name) => ({ type: 'CHAT', span, name });
exports.chatMsg = (msg, fontcolor, name) => ({
	type: 'CHAT',
	span: <div style={!name && fontcolor && { color: fontcolor }}>{msg}</div>,
	name: name || fontcolor,
});

exports.store = redux.createStore((state, action) => {
	switch(action.type) {
		case 'NAV':
			return { ...state, nav: { view: action.view, props: action.props }};
		case 'OPT':
			return { ...state, opts: { ...state.opts, [action.key]: action.val }};
		case 'CMD':
			return { ...state, cmds: action.cmds };
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
			const chat = new Map(state.chat);
			const name = action.name || state.opts.channel;
			chat.set(name, (chat.get(name) || []).concat([action.span]));
			if (action.name === 'System') chat.set('Main', (chat.get('Main') || []).concat([action.span]));
			return { ...state, chat };
		}
	}
	return state;
}, {
	nav: {},
	opts,
	cmds: {},
	chat: new Map(),
	muted: new Set(),
}, redux.applyMiddleware(({dispatch, getState}) => next => action => {
	if (typeof action === 'function') {
		return action(dispatch, getState);
	} else {
		return next(action);
	}
}));


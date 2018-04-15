'use strict';
const redux = require('redux'), opts = {};

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
	})
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

exports.store = redux.createStore((state, action) => {
	switch(action.type) {
		case 'NAV':
			return Object.assign({}, state, { nav: { view: action.view, props: action.props }});
		case 'OPT':
			return Object.assign({}, state, { opts: Object.assign({}, state.opts, { [action.key]: action.val }) });
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
	}
	return state;
}, {
	nav: {},
	opts,
	cmds: {},
	muted: new Set(),
}, redux.applyMiddleware(({dispatch, getState}) => next => action => {
	if (typeof action === 'function') {
		return action(dispatch, getState);
	} else {
		return next(action);
	}
}));


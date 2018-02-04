'use strict';
const redux = require('redux'), opts = {};

let hasLocalStorage = true;
try {
	for (let key in localStorage)
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

exports.setCmds = cmds => ({ type: 'CMD', cmds })

exports.store = redux.createStore((state, action) => {
	if (action.type === 'NAV') {
		return Object.assign({}, state, { nav: { view: action.view, props: action.props }});
	}
	else if (action.type === 'OPT') {
		return Object.assign({}, state, { opts: Object.assign({}, state.opts, { [action.key]: action.val }) });
	}
	else if (action.type == 'CMD') {
		return Object.assign({}, state, { cmds: action.cmds });
	}
	return state;
}, {
	nav: {},
	opts,
	cmds: {},
}, redux.applyMiddleware(({dispatch, getState}) => next => action => {
	if (typeof action === 'function') {
		return action(dispatch, getState);
	} else {
		return next(action);
	}
}));


module.exports = require('redux').createStore((state, action) => {
	if (action.type === 'NAV') {
		return Object.assign({}, state, { nav: action.nav, navprops: action.props });
	}
	return state;
}, { nav: require('./views/Login') });


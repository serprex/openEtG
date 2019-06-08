'use strict';
const App = require('../views/App'),
	Rightpane = require('../views/Rightpane'),
	sock = require('../sock'),
	store = require('../store'),
	{ Provider } = require('react-redux'),
	reactDOM = require('react-dom'),
	React = require('react');
let lastError = 0;
window.onerror = function(...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		store.store.dispatch(store.chatMsg(args.join(', '), 'System'));
		lastError = now;
	}
};
sock.emit('motd');
reactDOM.render(
	<Provider store={store.store}>
		<App />
	</Provider>,
	document.getElementById('leftpane'),
);
reactDOM.render(
	<Provider store={store.store}>
		<Rightpane />
	</Provider>,
	document.getElementById('rightpane'),
);

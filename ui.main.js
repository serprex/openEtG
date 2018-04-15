'use strict';
require('@babel/polyfill');
const App = require('./views/App'),
	Rightpane = require('./views/Rightpane'),
	chat = require('./chat'),
	store = require('./store'),
	{ Provider } = require('react-redux'),
	reactDOM = require('react-dom'),
	React = require('react');
let lastError = 0;
window.onerror = function(...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		chat(args.join(', '), 'System');
		lastError = now;
	}
};
reactDOM.render(
	<Provider store={store.store}>
		<App />
	</Provider>,
	document.getElementById("leftpane"),
);
reactDOM.render(
	<Provider store={store.store}>
		<Rightpane />
	</Provider>,
	document.getElementById("rightpane"),
);

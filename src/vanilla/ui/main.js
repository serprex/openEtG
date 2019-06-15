'use strict';
const chat = require('../chat'),
	App = require('../views/App'),
	Rightpane = require('../views/Rightpane'),
	store = require('../store'),
	{ Provider } = require('react-redux'),
	reactDOM = require('react-dom'),
	React = require('react');
var lastError = 0;
window.onerror = function() {
	const now = Date.now();
	if (lastError + 999 < now) {
		chat(Array.apply(null, arguments).join(', '));
		lastError = now;
	}
};
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

'use strict';
var ui = require('./ui');
var etg = require('./etg');
var chat = require('./chat');
var Cards = require('./Cards');
var Effect = require('./Effect');
var etgutil = require('../etgutil');
var Actives = require('./Skills');
const App = require('./views/App'),
	Rightpane = require('./views/Rightpane'),
	store = require('./store'),
	{ Provider } = require('react-redux'),
	reactDOM = require('react-dom'),
	React = require('react');
var lastError = 0;
window.onerror = function() {
	var now = Date.now();
	if (lastError + 999 < now) {
		chat(Array.apply(null, arguments).join(', '));
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

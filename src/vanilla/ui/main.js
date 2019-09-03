import React from 'react';
import reactDOM from 'react-dom';
import { Provider } from 'react-redux';

import chat from '../chat.js';
import * as store from '../store.js';

let lastError = 0;
window.onerror = function() {
	const now = Date.now();
	if (lastError + 999 < now) {
		chat(Array.apply(null, arguments).join(', '));
		lastError = now;
	}
};

import('../views/App.js').then(App =>
	reactDOM.render(
		<Provider store={store.store}>
			<App.default />
		</Provider>,
		document.getElementById('leftpane'),
	),
);
import('../views/Rightpane.js').then(Rightpane =>
	reactDOM.render(
		<Provider store={store.store}>
			<Rightpane.default />
		</Provider>,
		document.getElementById('rightpane'),
	),
);

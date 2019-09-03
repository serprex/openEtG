import React from 'react';
import reactDOM from 'react-dom';
import { Provider } from 'react-redux';

import { store, chatMsg } from '../store.js';

let lastError = 0;
window.onerror = function(...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		store.dispatch(chatMsg(args.join(', '), 'System'));
		lastError = now;
	}
};

import { emit } from '../sock.js';
emit({ x: 'motd' });

import('../views/App.js').then(App =>
	reactDOM.render(
		<Provider store={store}>
			<App.default />
		</Provider>,
		document.getElementById('leftpane'),
	),
);
import('../views/Rightpane.js').then(Rightpane =>
	reactDOM.render(
		<Provider store={store}>
			<Rightpane.default />
		</Provider>,
		document.getElementById('rightpane'),
	),
);

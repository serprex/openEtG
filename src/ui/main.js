import(/* webpackPreload: true */ '../Game.js');
import(/* webpackPrefetch: true */ '../ai.worker.js');

import { render } from 'react-dom';
import { Provider } from 'react-redux';

import { store, chatMsg, doNav } from '../store.js';

let lastError = 0;
window.onerror = function (...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		store.dispatch(chatMsg(args.join(', '), 'System'));
		lastError = now;
	}
};

import { emit } from '../sock.js';
emit({ x: 'motd' });

import App from '../views/App.js';
render(
	<Provider store={store}>
		<App />
	</Provider>,
	document.getElementById('leftpane'),
);
import('../views/Rightpane.js').then(Rightpane =>
	render(
		<Provider store={store}>
			<Rightpane.default />
		</Provider>,
		document.getElementById('rightpane'),
	),
);

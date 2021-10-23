import { render } from 'react-dom';
import { Provider } from 'react-redux';

import { store, chatMsg, doNav } from '../store.jsx';

let lastError = 0;
window.onerror = function (...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		store.dispatch(chatMsg(args.join(', '), 'System'));
		lastError = now;
	}
};

import { emit } from '../sock.jsx';
emit({ x: 'motd' });

import App from '../views/App.jsx';
render(
	<Provider store={store}>
		<App />
	</Provider>,
	document.getElementById('leftpane'),
);
import('../views/Rightpane.jsx').then(Rightpane =>
	render(
		<Provider store={store}>
			<Rightpane.default />
		</Provider>,
		document.getElementById('rightpane'),
	),
);

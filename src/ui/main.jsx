import { createRoot } from 'react-dom/client';
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
createRoot(document.getElementById('leftpane')).render(
	<Provider store={store}>
		<App />
	</Provider>,
);
import('../views/Rightpane.jsx').then(Rightpane =>
	createRoot(document.getElementById('rightpane')).render(
		<Provider store={store}>
			<Rightpane.default />
		</Provider>,
	),
);

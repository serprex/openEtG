import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { store, chatMsg } from '../store.jsx';

let lastError = 0;
window.onerror = function (...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		store.dispatch(chatMsg(args.join(', '), 'System'));
		lastError = now;
	}
};

import { emit } from '../sock.jsx';
import App from '../views/App.jsx';
import Rightpane from '../views/Rightpane.jsx';

createRoot(document.getElementById('leftpane')).render(
	<Provider store={store}>
		<App />
	</Provider>,
);
createRoot(document.getElementById('rightpane')).render(
	<Provider store={store}>
		<Rightpane />
	</Provider>,
);

emit({ x: 'motd' });
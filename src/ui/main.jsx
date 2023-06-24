import { render } from 'solid-js/web';
import { chatMsg } from '../store.jsx';

let lastError = 0;
window.onerror = function (...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		chatMsg(args.join(', '), 'System');
		lastError = now;
	}
};

import { emit } from '../sock.jsx';
import App from '../views/App.js';
import Rightpane from '../views/Rightpane.jsx';

render(() => <App />, document.getElementById('leftpane'));
render(() => <Rightpane />, document.getElementById('rightpane'));

emit({ x: 'motd' });
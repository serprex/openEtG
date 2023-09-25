import { chatMsg, doNav, Login } from '../store.jsx';

let lastError = 0;
window.onerror = function (...args) {
	const now = Date.now();
	if (lastError + 999 < now) {
		chatMsg(args.join(', '), 'System');
		lastError = now;
	}
};

doNav(Login);
import { render } from 'solid-js/web';

import Rightpane from '../views/Rightpane.jsx';
render(() => <Rightpane />, document.getElementById('rightpane'));

import App from '../views/App.js';
render(() => <App />, document.getElementById('leftpane'));

import { emit } from '../sock.jsx';
emit({ x: 'motd' });

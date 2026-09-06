import { appState } from '../store.jsx';
import { createMemo, untrack } from 'solid-js';

export default function App(props) {
	const mod = createMemo(() => appState.nav.view);
	return createMemo(() => {
		const view = mod().default;
		appState.nav.key;
		return untrack(() => view(appState.nav.props));
	});
}

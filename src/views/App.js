import { useRx } from '../store.jsx';
import { createMemo, untrack } from 'solid-js';

export default function App(props) {
	const nav = useRx(state => state.nav);
	const mod = createMemo(() => nav.view);
	return createMemo(() => {
		const view = mod().default;
		nav.key;
		return untrack(() => view(nav.props));
	});
}

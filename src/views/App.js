import { useRx } from '../store.jsx';
import { untrack, createMemo } from 'solid-js';

export default function App(props) {
	const nav = useRx(state => state.nav);
	return createMemo(() => {
		const view = nav.view;
		nav.key;
		return untrack(() => view(nav.props));
	});
}

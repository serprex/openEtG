import { useRedux } from '../store.jsx';
import { untrack, createMemo } from 'solid-js';

export default function App(props) {
	const { nav } = useRedux();
	return createMemo(() => {
		const view = nav.view;
		nav.key;
		return untrack(() => view(nav.props));
	});
}

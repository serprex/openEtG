import { createSignal, onMount } from 'solid-js';

import * as sock from '../../sock.jsx';
import * as store from '../../store.jsx';
import { eleNames } from '../../ui.js';

export default function OriginalLogin() {
	const [select, setSelect] = createSignal(false);

	onMount(() => {
		sock.setCmds({
			originaldata: data => {
				if (data.deck) {
					delete data.x;
					store.setOrig(data);
					store.doNav(import('./MainMenu.jsx'));
				} else {
					setSelect(true);
				}
			},
		});
		sock.userEmit('loginoriginal');
	});

	const mainc = () =>
		[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => (
			<span
				class={`imgb ico e${i}`}
				style={`position:absolute;left:12px;top:${24 + (i - 1) * 40}px`}
				onClick={() => {
					sock.userEmit('initoriginal', {
						e: i === 13 ? (Math.random() * 12 + 1) | 0 : i,
						name: 'Original',
					});
				}}>
				<span style="position:absolute;left:48px;top:6px;width:144px">
					{i === 13 ? 'Random' : eleNames[i]}
				</span>
			</span>
		));
	return (
		<>
			{select() ? mainc : 'Loading..'}
			<input
				type="button"
				value="Exit"
				onClick={() => store.doNav(import('../../views/MainMenu.jsx'))}
				style="position:absolute;left:8px;top:570px"
			/>
		</>
	);
}

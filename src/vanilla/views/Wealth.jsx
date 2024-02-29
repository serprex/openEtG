import { createSignal, onMount, Index } from 'solid-js';

import { emit, setCmds } from '../../sock.jsx';
import { doNav } from '../../store.jsx';

export default function Wealth() {
	const [getTop, setTop] = createSignal([]);

	onMount(() => {
		setCmds({
			legacyboard: ({ top }) => {
				setTop(top);
			},
		});
		emit({ x: 'legacyboard' });
	});

	return (
		<div style="display:flex">
			<input
				type="button"
				value="Exit"
				onClick={() => doNav(import('./MainMenu.jsx'))}
			/>
			<div style="width:810px;display:grid;grid-template-rows:repeat(33,18px);column-gap:18px;grid-auto-flow:column;grid-auto-columns:257px;white-space:nowrap">
				<Index each={getTop()}>
					{(item, i) => (
						<div style="display:flex;justify-content:space-between">
							<div style="text-overflow:ellipsis;overflow:hidden">
								{`${i + 1}. ${item()[0]}`}
							</div>
							{item()[2]}
						</div>
					)}
				</Index>
			</div>
		</div>
	);
}

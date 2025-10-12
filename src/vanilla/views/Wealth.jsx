import { createSignal, onMount, Index } from 'solid-js';

import { userEmit, setCmds } from '../../sock.jsx';
import { doNav } from '../../store.jsx';

export default function Wealth() {
	const [getTop, setTop] = createSignal([]);

	onMount(() => {
		setCmds({
			legacyboard: ({ ownscore, top }) => {
				setTop({ ownscore, top });
			},
		});
		userEmit('legacyboard');
	});

	return (
		<div style="display:flex">
			<div>
				<input
					type="button"
					value="Exit"
					onClick={() => doNav(import('./MainMenu.jsx'))}
				/>
				<div>{getTop()?.ownscore}</div>
			</div>
			<div style="width:810px;display:grid;grid-template-rows:repeat(33,18px);column-gap:18px;grid-auto-flow:column;grid-auto-columns:257px;white-space:nowrap">
				<Index each={getTop()?.top}>
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

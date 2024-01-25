import { createSignal, onMount } from 'solid-js';
import { emit, setCmds } from '../sock.jsx';
import ExitBtn from '../Components/ExitBtn.jsx';
import { doNav } from '../store.jsx';

export default function WealthTop() {
	const [getTop, setTop] = createSignal(null);

	onMount(() => {
		setCmds({ wealthtop: ({ top }) => setTop(top) });
		emit({ x: 'wealthtop' });
	});

	const list = () => {
		const olc = [],
			top = getTop();
		if (top) {
			for (let i = 0; i < top.length; i += 2) {
				olc.push(
					<div
						style="display:flex;justify-content:space-between"
						onClick={() => doNav(import('./Library.jsx'), { name: top[i] })}>
						<div style="text-overflow:ellipsis;overflow:hidden">
							{`${(i >> 1) + 1}. ${top[i]}`}
						</div>
						{top[i + 1]}
					</div>,
				);
			}
		}
		return olc;
	};

	return (
		<>
			<div style="position:absolute;left:90px;width:810px;display:grid;grid-template-rows:repeat(33,18px);column-gap:18px;grid-auto-flow:column;grid-auto-columns:257px;white-space:nowrap">
				{list}
			</div>
			<ExitBtn x={4} y={300} />
		</>
	);
}

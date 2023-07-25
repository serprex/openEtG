import { createSignal, onMount } from 'solid-js';
import * as sock from '../sock.jsx';
import * as Components from '../Components/index.jsx';
import * as store from '../store.jsx';

export default function WealthTop(props) {
	const [getTop, setTop] = createSignal(null);

	onMount(() => {
		sock.setCmds({ wealthtop: ({ top }) => setTop(top) });
		sock.emit({ x: 'wealthtop' });
	});

	const list = () => {
		const olc = [],
			top = getTop();
		if (top) {
			for (let i = 0; i < top.length; i += 2) {
				olc.push(
					<div
						style="display:flex;justify-content:space-between"
						onClick={() =>
							store.doNav(import('./Library.jsx'), { name: top[i] })
						}>
						<div style="text-overflow:ellipsis;overflow:hidden">
							{`${(i >> 1) + 1}. ${top[i]}`}
						</div>
						{Math.round(top[i + 1])}
					</div>,
				);
			}
		}
		return (
			<div style="position:absolute;left:90px;width:810px;line-height:18px;display:grid;grid-template-rows:repeat(33,18px);column-gap:18px;grid-auto-flow:column;grid-auto-columns:257px;white-space:nowrap">
				{olc}
			</div>
		);
	};

	return (
		<>
			{list}
			<Components.ExitBtn x={4} y={300} />
		</>
	);
}

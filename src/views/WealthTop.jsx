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
					<li
						onClick={() =>
							store.doNav(import('./Library.jsx'), { name: top[i] })
						}>
						{top[i]}
						<span class="floatRight">{Math.round(top[i + 1])}</span>
					</li>,
				);
			}
		}
		return (
			<ol style="position:absolute;left:80px;width:800px;columns:3;column-gap:40px;line-height:17px">
				{olc}
			</ol>
		);
	};

	return (
		<>
			{list}
			<Components.ExitBtn x={4} y={300} />
		</>
	);
}

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
		const ol1c = [],
			ol2c = [],
			top = getTop();
		if (top) {
			for (let i = 0; i < top.length; i += 2) {
				const ol = i < top.length / 2 ? ol1c : ol2c;
				ol.push(
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
			<>
				<ol class="width400" style="position:absolute;left:80px;top:8px">
					{ol1c}
				</ol>
				<ol
					class="width400"
					start={ol1c.length + 1}
					style="position:absolute;left:480px;top:8px">
					{ol2c}
				</ol>
			</>
		);
	};

	return (
		<>
			{list}
			<Components.ExitBtn x={8} y={300} />
		</>
	);
}

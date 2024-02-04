import { createComputed, createSignal, onMount, Index } from 'solid-js';
import { emit, setCmds } from '../sock.jsx';
import ExitBtn from '../Components/ExitBtn.jsx';
import { doNav } from '../store.jsx';
import { presets } from '../ui.js';
import { state } from '../store.jsx';

const categories = [
	'Wealth',
	'Streak0',
	'Streak1',
	'Streak2',
	'Streak3',
	'Streak4',
	'Streak5',
	'Colosseum',
];

export default function Leaderboards() {
	const [getCategory, setCategory] = createSignal('Wealth'),
		[getFlags, setFlags] = createSignal(state.user.flags.slice().sort()),
		[getTop, setTop] = createSignal({});

	onMount(() => {
		setCmds({
			leaderboard: ({ flags, category, top }) => {
				const name = category + ':' + flags.sort().join(' ');
				setTop(t => ({
					...t,
					[name]: top,
				}));
			},
		});
	});

	createComputed(() => {
		const top = getTop();
		if (!top[getCategory() + ':' + getFlags().join(' ')]) {
			emit({ x: 'leaderboard', flags: getFlags(), category: getCategory() });
		}
	});

	return (
		<>
			<div style="position:absolute;left:90px;width:810px;display:grid;grid-template-rows:repeat(33,18px);column-gap:18px;grid-auto-flow:column;grid-auto-columns:257px;white-space:nowrap">
				<Index
					each={getTop()?.[getCategory() + ':' + getFlags().join(' ')] ?? []}>
					{(item, i) => (
						<div
							style="display:flex;justify-content:space-between"
							onClick={() =>
								doNav(import('./Library.jsx'), {
									name: item()[0],
									alt: item()[1],
								})
							}>
							<div style="text-overflow:ellipsis;overflow:hidden">
								{`${i + 1}. ${item()[1] || item()[0]}`}
							</div>
							{item()[2]}
						</div>
					)}
				</Index>
			</div>
			<div style="display:flex;position:absolute;left:0;top:0;flex-direction:column;row-gap:4px">
				{categories.map(category => (
					<input
						type="button"
						class={getCategory() === category ? 'selectedbutton' : ''}
						value={category}
						onClick={[setCategory, category]}
					/>
				))}
			</div>
			<div style="display:flex;position:absolute;left:0;top:200px;flex-direction:column;height:180px;row-gap:4px">
				<input
					type="button"
					class={getFlags().length === 0 ? 'selectedbutton' : ''}
					value="Main"
					onClick={[setFlags, []]}
				/>
				{presets.map(preset => (
					<input
						type="button"
						class={getFlags() === preset[1] ? 'selectedbutton' : ''}
						value={preset[0]}
						onClick={[setFlags, preset[1]]}
					/>
				))}
			</div>
			<ExitBtn x={4} y={578} />
		</>
	);
}

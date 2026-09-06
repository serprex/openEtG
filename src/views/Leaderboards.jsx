import { For, createEffect, createSignal } from 'solid-js';
import { userEmit, useCmds } from '../sock.jsx';
import { doNav, appState } from '../store.jsx';
import { presets } from '../ui.js';

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
		[getFlags, setFlags] = createSignal(appState.user.flags.slice().sort()),
		[getTop, setTop] = createSignal({});

	useCmds({
		leaderboard: ({ flags, category, ownscore, top }) => {
			const name = category + ':' + flags.sort().join(' ');
			setTop(t => ({
				...t,
				[name]: [ownscore, top],
			}));
		},
	});

	createEffect(
		() => [getTop(), getCategory(), getFlags()],
		([top, category, flags]) => {
			if (!top[category + ':' + flags.join(' ')]) {
				userEmit('leaderboard', { flags, category });
			}
		},
	);

	return (
		<div style="display:flex">
			<div style="display:flex;flex-direction:column;justify-content:space-between">
				<div style="display:flex;flex-direction:column;row-gap:4px;flex-grow:1">
					{categories.map(category => (
						<input
							type="button"
							class={getCategory() === category ? 'selected' : ''}
							value={category}
							onClick={[setCategory, category]}
						/>
					))}
				</div>
				<div style="display:flex;flex-direction:column;row-gap:4px;flex-grow:1">
					<input
						type="button"
						class={getFlags().length === 0 ? 'selected' : ''}
						value="Main"
						onClick={[setFlags, []]}
					/>
					{presets.map(preset => (
						<input
							type="button"
							class={getFlags() === preset[1] ? 'selected' : ''}
							value={preset[0]}
							onClick={[setFlags, preset[1]]}
						/>
					))}
				</div>
				<div style="margin-top:auto">
					<div>
						{getTop()?.[getCategory() + ':' + getFlags().join(' ')]?.[0]}
					</div>
					<input
						type="button"
						value="Exit"
						onClick={() => doNav(import('./MainMenu.jsx'))}
					/>
				</div>
			</div>
			<div style="width:810px;display:grid;grid-template-rows:repeat(33,18px);column-gap:18px;grid-auto-flow:column;grid-auto-columns:257px;white-space:nowrap">
				<For
					each={
						getTop()?.[getCategory() + ':' + getFlags().join(' ')]?.[1] ?? []
					}
					keyed={false}>
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
				</For>
			</div>
		</div>
	);
}

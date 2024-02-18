import { createMemo, Index, Show } from 'solid-js';
import * as Quest from '../Quest.js';
import Text from '../Components/Text.jsx';
import * as store from '../store.jsx';

export function QuestColumn(props) {
	const user = store.useRx(state => state.user);
	return (
		<div style="display:flex;flex-direction:column;width:177px">
			<Index each={props.area.children}>
				{(area, i) => (
					<Show
						when={
							typeof area() !== 'string' ||
							Quest.requireQuest(Quest.quarks[area()], user)
						}>
						<span
							style={`margin-top:8px;color:#${
								typeof area() === 'string' && !user.quests[area()] ? 'f' : 'a'
							}${props.quest[props.qi] === i ? 'ff' : 'aa'}`}
							onClick={() => {
								const newquest = props.quest.slice(0, props.qi);
								newquest[props.qi] = i;
								store.setOptTemp('quest', newquest);
							}}>
							{typeof area() === 'string' ?
								Quest.quarks[area()].name
							:	area().name}
						</span>
					</Show>
				)}
			</Index>
		</div>
	);
}

export default function QuestView() {
	const opts = store.useRx(state => state.opts);
	const questInfo = createMemo(() => {
		const questAreas = [],
			quest = opts.quest ?? [];
		let qbag = Quest.root;
		for (let qi = 0; qi < quest.length + 1; qi++) {
			questAreas.push(qbag);
			if (qi < quest.length) {
				qbag = qbag.children[quest[qi]];
				if (!qbag.children) break;
			} else {
				break;
			}
		}
		const selectedQuest = typeof qbag === 'string' ? Quest.quarks[qbag] : null;
		return { questAreas, selectedQuest };
	});
	return (
		<>
			<div
				class="bgbox"
				style="margin:8px;width:884px;min-height:108px;display:flex;align-items:center">
				<Text
					text={
						questInfo().selectedQuest?.info ??
						"Click list items to see quest lines, & FIGHT button to challenge them!\nNames in red are quests you haven't completed."
					}
				/>
			</div>
			<div style="display:flex;width:884px;justify-content:space-between;margin:8px">
				<Show when={questInfo().selectedQuest}>
					{selectedQuest => (
						<input
							type="button"
							value="Fight!"
							onClick={() => store.navGame(Quest.mkQuestAi(selectedQuest()))}
						/>
					)}
				</Show>
				<input
					type="button"
					style="margin-left:auto"
					value="Exit"
					onClick={() => store.doNav(import('../views/MainMenu.jsx'))}
				/>
			</div>
			<div style="display:flex;margin:8px">
				<Index each={questInfo().questAreas}>
					{(area, qi) => (
						<QuestColumn quest={opts.quest ?? []} qi={qi} area={area()} />
					)}
				</Index>
			</div>
		</>
	);
}

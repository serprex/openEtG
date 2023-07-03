import { createMemo } from 'solid-js';
import * as Quest from '../Quest.js';
import * as Components from '../Components/index.jsx';
import * as mkAi from '../mkAi.js';
import * as store from '../store.jsx';

function QuestButton(props) {
	return (
		<span
			style={{
				position: 'absolute',
				left: `${props.x}px`,
				top: `${props.y}px`,
				color: `${
					props.area.key && !props.user.quests[props.area.key] ? '#f' : '#a'
				}${props.sel ? 'ff' : 'aa'}`,
			}}
			onClick={props.onClick}>
			{(props.area.key && Quest.quarks[props.area.key].name) ?? props.area.name}
		</span>
	);
}

export default function QuestView(props) {
	const rx = store.useRx();
	const questInfo = createMemo(() => {
		const questAreas = [],
			quest = rx.opts.quest ?? [];
		let qbag = Quest.root;
		for (let qi = 0; qi < quest.length + 1; qi++) {
			let y = 162;
			for (let i = 0; i < qbag.children.length; i++) {
				const area = qbag.children[i];
				if (area.key) {
					const quark = Quest.quarks[area.key];
					if (quark.questdependencies && !Quest.requireQuest(quark, rx.user)) {
						continue;
					}
				}
				questAreas.push(
					<QuestButton
						x={8 + qi * 177}
						y={y}
						area={area}
						user={rx.user}
						onClick={() => {
							const newquest = quest.slice(0, qi);
							newquest[qi] = i;
							store.setOptTemp('quest', newquest);
						}}
						sel={quest[qi] === i}
					/>,
				);
				y += 24;
			}
			if (qi < quest.length) {
				qbag = qbag.children[quest[qi]];
				if (!qbag.children) break;
			}
		}
		const selectedQuest = qbag.key && Quest.quarks[qbag.key];
		return { questAreas, selectedQuest };
	});
	return (
		<>
			<Components.Box x={8} y={8} width={880} height={108} />
			<Components.ExitBtn x={750} y={120} />
			<Components.Text
				text={
					questInfo().selectedQuest?.info ??
					"Click list items to see quest lines, & FIGHT button to challenge them!\nNames in red are quests you haven't completed."
				}
				style="position:absolute;left:26px;top:26px;max-width:850px"
			/>
			{questInfo().selectedQuest?.key && (
				<input
					type="button"
					value="Fight!"
					style="position:absolute;left:8px;top:120px"
					onClick={() => mkAi.run(Quest.mkQuestAi(questInfo().selectedQuest))}
				/>
			)}
			{questInfo().questAreas}
		</>
	);
}
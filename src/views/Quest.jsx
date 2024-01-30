import { createMemo } from 'solid-js';
import * as Quest from '../Quest.js';
import ExitBtn from '../Components/ExitBtn.jsx';
import Text from '../Components/Text.jsx';
import * as store from '../store.jsx';

function QuestButton(props) {
	return (
		<span
			style={{
				position: 'absolute',
				left: `${props.x}px`,
				top: `${props.y}px`,
				color: `#${
					typeof props.area === 'string' && !props.user.quests[props.area] ?
						'f'
					:	'a'
				}${props.sel ? 'ff' : 'aa'}`,
			}}
			onClick={props.onClick}>
			{typeof props.area === 'string' ?
				Quest.quarks[props.area].name
			:	props.area.name}
		</span>
	);
}

export default function QuestView() {
	const rx = store.useRx();
	const questInfo = createMemo(() => {
		const questAreas = [],
			quest = rx.opts.quest ?? [];
		let qbag = Quest.root;
		for (let qi = 0; qi < quest.length + 1; qi++) {
			let y = 162;
			for (let i = 0; i < qbag.children.length; i++) {
				const area = qbag.children[i];
				if (typeof area === 'string') {
					const quark = Quest.quarks[area];
					if (!Quest.requireQuest(quark, rx.user)) continue;
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
		const selectedQuest = typeof qbag === 'string' ? Quest.quarks[qbag] : null;
		return { questAreas, selectedQuest };
	});
	return (
		<>
			<div
				class="bgbox"
				style="position:absolute;left:8px;top:8px;width:880px;height:108px"
			/>
			<ExitBtn x={750} y={120} />
			<div style="position:absolute;left:26px;top:26px;max-width:850px">
				<Text
					text={
						questInfo().selectedQuest?.info ??
						"Click list items to see quest lines, & FIGHT button to challenge them!\nNames in red are quests you haven't completed."
					}
				/>
			</div>
			{questInfo().selectedQuest?.key && (
				<input
					type="button"
					value="Fight!"
					style="position:absolute;left:8px;top:120px"
					onClick={() =>
						store.navGame(Quest.mkQuestAi(questInfo().selectedQuest))
					}
				/>
			)}
			{questInfo().questAreas}
		</>
	);
}

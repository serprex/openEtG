import { createMemo } from 'solid-js';

import Cards from '../Cards.js';
import * as Quest from '../Quest.js';
import CardImage from '../Components/CardImage.jsx';
import ExitBtn from '../Components/ExitBtn.jsx';
import Text from '../Components/Text.jsx';
import * as store from '../store.jsx';
import { decodedeck } from '../etgutil.js';

export function QuestRewards(props) {
	const quest = createMemo(() => {
		let quest = props.quest;
		if (!quest) return null;
		while (quest.autonext) quest = quest.autonext;
		return quest;
	});
	return (
		<>
			{quest()?.choicerewards && (
				<div style="position:absolute;left:750px;top:156px;display:flex;height:200px;flex-direction:column">
					<div>Choice</div>
					{Array.isArray(quest()?.choicerewards) && (
						<Index each={quest()?.choicerewards}>
							{(reward, i) => (
								<CardImage
									style={{ position: 'absolute', top: i * 20 + 'px' }}
									card={Cards.Codes[reward()]}
								/>
							)}
						</Index>
					)}
					{!Array.isArray(quest()?.choicerewards) && quest()?.choicerewards}
				</div>
			)}
			{quest()?.cardreward && (
				<div style="position:absolute;left:750px;top:156px;display:flex;height:200px;flex-direction:column">
					<div>Cards</div>
					<Index each={decodedeck(quest()?.cardreward)}>
						{(code, i) => (
							<CardImage
								style={{ position: 'absolute', top: i * 20 + 'px' }}
								card={Cards.Codes[code()]}
							/>
						)}
					</Index>
				</div>
			)}
			{quest()?.goldreward && (
				<div style="position:absolute;left:750px;top:156px">
					{quest()?.goldreward}
					<span class="ico gold" />
				</div>
			)}
		</>
	);
}

function QuestButton(props) {
	return (
		<span
			style={{
				position: 'absolute',
				left: `${props.x}px`,
				top: `${props.y}px`,
				color: `#${
					typeof props.area === 'string' && !props.quests[props.area] ?
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
				if (
					typeof area === 'string' &&
					!Quest.requireQuest(Quest.quarks[area], rx.user)
				) {
					continue;
				}
				questAreas.push(
					<QuestButton
						x={8 + qi * 180}
						y={y}
						area={area}
						quests={rx.user.quests}
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
				style="position:absolute;left:8px;top:8px;width:880px;height:108px;padding-left:15px;padding-top:15px">
				<Text
					text={
						questInfo().selectedQuest?.info ??
						"Click list items to see quest lines, & FIGHT button to challenge them!\nNames in red are quests you haven't completed."
					}
				/>
			</div>
			<ExitBtn x={750} y={120} />
			{questInfo().selectedQuest?.key && (
				<>
					<input
						type="button"
						value="Fight!"
						style="position:absolute;left:8px;top:120px"
						onClick={() =>
							store.navGame(Quest.mkQuestAi(questInfo().selectedQuest))
						}
					/>
					<QuestRewards quest={Quest.quarks[questInfo().selectedQuest.key]} />
				</>
			)}
			{questInfo().questAreas}
		</>
	);
}

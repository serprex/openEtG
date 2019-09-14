import React from 'react';
import { connect } from 'react-redux';

import * as Quest from '../Quest.js';
import * as Components from '../Components/index.js';
import * as mkAi from '../mkAi.js';
import * as store from '../store.js';

function QuestButton({ sel, x, y, area, user, onClick }) {
	return (
		<span
			style={{
				position: 'absolute',
				left: `${x}px`,
				top: `${y}px`,
				color: `${area.key && !user.quests[area.key] ? '#f' : '#a'}${
					sel ? 'ff' : 'aa'
				}`,
			}}
			onClick={onClick}>
			{(area.key && Quest.quarks[area.key].name) || area.name}
		</span>
	);
}

export default connect(({ user, opts }) => ({ user, oquest: opts.quest }))(
	function QuestView({ user, oquest, dispatch }) {
		const questAreas = [],
			quest = oquest || [];
		let qbag = Quest.root;
		for (let qi = 0; qi < quest.length + 1; qi++) {
			let y = 162;
			for (let i = 0; i < qbag.children.length; i++) {
				const area = qbag.children[i];
				if (area.key) {
					const quark = Quest.quarks[area.key];
					if (quark.questdependencies && !Quest.requireQuest(quark, user)) {
						continue;
					}
				}
				questAreas.push(
					<QuestButton
						x={8 + qi * 177}
						y={y}
						key={area.key || area.name}
						area={area}
						user={user}
						onClick={() => {
							const newquest = quest.slice(0, qi);
							newquest[qi] = i;
							dispatch(store.setOptTemp('quest', newquest));
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
		const selectedQuest = {
			...(qbag.key && Quest.quarks[qbag.key]),
			...qbag,
		};
		return (
			<>
				<Components.Box x={8} y={8} width={880} height={108} />
				<Components.ExitBtn x={750} y={120} />
				<Components.Text
					text={
						selectedQuest.info ||
						"Click the list items to see the quest lines, & the FIGHT button to challenge them!\nNames in red are the ones you haven't yet completed."
					}
					style={{
						position: 'absolute',
						left: '26px',
						top: '26px',
						maxWidth: '850px',
					}}
				/>
				{selectedQuest && selectedQuest.key && (
					<input
						type="button"
						value="Fight!"
						style={{
							position: 'absolute',
							left: '8px',
							top: '120px',
						}}
						onClick={() => mkAi.run(Quest.mkQuestAi(selectedQuest))}
					/>
				)}
				{questAreas}
			</>
		);
	},
);

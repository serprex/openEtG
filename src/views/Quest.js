const sock = require('../sock'),
	Quest = require('../Quest'),
	Components = require('../Components'),
	mkAi = require('../mkAi'),
	store = require('../store'),
	{connect} = require('react-redux'),
	React = require('react');

function QuestButton({ sel, x, y, idx, area, user, onClick }) {
	return <span style={{
			position: 'absolute',
			left: `${x}px`,
			top: `${y}px`,
			color: (area.key && !user.quests[area.key] ? '#f' : '#a') + (sel ? 'ff' : 'aa'),
		}}
		onClick={onClick}>{(area.key && Quest.quarks[area.key].name) || area.name}</span>;
}

module.exports = connect(({user})=>({user}))(class QuestView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			quest: [],
		};
	}

	render() {
		const questAreas = [];
		let qbag = Quest.root;
		for (let qi = 0; qi<this.state.quest.length+1; qi++) {
			let y = 162;
			for (let i = 0; i<qbag.children.length; i++) {
				const area = qbag.children[i];
				if (area.key) {
					const quark = Quest.quarks[area.key];
					if (quark.questdependencies && !Quest.requireQuest(quark, this.props.user)) {
						continue;
					}
				}
				questAreas.push(<QuestButton x={8+qi*177} y={y} idx={i}
					key={area.key || area.name}
					area={area}
					user={this.props.user}
					onClick={() => {
						const quest = this.state.quest.slice(0, qi);
						quest[qi] = i;
						this.setState({quest});
					}}
					sel={this.state.quest[qi] === i}
				/>);
				y += 24;
			}
			if (qi < this.state.quest.length) {
				qbag = qbag.children[this.state.quest[qi]];
				if (!qbag.children) break;
			}
		}
		const selectedQuest = Object.assign({}, qbag.key && Quest.quarks[qbag.key], qbag);
		return <>
			<Components.Box x={8} y={8} width={880} height={108} />
			<Components.ExitBtn x={750} y={120} />
			{selectedQuest && selectedQuest.info && <Components.Text
				text={selectedQuest.info}
				style={{
					position: 'absolute',
					left: '26px',
					top: '26px',
					maxWidth: '850px',
				}}
			/>}
			{selectedQuest && selectedQuest.key && <input type='button'
				value='Fight!'
				style={{
					position: 'absolute',
					left: '8px',
					top: '120px',
				}}
				onClick={() => mkAi.run(Quest.mkQuestAi(selectedQuest))}
			/>}
			{questAreas}
		</>;
	}
});

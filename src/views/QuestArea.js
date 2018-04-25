const sock = require('../sock'),
	Quest = require('../Quest'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react');

function startQuest(questname) {
	if (!sock.user.quests[questname] && sock.user.quests[questname] != 0) {
		sock.userExec('updatequest', { quest: questname, newstage: 0 });
	}
}
function QuestButton(props) {
	return <span
		className='imgb'
		style={{
			border: '2px solid #88aa66',
			borderRadius: '50%',
			backgroundColor: sock.user.quests[props.quest] > props.stage ? '#4f0' : '#000',
			display: 'inline-block',
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
			width: '32px',
			height: '32px',
		}}
		onMouseOver={props.onMouseOver}
		onMouseOut={props.onMouseOut}
		onClick={props.onClick}
	/>;
}
module.exports = class QuestArea extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		const children = [
			<img src='assets/bg_quest.png'
				style={{
					position: 'absolute',
					left: '124px',
					top: '162px',
				}}
			/>,
			<Components.Box x={9} y={9} width={880} height={111} />,
			<Components.Text
				text={this.state.info}
				style={{
					position: 'absolute',
					left: '26px',
					top: '26px',
					maxWidth: '850px',
				}}
			/>,
			<Components.Text
				text={this.state.err}
				style={{
					position: 'absolute',
					left: '26px',
					top: '125px',
					maxWidth: '850px',
				}}
			/>,
			<input type='button'
				value='Exit'
				onClick={() => store.store.dispatch(store.doNav(require('./QuestMain')))}
				style={{
					position: 'absolute',
					left: '750px',
					top: '246px',
				}}
			/>,
		];
		Quest.areas[this.props.area].forEach(quest => {
			const stage0 = Quest[quest][0];
			if (stage0.dependency === undefined || stage0.dependency(sock.user))
				startQuest(quest);
		});
		Quest.areas[this.props.area].forEach(quest => {
			let pos;
			if (sock.user.quests[quest] !== undefined && Quest[quest]) {
				for (let i = 0; i <= sock.user.quests[quest]; i++) {
					if ((pos = Quest[quest].info.pos[i])) {
						children.push(
							<QuestButton
								quest={quest}
								stage={i}
								x={pos[0]}
								y={pos[1]}
								onMouseOver={() => {
									if (this.state.info !== Quest[quest].info.text[i]) {
										this.setState({ info: Quest[quest].info.text[i] });
									}
								}}
								onMouseOut={() => this.setState({ info: '' })}
								onClick={() => {
									const err = Quest.mkQuestAi(quest, i, this.props.area);
									if (typeof err === 'string') this.setState({ err });
									else store.store.dispatch(store.doNav(require('./Match'), err));
								}}
							/>,
						);
					}
				}
			}
		});
		return children;
	}
};

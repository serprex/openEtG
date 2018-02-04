const sock = require('../sock'),
	Quest = require('../Quest'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	h = React.createElement;

function startQuest(questname) {
	if (!sock.user.quests[questname] && sock.user.quests[questname] != 0) {
		sock.userExec('updatequest', { quest: questname, newstage: 0 });
	}
}
module.exports = class QuestArea extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		const self = this;
		const questmap = h('img', {
			src: 'assets/bg_quest.png',
			style: {
				position: 'absolute',
				left: '124px',
				top: '162px',
			},
		});
		const tinfo = h(Components.Text, {
			text: self.state.info,
			style: {
				position: 'absolute',
				left: '26px',
				top: '26px',
				maxWidth: '850px',
			},
		});
		const errinfo = h(Components.Text, {
			text: self.state.err,
			style: {
				position: 'absolute',
				left: '26px',
				top: '125px',
				maxWidth: '850px',
			},
		});
		const children = [
			questmap,
			h(Components.Box, {
				x: 9,
				y: 9,
				width: 880,
				height: 111,
			}),
			tinfo,
			errinfo,
			h('input', {
				type: 'button',
				value: 'Exit',
				onClick: function() {
					store.store.dispatch(store.doNav(require('./QuestMain')));
				},
				style: {
					position: 'absolute',
					left: '750px',
					top: '246px',
				},
			}),
		];
		function QuestButton(props) {
			const quest = props.quest,
				stage = props.stage;
			return h('span', {
				className: 'imgb',
				style: {
					border: '2px solid #88aa66',
					borderRadius: '50%',
					backgroundColor: sock.user.quests[quest] > stage ? '#4f0' : '#000',
					display: 'inline-block',
					position: 'absolute',
					left: props.x + 'px',
					top: props.y + 'px',
					width: '32px',
					height: '32px',
				},
				onMouseOver: function() {
					if (self.state.info !== Quest[quest].info.text[stage]) {
						self.setState({ info: Quest[quest].info.text[stage] });
					}
				},
				onMouseOut: function() {
					self.setState({ info: '' });
				},
				onClick: function() {
					const err = Quest.mkQuestAi(quest, stage, self.props.area);
					if (typeof err === 'string') self.setState({ err });
					else store.store.dispatch(store.doNav(require('./Match'), err));
				},
			});
		}
		Quest.areas[self.props.area].forEach(quest => {
			var stage0 = Quest[quest][0];
			if (stage0.dependency === undefined || stage0.dependency(sock.user))
				startQuest(quest);
		});
		Quest.areas[self.props.area].forEach(quest => {
			var pos;
			if (sock.user.quests[quest] !== undefined && Quest[quest]) {
				for (var i = 0; i <= sock.user.quests[quest]; i++) {
					if ((pos = Quest[quest].info.pos[i])) {
						children.push(
							h(QuestButton, {
								quest: quest,
								stage: i,
								x: pos[0],
								y: pos[1],
							}),
						);
					}
				}
			}
		});
		return h('div', { children: children });
	}
};

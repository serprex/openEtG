'use strict';
const chat = require('../chat'),
	sock = require('../sock'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	userutil = require('../userutil'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	h = React.createElement;

module.exports = class Reward extends React.Component {
	constructor(props) {
		super(props);
		let reward = props.type, rewardList;
		if (typeof reward == 'string') {
			var shiny = reward.charAt(0) == '!';
			if (shiny) reward = reward.slice(1);
			var upped = reward.slice(0, 5) == 'upped';
			var rarity = userutil.rewardwords[upped ? reward.slice(5) : reward];
			rewardList = Cards.filter(upped, x => x.rarity == rarity).map(
				card => card.asShiny(shiny).code,
			);
		} else if (reward instanceof Array) {
			rewardList = reward;
		}
		this.state = {
			rewardList: rewardList,
		};
	}

	componentDidMount() {
		store.store.dispatch(store.setCmds({
			codedone: data => {
				sock.user.pool = etgutil.addcard(sock.user.pool, data.card);
				chat(Cards.Codes[data.card].name + ' added!', 'System');
				this.props.doNav(require('./MainMenu'));
			},
		}));
	}

	render() {
		const self = this,
			props = this.props,
			reward = props.type,
			numberofcopies = props.amount || 1,
			code = props.code;
		if (!self.state.rewardList) {
			console.log('Unknown reward', reward);
			props.doNav(require('./MainMenu'));
			return;
		}
		const rewardui = [
			h('input', {
				type: 'button',
				value: 'Done',
				onClick: function() {
					if (self.state.chosenReward) {
						if (code === undefined) {
							sock.userExec('addbound', {
								c:
									etgutil.encodeCount(numberofcopies) +
									self.state.chosenReward.toString(32),
							});
							self.props.doNav(require('./MainMenu'));
						} else {
							sock.userEmit('codesubmit2', {
								code: code,
								card: self.state.chosenReward,
							});
						}
					} else chat('Choose a reward', 'System');
				},
				style: {
					position: 'absolute',
					left: '10px',
					top: '40px',
				},
			}),
		];
		if (numberofcopies > 1) {
			rewardui.push(
				h(
					'div',
					{
						style: {
							position: 'absolute',
							left: '20px',
							top: '100px',
						},
					},
					'You will get ' + numberofcopies + ' copies of the card you choose',
				),
			);
		}
		if (code) {
			rewardui.push(
				h(Components.ExitBtn, { x: 10, y: 10, doNav: props.doNav }),
			);
		}
		self.state.rewardList.forEach((reward, i) => {
			const card = h(Components.CardImage, {
				x: 100 + Math.floor(i / 12 * 13),
				y: 272 + (i % 12) * 19,
				card: Cards.Codes[reward],
				onClick: function() {
					self.setState({ chosenReward: reward });
				},
			});
			rewardui.push(card);
		});

		rewardui.push(
			self.state.chosenReward &&
				h(Components.Card, { x: 233, y: 10, code: self.state.chosenReward }),
		);

		return h('div', { children: rewardui });
	}
};

'use strict';
const Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	userutil = require('../userutil'),
	Components = require('../Components'),
	sock = require('../sock'),
	store = require('../store'),
	React = require('react');

module.exports = class Reward extends React.Component {
	constructor(props) {
		super(props);
		let reward = props.type, rewardList;
		if (typeof reward == 'string') {
			const shiny = reward.charAt(0) == '!';
			if (shiny) reward = reward.slice(1);
			const upped = reward.slice(0, 5) == 'upped';
			const rarity = userutil.rewardwords[upped ? reward.slice(5) : reward];
			rewardList = Cards.filter(upped, x => x.rarity == rarity).map(
				card => card.asShiny(shiny).code,
			);
		} else if (reward instanceof Array) {
			rewardList = reward;
		}
		this.state = {
			rewardList,
			chosenReward: null,
		};
	}

	componentDidMount() {
		if (this.state.rewardList) {
			store.store.dispatch(store.setCmds({
				codedone: data => {
					const {user} = store.store.getState();
					store.store.dispatch(store.updateUser({ pool: etgutil.addcard(user.pool, data.card) }));
					store.store.dispatch(store.chatMsg(Cards.Codes[data.card].name + ' added!', 'System'));
					store.store.dispatch(store.doNav(require('./MainMenu')));
				},
			}));
		} else {
			store.store.dispatch(store.chatMsg('Unknown reward ${this.props.type}', 'System'));
			store.store.dispatch(store.doNav(require('./MainMenu')));
		}
	}

	render() {
		const props = this.props,
			reward = props.type,
			numberofcopies = props.amount || 1,
			code = props.code;
		return this.state.rewardList && <>
			<input type='button'
				value='Done'
				onClick={() => {
					if (this.state.chosenReward) {
						if (code === undefined) {
							sock.userExec('addbound', {
								c:
									etgutil.encodeCount(numberofcopies) +
									this.state.chosenReward.toString(32),
							});
							store.store.dispatch(store.doNav(require('./MainMenu')));
						} else {
							sock.userEmit('codesubmit2', {
								code: code,
								card: this.state.chosenReward,
							});
						}
					} else store.store.dispatch(store.chatMsg('Choose a reward', 'System'));
				}}
				style={{
					position: 'absolute',
					left: '10px',
					top: '40px',
				}}
			/>
			{numberofcopies > 1 &&
				<div style={{
					position: 'absolute',
					left: '20px',
					top: '100px',
				}}>You will get {numberofcopies} copies of the card you choose</div>}
			{!!code && <Components.ExitBtn x={10} y={10} /> }
			{this.state.rewardList.map((reward, i) =>
				<Components.CardImage key={i}
					x={100 + Math.floor(i / 12) * 108}
					y={272 + (i % 12) * 20}
					card={Cards.Codes[reward]}
					onClick={() => this.setState({ chosenReward: reward })}
				/>
			)}
			<Components.Card x={233} y={10} code={this.state.chosenReward} />
		</>;
	}
};

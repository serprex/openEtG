'use strict';
const Cards = require('../Cards'),
	mkGame = require('../mkGame'),
	sock = require('../sock'),
	store = require('../store'),
	util = require('../util'),
	etgutil = require('../etgutil'),
	Components = require('../Components'),
	React = require('react');

function RenderInfo(props) {
	const {info, y} = props;
	if (info) {
		const card = y ? etgutil.asUpped(info.card, true) : info.card;
		const adeck = '05' + card.toString(32) + info.deck;
		return <>
			<Components.DeckDisplay
				deck={etgutil.decodedeck(adeck)}
				renderMark
				y={y}
			/>
			<Components.Text
				style={{ position: 'absolute', left: '100px', top: 4 + y + 'px' }}
				text={
					'W-L: ' +
					(info.win || 0) +
					' - ' +
					(info.loss || 0) +
					', Rank: ' +
					(info.rank == undefined ? 'Inactive' : info.rank + 1) +
					', ' +
					((info.win || 0) * 3 + (info.loss || 0) * 1) +
					'$'}
			/>
			<input readOnly
				style={{ position: 'absolute', left: '330px', top: 4 + y + 'px', width: '190px' }}
				value={adeck}
			/>
			<span style={{ position: 'absolute', left: '400px', top: 224 + y + 'px' }}>
				Age: {info.day}
			</span>
			<span style={{ position: 'absolute', left: '100px', top: 224 + y + 'px' }}>
				HP: {info.curhp} / {info.hp}
			</span>
			<span style={{ position: 'absolute', left: '200px', top: 224 + y + 'px' }}>
				Mark: {info.mark}
			</span>
			<span style={{ position: 'absolute', left: '300px', top: 224 + y + 'px' }}>
				Draw: {info.draw}
			</span>
			<input type='button'
				value='Modify'
				style={{
					position: 'absolute',
					left: '500px',
					top: 224 + y + 'px',
				}}
				onClick={() => {
					store.store.dispatch(store.doNav(require('./ArenaEditor'), {
						adeck: info.deck,
						acard: Cards.Codes[card],
						ainfo: info,
					}));
				}}
			/>
			<input type='button'
				value='Test'
				style={{
					position: 'absolute',
					left: '600px',
					top: 224 + y + 'px',
				}}
				onClick={() => {
					const deck = sock.getDeck();
					if (etgutil.decklength(deck) < 9 || etgutil.decklength(adeck) < 9) {
						store.store.dispatch(store.chatMsg('Deck too small'));
						return;
					}
					const gameData = mkGame({
						deck: adeck,
						urdeck: deck,
						seed: util.randint(),
						foename: 'Test',
						cardreward: '',
						p2hp: info.curhp,
						p2markpower: info.mark,
						p2drawpower: info.draw,
						ai: true,
					});
					store.store.dispatch(store.doNav(require('./Match'), gameData));
				}}
			/>
		</>;
	} else {
		return null;
	}
}
function ArenaCard(props) {
	const { info, y, code } = props;
	return <>
		<input type='button'
			value='Create'
			style={{
				position: 'absolute',
				left: '734px',
				top: 260 + y + 'px',
			}}
			onClick={() => {
				store.store.dispatch(store.doNav(require('./ArenaEditor'), {
					adeck: '',
					acard: Cards.Codes[code],
					ainfo: {},
					acreate: true,
				}));
			}}
		/>
		<Components.Card x={734} y={y} code={code} />
	</>;
}

module.exports = class ArenaInfo extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		sock.userEmit('arenainfo');
		store.store.dispatch(store.setCmds({
			arenainfo: data => this.setState(data),
		}));
	}

	render() {
		return <>
			<Components.Text
				style={{ position: 'absolute', left: '96px', top: '576px' }}
				text='Earn 1$ when your arena deck is faced, & another 2$ when it wins'
			/>
			<Components.ExitBtn x={8} y={300} />
			<RenderInfo info={this.state.A} y={0} />
			<RenderInfo info={this.state.B} y={300} />
			{!!sock.user.ocard && <>
				<ArenaCard info={this.state.A} y={8} code={etgutil.asUpped(sock.user.ocard, false)} />
				<ArenaCard info={this.state.B} y={300} code={etgutil.asUpped(sock.user.ocard, true)} />
			</>}
		</>;
	}
};

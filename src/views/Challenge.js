const sock = require('../sock'),
	util = require('../util'),
	Cards = require('../Cards'),
	mkGame = require('../mkGame'),
	etgutil = require('../etgutil'),
	options = require('../options'),
	Components = require('../Components'),
	store = require('../store'),
	{ connect } = require('react-redux'),
	React = require('react');

function sendChallenge(foe) {
	const deck = sock.getDeck(),
		{ user } = store.store.getState();
	if (!Cards.isDeckLegal(etgutil.decodedeck(deck), user)) {
		store.store.dispatch(store.chatMsg(`Invalid deck`, 'System'));
		return;
	}
	const gameData = {};
	options.parsepvpstats(gameData);
	if (user) {
		gameData.f = foe;
		sock.userEmit('foewant', gameData);
	} else {
		gameData.deck = deck;
		gameData.room = foe;
		sock.emit('pvpwant', gameData);
	}
	sock.pvp = foe;
}

function LabelText(props) {
	return (
		<span
			style={{
				fontSize: '18px',
				color: '#fff',
				pointerEvents: 'none',
				position: 'absolute',
				left: props.x + 'px',
				top: props.y + 'px',
			}}>
			{props.children}
		</span>
	);
}

module.exports = connect(({ user, opts }) => ({
	hasUser: !!user,
	aideck: opts.aideck,
	foename: opts.foename,
	pvphp: opts.pvphp,
	pvpmark: opts.pvpmark,
	pvpdraw: opts.pvpdraw,
	pvpdeck: opts.pvpdeck,
	aideck: opts.aideck,
	aihp: opts.aihp,
	aimark: opts.aimark,
	aidraw: opts.aidraw,
	aideckpower: opts.aideckpower,
}))(
	class Challenge extends React.Component {
		constructor(props) {
			super(props);
			this.state = {};
		}

		render() {
			const self = this;
			function makeChallenge(foe) {
				if (!foe) return;
				sendChallenge(self.props.foename);
				self.setState({ challenge: foe });
			}
			function maybeCustomAi(e) {
				if (e.which == 13) aiClick.call(self);
			}
			function aiClick() {
				if (!self.props.aideck) return;
				const deck = sock.getDeck();
				if (
					etgutil.decklength(deck) < 9 ||
					etgutil.decklength(self.props.aideck) < 9
				) {
					self.props.dispatch(store.doNav(require('./DeckEditor')));
					return;
				}
				const gameData = {
					deck: self.props.aideck,
					urdeck: deck,
					seed: util.randint(),
					foename: 'Custom',
					cardreward: '',
					ai: true,
					rematch: aiClick,
				};
				options.parsepvpstats(gameData);
				options.parseaistats(gameData);
				self.props.dispatch(store.doNav(require('./Match'), mkGame(gameData)));
			}
			function maybeChallenge(e) {
				e.cancelBubble = true;
				if (e.which == 13) makeChallenge(self.props.foename);
			}
			function exitClick() {
				if (sock.pvp) {
					if (self.props.hasUser) sock.userEmit('foecancel');
					else sock.emit('roomcancel', { room: sock.pvp });
					delete sock.pvp;
				}
				self.props.dispatch(store.doNav(require('./MainMenu')));
			}
			function cancelClick() {
				if (sock.pvp) {
					if (self.props.hasUser) sock.userEmit('foecancel');
					else sock.emit('roomcancel', { room: sock.pvp });
					delete sock.pvp;
				}
				delete sock.spectate;
				self.setState({ challenge: null });
			}
			const deck = etgutil.decodedeck(sock.getDeck());
			const children = [<Components.DeckDisplay deck={deck} renderMark />],
				foename = !self.state.challenge && (
					<input
						placeholder="Challenge"
						value={this.props.foename}
						onChange={e =>
							this.props.dispatch(store.setOptTemp('foename', e.target.value))
						}
						onKeyPress={maybeChallenge}
						style={{
							position: 'absolute',
							left: '190px',
							top: '375px',
						}}
					/>
				),
				pvphp = !self.state.challenge && (
					<input
						placeholder="HP"
						value={this.props.pvphp}
						onChange={e =>
							this.props.dispatch(store.setOptTemp('pvphp', e.target.value))
						}
						className="numput"
						style={{
							position: 'absolute',
							left: '190px',
							top: '425px',
						}}
					/>
				),
				pvpmark = !self.state.challenge && (
					<input
						placeholder="Mark"
						value={this.props.pvpmark}
						onChange={e =>
							this.props.dispatch(store.setOptTemp('pvpmark', e.target.value))
						}
						className="numput"
						style={{
							position: 'absolute',
							left: '190px',
							top: '450px',
						}}
					/>
				),
				pvpdraw = !self.state.challenge && (
					<input
						placeholder="Draw"
						value={this.props.pvpdraw}
						onChange={e =>
							this.props.dispatch(store.setOptTemp('pvpdraw', e.target.value))
						}
						className="numput"
						style={{
							position: 'absolute',
							left: '190px',
							top: '475px',
						}}
					/>
				),
				pvpdeck = !self.state.challenge && (
					<input
						placeholder="Deck"
						value={this.props.pvpdeck}
						onChange={e =>
							this.props.dispatch(store.setOptTemp('pvpdeck', e.target.value))
						}
						className="numput"
						style={{
							position: 'absolute',
							left: '190px',
							top: '500px',
						}}
					/>
				),
				pvpButton = !self.state.challenge && (
					<input
						type="button"
						value="PvP"
						onClick={() => makeChallenge(self.props.foename)}
						style={{
							position: 'absolute',
							left: '110px',
							top: '375px',
						}}
					/>
				),
				spectateButton = !self.state.challenge && (
					<input
						type="button"
						value="Spectate"
						onClick={() => {
							sock.spectate = self.props.foename;
							sock.userEmit('spectate', { f: sock.spectate });
						}}
						style={{
							position: 'absolute',
							left: '110px',
							top: '450px',
						}}
					/>
				),
				cancelButton = self.state.challenge && (
					<input
						type="button"
						value="Cancel"
						onClick={cancelClick}
						style={{
							position: 'absolute',
							left: '110px',
							top: '400px',
						}}
					/>
				),
				aideck = (
					<input
						placeholder="AI Deck"
						value={this.props.aideck}
						onChange={e =>
							this.props.dispatch(store.setOpt('aideck', e.target.value))
						}
						onKeyPress={maybeCustomAi}
						onClick={e => e.target.setSelectionRange(0, 999)}
						style={{
							position: 'absolute',
							left: '440px',
							top: '375px',
						}}
					/>
				),
				aihp = (
					<input
						placeholder="HP"
						value={this.props.aihp}
						onChange={e =>
							this.props.dispatch(store.setOpt('aihp', e.target.value))
						}
						className="numput"
						style={{
							position: 'absolute',
							left: '440px',
							top: '425px',
						}}
					/>
				),
				aimark = (
					<input
						placeholder="Mark"
						value={this.props.aimark}
						onChange={e =>
							this.props.dispatch(store.setOpt('aimark', e.target.value))
						}
						className="numput"
						style={{
							position: 'absolute',
							left: '440px',
							top: '450px',
						}}
					/>
				),
				aidraw = (
					<input
						placeholder="Draw"
						value={this.props.aidraw}
						onChange={e =>
							this.props.dispatch(store.setOpt('aidraw', e.target.value))
						}
						className="numput"
						style={{
							position: 'absolute',
							left: '440px',
							top: '475px',
						}}
					/>
				),
				aideckpower = (
					<input
						placeholder="Deck"
						value={this.props.aideckpower}
						onChange={e =>
							this.props.dispatch(
								store.setOptTemp('aideckpower', e.target.value),
							)
						}
						className="numput"
						style={{
							position: 'absolute',
							left: '440px',
							top: '500px',
						}}
					/>
				),
				challengeLabel = self.state.challenge && (
					<div style={{ position: 'absolute', left: '190px', top: '375px' }}>
						You have challenged {self.state.challenge}
					</div>
				);
			children.push(
				<Components.ExitBtn x={190} y={300} onClick={exitClick} />,
				<LabelText x={190} y={400}>
					Own stats
				</LabelText>,
				pvphp,
				pvpmark,
				pvpdraw,
				pvpdeck,
			);
			if (self.props.pvp) {
				children.push(
					pvpButton,
					spectateButton,
					cancelButton,
					foename,
					challengeLabel,
				);
			} else {
				children.push(
					<input
						type="button"
						value="Custom AI"
						onClick={aiClick}
						style={{
							position: 'absolute',
							left: '360px',
							top: '375px',
						}}
					/>,
					aideck,
					<LabelText x={440} y={400}>
						AI's stats:
					</LabelText>,
					aihp,
					aimark,
					aidraw,
					aideckpower,
				);
			}
			return children;
		}
	},
);
module.exports.sendChallenge = sendChallenge;

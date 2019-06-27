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
		gameData.x = 'foewant';
		gameData.f = foe;
		sock.userEmit(gameData);
	} else {
		gameData.x = 'pvpwant';
		gameData.deck = deck;
		gameData.room = foe;
		sock.emit(gameData);
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
	aimanual: opts.aimanual,
}))(
	class Challenge extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				challenge: null,
				replay: '',
			};
		}

		aiClick = () => {
			if (!this.props.aideck) return;
			const deck = sock.getDeck();
			if (
				etgutil.decklength(deck) < 9 ||
				etgutil.decklength(this.props.aideck) < 9
			) {
				this.props.dispatch(store.doNav(require('./DeckEditor')));
				return;
			}
			const gameData = {
				deck: this.props.aideck,
				urdeck: deck,
				seed: util.randint(),
				foename: 'Custom',
				cardreward: '',
				ai: this.props.aimanual ? 2 : 1,
				rematch: this.aiClick,
			};
			options.parsepvpstats(gameData);
			options.parseaistats(gameData);
			this.props.dispatch(
				store.doNav(require('./Match'), { game: mkGame(gameData) }),
			);
		};

		replayClick = () => {
			let replay;
			try {
				replay = JSON.parse(this.state.replay);
				if (!replay || typeof replay !== 'object') {
					return console.log('Invalid object');
				}
				if (!Array.isArray(replay.players)) {
					return console.log('Replay players are not an array');
				}
				if (!Array.isArray(replay.moves)) {
					return console.log('Replay moves are not an array');
				}
			} catch {
				return console.log('Invalid JSON');
			}
			const data = {
				seed: replay.seed,
				level: undefined,
				cost: 0,
				ai: 3,
				spectate: 0,
				cardreward: '',
				goldreward: 0,
			};
			for (let i = 0; i < replay.players.length; i++) {
				const pl = replay.players[i];
				for (const key in pl) {
					if (key == 'deck') {
						data[i ? 'deck' : 'urdeck'] = pl[key];
					} else {
						data[`p${i + 1}${key}`] = pl[key];
					}
				}
			}
			const game = mkGame(data);
			game.setIn([game.id, 'player1'], 2);
			game.setIn([game.id, 'player2'], 3);
			this.props.dispatch(
				store.doNav(require('./Match'), {
					replay,
					game,
				}),
			);
		};

		render() {
			const self = this;
			function makeChallenge(foe) {
				if (!foe) return;
				sendChallenge(self.props.foename);
				self.setState({ challenge: foe });
			}
			function maybeCustomAi(e) {
				if (e.which == 13) self.aiClick();
			}
			function maybeChallenge(e) {
				e.cancelBubble = true;
				if (e.which == 13) makeChallenge(self.props.foename);
			}
			function exitClick() {
				if (sock.pvp) {
					if (self.props.hasUser) sock.userEmit('foecancel');
					else sock.emit({ x: 'roomcancel', room: sock.pvp });
					delete sock.pvp;
				}
				self.props.dispatch(store.doNav(require('./MainMenu')));
			}
			function cancelClick() {
				if (sock.pvp) {
					if (self.props.hasUser) sock.userEmit('foecancel');
					else sock.emit({ x: 'roomcancel', room: sock.pvp });
					delete sock.pvp;
				}
				delete sock.spectate;
				self.setState({ challenge: null });
			}
			const deck = etgutil.decodedeck(sock.getDeck());
			return (
				<>
					<Components.DeckDisplay deck={deck} renderMark />
					<Components.ExitBtn x={190} y={300} onClick={exitClick} />
					<LabelText x={190} y={400}>
						Own stats
					</LabelText>
					{self.state.challenge && (
						<>
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
							<input
								placeholder="Mark"
								value={this.props.pvpmark}
								onChange={e =>
									this.props.dispatch(
										store.setOptTemp('pvpmark', e.target.value),
									)
								}
								className="numput"
								style={{
									position: 'absolute',
									left: '190px',
									top: '450px',
								}}
							/>
							<input
								placeholder="Draw"
								value={this.props.pvpdraw}
								onChange={e =>
									this.props.dispatch(
										store.setOptTemp('pvpdraw', e.target.value),
									)
								}
								className="numput"
								style={{
									position: 'absolute',
									left: '190px',
									top: '475px',
								}}
							/>
							<input
								placeholder="Deck"
								value={this.props.pvpdeck}
								onChange={e =>
									this.props.dispatch(
										store.setOptTemp('pvpdeck', e.target.value),
									)
								}
								className="numput"
								style={{
									position: 'absolute',
									left: '190px',
									top: '500px',
								}}
							/>
						</>
					)}
					{self.props.pvp ? (
						<>
							<input
								placeholder="Challenge"
								value={this.props.foename}
								onChange={e =>
									this.props.dispatch(
										store.setOptTemp('foename', e.target.value),
									)
								}
								onKeyPress={maybeChallenge}
								style={{
									position: 'absolute',
									left: '190px',
									top: '375px',
								}}
							/>
							{!self.state.challenge ? (
								<>
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
									<input
										type="button"
										value="Cancel"
										onClick={cancelClick}
										style={{
											position: 'absolute',
											left: '110px',
											top: '400px',
										}}
									/>{' '}
								</>
							) : (
								<div
									style={{ position: 'absolute', left: '190px', top: '375px' }}>
									You have challenged {self.state.challenge}
								</div>
							)}
						</>
					) : (
						<>
							<input
								type="button"
								value="Replay"
								onClick={this.replayClick}
								style={{
									position: 'absolute',
									left: '360px',
									top: '350px',
								}}
							/>
							<textarea
								className="chatinput"
								placeholder="Replay"
								value={this.state.replay || ''}
								onChange={e => this.setState({ replay: e.target.value })}
								style={{
									position: 'absolute',
									left: '440px',
									top: '325px',
								}}
							/>
							<input
								type="button"
								value="Custom AI"
								onClick={self.aiClick}
								style={{
									position: 'absolute',
									left: '360px',
									top: '375px',
								}}
							/>
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
							<LabelText x={440} y={400}>
								AI's stats:
							</LabelText>
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
							<label
								style={{
									position: 'absolute',
									left: '440px',
									top: '525px',
								}}>
								<input
									type="checkbox"
									value={this.props.aimanual}
									onChange={e =>
										this.props.dispatch(
											store.setOptTemp('aimanual', e.target.checked),
										)
									}
								/>{' '}
								Manual
							</label>
						</>
					)}
				</>
			);
		}
	},
);
module.exports.sendChallenge = sendChallenge;

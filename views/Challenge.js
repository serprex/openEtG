const px = require('../px'),
	sock = require('../sock'),
	util = require('../util'),
	mkGame = require('../mkGame'),
	etgutil = require('../etgutil'),
	options = require('../options'),
	Components = require('../Components'),
	h = preact.h;

function sendChallenge(foe) {
	var deck = sock.getDeck();
	if (etgutil.decklength(deck) < (sock.user ? 31 : 9)) {
		px.doNav(require('./Editor'));
		return;
	}
	var gameData = {};
	options.parsepvpstats(gameData);
	if (sock.user) {
		gameData.f = foe;
		sock.userEmit('foewant', gameData);
	} else {
		gameData.deck = deck;
		gameData.room = foe;
		sock.emit('pvpwant', gameData);
	}
	sock.pvp = foe;
}

module.exports = class Challenge extends preact.Component {
	render() {
		const self = this;
		function makeChallenge(foe) {
			if (!foe) return;
			sendChallenge(options.foename);
			self.setState({ challenge: foe });
		}
		function maybeCustomAi(e) {
			if (e.keyCode == 13) aiClick.call(this);
		}
		function aiClick() {
			if (!options.aideck) return;
			var deck = sock.getDeck();
			if (
				etgutil.decklength(deck) < 9 ||
				etgutil.decklength(options.aideck) < 9
			) {
				self.props.doNav(require('./Editor'));
				return;
			}
			var gameData = {
				deck: options.aideck,
				urdeck: deck,
				seed: util.randint(),
				foename: 'Custom',
				cardreward: '',
				ai: true,
			};
			options.parsepvpstats(gameData);
			options.parseaistats(gameData);
			self.props.doNav(require('./Match'), mkGame(gameData));
		}
		function maybeChallenge(e) {
			e.cancelBubble = true;
			if (e.keyCode == 13) makeChallenge(options.foename);
		}
		function exitClick() {
			if (sock.pvp) {
				if (sock.user) sock.userEmit('foecancel');
				else sock.emit('roomcancel', { room: sock.pvp });
				delete sock.pvp;
			}
			self.props.doNav(require('./MainMenu'));
		}
		function cancelClick() {
			if (sock.pvp) {
				if (sock.user) sock.userEmit('foecancel');
				else sock.emit('roomcancel', { room: sock.pvp });
				delete sock.pvp;
			}
			delete sock.spectate;
			self.setState({ challenge: null });
		}
		function labelText(x, y, text) {
			return h('span', {
				style: {
					fontSize: '18px',
					color: '#fff',
					pointerEvents: 'none',
					position: 'absolute',
					left: x + 'px',
					top: y + 'px',
				},
			});
		}
		const deck = etgutil.decodedeck(sock.getDeck());
		const children = [
				h(Components.DeckDisplay, { deck: deck, renderMark: true }),
			],
			foename =
				!self.state.challenge &&
				h(Components.Input, {
					placeholder: 'Challenge',
					opt: 'foename',
					onKeyPress: maybeChallenge,
					x: 190,
					y: 375,
				}),
			pvphp =
				!self.state.challenge &&
				h(Components.Input, {
					placeholder: 'HP',
					opt: 'pvphp',
					num: true,
					x: 190,
					y: 425,
				}),
			pvpmark =
				!self.state.challenge &&
				h(Components.Input, {
					placeholder: 'Mark',
					opt: 'pvpmark',
					num: true,
					x: 190,
					y: 450,
				}),
			pvpdraw =
				!self.state.challenge &&
				h(Components.Input, {
					placeholder: 'Draw',
					opt: 'pvpdraw',
					num: true,
					x: 190,
					y: 475,
				}),
			pvpdeck =
				!self.state.challenge &&
				h(Components.Input, {
					placeholder: 'Deck',
					opt: 'pvpdeck',
					num: true,
					x: 190,
					y: 500,
				}),
			pvpButton =
				!self.state.challenge &&
				h('input', {
					type: 'button',
					value: 'PvP',
					onClick: function() {
						makeChallenge(options.foename);
					},
					style: {
						position: 'absolute',
						left: '110px',
						top: '375px',
					},
				}),
			spectateButton =
				!self.state.challenge &&
				h('input', {
					type: 'button',
					value: 'Spectate',
					onClick: function() {
						sock.spectate = options.foename;
						sock.userEmit('spectate', { f: sock.spectate });
					},
					style: {
						position: 'absolute',
						left: '110px',
						top: '450px',
					},
				}),
			cancelButton =
				self.state.challenge &&
				h('input', {
					type: 'button',
					value: 'Cancel',
					onClick: cancelClick,
					style: {
						position: 'absolute',
						left: '110px',
						top: '400px',
					},
				}),
			aideck = h(Components.Input, {
				placeholder: 'AI Deck',
				opt: 'aideck',
				onKeyPress: maybeCustomAi,
				onClick: function(e) {
					e.target.setSelectionRange(0, 999);
				},
				x: 440,
				y: 375,
			}),
			aihp = h(Components.Input, {
				placeholder: 'HP',
				opt: 'aihp',
				num: true,
				x: 440,
				y: 425,
			}),
			aimark = h(Components.Input, {
				placeholder: 'Mark',
				opt: 'aimark',
				num: true,
				x: 440,
				y: 450,
			}),
			aidraw = h(Components.Input, {
				placeholder: 'Draw',
				opt: 'aidraw',
				num: true,
				x: 440,
				y: 475,
			}),
			aideckpower = h(Components.Input, {
				placeholder: 'Deck',
				opt: 'aideckpower',
				num: true,
				x: 440,
				y: 500,
			}),
			challengeLabel =
				self.state.challenge &&
				h(
					'div',
					{ style: { position: 'absolute', left: '190px', top: '375px' } },
					'You have challenged ' + self.state.challenge,
				);
		children.push(
			h(Components.ExitBtn, { x: 190, y: 300, onClick: exitClick }),
			labelText(190, 400, 'Own stats:'),
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
				h('input', {
					type: 'button',
					value: 'Custom AI',
					onClick: aiClick,
					style: {
						position: 'absolute',
						left: '360px',
						top: '375px',
					},
				}),
				aideck,
				labelText(440, 400, "AI's stats:"),
				aihp,
				aimark,
				aidraw,
				aideckpower,
			);
		}
		return h('div', { children: children });
	}
};
module.exports.sendChallenge = sendChallenge;

'use strict';
const etg = require('../etg'),
	chat = require('../chat'),
	mkAi = require('../mkAi'),
	sock = require('../sock'),
	util = require('../util'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	options = require('../options'),
	RngMock = require('../RngMock'),
	userutil = require('../userutil'),
	mkGame = require('../mkGame'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	h = React.createElement,
	streak200 = new Uint8Array([10, 10, 15, 20, 15, 20]);

module.exports = class Result extends React.Component {
	constructor(props) {
		super(props);
		this.onkeydown = this.onkeydown.bind(this);
		this.rematch = this.rematch.bind(this);
		this.exitFunc = this.exitFunc.bind(this);
	}

	onkeydown(e) {
		const kc = e.which || e.keyCode;
		if (kc == 32 || kc == 13) this.exitFunc();
		else if (
			kc == 87 &&
			!this.props.game.quest &&
			this.props.game.daily === undefined
		) {
			this.rematch();
		}
	}

	exitFunc() {
		const game = this.props.game;
		if (game.quest) {
			if (game.winner === game.player1 && game.choicerewards) {
				store.store.dispatch(store.doNav(require('./Reward'), {
					type: game.choicerewards,
					amount: game.rewardamount,
				}));
			} else {
				store.store.dispatch(store.doNav(require('./QuestArea'), { area: game.area }));
			}
		} else if (game.daily !== undefined) {
			store.store.dispatch(store.doNav(require('./Colosseum')));
		} else {
			store.store.dispatch(store.doNav(require('./MainMenu')));
		}
	}

	rematch() {
		const game = this.props.game,
			data = this.props.data;
		switch (game.level) {
			case 0:
				mkAi.run(mkAi.mkAi(0)());
				break;
			case 1:
				mkAi.run(mkAi.mkPremade(1)());
				break;
			case 2:
				mkAi.run(mkAi.mkAi(2)());
				break;
			case 3:
				mkAi.run(mkAi.mkPremade(3)());
				break;
			case 4:
				sock.userEmit('foearena', { lv: 0 });
				break;
			case 5:
				sock.userEmit('foearena', { lv: 1 });
				break;
			case undefined:
				if (game.foename == 'Custom' || game.foename == 'Test') {
					const gameData = {
						deck:
							etgutil.encodedeck(data.p2deck) +
							etgutil.toTrueMarkSuffix(game.player2.mark),
						urdeck: sock.getDeck(),
						seed: util.randint(),
						foename: game.foename,
						cardreward: '',
						ai: true,
					};
					if (game.foename == 'Custom') {
						options.parsepvpstats(gameData);
						options.parseaistats(gameData);
					} else {
						gameData.p2hp = data.p2hp;
						gameData.p2markpower = data.p2markpower;
						gameData.p2drawpower = data.p2drawpower;
					}
					store.store.dispatch(store.doNav(require('./Match'), mkGame(gameData)));
				}
		}
	}

	componentDidMount() {
		document.addEventListener('keydown', this.onkeydown);
	}

	componentWillUnmount() {
		document.removeEventListener('keydown', this.onkeydown);
	}

	render() {
		const game = this.props.game,
			data = this.props.data;
		const winner = game.winner === game.player1,
			foeDeck = data.p2deck,
			children = [
				<Components.ExitBtn x={412} y={440} onClick={this.exitFunc} />,
			],
			lefttext = [
				game.ply + ' plies',
				(game.time / 1000).toFixed(1) + ' seconds',
			];
		function computeBonuses() {
			if (game.endurance !== undefined) return 1;
			const bonus = [
				[
					'Creature Domination',
					game.player1.countcreatures() > 2 * game.player2.countcreatures()
						? 0.1
						: 0,
				],
				['Creatureless', game.bonusstats.creaturesplaced == 0 ? 0.1 : 0],
				['Current Health', game.player1.hp / 300],
				['Max Health', (game.player1.maxhp - 100) / 600],
				['Full Health', game.player1.hp == game.player1.maxhp ? 0.2 : 0],
				[
					'Deckout',
					game.player2.deck.length == 0 && game.player2.hp > 0 ? 0.5 : 0,
				],
				['Double Kill', game.player2.hp < -game.player2.maxhp ? 0.15 : 0],
				['Equipped', game.player1.weapon && game.player1.shield ? 0.05 : 0],
				['Grounds Keeper', (game.player1.countpermanents() - 8) / 40],
				['Head Hunter', [1, 0.5, 0.25, 0.12, 0.06, 0.03, 0.01][data.rank]],
				['Last point', game.player1.hp == 1 ? 0.3 : 0],
				['Mid Turn', game.turn == game.player1 ? 0.1 : 0],
				['Murderer', game.bonusstats.creatureskilled > 5 ? 0.15 : 0],
				['Perfect Damage', game.player2.hp == 0 ? 0.1 : 0],
				['Pillarless', game.bonusstats.cardsplayed[0] == 0 ? 0.05 : 0],
				['Size matters', (etgutil.decklength(sock.getDeck()) - 36) / 150],
				['Toxic', game.player2.status.get('poison') > 18 ? 0.1 : 0],
				[
					'Unupped',
					(function() {
						let unupnu = 0;
						etgutil.iterraw(sock.getDeck(), (code, count) => {
							const card = Cards.Codes[code];
							if (card && !card.upped) unupnu += count;
						});
						return unupnu / 300;
					})(),
				],
				['Waiter', game.player1.deck.length == 0 ? 0.3 : 0],
				['Weapon Master', game.bonusstats.cardsplayed[1] >= 3 ? 0.1 : 0],
			].reduce((bsum, data) => {
				const b = data[1];
				if (b > 0) {
					lefttext.push(Math.round(b * 100) + '% ' + data[0]);
					return bsum + b;
				} else return bsum;
			}, 1);
			lefttext.push(
				((streakrate + 1) * bonus * 100 - 100).toFixed(1) + '% total bonus',
			);
			return bonus;
		}
		if (!game.quest && game.daily === undefined) {
			children.push(
				<input type='button'
					value='Rematch'
					onClick={this.rematch}
					style={{
						position: 'absolute',
						left: '412px',
						top: '490px',
					}}
				/>,
			);
		}
		let streakrate = 0;
		if (winner) {
			if (sock.user) {
				if (game.level !== undefined || !game.ai)
					sock.userExec('addwin', { pvp: !game.ai });
				if (!game.quest && game.ai) {
					if (game.cardreward === undefined && foeDeck) {
						let winnable = foeDeck.filter(
								card => card.rarity > 0 && card.rarity < 4,
							),
							cardwon;
						if (winnable.length) {
							cardwon = RngMock.choose(winnable);
							if (cardwon == 3 && Math.random() < 0.5)
								cardwon = RngMock.choose(winnable);
						} else {
							const elewin =
								foeDeck[Math.floor(Math.random() * foeDeck.length)];
							cardwon = RngMock.randomcard(
								elewin.upped,
								x =>
									x.element == elewin.element &&
									x.type != etg.Pillar &&
									x.rarity <= 3,
							);
						}
						if (game.level !== undefined && game.level < 2) {
							cardwon = cardwon.asUpped(false);
						}
						game.cardreward =
							'01' + etgutil.asShiny(cardwon.code, false).toString(32);
					}
					if (!game.goldreward) {
						let goldwon;
						if (game.level !== undefined) {
							if (game.daily == undefined) {
								const streak = (sock.user.streakback || 0) + 1;
								sock.user.streakback = 0;
								streakrate = Math.min(streak200[game.level] * streak / 200, 1);
								sock.userExec('setstreak', { l: game.level, n: streak });
								lefttext.push(
									streak + ' win streak',
									(streakrate * 100).toFixed(1) + '% streak bonus',
								);
							}
							goldwon = Math.floor(
								userutil.pveCostReward[game.level * 2 + 1] *
									(1 + streakrate) *
									computeBonuses(),
							);
						} else goldwon = 0;
						game.goldreward = goldwon;
					}
				}
				if (game.addonreward) {
					game.goldreward = (game.goldreward || 0) + game.addonreward;
				}
				if (game.goldreward) {
					const goldwon = game.goldreward - (game.cost || 0) + '$';
					children.push(
						<Components.Text
							text={goldwon}
							style={{
								textAlign: 'center',
								width: '900px',
								position: 'absolute',
								left: '0px',
								top: '550px',
							}}
						/>,
					);
					sock.userExec('addgold', { g: game.goldreward });
				}
				if (game.cardreward) {
					const x0 = 470 - etgutil.decklength(game.cardreward) * 20 - 64;
					etgutil.iterdeck(game.cardreward, (code, i) =>
						children.push(
							<Components.Card
								x={x0 + i * 40}
								y={170}
								code={code}
							/>,
						),
					);
					sock.userExec(game.quest ? 'addbound' : 'addcards', {
						c: game.cardreward,
					});
				}
			}
			children.push(
				<Components.Text
					text={game.quest ? game.wintext : 'You won!'}
					style={{
						textAlign: 'center',
						width: '900px',
						position: 'absolute',
						left: '0px',
						top: game.cardreward ? '100px' : '250px',
					}}
				/>
			);
		}
		children.push(
			<span
				style={{
					position: 'absolute',
					left: '8px',
					top: '290px',
					whiteSpace: 'pre',
				}}>
				{lefttext.join('\n')}
			</span>
		);

		if (game.endurance == undefined) {
			chat(
				[
					game.level === undefined ? -1 : game.level,
					(game.foename || '?').replace(/,/g, ' '),
					winner ? 'W' : 'L',
					game.ply,
					game.time,
					game.player1.hp,
					game.player1.maxhp,
					(game.goldreward || 0) - (game.cost || 0),
					game.cardreward || '-',
					userutil.calcWealth(game.cardreward),
					!sock.user || game.level === undefined
						? -1
						: sock.user.streak[game.level],
					streakrate.toFixed(3).replace(/\.?0+$/, ''),
				].join(),
				null,
				'Stats',
			);
		}
		return children;
	}
};

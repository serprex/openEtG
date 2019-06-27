'use strict';
const etg = require('../etg'),
	sock = require('../sock'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	RngMock = require('../RngMock'),
	userutil = require('../userutil'),
	Components = require('../Components'),
	store = require('../store'),
	{ connect } = require('react-redux'),
	React = require('react'),
	streak200 = new Uint8Array([10, 10, 15, 20, 15, 20]);

function TooltipText(props) {
	return (
		<div
			onMouseOver={e => props.setTip(e, props.tip)}
			onMouseOut={props.clearTip}>
			{props.children}
		</div>
	);
}

const BonusList = [
	{
		name: 'Are we idle yet?',
		desc: 'Take longer than 3 minutes to win',
		func: game =>
			game.bonusstats.get('time') > 180000
				? Math.min((game.bonusstats.get('time') - 180000) / 60000, 0.2)
				: 0,
	},
	{
		name: 'Colosseum Bonus',
		desc: 'Bonus from winning Colosseum Duels',
		func: game => game.data.get('colobonus', 0),
	},
	{
		name: 'Creature Domination',
		desc: 'More than twice as many creatures than foe',
		func: game =>
			game.player1.countcreatures() > 2 * game.player2.countcreatures()
				? 0.1
				: 0,
	},
	{
		name: 'Creatureless',
		desc: 'Never play a creature',
		func: game => (game.bonusstats.get('creaturesplaced') == 0 ? 0.1 : 0),
	},
	{
		name: 'Current Health',
		desc: '1% per 3hp',
		func: game => game.player1.hp / 300,
	},
	{
		name: 'Deckout',
		desc: 'Win through deckout',
		func: game =>
			game.player2.deckIds.length == 0 && game.player2.hp > 0 ? 0.5 : 0,
	},
	{
		name: 'Double Kill',
		desc: 'Foe lost with as much negative hp as maxhp',
		func: game => (game.player2.hp <= -game.player2.maxhp ? 0.15 : 0),
	},
	{
		name: 'Equipped',
		desc: 'End match wielding a weapon & shield',
		func: game => (game.player1.weaponId && game.player1.shieldId ? 0.05 : 0),
	},
	{
		name: 'First past the post',
		desc: 'Win with non-positive hp, or foe loses from damage with positive hp',
		func: game =>
			game.player2.deckIds.length &&
			(game.player1.hp <= 0 || game.player2.hp > 0)
				? 0.1
				: 0,
	},
	{
		name: 'Full Health',
		desc: 'Hp equal to maxhp',
		func: game => (game.player1.hp === game.player1.maxhp ? 0.2 : 0),
	},
	{
		name: 'Grounds Keeper',
		desc: '2.5% per permanent over 8',
		func: game => (game.player1.countpermanents() - 8) / 40,
	},
	{
		name: 'Head Hunter',
		desc: "Defeat arena's top 7 decks",
		func: game =>
			[1, 1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64][game.data.get('rank')],
	},
	{
		name: 'Last point',
		desc: 'End with 1hp',
		func: game => (game.player1.hp == 1 ? 0.3 : 0),
	},
	{
		name: 'Max Health',
		desc: '1% per 6 maxhp over 100',
		func: game => (game.player1.maxhp - 100) / 600,
	},
	{
		name: 'Mid Turn',
		desc: 'Defeat foe with game ended still on own turn',
		func: game => (game.turn == game.player1Id ? 0.1 : 0),
	},
	{
		name: 'Murderer',
		desc: 'Kill over 5 creatures',
		func: game => (game.bonusstats.get('creatureskilled') > 5 ? 0.15 : 0),
	},
	{
		name: 'Perfect Damage',
		desc: 'Foe lost with 0hp',
		func: game => (game.player2.hp === 0 ? 0.1 : 0),
	},
	{
		name: 'Pillarless',
		desc: 'Never play a pillar',
		func: game => (game.bonusstats.get('cardsplayed')[0] == 0 ? 0.05 : 0),
	},
	{
		name: 'Size matters',
		desc: '0.666..% per card in deck over 36',
		func: game => (etgutil.decklength(sock.getDeck()) - 36) / 150,
	},
	{
		name: 'Toxic',
		desc: 'Foe lost with 18 poison',
		func: game => (game.player2.getStatus('poison') > 18 ? 0.1 : 0),
	},
	{
		name: 'Unupped',
		desc: '0.333..% per unupped card in deck',
		func: game => {
			let unupnu = 0;
			etgutil.iterraw(sock.getDeck(), (code, count) => {
				const card = Cards.Codes[code];
				if (card && !card.upped) unupnu += count;
			});
			return unupnu / 300;
		},
	},
	{
		name: 'Waiter',
		desc: 'Won with 0 cards in deck',
		func: game => (game.player1.deckIds.length === 0 ? 0.3 : 0),
	},
	{
		name: 'Weapon Master',
		desc: 'Play over 2 weapons',
		func: game => (game.bonusstats.get('cardsplayed')[1] > 2 ? 0.1 : 0),
	},
];

module.exports = connect(({ user }) => ({ user }))(
	class Result extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				lefttext: [],
				tooltip: null,
			};
		}

		onkeydown = e => {
			if (e.target.tagName === 'TEXTAREA') return;
			const kc = e.which;
			if (kc == 32 || kc == 13) this.exitFunc();
			else if (
				kc == 87 &&
				this.props.game.data.get('rematch') &&
				(!this.props.game.data.get('rematchFilter') ||
					this.props.game.data.get('rematchFilter')(this.props))
			) {
				this.props.game.data.get('rematch')(this.props);
			}
		};

		setTip = (e, text) =>
			this.setState({
				tooltip: (
					<div
						style={{
							position: 'absolute',
							left: '8px',
							top: '258px',
						}}>
						{text}
					</div>
				),
			});

		clearTip = () => this.setState({ tooltip: null });

		exitFunc = () => {
			const { game } = this.props;
			if (game.data.get('quest')) {
				if (game.winner === game.player1Id && game.data.get('choicerewards')) {
					this.props.dispatch(
						store.doNav(require('./Reward'), {
							type: game.data.get('choicerewards'),
							amount: game.data.get('rewardamount'),
						}),
					);
				} else {
					this.props.dispatch(store.doNav(require('./Quest')));
				}
			} else if (game.data.get('daily') !== undefined) {
				this.props.dispatch(store.doNav(require('./Colosseum')));
			} else {
				this.props.dispatch(store.doNav(require('./MainMenu')));
			}
		};

		computeBonuses(game, lefttext, streakrate) {
			if (game.data.get('endurance') !== undefined) return 1;
			const bonus = BonusList.reduce((bsum, bonus) => {
				const b = bonus.func(game);
				if (b > 0) {
					lefttext.push(
						<TooltipText
							tip={bonus.desc}
							setTip={this.setTip}
							clearTip={this.clearTip}>
							{Math.round(b * 100)}% {bonus.name}
						</TooltipText>,
					);
					return bsum + b;
				} else return bsum;
			}, 1);
			lefttext.push(
				<div>
					{((streakrate + 1) * bonus * 100 - 100).toFixed(1)}% total bonus
				</div>,
			);
			return bonus;
		}

		componentDidMount() {
			document.addEventListener('keydown', this.onkeydown);
			const { user, game } = this.props,
				level = game.data.get('level'),
				winner = game.winner === game.player1Id,
				lefttext = [
					<div>{game.bonusstats.get('ply')} plies</div>,
					<div>{(game.bonusstats.get('time') / 1000).toFixed(1)} seconds</div>,
				];
			this.props.dispatch(store.clearChat('Replay'));
			const replay = game.get(game.id, 'bonusstats', 'replay'),
				pfirst = game.byId(2),
				psecond = game.byId(3);
			function playerjson(pl) {
				const isp1 = pl.id === game.player1Id;
				return {
					name: isp1 ? user.name : `${game.data.get('foename')}`,
					hp: game.data.get(`p${isp1 ? 1 : 2}hp`, 100),
					maxhp: game.data.get(`p${isp1 ? 1 : 2}maxhp`, 100),
					markpower: game.data.get(`p${isp1 ? 1 : 2}markpower`),
					drawpower: game.data.get(`p${isp1 ? 1 : 2}drawpower`),
					deck: game.data.get(isp1 ? 'urdeck' : 'deck'),
				};
			}
			this.props.dispatch(
				store.chat(
					JSON.stringify({
						date: game.bonusstats.time,
						seed: game.get(game.id, 'seed'),
						first: game.first,
						players: [playerjson(pfirst), playerjson(psecond)],
						moves: Array.from(replay || []),
					}),
					'Replay',
				),
			);
			let streakrate = 0;
			if (winner) {
				if (this.props.user) {
					if (level !== undefined || !game.ai)
						sock.userExec('addwin', { pvp: !game.ai });
					if (!game.data.get('quest') && game.ai === 1) {
						if (
							game.data.get('cardreward') === undefined &&
							game.data.get('deck')
						) {
							const foeDeck = etgutil.decodedeck(game.data.get('deck'));
							let winnable = foeDeck.filter(code => {
									const card = Cards.Codes[code];
									return card && card.rarity > 0 && card.rarity < 4;
								}),
								cardwon;
							if (winnable.length) {
								cardwon = RngMock.choose(winnable);
								if (cardwon == 3 && Math.random() < 0.5)
									cardwon = RngMock.choose(winnable);
							} else {
								const elewin = RngMock.choose(foeDeck);
								cardwon = RngMock.randomcard(
									elewin.upped,
									x =>
										x.element == elewin.element &&
										x.type != etg.Pillar &&
										x.rarity <= 3,
								);
							}
							game.props = game.props.setIn(
								[game.id, 'data', 'cardreward'],
								'01' + etgutil.asShiny(cardwon, false).toString(32),
							);
						}
						if (!game.data.get('goldreward')) {
							let goldwon,
								agetax = 0;
							if (level !== undefined) {
								if (game.data.get('daily') === undefined) {
									const streak = (this.props.streakback || 0) + 1;
									if (streak !== this.props.user.streak[level]) {
										sock.userExec('setstreak', { l: level, n: streak });
									}
									streakrate = Math.min((streak200[level] * streak) / 200, 1);
									lefttext.push(
										<TooltipText
											tip={streak + ' win streak'}
											setTip={this.setTip}
											clearTip={this.clearTip}>
											{(streakrate * 100).toFixed(1)}% streak bonus
										</TooltipText>,
									);
									if (game.data.get('age')) {
										agetax = Math.max(
											Math.min(game.data.get('age') * 0.1 - 0.5, 0.5),
											0,
										);
										if (agetax > 0) {
											lefttext.push(
												<TooltipText
													tip={'Old arena decks bear less fruit'}
													setTip={this.setTip}
													clearTip={this.clearTip}>
													{(agetax * -100).toFixed(1)}% age tax
												</TooltipText>,
											);
										}
									}
								}
								goldwon = Math.round(
									userutil.pveCostReward[level * 2 + 1] *
										(1 + streakrate) *
										this.computeBonuses(game, lefttext, streakrate) *
										(1 - agetax),
								);
							} else goldwon = 0;
							game.props = game.props.setIn(
								[game.id, 'data', 'goldreward'],
								goldwon,
							);
						}
					}
					if (game.data.get('addonreward')) {
						game.props = game.props.updateIn(
							[game.id, 'data', 'goldreward'],
							(reward = 0) => reward + game.data.get('addonreward'),
						);
					}
					if (game.data.get('goldreward')) {
						sock.userExec('addgold', { g: game.data.get('goldreward') });
					}
					if (game.data.get('cardreward')) {
						sock.userExec(game.data.get('quest') ? 'addbound' : 'addcards', {
							c: game.data.get('cardreward'),
						});
					}
				}
			}
			this.setState({ lefttext });
			if (game.get('endurance') == undefined) {
				this.props.dispatch(
					store.chatMsg(
						[
							level === undefined ? -1 : level,
							(game.data.get('foename') || '?').replace(/,/g, ' '),
							winner ? 'W' : 'L',
							game.bonusstats.get('ply'),
							game.bonusstats.get('time'),
							game.player1.hp,
							game.player1.maxhp,
							game.data.get('goldreward', 0) - game.data.get('cost', 0),
							game.data.get('cardreward') || '-',
							userutil.calcWealth(game.data.get('cardreward')),
							!this.props.user || level === undefined
								? -1
								: this.props.user.streak[level],
							streakrate.toFixed(3).replace(/\.?0+$/, ''),
						].join(),
						'Stats',
					),
				);
			}
		}

		componentWillUnmount() {
			document.removeEventListener('keydown', this.onkeydown);
		}

		render() {
			const { game } = this.props,
				cards = [],
				cardreward = game.data.get('cardreward');
			if (cardreward) {
				const x0 = 470 - etgutil.decklength(cardreward) * 20 - 64;
				etgutil.iterdeck(cardreward, (code, i) =>
					cards.push(
						<Components.Card key={i} x={x0 + i * 40} y={170} code={code} />,
					),
				);
			}
			return (
				<>
					<Components.ExitBtn x={412} y={440} onClick={this.exitFunc} />
					{game.data.get('rematch') &&
						(!game.data.get('rematchFilter') ||
							game.data.get('rematchFilter')(this.props)) && (
							<input
								type="button"
								value="Rematch"
								onClick={() => game.data.get('rematch')(this.props)}
								style={{
									position: 'absolute',
									left: '412px',
									top: '490px',
								}}
							/>
						)}
					{this.props.user && (
						<>
							{game.winner == game.player1Id && (
								<>
									{game.data.get('goldreward') > 0 && (
										<Components.Text
											text={`${game.data.get('goldreward') -
												(game.data.get('cost') || 0)}$`}
											style={{
												textAlign: 'center',
												width: '900px',
												position: 'absolute',
												left: '0px',
												top: '550px',
											}}
										/>
									)}
									{cards.length > 0 && cards}
									<Components.Text
										text={
											game.data.get('quest')
												? game.data.get('wintext')
												: 'You won!'
										}
										style={{
											textAlign: 'center',
											width: '900px',
											position: 'absolute',
											left: '0px',
											top: game.data.get('cardreward') ? '100px' : '250px',
										}}
									/>
								</>
							)}
							<span
								style={{
									position: 'absolute',
									left: '8px',
									top: '290px',
								}}>
								{this.state.lefttext}
							</span>
							{this.state.tooltip}
						</>
					)}
				</>
			);
		}
	},
);

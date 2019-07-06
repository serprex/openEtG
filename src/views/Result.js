import React from 'react';
import { connect } from 'react-redux';

import * as etg from '../etg.js';
import * as sock from '../sock.js';
import * as Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import RngMock from '../RngMock.js';
import * as userutil from '../userutil.js';
import * as Components from '../Components/index.js';
import * as store from '../store.js';

const streak200 = new Uint8Array([10, 10, 15, 20, 15, 20]);

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
		func: (game, p1, p2) =>
			game.bonusstats.get('time') > 180000
				? Math.min((game.bonusstats.get('time') - 180000) / 60000, 0.2)
				: 0,
	},
	{
		name: 'Colosseum Bonus',
		desc: 'Bonus from winning Colosseum Duels',
		func: (game, p1, p2) => game.data.get('colobonus', 0),
	},
	{
		name: 'Creature Domination',
		desc: 'More than twice as many creatures than foe',
		func: (game, p1, p2) =>
			p1.countcreatures() > 2 * p2.countcreatures() ? 0.1 : 0,
	},
	{
		name: 'Creatureless',
		desc: 'Never play a creature',
		func: (game, p1, p2) =>
			game.bonusstats.get('creaturesplaced', p1.id) ? 0 : 0.1,
	},
	{
		name: 'Current Health',
		desc: '1% per 3hp',
		func: (game, p1, p2) => p1.hp / 300,
	},
	{
		name: 'Deckout',
		desc: 'Win through deckout',
		func: (game, p1, p2) => (p2.deckIds.length === 0 && p2.hp > 0 ? 0.5 : 0),
	},
	{
		name: 'Double Kill',
		desc: 'Foe lost with as much negative hp as maxhp',
		func: (game, p1, p2) => (p2.hp <= -p2.maxhp ? 0.15 : 0),
	},
	{
		name: 'Equipped',
		desc: 'End match wielding a weapon & shield',
		func: (game, p1, p2) => (p1.weaponId && p1.shieldId ? 0.05 : 0),
	},
	{
		name: 'First past the post',
		desc: 'Win with non-positive hp, or foe loses from damage with positive hp',
		func: (game, p1, p2) =>
			p2.deckIds.length && (p1.hp <= 0 || p2.hp > 0) ? 0.1 : 0,
	},
	{
		name: 'Full Health',
		desc: 'Hp equal to maxhp',
		func: (game, p1, p2) => (p1.hp === p1.maxhp ? 0.2 : 0),
	},
	{
		name: 'Grounds Keeper',
		desc: '2.5% per permanent over 8',
		func: (game, p1, p2) => (p1.countpermanents() - 8) / 40,
	},
	{
		name: 'Head Hunter',
		desc: "Defeat arena's top 7 decks",
		func: (game, p1, p2) =>
			[1, 1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64][game.data.get('rank')],
	},
	{
		name: 'Last point',
		desc: 'End with 1hp',
		func: (game, p1, p2) => (p1.hp === 1 ? 0.3 : 0),
	},
	{
		name: 'Max Health',
		desc: '1% per 6 maxhp over 100',
		func: (game, p1, p2) => (p1.maxhp - 100) / 600,
	},
	{
		name: 'Mid Turn',
		desc: 'Defeat foe with game ended still on own turn',
		func: (game, p1, p2) => (game.turn === p1.id ? 0.1 : 0),
	},
	{
		name: 'Murderer',
		desc: 'Kill over 5 creatures',
		func: (game, p1, p2) =>
			game.bonusstats.get('creatureskilled', p1.id) > 5 ? 0.15 : 0,
	},
	{
		name: 'Perfect Damage',
		desc: 'Foe lost with 0hp',
		func: (game, p1, p2) => (p2.hp === 0 ? 0.1 : 0),
	},
	{
		name: 'Pillarless',
		desc: 'Never play a pillar',
		func: (game, p1, p2) => {
			const cardsplayed = game.bonusstats.get('cardsplayed', p1.id);
			return cardsplayed && cardsplayed[0] ? 0 : 0.05;
		},
	},
	{
		name: 'Size matters',
		desc: '0.666..% per card in deck over 36',
		func: (game, p1, p2) => {
			return (
				(etgutil.decklength(
					game.data.getIn(['players', p1.getIndex(), 'deck']),
				) -
					36) /
				150
			);
		},
	},
	{
		name: 'Toxic',
		desc: 'Foe lost with 18 poison',
		func: (game, p1, p2) => (p2.getStatus('poison') > 18 ? 0.1 : 0),
	},
	{
		name: 'Unupped',
		desc: '0.333..% per unupped card in deck',
		func: (game, p1, p2) => {
			let unupnu = 0;
			etgutil.iterraw(
				game.data.getIn(['players', p1.getIndex(), 'deck']),
				(code, count) => {
					const card = Cards.Codes[code];
					if (card && !card.upped) unupnu += count;
				},
			);
			return unupnu / 300;
		},
	},
	{
		name: 'Waiter',
		desc: 'Won with 0 cards in deck',
		func: (game, p1, p2) => (p1.deckIds.length === 0 ? 0.2 : 0),
	},
	{
		name: 'Weapon Master',
		desc: 'Play over 2 weapons',
		func: (game, p1, p2) =>
			game.bonusstats.get('cardsplayed', p1.id)[1] > 2 ? 0.1 : 0,
	},
];

export default connect(({ user }) => ({ user }))(
	class Result extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				lefttext: [],
				tooltip: null,
				game: props.game,
				username: props.user && props.user.name,
				player1: props.game.byUser(props.user ? props.user.name : ''),
				goldreward: props.game.data.get('goldreward'),
				cardreward: props.game.data.get('cardreward'),
			};
		}

		static getDerivedStateFromProps(props, state) {
			if (
				props.game !== state.game ||
				(props.user && props.user.name) !== state.username
			) {
				const player1 = props.game.byUser(props.user ? props.user.name : '');
				return {
					game: props.game,
					username: props.user && props.user.name,
					player1,
				};
			}
			return null;
		}

		onkeydown = e => {
			if (e.target.tagName === 'TEXTAREA') return;
			const kc = e.which;
			if (kc === 32 || kc === 13) this.exitFunc();
			else if (
				kc === 87 &&
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
				if (
					game.winner === this.state.player1.id &&
					game.data.get('choicerewards')
				) {
					this.props.dispatch(
						store.doNav(import('./Reward'), {
							type: game.data.get('choicerewards'),
							amount: game.data.get('rewardamount'),
						}),
					);
				} else {
					this.props.dispatch(store.doNav(import('./Quest')));
				}
			} else if (game.data.get('daily') !== undefined) {
				this.props.dispatch(store.doNav(import('./Colosseum')));
			} else {
				this.props.dispatch(store.doNav(import('./MainMenu')));
			}
		};

		computeBonuses(game, lefttext, streakrate) {
			if (game.data.get('endurance') !== undefined) return 1;
			const bonus = BonusList.reduce((bsum, bonus) => {
				const b = bonus.func(game, this.state.player1, this.state.player1.foe);
				if (b > 0) {
					lefttext.push(
						<TooltipText
							key={lefttext.length}
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
				<div key={lefttext.length}>
					{((streakrate + 1) * bonus * 100 - 100).toFixed(1)}% total bonus
				</div>,
			);
			return bonus;
		}

		componentDidMount() {
			document.addEventListener('keydown', this.onkeydown);
			const { game } = this.props,
				level = game.data.get('level'),
				winner = game.winner === this.state.player1.id,
				lefttext = [
					<div key="0">{game.bonusstats.get('ply')} plies</div>,
					<div key="1">
						{(game.bonusstats.get('time') / 1000).toFixed(1)} seconds
					</div>,
				];

			this.props.dispatch(store.clearChat('Replay'));
			const replay = game.get(game.id, 'bonusstats', 'replay');
			if (
				replay &&
				game.data.get('endurance') === undefined &&
				!game.data.get('quest')
			) {
				this.props.dispatch(
					store.chat(
						JSON.stringify({
							date: game.get(game.id, 'bonusstats', 'time'),
							seed: game.get(game.id, 'data', 'seed'),
							players: game.data.get('players'),
							moves: Array.from(replay),
						}),
						'Replay',
					),
				);
			}

			let streakrate = 0;
			const state = {
				lefttext,
				cardreward: this.state.cardreward,
				goldreward: this.state.goldreward,
			};
			if (winner && this.props.user) {
				const wasPvP = game.data.get('players').every(pd => !pd.ai);
				if (level !== undefined || wasPvP)
					sock.userExec('addwin', { pvp: wasPvP });
				if (level !== undefined) {
					const foedecks = game.data.get('players').filter(pd => !pd.user),
						foedeck = RngMock.choose(foedecks);
					if (state.cardreward === undefined && foedeck) {
						const foeDeck = etgutil.decodedeck(foedeck.deck);
						let winnable = foeDeck.filter(code => {
								const card = Cards.Codes[code];
								return card && card.rarity > 0 && card.rarity < 3;
							}),
							cardwon;
						if (winnable.length) {
							cardwon = RngMock.choose(winnable);
						} else {
							const elewin = Cards.Codes[RngMock.choose(foeDeck)];
							cardwon = RngMock.randomcard(
								elewin.upped,
								x =>
									x.element === elewin.element &&
									x.type !== etg.Pillar &&
									x.rarity <= 3,
							);
						}
						state.cardreward =
							'01' + etgutil.asShiny(cardwon, false).toString(32);
					}
					if (state.goldreward === undefined) {
						let agetax = 0;
						if (level !== undefined) {
							if (game.data.get('daily') === undefined) {
								const streak = (this.props.streakback || 0) + 1;
								if (streak !== this.props.user.streak[level]) {
									sock.userExec('setstreak', { l: level, n: streak });
								}
								streakrate = Math.min((streak200[level] * streak) / 200, 1);
								lefttext.push(
									<TooltipText
										key={lefttext.length}
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
												key={lefttext.length}
												tip={'Old arena decks bear less fruit'}
												setTip={this.setTip}
												clearTip={this.clearTip}>
												{(agetax * -100).toFixed(1)}% age tax
											</TooltipText>,
										);
									}
								}
							}
							state.goldreward = Math.round(
								userutil.pveCostReward[level * 2 + 1] *
									(1 + streakrate) *
									this.computeBonuses(game, lefttext, streakrate) *
									(1 - agetax),
							);
						}
					}
				}
				if (state.goldreward) {
					sock.userExec('addgold', { g: state.goldreward });
				}
				if (state.cardreward) {
					sock.userExec(game.data.get('quest') ? 'addbound' : 'addcards', {
						c: state.cardreward,
					});
				}
			}
			this.setState(state);
			if (game.data.get('endurance') === undefined) {
				this.props.dispatch(
					store.chatMsg(
						[
							level === undefined ? -1 : level,
							(this.state.player1.foe.data.name || '?').replace(/,/g, ' '),
							winner ? 'W' : 'L',
							game.bonusstats.get('ply'),
							game.bonusstats.get('time'),
							this.state.player1.hp,
							this.state.player1.maxhp,
							(this.state.goldreward || 0) - game.data.get('cost', 0),
							this.state.cardreward || '-',
							userutil.calcWealth(this.state.cardreward),
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
				{ cardreward } = this.state,
				cards = [];
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
							game.data.get('rematchFilter')(
								this.props,
								this.state.player1.id,
							)) && (
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
							{game.winner === this.state.player1.id && (
								<>
									{this.state.goldreward > 0 && (
										<Components.Text
											text={`${this.state.goldreward -
												game.data.get('cost', 0)}$`}
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
											top: this.state.cardreward ? '100px' : '250px',
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

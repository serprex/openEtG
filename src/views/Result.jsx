import { Component } from 'react';
import { connect } from 'react-redux';

import * as etg from '../etg.js';
import * as etgutil from '../etgutil.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import * as userutil from '../userutil.js';
import * as Components from '../Components/index.jsx';
import Game from '../Game.js';
import Cards from '../Cards.js';
import { choose, randomcard } from '../util.js';

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
		func: (game, p1, p2, stats) =>
			Math.min((game.duration - 180000) / 60000, 0.2),
	},
	{
		name: 'Colosseum Bonus',
		desc: 'Bonus from winning Colosseum Duels',
		func: (game, p1, p2, stats) => game.data.colobonus,
	},
	{
		name: 'Creature Domination',
		desc: 'More than twice as many creatures than foe',
		func: (game, p1, p2, stats) =>
			p1.countcreatures() > 2 * p2.countcreatures() ? 0.05 : 0,
	},
	{
		name: 'Creatureless',
		desc: 'Never play a creature',
		func: (game, p1, p2, stats) => (stats.creaturesPlayed === 0 ? 0.1 : 0),
	},
	{
		name: 'Current Health',
		desc: '1% per 3hp',
		func: (game, p1, p2, stats) => p1.hp / 300,
	},
	{
		name: 'Deckout',
		desc: 'Win through deckout',
		func: (game, p1, p2, stats) =>
			p2.deck_length === 0 && p2.hp > 0 ? 0.5 : 0,
	},
	{
		name: 'Double Kill',
		desc: 'Foe lost with as much negative hp as maxhp',
		func: (game, p1, p2, stats) => (p2.hp <= -p2.maxhp ? 0.1 : 0),
	},
	{
		name: 'Equipped',
		desc: 'End match wielding a weapon & shield',
		func: (game, p1, p2, stats) => (p1.weaponId && p1.shieldId ? 0.05 : 0),
	},
	{
		name: 'First past the post',
		desc: 'Win with non-positive hp, or foe loses from damage with positive hp',
		func: (game, p1, p2, stats) =>
			p2.deck_length && (p1.hp <= 0 || p2.hp > 0) ? 0.1 : 0,
	},
	{
		name: 'Full Health',
		desc: 'Hp equal to maxhp',
		func: (game, p1, p2, stats) => (p1.hp === p1.maxhp ? 0.2 : 0),
	},
	{
		name: 'Grounds Keeper',
		desc: '2% per permanent over 8',
		func: (game, p1, p2, stats) => (p1.countpermanents() - 8) / 50,
	},
	{
		name: 'Head Hunter',
		desc: "Defeat arena's top 7 decks",
		func: (game, p1, p2, stats) =>
			[1, 1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64][game.data.rank],
	},
	{
		name: 'Last Leg',
		desc: 'Foe lost with 1 maxhp',
		func: (game, p1, p2, stats) => (p2.maxhp === 1 ? 0.1 : 0),
	},
	{
		name: 'Last Point',
		desc: 'End with 1hp',
		func: (game, p1, p2, stats) => (p1.hp === 1 ? 0.3 : 0),
	},
	{
		name: 'Max Health',
		desc: '1% per 6 maxhp over 100',
		func: (game, p1, p2, stats) => (p1.maxhp - 100) / 600,
	},
	{
		name: 'Mid Turn',
		desc: 'Defeat foe with game ended still on own turn',
		func: (game, p1, p2, stats) => {
			const { replay } = game;
			return replay.length && replay[replay.length - 1].x === 'end' ? 0 : 0.1;
		},
	},
	{
		name: 'Murderer',
		desc: 'Kill over 5 creatures',
		func: (game, p1, p2, stats) => (stats.creaturesDied > 5 ? 0.15 : 0),
	},
	{
		name: 'Perfect Damage',
		desc: 'Foe lost with 0hp',
		func: (game, p1, p2, stats) => (p2.hp === 0 ? 0.1 : 0),
	},
	{
		name: 'Pillarless',
		desc: 'Never play a pillar',
		func: (game, p1, p2, stats) => (stats.pillarsPlayed === 0 ? 0.05 : 0),
	},
	{
		name: 'Purity',
		desc: 'Won match with more than 2 purify counters',
		func: (game, p1, p2, stats) => (p1.getStatus('poison') < -2 ? 0.05 : 0),
	},
	{
		name: 'Size matters',
		desc: '0.666..% per card in deck over 36',
		func: (game, p1, p2, stats) =>
			(etgutil.decklength(p1.data.deck) - 36) / 150,
	},
	{
		name: 'Toxic',
		desc: 'Foe lost with more than 18 poison counters',
		func: (game, p1, p2, stats) => (p2.getStatus('poison') > 18 ? 0.1 : 0),
	},
	{
		name: 'Unupped',
		desc: '4% per unupped card in deck',
		func: (game, p1, p2, stats) => {
			let unupnu = 0;
			for (const [code, count] of etgutil.iterraw(p1.data.deck)) {
				const card = game.Cards.Codes[code];
				if (card && !card.upped) unupnu += count;
			}
			return unupnu / 25;
		},
	},
	{
		name: 'Waiter',
		desc: 'Won with 0 cards in deck',
		func: (game, p1, p2, stats) => (p1.deck_length === 0 ? 0.2 : 0),
	},
	{
		name: 'Weapon Master',
		desc: 'Play over 2 weapons',
		func: (game, p1, p2, stats) => (stats.weaponsPlayed > 2 ? 0.1 : 0),
	},
];

export default connect(({ user }) => ({ user }))(
	class Result extends Component {
		constructor(props) {
			super(props);
			this.state = {
				lefttext: [],
				tooltip: null,
				game: props.game,
				username: props.user.name,
				player1: props.game.byUser(props.user ? props.user.name : ''),
				goldreward: props.game.data.goldreward,
				cardreward: props.game.data.cardreward,
			};
		}

		static getDerivedStateFromProps(props, state) {
			if (props.game !== state.game || props.user.name !== state.username) {
				const player1 = props.game.byUser(props.user ? props.user.name : '');
				return {
					game: props.game,
					username: props.user && props.user.name,
					player1,
				};
			}
			return null;
		}

		canRematch = () =>
			this.props.game.data.rematch &&
			(!this.props.game.data.rematchFilter ||
				this.props.game.data.rematchFilter(this.props, this.state.player1.id));

		onkeydown = e => {
			if (e.target.tagName === 'TEXTAREA') return;
			const kc = e.which;
			if (kc === 32 || kc === 13) this.exitFunc();
			else if ((kc === 87 || e.key === 'w') && this.canRematch()) {
				this.props.game.data.rematch(this.props);
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
			if (game.data.quest) {
				if (game.winner === this.state.player1.id && game.data.choicerewards) {
					this.props.dispatch(
						store.doNav(import('./Reward.jsx'), {
							type: game.data.choicerewards,
							amount: game.data.rewardamount,
						}),
					);
				} else {
					this.props.dispatch(store.doNav(import('./Quest.jsx')));
				}
			} else if (game.data.daily !== undefined) {
				this.props.dispatch(store.doNav(import('./Colosseum.jsx')));
			} else {
				this.props.dispatch(store.doNav(import('./MainMenu.jsx')));
			}
		};

		async computeBonuses(game, lefttext, streakrate) {
			if (game.data.endurance !== undefined) return 1;
			const replayGame = new Game({
					seed: game.data.seed,
					set: game.data.set,
					players: game.data.players,
				}),
				replayStats = {
					weaponsPlayed: 0,
					creaturesPlayed: 0,
					pillarsPlayed: 0,
					creaturesDied: 0,
				};

			replayGame.game.tracedeath();
			for (const move of game.replay) {
				if (replayGame.turn === this.state.player1.id && move.x === 'cast') {
					const c = replayGame.byId(move.c);
					if (c.type === etg.Spell) {
						if (c.card.type === etg.Creature) replayStats.creaturesPlayed++;
						if (c.card.type === etg.Weapon) replayStats.weaponsPlayed++;
						if (c.getStatus('pillar')) replayStats.pillarsPlayed++;
					}
				}
				replayGame.next(move);
			}
			replayStats.creaturesDied = replayGame.get(
				this.state.player1.id,
				'creaturesDied',
			);

			const bonus = BonusList.reduce((bsum, bonus) => {
				const b = bonus.func(
					game,
					this.state.player1,
					this.state.player1.foe,
					replayStats,
				);
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

		async componentDidMount() {
			document.addEventListener('keydown', this.onkeydown);
			const { game } = this.props,
				level = game.data.level,
				winner = game.winner === this.state.player1.id,
				lefttext = [
					<div key="0">{game.countPlies()} plies</div>,
					<div key="1">{(game.duration / 1000).toFixed(1)} seconds</div>,
				];

			this.props.dispatch(store.clearChat('Replay'));
			const { replay } = game;
			if (
				replay &&
				game.data.endurance === undefined &&
				game.data.quest === undefined
			) {
				this.props.dispatch(
					store.chat(
						JSON.stringify({
							date: game.time,
							seed: game.data.seed,
							set: game.data.set,
							players: game.data.players,
							moves: replay,
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
			if (winner) {
				const wasPvP = game.data.players.every(pd => !pd.ai);
				if (level !== undefined || wasPvP)
					sock.userExec('addwin', { pvp: wasPvP });
				if (level !== undefined) {
					const foedecks = game.data.players.filter(pd => !pd.user),
						foedeck = choose(foedecks);
					if (state.cardreward === undefined && foedeck) {
						const foeDeck = etgutil.decodedeck(foedeck.deck);
						let winnable = foeDeck.filter(code => {
								const card = game.Cards.Codes[code];
								return card && card.rarity > 0 && card.rarity < 4;
							}),
							cardwon;
						if (winnable.length) {
							cardwon = choose(winnable);
						} else {
							cardwon = randomcard(
								Cards,
								false,
								x => x.rarity > 0 && x.rarity < 4,
							);
						}
						state.cardreward =
							'01' + etgutil.encodeCode(etgutil.asShiny(cardwon, false));
					}
					if (state.goldreward === undefined) {
						if (level !== undefined) {
							if (game.data.daily === undefined) {
								const streak = (this.props.streakback ?? 0) + 1;
								if (streak !== this.props.user.streak[level]) {
									sock.userExec('setstreak', {
										l: level,
										n: streak,
									});
								}
								streakrate = Math.min(
									(streak200[level] * (streak - 1)) / 200,
									1,
								);
								lefttext.push(
									<TooltipText
										key={lefttext.length}
										tip={streak + ' win streak'}
										setTip={this.setTip}
										clearTip={this.clearTip}>
										{(streakrate * 100).toFixed(1)}% streak bonus
									</TooltipText>,
								);
							}
							state.goldreward = Math.round(
								userutil.pveCostReward[level * 2 + 1] *
									(1 + streakrate) *
									(await this.computeBonuses(game, lefttext, streakrate)),
							);
						}
					}
				}
				if (state.goldreward) {
					sock.userExec('addgold', { g: state.goldreward });
				}
				if (state.cardreward) {
					sock.userExec(`add${game.data.quest ? 'bound' : ''}cards`, {
						c: state.cardreward,
					});
				}
			}
			this.setState(state);
			if (
				level !== undefined &&
				game.data.endurance === undefined &&
				game.data.colobonus === undefined
			) {
				const stats = [
					level,
					(this.state.player1.foe.data.name || '?').replace(/,/g, ' '),
					winner ? 'W' : 'L',
					game.countPlies(),
					game.duration,
					this.state.player1.hp,
					this.state.player1.maxhp,
					(state.goldreward | 0) - (game.data.cost | 0),
					state.cardreward || '-',
					userutil.calcWealth(Cards, state.cardreward),
					winner ? (this.props.streakback ?? 0) + 1 : 0,
					streakrate,
				];
				sock.userEmit('stat', {
					set: game.data.set,
					stats: stats,
					players: game.data.players,
				});
				stats[stats.length - 1] = +stats[stats.length - 1].toFixed(3);
				this.props.dispatch(store.chatMsg(stats.join(), 'Stats'));
				const { opts } = store.store.getState();
				if (opts.runcount) {
					if (opts.runcountcur === opts.runcount) {
						this.props.dispatch(
							store.chatMsg(`${opts.runcount} runs completed`, 'System'),
						);
						this.props.dispatch(store.setOptTemp('runcountcur', 1));
					} else {
						this.props.dispatch(
							store.setOptTemp('runcountcur', opts.runcountcur + 1),
						);
					}
				}
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
				let x0 = 470 - etgutil.decklength(cardreward) * 20 - 80;
				for (const code of etgutil.iterdeck(cardreward)) {
					cards.push(
						<Components.Card
							key={cards.length}
							x={x0}
							y={170}
							card={Cards.Codes[code]}
						/>,
					);
					x0 += 40;
				}
			}
			return (
				<>
					<Components.ExitBtn x={412} y={440} onClick={this.exitFunc} />
					{this.canRematch() && (
						<input
							type="button"
							value="Rematch"
							onClick={() => game.data.rematch(this.props)}
							style={{
								position: 'absolute',
								left: '412px',
								top: '490px',
							}}
						/>
					)}
					{game.winner === this.state.player1.id && (
						<>
							{this.state.goldreward > 0 && (
								<Components.Text
									text={`${this.state.goldreward - (game.data.cost | 0)}$`}
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
								text={game.data.wintext || 'You won!'}
								style={{
									textAlign: 'center',
									width: '700px',
									position: 'absolute',
									left: '100px',
									bottom: this.state.cardreward ? '444px' : '180px',
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
			);
		}
	},
);

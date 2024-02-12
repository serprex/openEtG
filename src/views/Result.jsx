import { createSignal, onCleanup, onMount } from 'solid-js';

import * as etgutil from '../etgutil.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import { calcWealth, pveCostReward } from '../userutil.js';
import Card from '../Components/Card.jsx';
import Text from '../Components/Text.jsx';
import Game from '../Game.js';
import { Kind } from '../rs/pkg/etg.js';
import Cards from '../Cards.js';
import { choose } from '../util.js';

const streak200 = new Uint8Array([10, 10, 15, 20, 15, 20]);

function TooltipText(props) {
	return (
		<div onMouseOver={[props.setTip, props.tip]} onMouseOut={props.clearTip}>
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
			game.count_creatures(p1) > 2 * game.count_creatures(p2) ? 0.05 : 0,
	},
	{
		name: 'Creatureless',
		desc: 'Never play a creature',
		func: (game, p1, p2, stats) => (stats.creaturesPlayed === 0 ? 0.1 : 0),
	},
	{
		name: 'Current Health',
		desc: '1% per 3hp',
		func: (game, p1, p2, stats) => game.get(p1, 'hp') / 300,
	},
	{
		name: 'Deckout',
		desc: 'Win through deckout',
		func: (game, p1, p2, stats) =>
			game.deck_length(p2) === 0 && game.get(p2, 'hp') > 0 ? 0.5 : 0,
	},
	{
		name: 'Double Kill',
		desc: 'Foe lost with as much negative hp as maxhp',
		func: (game, p1, p2, stats) =>
			game.get(p2, 'hp') <= -game.get(p2, 'maxhp') ? 0.1 : 0,
	},
	{
		name: 'Equipped',
		desc: 'End match wielding a weapon & shield',
		func: (game, p1, p2, stats) =>
			game.get_weapon(p1) && game.get_shield(p1) ? 0.05 : 0,
	},
	{
		name: 'First past the post',
		desc: 'Win with non-positive hp, or foe loses from damage with positive hp',
		func: (game, p1, p2, stats) =>
			(
				game.deck_length(p2) &&
				(game.get(p1, 'hp') <= 0 || game.get(p2, 'hp') > 0)
			) ?
				0.1
			:	0,
	},
	{
		name: 'Full Health',
		desc: 'Hp equal to maxhp',
		func: (game, p1, p2, stats) =>
			game.get(p1, 'hp') === game.get(p1, 'maxhp') ? 0.2 : 0,
	},
	{
		name: 'Grounds Keeper',
		desc: '2% per permanent over 8',
		func: (game, p1, p2, stats) => (game.count_permanents(p1) - 8) / 50,
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
		func: (game, p1, p2, stats) => (game.get(p2, 'maxhp') === 1 ? 0.1 : 0),
	},
	{
		name: 'Last Point',
		desc: 'End with 1hp',
		func: (game, p1, p2, stats) => (game.get(p1, 'hp') === 1 ? 0.3 : 0),
	},
	{
		name: 'Max Health',
		desc: '1% per 6 maxhp over 100',
		func: (game, p1, p2, stats) => (game.get(p1, 'maxhp') - 100) / 600,
	},
	{
		name: 'Mid Turn',
		desc: 'Game ended with an action other than End Turn',
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
		func: (game, p1, p2, stats) => (game.get(p2, 'hp') === 0 ? 0.1 : 0),
	},
	{
		name: 'Pillarless',
		desc: 'Never play a pillar',
		func: (game, p1, p2, stats) => (stats.pillarsPlayed === 0 ? 0.05 : 0),
	},
	{
		name: 'Purity',
		desc: 'Won match with more than 2 purify counters',
		func: (game, p1, p2, stats) => (game.get(p1, 'poison') < -2 ? 0.05 : 0),
	},
	{
		name: 'Size matters',
		desc: '0.5% per card in deck over 30',
		func: (game, p1, p2, stats) =>
			(etgutil.decklength(game.data.players[p1 - 1].deck) - 31) / 200,
	},
	{
		name: 'Toxic',
		desc: 'Foe lost with more than 18 poison counters',
		func: (game, p1, p2, stats) => (game.get(p2, 'poison') > 18 ? 0.1 : 0),
	},
	{
		name: 'Unupped',
		desc: '2% per unupped card in deck',
		func: (game, p1, p2, stats) => {
			let unupnu = 0;
			for (const [code, count] of etgutil.iterraw(
				game.data.players[p1 - 1].deck,
			)) {
				const card = game.Cards.Codes[code];
				if (card && !card.upped) unupnu += count;
			}
			return unupnu / 50;
		},
	},
	{
		name: 'Waiter',
		desc: 'Won with 0 cards in deck',
		func: (game, p1, p2, stats) => (game.deck_length(p1) === 0 ? 0.2 : 0),
	},
	{
		name: 'Weapon Master',
		desc: 'Play over 2 weapons',
		func: (game, p1, p2, stats) => (stats.weaponsPlayed > 2 ? 0.1 : 0),
	},
];
function computeBonuses(game, p1id, lefttext, streakrate, setTip, clearTip) {
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

	replayGame.tracedeath();
	for (const move of game.replay) {
		if (replayGame.turn === p1id && move.x === 'cast') {
			const type = replayGame.get_kind(move.c);
			if (type === Kind.Spell) {
				const card = replayGame.Cards.Codes[replayGame.get(move.c, 'card')];
				if (card.type === Kind.Creature) replayStats.creaturesPlayed++;
				if (card.type === Kind.Weapon) replayStats.weaponsPlayed++;
				if (replayGame.get(move.c, 'pillar')) replayStats.pillarsPlayed++;
			}
		}
		replayGame.nextCmd(move, false);
	}
	replayStats.creaturesDied = replayGame.get(p1id, 'lives');

	const p1foe = game.get_foe(p1id);
	let bonus = 1;
	for (const item of BonusList) {
		const b = item.func(game, p1id, p1foe, replayStats);
		if (b > 0) {
			lefttext.push(() => (
				<TooltipText tip={item.desc} setTip={setTip} clearTip={clearTip}>
					{`${Math.round(b * 100)}% ${item.name}`}
				</TooltipText>
			));
			bonus += b;
		}
	}
	lefttext.push(() => (
		<div>{`${((streakrate + 1) * bonus * 100 - 100).toFixed(
			1,
		)}% total bonus`}</div>
	));
	return bonus;
}

export default function Result(props) {
	const rx = store.useRx();
	const { game } = props,
		p1id = game.userId(rx.username);
	const [tooltip, setTip] = createSignal(null);
	let goldreward = game.data.goldreward,
		boundreward = game.data.cardreward ?? '',
		poolreward = game.data.poolreward ?? '',
		spinreward = '';

	const canRematch = () =>
		game.data.rematch &&
		(!game.data.rematchFilter || game.data.rematchFilter(game, p1id));

	const exitFunc = () => {
		if (game.data.quest) {
			if (game.winner === p1id && game.data.choicerewards) {
				store.doNav(import('./Reward.jsx'), {
					type: game.data.choicerewards,
					amount: game.data.rewardamount,
				});
			} else {
				store.doNav(import('./Quest.jsx'));
			}
		} else if (game.data.daily !== undefined) {
			store.doNav(import('./Colosseum.jsx'));
		} else {
			store.doNav(import('./MainMenu.jsx'));
		}
	};

	const onkeydown = e => {
		if (e.target.tagName === 'TEXTAREA') return;
		if (e.key === ' ' || e.key === 'Enter') exitFunc();
		else if (e.key === 'w' && canRematch()) game.data.rematch();
	};

	const clearTip = () => setTip(null);

	onMount(() => {
		document.addEventListener('keydown', onkeydown);
	});
	onCleanup(() => {
		document.removeEventListener('keydown', onkeydown);
	});

	const level = game.data.level,
		winner = game.winner === p1id,
		lefttext = [
			() => <div>{game.countPlies()} plies</div>,
			() => <div>{(game.duration / 1000).toFixed(1)} seconds</div>,
		];

	const replay = game.replayJson();
	if (
		replay &&
		game.data.endurance === undefined &&
		game.data.quest === undefined
	) {
		store.clearChat('Replay');
		store.chat(() => replay, 'Replay');
	}

	let streakrate = 0;
	if (winner) {
		const wasPvP = game.data.players.every(pd => !pd.ai);
		if (level !== undefined || wasPvP) sock.userExec('addwin', { pvp: wasPvP });
		if (level !== undefined) {
			const foedecks = game.data.players.filter(pd => !pd.user),
				foedeck = choose(foedecks);
			if (foedeck) {
				const foeDeck = etgutil.decodedeck(foedeck.deck);
				// Chromatic Butterfly if nothing winnable
				let winnable = foeDeck.filter(code => {
						const card = game.Cards.Codes[code];
						return card && card.rarity > 0 && card.rarity < 4;
					}),
					cardwon = winnable.length ? choose(winnable) : 5009;
				spinreward = '01' + etgutil.encodeCode(etgutil.asShiny(cardwon, false));
				poolreward += spinreward;
			}
			if (props.hardcoreback) {
				const hardreward = '01' + etgutil.encodeCode(props.hardcoreback);
				if (props.hardcorebound) {
					boundreward = hardreward + boundreward;
				} else {
					poolreward = hardreward + poolreward;
				}
			}
			if (goldreward === undefined) {
				if (level !== undefined) {
					if (game.data.daily === undefined) {
						const streak = (props.streakback ?? 0) + 1;
						if (streak !== rx.user.streak[level]) {
							sock.userExec('setstreak', {
								l: level,
								n: streak,
							});
						}
						streakrate = Math.min((streak200[level] * (streak - 1)) / 200, 1);
						lefttext.push(() => (
							<TooltipText
								tip={streak + ' win streak'}
								setTip={setTip}
								clearTip={clearTip}>
								{(streakrate * 100).toFixed(1)}% streak bonus
							</TooltipText>
						));
					}

					goldreward = Math.round(
						pveCostReward[level * 2 + 1] *
							(1 + streakrate) *
							computeBonuses(
								game,
								p1id,
								lefttext,
								streakrate,
								setTip,
								clearTip,
							),
					);
				}
			}
		}
		if (goldreward) {
			sock.userExec('addgold', { g: goldreward });
		}
		if (boundreward) {
			sock.userExec('addcards', { c: boundreward, bound: true });
		}
		if (poolreward) {
			sock.userExec('addcards', { c: poolreward });
		}
	}
	if (
		level !== undefined &&
		game.data.endurance === undefined &&
		game.data.colobonus === undefined
	) {
		const stats = [
			level,
			(game.data.players[game.get_foe(p1id) - 1].name || '?').replace(
				/,/g,
				' ',
			),
			winner ? 'W' : 'L',
			game.countPlies(),
			game.duration,
			game.get(p1id, 'hp'),
			game.get(p1id, 'maxhp'),
			(goldreward | 0) - (game.data.cost | 0),
			spinreward || '-',
			calcWealth(Cards, spinreward),
			winner ? (props.streakback ?? 0) + 1 : 0,
			streakrate,
		];
		sock.userEmit('stat', {
			set: game.data.set,
			stats: stats,
			players: game.data.players,
		});
		stats[stats.length - 1] = +stats[stats.length - 1].toFixed(3);
		store.chatMsg(stats.join(), 'Stats');
		const { opts } = store.state;
		if (opts.runcount) {
			if (opts.runcountcur === opts.runcount) {
				store.chatMsg(`${opts.runcount} runs completed`, 'System');
				store.setOptTemp('runcountcur', 1);
			} else {
				store.setOptTemp('runcountcur', opts.runcountcur + 1);
			}
		}
	}

	const cards = () => {
		const cards = [],
			cardreward = boundreward + poolreward;
		if (cardreward) {
			let x0 = 390 - etgutil.decklength(cardreward) * 20;
			for (const code of etgutil.iterdeck(cardreward)) {
				cards.push(<Card x={x0} y={170} card={Cards.Codes[code]} />);
				x0 += 40;
			}
		}
		return cards;
	};

	return (
		<>
			<input
				type="button"
				value="Exit"
				onClick={exitFunc}
				style="position:absolute;left:412px;top:440px"
			/>
			{canRematch() && (
				<input
					type="button"
					value="Rematch"
					onClick={game.data.rematch}
					style="position:absolute;left:412px;top:490px"
				/>
			)}
			{game.winner === p1id && (
				<>
					{goldreward > 0 && (
						<div style="text-align:center;width:900px;position:absolute;left:0;top:550px">
							{goldreward - (game.data.cost | 0)}
							<span class="ico gold" />
						</div>
					)}
					{cards}
					<div
						style={`text-align:center;width:700px;position:absolute;left:100px;bottom:${
							boundreward || poolreward ? 444 : 180
						}px`}>
						<Text text={game.data.wintext ?? 'You won!'} />
					</div>
				</>
			)}
			{game.winner !== p1id && props.hardcoreback && (
				<div style="opacity:.3">
					<Card x={370} y={170} card={Cards.Codes[props.hardcoreback]} />
				</div>
			)}
			<span style="position:absolute;left:8px;top:290px">{lefttext}</span>
			<div style="position:absolute;left:8px;top:258px">{tooltip()}</div>
		</>
	);
}

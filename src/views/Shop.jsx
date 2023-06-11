import { useSelector } from 'react-redux';
import { useEffect, useState, Fragment } from 'react';

import * as sock from '../sock.jsx';
import Cards from '../Cards.js';
import * as Tutor from '../Components/Tutor.jsx';
import * as etgutil from '../etgutil.js';
import { parseInput } from '../util.js';
import * as Components from '../Components/index.jsx';
import * as store from '../store.jsx';

const packdata = [
	{
		cost: 15,
		type: 'Bronze',
		info: '10 Commons. ~3.4% rarity bonus',
	},
	{
		cost: 25,
		type: 'Silver',
		info: '3 Commons, 3 Uncommons. ~6.8% rarity bonus',
	},
	{
		cost: 80,
		type: 'Gold',
		info: '1 Common, 2 Uncommons, 2 Rares. ~1.7% rarity bonus',
	},
	{ cost: 250, type: 'Nymph', info: '1 Nymph' },
];

function PackDisplay(props) {
	const [hoverCard, setHoverCard] = useState(null);
	const { cards } = props;
	const dlen = etgutil.decklength(cards);
	let cardchildren;
	if (dlen < 51) {
		cardchildren = (
			<Components.DeckDisplay
				cards={Cards}
				x={64}
				deck={etgutil.decodedeck(cards)}
				onMouseOver={(i, card) => setHoverCard(card)}
			/>
		);
	} else {
		const deck = etgutil.decodedeck(cards);
		cardchildren = (
			<>
				<Components.DeckDisplay
					cards={Cards}
					x={64}
					deck={deck.slice(0, 50)}
					onMouseOver={(i, card) => setHoverCard(card)}
				/>
				<Components.DeckDisplay
					cards={Cards}
					x={-97}
					y={244}
					deck={deck.slice(50)}
					onMouseOver={(i, card) => setHoverCard(card)}
				/>
			</>
		);
	}
	return (
		<Components.Box x={40} y={16} width={710} height={568}>
			<Components.Card card={hoverCard} x={2} y={2} />
			{cardchildren}
		</Components.Box>
	);
}

export default function Shop() {
	const user = useSelector(({ user }) => user);
	const bulk = useSelector(({ opts }) => opts.bulk ?? '1');
	const [info1, setInfo1] = useState('Select from which element you want');
	const [info2, setInfo2] = useState('Select which type of pack you want');
	const [ele, setEle] = useState(-1);
	const [rarity, setRarity] = useState(-1);
	const [buy, setBuy] = useState(true);
	const [cards, setCards] = useState('');

	useEffect(() => {
		store.store.dispatch(
			store.setCmds({
				boostergive: data => {
					const userdelta = {};
					if (data.accountbound) {
						userdelta.accountbound = etgutil.mergedecks(
							user.accountbound,
							data.cards,
						);
						const freepacks = user.freepacks && user.freepacks.slice();
						if (freepacks) {
							freepacks[data.packtype]--;
							userdelta.freepacks = freepacks;
						}
					} else {
						const bdata = {};
						parseInput(bdata, 'bulk', bulk, 99);
						userdelta.pool = etgutil.mergedecks(user.pool, data.cards);
						userdelta.gold =
							user.gold - packdata[data.packtype].cost * (bdata.bulk || 1);
					}
					store.store.dispatch(store.updateUser(userdelta));
					const dlen = etgutil.decklength(data.cards);
					if (dlen < 121) {
						setCards(data.cards);
						setBuy(false);
					} else {
						setBuy(true);
					}
					store.store.dispatch(
						store.chat(
							<a
								style={{ display: 'block' }}
								href={`deck/${data.cards}`}
								target="_blank">
								{data.cards}
							</a>,
							'Packs',
						),
					);
				},
			}),
		);
	}, [user]);

	const buyPack = () => {
		const pack = packdata[rarity];
		const boostdata = {
			pack: rarity,
			element: ele,
		};
		parseInput(boostdata, 'bulk', bulk, 99);
		boostdata.bulk ||= 1;
		if (
			user.gold >= pack.cost * (boostdata.bulk || 1) ||
			(user.freepacks && user.freepacks[rarity] > 0)
		) {
			sock.userEmit('booster', boostdata);
			setBuy(false);
		} else {
			setInfo2("You can't afford that!");
		}
	};

	const hasFreePacks = !!(user.freepacks && user.freepacks[rarity]);
	const elebuttons = [];
	for (let i = 0; i < 14; i++) {
		elebuttons.push(
			<Components.IconBtn
				key={i}
				e={'e' + i}
				x={75 + (i >> 1) * 64}
				y={117 + (i & 1) * 75}
				click={() => {
					setEle(i);
					setInfo1(`Selected Element: ${i === 13 ? 'Random' : '1:' + i}`);
				}}
			/>,
		);
	}
	return (
		<>
			<Components.Box x={40} y={16} width={820} height={60} />
			<Components.Box x={40} y={89} width={494} height={168} />
			<Components.Box x={40} y={270} width={712} height={300} />
			<Components.Box x={768} y={90} width={94} height={184} />
			<Components.Text
				text={user.gold + '$'}
				style={{
					position: 'absolute',
					left: '775px',
					top: '101px',
				}}
			/>
			<Components.Text
				text={info1}
				style={{
					position: 'absolute',
					left: '50px',
					top: '25px',
				}}
			/>
			<span
				style={{
					position: 'absolute',
					left: '50px',
					top: '50px',
				}}>
				{info2}
			</span>
			<Components.ExitBtn x={775} y={246} />
			{hasFreePacks && (
				<span
					style={{
						position: 'absolute',
						left: '350px',
						top: '26px',
					}}>
					{!!user.freepacks[rarity] &&
						`Free ${packdata[rarity].type} packs left: ${user.freepacks[rarity]}`}
				</span>
			)}
			{cards && (
				<input
					type="button"
					value="Take Cards"
					onClick={() => {
						setBuy(true);
						setCards('');
					}}
					style={{
						position: 'absolute',
						left: '775px',
						top: '156px',
					}}
				/>
			)}
			{buy && !!~ele && !!~rarity && (
				<>
					{!hasFreePacks && (
						<input
							type="button"
							value="Max Buy"
							onClick={() => {
								const pack = packdata[rarity];
								store.store.dispatch(
									store.setOptTemp(
										'bulk',
										Math.min((user.gold / pack.cost) | 0, 99).toString(),
									),
								);
							}}
							style={{
								position: 'absolute',
								left: '775px',
								top: '128px',
							}}
						/>
					)}
					<input
						type="button"
						value="Buy Pack"
						onClick={buyPack}
						style={{
							position: 'absolute',
							left: '775px',
							top: '156px',
						}}
					/>
				</>
			)}
			{packdata.map((pack, n) => (
				<Fragment key={pack.type}>
					<img
						src={`/assets/pack${n}.webp`}
						className="imgb"
						onClick={() => {
							setRarity(n);
							setInfo2(`${pack.type} Pack: ${pack.info}`);
						}}
						style={{
							position: 'absolute',
							left: `${48 + 176 * n}px`,
							top: '278px',
						}}
					/>
					<Components.Text
						text={pack.cost + '$'}
						style={{
							position: 'absolute',
							left: `${48 + 176 * n}px`,
							top: '542px',
							width: '160px',
							textAlign: 'center',
						}}
					/>
				</Fragment>
			))}
			{elebuttons}
			{cards && <PackDisplay cards={cards} />}
			{!hasFreePacks && !!~ele && !!~rarity && (
				<input
					type="number"
					placeholder="Bulk"
					value={bulk}
					onChange={e =>
						store.store.dispatch(store.setOptTemp('bulk', e.target.value))
					}
					onKeyPress={e => {
						if (e.which === 13) buyPack();
					}}
					style={{
						position: 'absolute',
						top: '184px',
						left: '777px',
						width: '64px',
					}}
				/>
			)}
			<Tutor.Tutor x={8} y={500} panels={Tutor.Shop} />
		</>
	);
}
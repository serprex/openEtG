import { createSignal, onMount } from 'solid-js';
import { For } from 'solid-js/web';

import * as sock from '../sock.jsx';
import Cards from '../Cards.js';
import * as Tutor from '../Components/Tutor.jsx';
import * as etgutil from '../etgutil.js';
import { parseInput } from '../util.js';
import Card from '../Components/Card.jsx';
import DeckDisplay from '../Components/DeckDisplay.jsx';
import ExitBtn from '../Components/ExitBtn.jsx';
import IconBtn from '../Components/IconBtn.jsx';
import Text from '../Components/Text.jsx';
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
	const [hoverCard, setHoverCard] = createSignal(null);
	const DeckDisplaySetCard = (i, card) => setHoverCard(card);
	const children = () => {
		const deck = etgutil.decodedeck(props.cards),
			dlen = etgutil.decklength(props.cards);
		const children = [{ x: 106, y: 0, deck: deck.slice(0, 50) }];
		for (let start = 51; start < dlen; start += 70) {
			children.push({
				x: -92,
				y: 244 + (((start - 51) / 70) | 0) * 200,
				deck: deck.slice(start, start + 70),
			});
		}
		return children;
	};
	return (
		<div
			class="bgbox"
			style="position:absolute;left:0px;top:12px;width:756px;height:588px;z-index:1;overflow-y:auto">
			<Card card={hoverCard()} x={8} y={8} />
			<For each={children()}>
				{p => (
					<DeckDisplay
						cards={Cards}
						x={p.x}
						y={p.y}
						deck={p.deck}
						onMouseOver={DeckDisplaySetCard}
					/>
				)}
			</For>
		</div>
	);
}

export default function Shop() {
	const rx = store.useRx();
	const bulk = () => rx.opts.bulk ?? '1';
	const [info1, setInfo1] = createSignal('Select from which element you want');
	const [info2, setInfo2] = createSignal('Select which type of pack you want');
	const [ele, setEle] = createSignal(-1);
	const [rarity, setRarity] = createSignal(-1);
	const [buy, setBuy] = createSignal(true);
	const [cards, setCards] = createSignal('');

	onMount(() => {
		sock.setCmds({
			boostergive: data => {
				const userdelta = {};
				if (data.accountbound) {
					userdelta.accountbound = etgutil.mergedecks(
						rx.user.accountbound,
						data.cards,
					);
					const freepacks = rx.user.freepacks && rx.user.freepacks.slice();
					if (freepacks) {
						freepacks[data.packtype]--;
						userdelta.freepacks = freepacks;
					}
				} else {
					const bdata = {};
					parseInput(bdata, 'bulk', bulk(), 99);
					userdelta.pool = etgutil.mergedecks(rx.user.pool, data.cards);
					userdelta.gold =
						rx.user.gold - packdata[data.packtype].cost * (bdata.bulk || 1);
				}
				store.updateUser(userdelta);
				setCards(data.cards);
				setBuy(false);
				store.chat(
					() => (
						<a
							style="display:block"
							href={`deck/${data.cards}`}
							target="_blank">
							{data.cards}
						</a>
					),
					'Packs',
				);
			},
		});
	});

	const buyPack = () => {
		const pack = packdata[rarity()];
		const boostdata = {
			pack: rarity(),
			element: ele(),
		};
		parseInput(boostdata, 'bulk', bulk(), 99);
		boostdata.bulk ||= 1;
		if (
			rx.user.gold >= pack.cost * (boostdata.bulk || 1) ||
			(rx.user.freepacks && rx.user.freepacks[rarity()] > 0)
		) {
			sock.userEmit('booster', boostdata);
			setBuy(false);
		} else {
			setInfo2("You can't afford that!");
		}
	};

	const hasFreePacks = () =>
		!!(rx.user.freepacks && rx.user.freepacks[rarity()]);
	const elebuttons = [];
	for (let i = 0; i < 14; i++) {
		elebuttons.push(
			<IconBtn
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
			<div
				class="bgbox"
				style="position:absolute;left:40px;top:16px;width:820px;height:60px"
			/>
			<div
				class="bgbox"
				style="position:absolute;left:40px;top:89px;width:494px;height:168px"
			/>
			<div
				class="bgbox"
				style="position:absolute;left:768px;top:90px;width:94px;height:184px"
			/>
			<Text
				text={rx.user.gold + '$'}
				style="position:absolute;left:775px;top:101px"
			/>
			<Text text={info1()} style="position:absolute;left:50px;top:25px" />
			<span style="position:absolute;left:50px;top:50px">{info2()}</span>
			<ExitBtn x={775} y={246} />
			{hasFreePacks() && (
				<span style="position:absolute;left:350px;top:26px">
					{!!rx.user.freepacks[rarity()] &&
						`Free ${packdata[rarity()].type} packs left: ${
							rx.user.freepacks[rarity()]
						}`}
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
					style="position:absolute;left:775px;top:156px"
				/>
			)}
			{buy() && !!~ele() && !!~rarity() && (
				<>
					{!hasFreePacks() && (
						<input
							type="button"
							value="Max Buy"
							onClick={() => {
								const pack = packdata[rarity()];
								store.setOptTemp(
									'bulk',
									Math.min((rx.user.gold / pack.cost) | 0, 99).toString(),
								);
							}}
							style="position:absolute;left:775px;top:128px"
						/>
					)}
					<input
						type="button"
						value="Buy Pack"
						onClick={buyPack}
						style="position:absolute;left:775px;top:156px"
					/>
				</>
			)}
			<For each={packdata}>
				{(pack, n) => (
					<>
						<img
							src={`/assets/pack${n()}.webp`}
							class="imgb"
							onClick={() => {
								setRarity(n());
								setInfo2(`${pack.type} Pack: ${pack.info}`);
							}}
							style={{
								position: 'absolute',
								left: `${48 + 176 * n()}px`,
								top: '278px',
							}}
						/>
						<Text
							text={pack.cost + '$'}
							style={{
								position: 'absolute',
								left: `${48 + 176 * n()}px`,
								top: '542px',
								width: '160px',
								'text-align': 'center',
							}}
						/>
					</>
				)}
			</For>
			{elebuttons}
			{cards() && <PackDisplay cards={cards()} />}
			{!hasFreePacks() && !!~ele() && !!~rarity() && (
				<input
					type="number"
					placeholder="Bulk"
					value={bulk()}
					onChange={e => store.setOptTemp('bulk', e.target.value)}
					onKeyPress={e => {
						if (e.which === 13) buyPack();
					}}
					style="position:absolute;top:184px;left:777px;width:64px"
				/>
			)}
			<Tutor.Tutor x={8} y={500} panels={Tutor.Shop} />
		</>
	);
}

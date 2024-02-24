import { createSignal, onMount } from 'solid-js';
import { For } from 'solid-js/web';

import { playSound } from '../audio.js';
import * as sock from '../sock.jsx';
import Cards from '../Cards.js';
import * as Tutor from '../Components/Tutor.jsx';
import * as etgutil from '../etgutil.js';
import Card from '../Components/Card.jsx';
import DeckDisplay from '../Components/DeckDisplay.jsx';
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
	const DeckDisplaySetCard = (_i, card) => setHoverCard(card);
	const children = () => {
		const deck = etgutil.decodedeck(props.cards);
		const children = [{ x: 106, y: 0, deck: deck.slice(0, 50) }];
		for (let start = 51; start < deck.length; start += 70) {
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
			style={`position:absolute;left:0px;top:12px;width:756px;height:588px;z-index:1;overflow-y:auto${
				props.cards ? '' : ';display:none'
			}`}>
			<Card card={hoverCard()} />
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
					userdelta.pool = etgutil.mergedecks(rx.user.pool, data.cards);
					userdelta.gold = data.g;
				}
				store.updateUser(userdelta);
				setCards(data.cards);
				setBuy(false);
			},
		});
	});

	const buyPack = () => {
		const pack = packdata[rarity()];
		const boostdata = {
			pack: rarity(),
			element: ele(),
			bulk: bulk() | 0 || 1,
		};
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
	return (
		<>
			<Tutor.Tutor x={8} y={500} panels={Tutor.Shop} />
			<div class="shop">
				<div class="bgbox shop-info">
					<div class="shop-info1">
						<span class="shop-info1-text">
							<Text text={info1()} />
						</span>
						{hasFreePacks() && (
							<span>
								{!!rx.user.freepacks[rarity()] &&
									`Free ${packdata[rarity()].type} packs left: ${
										rx.user.freepacks[rarity()]
									}`}
							</span>
						)}
					</div>
					{info2()}
				</div>
				<div style="display:flex;justify-content:space-between;width:100%">
					<div class="bgbox shop-ele">
						{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => (
							<span
								class={`imgb ico e${i}${ele() === i ? ' selected' : ''}`}
								onClick={() => {
									playSound('click');
									setEle(i);
									setInfo1(
										`Selected Element: ${i === 13 ? 'Random' : '1:' + i}`,
									);
								}}
							/>
						))}
					</div>
					<div class="bgbox" style="width:94px;height:184px;position:relative">
						<div style="position:absolute;right:8px;top:11px">
							{rx.user.gold}
							<span class="ico gold" />
						</div>
						{cards() && (
							<input
								type="button"
								value="Take Cards"
								onClick={() => {
									setBuy(true);
									setCards('');
								}}
								style="position:absolute;left:7px;top:66px"
							/>
						)}
						{buy() &&
							!!~ele() &&
							!!~rarity() &&
							(!store.hasflag(rx.user, 'no-shop') || hasFreePacks()) && (
								<>
									{!hasFreePacks() && (
										<input
											type="button"
											value="Max Buy"
											onClick={() => {
												const pack = packdata[rarity()];
												store.setOptTemp(
													'bulk',
													Math.min(
														(rx.user.gold / pack.cost) | 0,
														255,
													).toString(),
												);
											}}
											style="position:absolute;left:7px;top:38px"
										/>
									)}
									<input
										type="button"
										value="Buy Pack"
										onClick={buyPack}
										style="position:absolute;left:7px;top:66px"
									/>
								</>
							)}
						{!hasFreePacks() &&
							!store.hasflag(rx.user, 'no-shop') &&
							!!~ele() &&
							!!~rarity() && (
								<input
									type="number"
									placeholder="Bulk"
									value={bulk()}
									min="0"
									max="255"
									onChange={e => store.setOptTemp('bulk', e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter') buyPack();
									}}
									style="position:absolute;top:94px;left:11px;width:64px"
								/>
							)}
						<input
							type="button"
							value="Exit"
							onClick={() => store.doNav(import('../views/MainMenu.jsx'))}
							style="position:absolute;left:7px;top:156px"
						/>
					</div>
				</div>
				<div class="shop-packs">
					<For each={packdata}>
						{(pack, n) => (
							<div class="shop-pack">
								<img
									src={`/assets/pack${n()}.webp`}
									class={`imgb${rarity() === n() ? ' selected' : ''}`}
									onClick={() => {
										setRarity(n());
										setInfo2(`${pack.type} Pack: ${pack.info}`);
									}}
								/>
								{rx.user.freepacks && rx.user.freepacks[n()] > 0 && (
									<span class="free-pack">{rx.user.freepacks[n()]}</span>
								)}
								{pack.cost}
								<span class="ico gold" />
							</div>
						)}
					</For>
				</div>
			</div>
			<PackDisplay cards={cards()} />
		</>
	);
}

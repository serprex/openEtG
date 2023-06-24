import { createMemo, createSignal, onMount } from 'solid-js';
import { For } from 'solid-js/web';

import Cards from '../Cards.js';
import * as etg from '../etg.js';
import * as etgutil from '../etgutil.js';
import * as userutil from '../userutil.js';
import * as sock from '../sock.jsx';
import * as store from '../store.jsx';
import * as Components from '../Components/index.jsx';

function Order(p) {
	return (
		<div onClick={_e => p.onClick(Math.abs(p.order.p), p.order.q)}>
			{p.order.q} @ {Math.abs(p.order.p)}
		</div>
	);
}
function CardOrders(p) {
	return (
		p.bc && (
			<>
				<div style="position:absolute;left:100px;top:72px;width:230px;height:192px;color:#4f8">
					<div>Buys</div>
					<For each={p.bc.filter(x => x.p > 0 && x.u !== p.username)}>
						{buy => <Order order={buy} onClick={p.onClickBuy} />}
					</For>
				</div>
				<div style="position:absolute;left:330px;top:72px;width:230px;height:192px;color:#f84">
					<div>Sells</div>
					<For each={p.bc.filter(x => x.p < 0 && x.u !== p.username)}>
						{sell => <Order order={sell} onClick={p.onClickSell} />}
					</For>
				</div>
				{p.bc.some(({ u }) => u === p.username) && (
					<div style="position:absolute;left:560px;top:72px;width:230px;height:192px">
						<For each={p.bc.filter(x => x.u === p.username)}>
							{order => (
								<div style={order.p > 0 ? 'color:#4f8' : 'color:#f84'}>
									{order.q} @ {Math.abs(order.p)}
								</div>
							)}
						</For>
						<input
							type="button"
							value="Cancel"
							style="display:block"
							onClick={p.onClickCancel}
						/>
					</div>
				)}
			</>
		)
	);
}

function OrderSummary(props) {
	const bz = createMemo(() => {
		const bz = [];
		for (const k in props.bz) {
			const bzv = props.bz[k];
			if (!bzv.length) continue;
			const o0 = bzv[0],
				o1 = bzv[bzv.length - 1],
				card = Cards.Codes[k];
			if (!((props.showSell && o0.p < 0) || (props.showBuy && o1.p > 0))) {
				continue;
			}
			if (props.showDeal) {
				const worth = userutil.cardValue(card);
				if (
					!(
						(props.showSell && o0.p < 0 && -o0.p < worth) ||
						(props.showBuy && o1.p > 0 && o1.p > worth)
					)
				) {
					continue;
				}
			}
			if (
				props.showMine
					? bzv.every(({ u }) => u !== props.username)
					: bzv.some(({ u }) => u === props.username)
			) {
				continue;
			}
			bz.push({
				code: +k,
				name: `${card.upped ? '^' : ''}${card.shiny ? '$' : ''}${card.name}`,
				orders: bzv,
			});
		}

		return bz.sort((a, b) =>
			Cards.Codes[a.code].name.localeCompare(Cards.Codes[b.code].name),
		);
	});

	return (
		<For each={bz()}>
			{({ code, name, orders }) => {
				const o0 = orders[0],
					o1 = orders[orders.length - 1];
				return (
					(o0 || o1) && (
						<div style="width:288px" onClick={[props.onClick, code]}>
							<div style="display:inline-block;width:192px;text-overflow:ellipsis;">
								{name}
							</div>
							<div style="display:inline-block;color:#4f8;width:48px">
								{o1.p > 0 ? o1.p : ' '}
							</div>
							<div style="display:inline-block;color:#f84;width:48px">
								{o0.p < 0 ? -o0.p : ' '}
							</div>
						</div>
					)
				);
			}}
		</For>
	);
}

function OrderBook(p) {
	return (
		<div
			class="bgbox"
			style="position:absolute;top:270px;width:900px;height:330px;overflow-y:auto">
			<label style="display:inline-block;width:200px">
				<input
					type="checkbox"
					checked={p.deal}
					onChange={e => store.setOptTemp('orderFilter_Deal', e.target.checked)}
				/>{' '}
				Deals
			</label>
			<label style="display:inline-block;width:200px">
				<input
					type="checkbox"
					checked={p.buy}
					onChange={e => store.setOptTemp('orderFilter_Buy', e.target.checked)}
				/>{' '}
				Buys
			</label>
			<label style="display:inline-block;width:200px">
				<input
					type="checkbox"
					checked={p.sell}
					onChange={e => store.setOptTemp('orderFilter_Sell', e.target.checked)}
				/>{' '}
				Sells
			</label>
			<label style="display:inline-block;width:200px">
				<input
					type="checkbox"
					checked={p.mine}
					onChange={e => store.setOptTemp('orderFilter_Mine', e.target.checked)}
				/>{' '}
				Mine
			</label>
			{p.bz && (
				<div style="column-count:3;width:890px">
					<OrderSummary
						username={p.username}
						bz={p.bz}
						showDeal={p.deal}
						showBuy={p.buy}
						showSell={p.sell}
						showMine={p.mine}
						onClick={p.onClick}
					/>
				</div>
			)}
		</div>
	);
}

export default function Bazaar() {
	const rx = store.useRx();
	const cardpool = createMemo(() => etgutil.deck2pool(rx.user.pool));

	const [bz, setBz] = createSignal(null);
	const [bcard, setBcard] = createSignal(null);
	const [sell, setSell] = createSignal(0);
	const [buy, setBuy] = createSignal(0);
	const [sellq, setSellq] = createSignal(0);
	const [buyq, setBuyq] = createSignal(0);
	const [showOrders, setShowOrders] = createSignal(false);

	onMount(() => {
		store.setCmds({
			bzread: data => {
				const bz = data.bz;
				for (const k in bz) {
					bz[k].sort(
						(x, y) =>
							Math.sign(x.p) - Math.sign(y.p) || Math.abs(x.p) - Math.abs(y.p),
					);
				}
				setBz(data.bz);
			},
			bzbid: data => {
				setBz(bz => {
					const newbz = { ...bz };
					for (const code in data.rm) {
						if (newbz[code]) {
							newbz[code] = newbz[code].filter(
								bid =>
									!data.rm[code].some(
										rm => rm.u === bid.u && rm.q === bid.q && rm.p === bid.p,
									),
							);
						}
					}
					for (const code in data.add) {
						newbz[code] = newbz[code] ? newbz[code].slice() : [];
						newbz[code].push(...data.add[code]);
					}
					return newbz;
				});
				store.updateUser({
					gold: data.g,
					pool: data.pool,
				});
			},
		});
		sock.emit({ x: 'bzread' });
	});

	return (
		<>
			<Components.ExitBtn x={8} y={56} />
			<input
				type="button"
				value="Orders"
				onClick={() => setShowOrders(showOrders => !showOrders)}
				style="position:absolute;top:96px;left:8px;"
			/>
			{!!bcard() && bz() && (
				<>
					<input
						type="button"
						value="Sell"
						onClick={() => {
							sock.userEmit('bzbid', {
								price: -sell(),
								cards:
									etgutil.encodeCount(sellq() || 1) +
									etgutil.encodeCode(bcard().code),
							});
						}}
						style="position:absolute;left:100px;top:8px"
					/>
					<input
						placeholder="Price"
						value={sell() || ''}
						onInput={e => setSell(e.target.value | 0)}
						style="position:absolute;left:200px;top:8px"
					/>
					<input
						placeholder="Quantity"
						value={sellq() || ''}
						onInput={e => setSellq(e.target.value | 0)}
						style="position:absolute;left:360px;top:8px"
					/>
					{buy() > userutil.sellValue(bcard()) && (
						<input
							type="button"
							value="Buy"
							onClick={() => {
								sock.userEmit('bzbid', {
									price: buy(),
									cards:
										etgutil.encodeCount(buyq() || 1) +
										etgutil.encodeCode(bcard().code),
								});
							}}
							style="position:absolute;left:100px;top:40px"
						/>
					)}
					<input
						placeholder="Price"
						value={buy() || ''}
						onInput={e => setBuy(e.target.value | 0)}
						style="position:absolute;left:200px;top:40px"
					/>
					<input
						placeholder="Quantity"
						value={buyq() || ''}
						onInput={e => setBuyq(e.target.value | 0)}
						style="position:absolute;left:360px;top:40px"
					/>
					<div
						style="position:absolute;right:144px;top:8px"
						onClick={() => setSell(userutil.sellValue(bcard()))}>
						Autosell: {userutil.sellValue(bcard())}
						<span class="ico g" />
					</div>
					<div style="position:absolute;right:144px;top:40px">
						Wealth value: {userutil.cardValue(bcard())}
						<span class="ico g" />
					</div>
					<CardOrders
						username={rx.user.name}
						bc={bz()[bcard().code]}
						onClickBuy={(sell, sellq) => {
							setSell(sell);
							setSellq(sellq);
						}}
						onClickSell={(buy, buyq) => {
							setBuy(buy);
							setBuyq(buyq);
						}}
						onClickCancel={() =>
							sock.userEmit('bzcancel', {
								c: bcard().code,
							})
						}
					/>
				</>
			)}
			<Components.Text
				text={rx.user.gold + '$'}
				style="position:absolute;left:5px;top:240px"
			/>
			<Components.Card x={768} y={8} card={bcard()} />
			<Components.CardSelector
				cards={Cards}
				cardpool={cardpool()}
				maxedIndicator
				filter={card => !card.isFree()}
				onClick={card => {
					if (~card.rarity && !card.getStatus('pillar') && !card.isFree()) {
						setBcard(card);
					}
				}}
			/>
			{showOrders() && (
				<OrderBook
					username={rx.user.name}
					deal={rx.opts.orderFilter_Deal ?? false}
					buy={rx.opts.orderFilter_Buy ?? true}
					sell={rx.opts.orderFilter_Sell ?? true}
					mine={rx.opts.orderFilter_Mine ?? false}
					bz={bz()}
					onClick={code => {
						setBcard(Cards.Codes[code]);
					}}
				/>
			)}
		</>
	);
}
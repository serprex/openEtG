import React from 'react';
import { connect } from 'react-redux';

import Cards from '../Cards.js';
import * as etg from '../etg.js';
import * as etgutil from '../etgutil.js';
import * as userutil from '../userutil.js';
import * as sock from '../sock.js';
import * as store from '../store.js';
import * as Components from '../Components/index.js';

function Order({ order, onClick }) {
	return (
		<div onClick={_e => onClick(Math.abs(order.p), order.q)}>
			{order.q} @ {Math.abs(order.p)}
		</div>
	);
}
const CardOrders = connect(({ user }) => ({ uname: user.name }))(
	function CardOrders({ uname, bc, onClickBuy, onClickSell, onClickCancel }) {
		if (!bc) return null;
		const hasMine = bc.some(({ u }) => u === uname);
		return (
			<>
				<div
					style={{
						position: 'absolute',
						left: '100px',
						top: '72px',
						width: '230px',
						height: '192px',
						color: '#4f8',
					}}>
					<div>Buys</div>
					{bc
						.filter(x => x.p > 0 && x.u !== uname)
						.map((buy, i) => (
							<Order key={i} order={buy} onClick={onClickBuy} />
						))}
				</div>
				<div
					style={{
						position: 'absolute',
						left: '330px',
						top: '72px',
						width: '230px',
						height: '192px',
						color: '#f84',
					}}>
					<div>Sells</div>
					{bc
						.filter(x => x.p < 0 && x.u !== uname)
						.map((sell, i) => (
							<Order key={i} order={sell} onClick={onClickSell} />
						))}
				</div>
				{hasMine && (
					<div
						style={{
							position: 'absolute',
							left: '560px',
							top: '72px',
							width: '230px',
							height: '192px',
						}}>
						{bc
							.filter(x => x.u === uname)
							.map((order, i) => (
								<div
									key={i}
									style={{
										color: order.p > 0 ? '#4f8' : '#f84',
									}}>
									{order.q} @ {Math.abs(order.p)}
								</div>
							))}
						<input
							type="button"
							value="Cancel"
							style={{ display: 'block' }}
							onClick={onClickCancel}
						/>
					</div>
				)}
			</>
		);
	},
);

const OrderSummary = connect(({ user }) => ({ uname: user.name }))(
	class OrderSummary extends React.Component {
		constructor(props) {
			super(props);

			this.state = {
				bz: null,
				props: {},
			};
		}

		static getDerivedStateFromProps(props, state) {
			const Bz = props.bz;
			if (
				Bz !== state.props.bz ||
				props.showDeal !== state.props.showDeal ||
				props.showBuy !== state.props.showBuy ||
				props.showSell !== state.props.showSell ||
				props.showMine !== state.props.showMine ||
				props.uname !== state.props.uname
			) {
				if (!Bz) {
					return {
						props,
						bz: null,
					};
				}
				const bz = [];
				for (const k in Bz) {
					const bzv = Bz[k];
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
							? bzv.every(({ u }) => u !== props.uname)
							: bzv.some(({ u }) => u === props.uname)
					) {
						continue;
					}
					bz.push({
						code: +k,
						name: `${card.upped ? '^' : ''}${card.shiny ? '$' : ''}${
							card.name
						}`,
						orders: bzv,
					});
				}

				return {
					props,
					bz: bz.sort((a, b) =>
						Cards.Codes[a.code].name.localeCompare(Cards.Codes[b.code].name),
					),
				};
			}
			return null;
		}

		render() {
			const { onClick } = this.props;
			return this.state.bz.map(({ code, name, orders }) => {
				const o0 = orders[0],
					o1 = orders[orders.length - 1];
				return (
					(o0 || o1) && (
						<div
							key={code}
							style={{ width: '288px' }}
							onClick={() => onClick(code)}>
							<div
								style={{
									display: 'inline-block',
									width: '192px',
									textOverflow: 'ellipsis',
								}}>
								{name}
							</div>
							<div
								style={{
									display: 'inline-block',
									color: '#4f8',
									width: '48px',
								}}>
								{o1.p > 0 ? o1.p : ' '}
							</div>
							<div
								style={{
									display: 'inline-block',
									color: '#f84',
									width: '48px',
								}}>
								{o0.p < 0 ? -o0.p : ' '}
							</div>
						</div>
					)
				);
			});
		}
	},
);

function defVal(x, y) {
	return x === undefined ? y : x;
}
const OrderBook = connect(({ opts }) => ({
	deal: defVal(opts.orderFilter_Deal, false),
	buy: defVal(opts.orderFilter_Buy, true),
	sell: defVal(opts.orderFilter_Sell, true),
	mine: defVal(opts.orderFilter_Mine, false),
}))(function OrderBook({ dispatch, bz, onClick, deal, buy, sell, mine }) {
	return (
		<div
			className="bgbox"
			style={{
				position: 'absolute',
				top: '270px',
				width: '900px',
				height: '330px',
				overflowY: 'auto',
			}}>
			<label style={{ display: 'inline-block', width: '200px' }}>
				<input
					type="checkbox"
					checked={deal}
					onChange={e =>
						dispatch(store.setOptTemp('orderFilter_Deal', e.target.checked))
					}
				/>{' '}
				Deals
			</label>
			<label style={{ display: 'inline-block', width: '200px' }}>
				<input
					type="checkbox"
					checked={buy}
					onChange={e =>
						dispatch(store.setOptTemp('orderFilter_Buy', e.target.checked))
					}
				/>{' '}
				Buys
			</label>
			<label style={{ display: 'inline-block', width: '200px' }}>
				<input
					type="checkbox"
					checked={sell}
					onChange={e =>
						dispatch(store.setOptTemp('orderFilter_Sell', e.target.checked))
					}
				/>{' '}
				Sells
			</label>
			<label style={{ display: 'inline-block', width: '200px' }}>
				<input
					type="checkbox"
					checked={mine}
					onChange={e =>
						dispatch(store.setOptTemp('orderFilter_Mine', e.target.checked))
					}
				/>{' '}
				Mine
			</label>
			{bz && (
				<div style={{ columnCount: '3', width: '890px' }}>
					<OrderSummary
						bz={bz}
						showDeal={deal}
						showBuy={buy}
						showSell={sell}
						showMine={mine}
						onClick={onClick}
					/>
				</div>
			)}
		</div>
	);
});

export default connect(({ user }) => ({ user }))(
	class Bazaar extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				bz: null,
				bcode: 0,
				sell: 0,
				buy: 0,
				sellq: 0,
				buyq: 0,
				showOrders: false,
			};
		}

		static getDerivedStateFromProps(nextProps, prevState) {
			return { cardpool: etgutil.deck2pool(nextProps.user.pool) };
		}

		componentDidMount() {
			sock.emit({ x: 'bzread' });
			this.props.dispatch(
				store.setCmds({
					bzread: data => {
						this.setState({ bz: data.bz });
					},
					bzbid: data => {
						this.setState({ bz: data.bz });
						this.props.dispatch(
							store.updateUser({
								gold: data.g,
								pool: data.pool,
							}),
						);
					},
				}),
			);
		}

		render() {
			return (
				<>
					<Components.ExitBtn x={8} y={56} />
					<input
						type="button"
						value="Orders"
						onClick={() =>
							this.setState({
								showOrders: !this.state.showOrders,
							})
						}
						style={{
							position: 'absolute',
							top: '96px',
							left: '8px',
						}}
					/>
					{!!this.state.bcode && this.state.bz && (
						<>
							<input
								type="button"
								value="Sell"
								onClick={() => {
									sock.userEmit('bzbid', {
										price: -this.state.sell,
										cards:
											etgutil.encodeCount(this.state.sellq || 1) +
											this.state.bcode.toString(32),
									});
								}}
								style={{
									position: 'absolute',
									left: '100px',
									top: '8px',
								}}
							/>
							<input
								placeholder="Price"
								value={this.state.sell || ''}
								onChange={e => this.setState({ sell: e.target.value | 0 })}
								style={{
									position: 'absolute',
									left: '200px',
									top: '8px',
								}}
							/>
							<input
								placeholder="Quantity"
								value={this.state.sellq || ''}
								onChange={e =>
									this.setState({
										sellq: e.target.value | 0,
									})
								}
								style={{
									position: 'absolute',
									left: '360px',
									top: '8px',
								}}
							/>
							<input
								type="button"
								value="Buy"
								onClick={() => {
									sock.userEmit('bzbid', {
										price: this.state.buy,
										cards:
											etgutil.encodeCount(this.state.buyq || 1) +
											this.state.bcode.toString(32),
									});
								}}
								style={{
									position: 'absolute',
									left: '100px',
									top: '40px',
								}}
							/>
							<input
								placeholder="Price"
								value={this.state.buy || ''}
								onChange={e => this.setState({ buy: e.target.value | 0 })}
								style={{
									position: 'absolute',
									left: '200px',
									top: '40px',
								}}
							/>
							<input
								placeholder="Quantity"
								value={this.state.buyq || ''}
								onChange={e => this.setState({ buyq: e.target.value | 0 })}
								style={{
									position: 'absolute',
									left: '360px',
									top: '40px',
								}}
							/>
							<div
								style={{
									position: 'absolute',
									right: '144px',
									top: '8px',
								}}
								onClick={() =>
									this.setState({
										sell: userutil.sellValue(Cards.Codes[this.state.bcode]),
									})
								}>
								Autosell: {userutil.sellValue(Cards.Codes[this.state.bcode])}
								<span className="ico g" />
							</div>
							<div
								style={{
									position: 'absolute',
									right: '144px',
									top: '40px',
								}}>
								Wealth value:{' '}
								{userutil.cardValue(Cards.Codes[this.state.bcode])}
								<span className="ico g" />
							</div>
							<CardOrders
								bc={this.state.bz[this.state.bcode]}
								onClickBuy={(sell, sellq) => this.setState({ sell, sellq })}
								onClickSell={(buy, buyq) => this.setState({ buy, buyq })}
								onClickCancel={() =>
									sock.userEmit('bzcancel', {
										c: this.state.bcode,
									})
								}
							/>
						</>
					)}
					<Components.Text
						text={this.props.user.gold + '$'}
						style={{
							position: 'absolute',
							left: '5px',
							top: '240px',
						}}
					/>
					<Components.Card x={768} y={8} code={this.state.bcode} />
					<Components.CardSelector
						cardpool={this.state.cardpool}
						maxedIndicator
						onClick={code => {
							const card = Cards.Codes[code];
							if (~card.rarity && card.type !== etg.Pillar && !card.isFree()) {
								this.setState({ bcode: code });
							}
						}}
					/>
					{this.state.showOrders && (
						<OrderBook
							bz={this.state.bz}
							onClick={code => {
								this.setState({ bcode: code });
							}}
						/>
					)}
				</>
			);
		}
	},
);

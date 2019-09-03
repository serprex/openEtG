import React from 'react';
import { connect } from 'react-redux';

import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import * as sock from '../sock.js';
import * as store from '../store.js';
import { chain } from '../util.js';
import Editor from '../Components/Editor.js';

const artable = {
	hp: { min: 65, max: 200, incr: 45, cost: 1 },
	mark: { cost: 45 },
	draw: { cost: 135 },
};
function attrval(x, d) {
	x = +x;
	return x === 0 ? 0 : x || d;
}
function AttrUi({ y, name, value, sumscore, arpts, onChange }) {
	const top = `${128 + y * 20}px`;
	const data = artable[name];
	const incr = data.incr || 1;
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left: '4px',
					top,
				}}>
				{name}
			</div>
			{value - incr >= (data.min || 0) && (
				<input
					type="button"
					value="-"
					onClick={() => onChange(value - incr)}
					style={{
						position: 'absolute',
						left: '38px',
						top,
						width: '14px',
					}}
				/>
			)}
			{(!data.max || value + incr <= data.max) &&
				sumscore + incr * artable[name].cost <= arpts && (
					<input
						type="button"
						value="+"
						onClick={() => onChange(value + incr)}
						style={{
							position: 'absolute',
							left: '82px',
							top,
							width: '14px',
						}}
					/>
				)}
			<div
				style={{
					position: 'absolute',
					left: '56px',
					top,
				}}>
				{value}
			</div>
		</>
	);
}

export default connect(({ user }) => ({ user }))(
	class ArenaEditor extends React.Component {
		constructor(props) {
			super(props);
			const baseacard = props.acard.asUpped(false).asShiny(false);
			const pool = [];
			for (const [code, count] of chain(
				etgutil.iterraw(props.user.pool),
				etgutil.iterraw(props.user.accountbound),
			)) {
				if (
					code in Cards.Codes &&
					(!props.acard ||
						(!Cards.Codes[code].isOf(baseacard) &&
							(props.acard.upped || !Cards.Codes[code].upped)))
				) {
					pool[code] = (pool[code] || 0) + count;
				}
			}
			pool[this.props.acard.code] = 5;
			let mark = 0,
				deck = etgutil.decodedeck(props.adeck);
			for (let i = deck.length - 1; i >= 0; i--) {
				if (!(deck[i] in Cards.Codes)) {
					const index = etgutil.fromTrueMark(deck[i]);
					if (~index) {
						mark = index;
					}
					deck.splice(i, 1);
				}
			}
			this.state = {
				hp: attrval(props.ainfo.hp, 200),
				mark: attrval(props.ainfo.mark, props.acard.upped ? 1 : 2),
				draw: attrval(props.ainfo.draw, props.acard.upped ? 2 : 1),
				pool,
				deck,
				dmark: mark,
			};
		}

		setDeck = deck => {
			deck.sort(Cards.codeCmp);
			const cardMinus = Cards.filterDeck(deck, this.state.pool);
			const acode = this.props.acard.code;
			cardMinus[acode] = 5;
			this.setState({ cardMinus, deck: deck.filter(x => x !== acode) });
		};

		render() {
			const arpts = this.props.acard.upped ? 515 : 425;
			let sumscore = 0;
			for (const k in artable) {
				sumscore += this.state[k] * artable[k].cost;
			}
			const acode = this.props.acard.code;
			return (
				<>
					<Editor
						deck={[acode, acode, acode, acode, acode].concat(this.state.deck)}
						mark={this.state.dmark}
						pool={this.state.pool}
						cardMinus={this.state.cardMinus}
						setDeck={this.setDeck}
						setMark={dmark => this.setState({ dmark })}
					/>
					<AttrUi
						y={0}
						name="hp"
						value={this.state.hp}
						sumscore={sumscore}
						arpts={arpts}
						onChange={val => this.setState({ hp: val })}
					/>
					<AttrUi
						y={1}
						name="mark"
						value={this.state.mark}
						sumscore={sumscore}
						arpts={arpts}
						onChange={val => this.setState({ mark: val })}
					/>
					<AttrUi
						y={2}
						name="draw"
						value={this.state.draw}
						sumscore={sumscore}
						arpts={arpts}
						onChange={val => this.setState({ draw: val })}
					/>
					<div
						style={{
							position: 'absolute',
							left: '4px',
							top: '188px',
						}}>
						{(arpts - sumscore) / 45}
					</div>
					<input
						type="button"
						value="Save & Exit"
						onClick={() => {
							if (this.state.deck.length < 30 || sumscore > arpts) {
								this.props.dispatch(
									store.chatMsg(
										'35 cards required before submission',
										'System',
									),
								);
								return;
							}
							const data = {
								d:
									etgutil.encodedeck(this.state.deck) +
									etgutil.toTrueMarkSuffix(this.state.dmark),
								lv: this.props.acard.upped,
								hp: this.state.hp,
								mark: this.state.mark,
								draw: this.state.draw,
							};
							if (!this.props.acreate) {
								data.mod = true;
							}
							sock.userEmit('setarena', data);
							if (this.props.ainfo.day > 0) {
								this.props.dispatch(
									store.updateUser({
										gold:
											this.props.user.gold +
											Math.min(this.props.ainfo.day * 25, 350),
									}),
								);
							}
							this.props.dispatch(
								store.chatMsg('Arena deck submitted', 'System'),
							);
							this.props.dispatch(store.doNav(import('../views/MainMenu.js')));
						}}
						style={{
							position: 'absolute',
							left: '8px',
							top: '58px',
						}}
					/>
					<input
						type="button"
						value="Exit"
						onClick={() => {
							this.props.dispatch(store.doNav(import('../views/ArenaInfo.js')));
						}}
						style={{
							position: 'absolute',
							left: '8px',
							top: '84px',
						}}
					/>
				</>
			);
		}
	},
);

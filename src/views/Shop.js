import { connect } from 'react-redux';
import { Component } from 'react';

import * as sock from '../sock.js';
import Cards from '../Cards.js';
import * as Tutor from '../Components/Tutor.js';
import * as etgutil from '../etgutil.js';
import { parseInput } from '../util.js';
import * as Components from '../Components/index.js';
import * as store from '../store.js';

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

class PackDisplay extends Component {
	constructor(props) {
		super(props);
		this.state = { hovercard: null };
	}

	render() {
		const { cards } = this.props;
		const dlen = etgutil.decklength(cards);
		let cardchildren;
		if (dlen < 51) {
			cardchildren = (
				<Components.DeckDisplay
					cards={Cards}
					x={64}
					deck={etgutil.decodedeck(cards)}
					onMouseOver={(i, card) => this.setState({ hovercard: card })}
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
						onMouseOver={(i, card) => this.setState({ hovercard: card })}
					/>
					<Components.DeckDisplay
						cards={Cards}
						x={-97}
						y={244}
						deck={deck.slice(50)}
						onMouseOver={(i, card) => this.setState({ hovercard: card })}
					/>
				</>
			);
		}
		return (
			<Components.Box x={40} y={16} width={710} height={568}>
				<Components.Card card={this.state.hovercard} x={2} y={2} />
				{cardchildren}
			</Components.Box>
		);
	}
}

export default connect(({ user, opts }) => ({
	user,
	bulk: typeof opts.bulk === 'string' ? opts.bulk : '1',
}))(
	class Shop extends Component {
		constructor(props) {
			super(props);
			this.state = {
				info1: 'Select from which element you want',
				info2: 'Select which type of pack you want',
				packele: -1,
				packrarity: -1,
				showbuy: true,
				cards: '',
			};
		}

		componentDidMount() {
			this.props.dispatch(
				store.setCmds({
					boostergive: data => {
						const userdelta = {};
						if (data.accountbound) {
							userdelta.accountbound = etgutil.mergedecks(
								this.props.user.accountbound,
								data.cards,
							);
							const freepacks =
								this.props.user.freepacks && this.props.user.freepacks.slice();
							if (freepacks) {
								freepacks[data.packtype]--;
								userdelta.freepacks = freepacks;
							}
						} else {
							const bdata = {};
							parseInput(bdata, 'bulk', this.props.bulk, 99);
							userdelta.pool = etgutil.mergedecks(
								this.props.user.pool,
								data.cards,
							);
							userdelta.gold =
								this.props.user.gold -
								packdata[data.packtype].cost * (bdata.bulk || 1);
						}
						this.props.dispatch(store.updateUser(userdelta));
						const dlen = etgutil.decklength(data.cards);
						if (dlen < 121) {
							this.setState({
								cards: data.cards,
								showbuy: false,
							});
						} else {
							this.setState({ showbuy: true });
						}
						this.props.dispatch(
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
		}

		buyPack = () => {
			const pack = packdata[this.state.packrarity];
			const boostdata = {
				pack: this.state.packrarity,
				element: this.state.packele,
			};
			parseInput(boostdata, 'bulk', this.props.bulk, 99);
			boostdata.bulk ||= 1;
			if (
				this.props.user.gold >= pack.cost * (boostdata.bulk || 1) ||
				(this.props.user.freepacks &&
					this.props.user.freepacks[this.state.packrarity] > 0)
			) {
				sock.userEmit('booster', boostdata);
				this.setState({ showbuy: false });
			} else {
				this.setState({ info2: "You can't afford that!" });
			}
		};

		render() {
			const hasFreePacks = !!(
				this.props.user.freepacks &&
				this.props.user.freepacks[this.state.packrarity]
			);
			const elebuttons = [];
			for (let i = 0; i < 14; i++) {
				elebuttons.push(
					<Components.IconBtn
						key={i}
						e={'e' + i}
						x={75 + (i >> 1) * 64}
						y={117 + (i & 1) * 75}
						click={() => {
							const update = {
								packele: i,
								info1: `Selected Element: ${i === 13 ? 'Random' : '1:' + i}`,
							};
							this.setState(update);
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
						text={this.props.user.gold + '$'}
						style={{
							position: 'absolute',
							left: '775px',
							top: '101px',
						}}
					/>
					<Components.Text
						text={this.state.info1}
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
						{this.state.info2}
					</span>
					<Components.ExitBtn x={775} y={246} />
					{hasFreePacks && (
						<span
							style={{
								position: 'absolute',
								left: '350px',
								top: '26px',
							}}>
							{!!this.props.user.freepacks[this.state.packrarity] &&
								`Free ${packdata[this.state.packrarity].type} packs left: ${
									this.props.user.freepacks[this.state.packrarity]
								}`}
						</span>
					)}
					{this.state.cards && (
						<input
							type="button"
							value="Take Cards"
							onClick={() => {
								this.setState({
									showbuy: true,
									hideget: true,
									cards: '',
								});
							}}
							style={{
								position: 'absolute',
								left: '775px',
								top: '156px',
							}}
						/>
					)}
					{this.state.showbuy &&
						!!~this.state.packele &&
						!!~this.state.packrarity && (
							<>
								{!hasFreePacks && (
									<input
										type="button"
										value="Max Buy"
										onClick={() => {
											const pack = packdata[this.state.packrarity];
											this.props.dispatch(
												store.setOptTemp(
													'bulk',
													Math.min(
														Math.floor(this.props.user.gold / pack.cost),
														99,
													).toString(),
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
									onClick={this.buyPack}
									style={{
										position: 'absolute',
										left: '775px',
										top: '156px',
									}}
								/>
							</>
						)}
					{packdata.map((pack, n) => (
						<>
							<img
								src={`/assets/pack${n}.webp`}
								key={pack.type}
								className="imgb"
								onClick={() => {
									this.setState({
										packrarity: n,
										info2: `${pack.type} Pack: ${pack.info}`,
									});
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
						</>
					))}
					{elebuttons}
					{this.state.cards && <PackDisplay cards={this.state.cards} />}
					{!hasFreePacks && !!~this.state.packele && !!~this.state.packrarity && (
						<input
							type="number"
							placeholder="Bulk"
							value={this.props.bulk}
							onChange={e =>
								this.props.dispatch(store.setOptTemp('bulk', e.target.value))
							}
							onKeyPress={e => {
								if (e.which === 13) this.buyPack();
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
	},
);

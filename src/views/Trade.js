import { Component } from 'react';
import { connect } from 'react-redux';

import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import * as userutil from '../userutil.js';
import * as Components from '../Components/index.js';
import * as sock from '../sock.js';
import * as store from '../store.js';

export default connect(({ user }) => ({ user }))(
	class Trade extends Component {
		constructor(props) {
			super(props);
			this.state = {
				canconfirm: false,
				confirm: 0,
				card: null,
				deck: [],
				gold: 0,
				offer: [],
				gopher: 0,
				cardminus: [],
			};
		}

		componentDidMount() {
			sock.userEmit('reloadtrade', { f: this.props.foe });
			this.props.dispatch(
				store.setCmds({
					offertrade: data => {
						this.setState({
							offer: etgutil.decodedeck(data.c),
							gopher: data.g | 0,
							canconfirm: true,
						});
					},
					tradedone: data => {
						this.props.dispatch(
							store.updateUser({
								pool: etgutil.mergedecks(
									etgutil.removedecks(this.props.user.pool, data.oldcards),
									data.newcards,
								),
								gold: this.props.user.gold + data.g,
							}),
						);
						this.props.dispatch(store.doNav(import('./MainMenu.js')));
					},
					tradecanceled: data => {
						if (data.u === this.props.foe) {
							this.props.dispatch(store.doNav(import('./MainMenu.js')));
						}
					},
				}),
			);
		}

		componentWillUnmount() {
			this.props.dispatch(store.setCmds({}));
		}

		render() {
			const cardminus = [];
			for (const code of this.state.deck) {
				cardminus[code] = (cardminus[code] ?? 0) + 1;
			}
			const cardpool = etgutil.deck2pool(this.props.user.pool);
			return (
				<>
					{(!this.state.confirm ||
						(this.state.confirm === 1 && this.state.canconfirm)) && (
						<input
							type="button"
							value={this.state.confirm ? 'Confirm' : 'Trade'}
							onClick={
								this.state.confirm
									? () => {
											sock.userEmit('offertrade', {
												f: this.props.foe,
												cards: etgutil.encodedeck(this.state.deck),
												g: this.state.gold,
												forcards: etgutil.encodedeck(this.state.offer),
												forg: this.state.gopher,
											});
											this.setState({ confirm: 2 });
									  }
									: () => {
											sock.userEmit('offertrade', {
												f: this.props.foe,
												cards: etgutil.encodedeck(this.state.deck),
												g: this.state.gold,
												forcards: null,
												forg: null,
											});
											this.setState({ confirm: 1 });
									  }
							}
							style={{
								position: 'absolute',
								left: '10px',
								top: this.state.confirm ? '60px' : '40px',
							}}
						/>
					)}
					<Components.DeckDisplay
						cards={Cards}
						deck={this.state.deck}
						onMouseOver={(i, card) => this.setState({ card })}
						onClick={i => {
							const newdeck = this.state.deck.slice();
							newdeck.splice(i, 1);
							this.setState({ deck: newdeck });
						}}
					/>
					<Components.DeckDisplay
						cards={Cards}
						deck={this.state.offer}
						x={450}
						onMouseOver={(i, card) => this.setState({ card })}
					/>
					<Components.Text
						text={`${
							this.state.gold +
							userutil.calcWealth(Cards, this.state.deck, true)
						}$`}
						style={{
							position: 'absolute',
							left: '100px',
							top: '235px',
						}}
					/>
					<Components.Text
						text={`(${this.state.gold}$)`}
						style={{
							position: 'absolute',
							left: '250px',
							top: '235px',
						}}
					/>
					<Components.Text
						text={`${
							this.state.gopher +
							userutil.calcWealth(Cards, this.state.offer, true)
						}$`}
						style={{
							position: 'absolute',
							left: '350px',
							top: '235px',
						}}
					/>
					<Components.Text
						text={`(${this.state.gopher}$)`}
						style={{
							position: 'absolute',
							left: '500px',
							top: '235px',
						}}
					/>
					<input
						type="button"
						value="Cancel"
						onClick={() => {
							sock.userEmit('canceltrade', { f: this.props.foe });
							this.props.dispatch(store.doNav(import('./MainMenu.js')));
						}}
						style={{
							position: 'absolute',
							left: '10px',
							top: '10px',
						}}
					/>
					<input
						type="number"
						placeholder="Gold"
						value={this.state.gold}
						onChange={e =>
							this.setState({
								gold: Math.min(
									this.props.user.gold,
									Math.abs(e.target.value | 0),
								),
							})
						}
						style={{
							position: 'absolute',
							left: '8px',
							top: '235px',
							width: '84px',
						}}
					/>
					{!this.state.confirm && (
						<Components.CardSelector
							cards={Cards}
							cardpool={cardpool}
							cardminus={cardminus}
							onMouseOver={card => this.setState({ card })}
							onClick={card => {
								const code = card.code;
								if (
									this.state.deck.length < 30 &&
									!card.isFree() &&
									code in cardpool &&
									!(code in cardminus && cardminus[code] >= cardpool[code])
								) {
									this.setState({
										deck: this.state.deck.concat([code]),
									});
								}
							}}
						/>
					)}
					<Components.Card x={734} y={8} card={this.state.card} />
				</>
			);
		}
	},
);

import { Component } from 'react';
import { connect } from 'react-redux';

import * as etgutil from '../../etgutil.js';
import Cards from '../Cards.js';
import { userEmit } from '../../sock.jsx';
import * as store from '../../store.jsx';
import * as Components from '../../Components/index.jsx';

export default connect(({ user, orig }) => ({ user, orig }))(
	class OriginalBazaar extends Component {
		state = { deck: [] };

		render() {
			let cost = 0;
			for (const code of this.state.deck) {
				const card = Cards.Codes[code];
				cost += 6 * card.rarity ** 2 + card.cost;
			}

			return (
				<>
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
					<Components.Text
						text={`${this.props.orig.electrum}$`}
						style={{
							position: 'absolute',
							left: '8px',
							top: '235px',
						}}
					/>
					<Components.Text
						text={`${cost}$`}
						style={{
							position: 'absolute',
							left: '100px',
							top: '235px',
						}}
					/>
					{this.state.deck.length > 0 &&
						(this.props.orig.electrum >= cost ? (
							<input
								type="button"
								value="Buy"
								style={{
									position: 'absolute',
									left: '200px',
									top: '235px',
								}}
								onClick={() => {
									const update = {
										electrum: -cost,
										pool: etgutil.encodedeck(this.state.deck),
									};
									userEmit('origadd', update);
									this.props.dispatch(store.addOrig(update));

									this.props.dispatch(store.doNav(import('./MainMenu.jsx')));
								}}
							/>
						) : (
							<div
								style={{
									position: 'absolute',
									left: '200px',
									top: '235px',
								}}>
								{`You need
								${cost - this.props.orig.electrum} more electrum to afford ${
									this.state.deck.length === 1 ? 'this card' : 'these cards'
								}`}
							</div>
						))}
					<input
						type="button"
						value="Exit"
						onClick={() => {
							this.props.dispatch(store.doNav(import('./MainMenu.jsx')));
						}}
						style={{
							position: 'absolute',
							left: '10px',
							top: '10px',
						}}
					/>
					<Components.CardSelector
						cards={Cards}
						filter={card =>
							card.rarity >= 1 && card.rarity <= 4 && card.name !== 'Relic'
						}
						onMouseOver={card => this.setState({ card })}
						onClick={card => {
							const code = card.code;
							if (
								this.state.deck.length < 60 &&
								!card.upped &&
								!card.isFree()
							) {
								this.setState({
									deck: this.state.deck.concat([code]),
								});
							}
						}}
					/>
					<Components.Card x={734} y={8} card={this.state.card} />
				</>
			);
		}
	},
);

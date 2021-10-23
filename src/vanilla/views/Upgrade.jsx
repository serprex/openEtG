import { Component } from 'react';
import { connect } from 'react-redux';

import * as etgutil from '../../etgutil.js';
import Cards from '../Cards.js';
import { userEmit } from '../../sock.jsx';
import * as store from '../../store.jsx';
import * as Components from '../../Components/index.jsx';

export default connect(({ user, orig }) => ({ user, orig }))(
	class OriginalUpgrade extends Component {
		state = { deck: [] };

		render() {
			const cardminus = [];
			for (const code of this.state.deck) {
				cardminus[code] = (cardminus[code] ?? 0) + 1;
			}
			const cardpool = etgutil.deck2pool(this.props.orig.pool);
			for (const key in cardpool) {
				const card = Cards.Codes[key];
				if (card.upped) delete cardpool[key];
			}
			const cost = this.state.deck.length * 1500;

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
								value="Upgrade"
								style={{
									position: 'absolute',
									left: '200px',
									top: '235px',
								}}
								onClick={() => {
									const update = {
										electrum: -cost,
										pool: etgutil.encodedeck(
											this.state.deck.map(code => code + 2000),
										),
										rmpool: etgutil.encodedeck(
											this.state.deck.filter(
												code => !Cards.Codes[code].isFree(),
											),
										),
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
									this.state.deck.length === 1
										? 'this upgrade'
										: 'these upgrades'
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
						cardpool={cardpool}
						cardminus={cardminus}
						filter={card =>
							card.isFree() ||
							(card.code in cardpool &&
								(cardminus[card.code] ?? 0) < cardpool[card.code])
						}
						onMouseOver={card => this.setState({ card })}
						onClick={card => {
							const code = card.code;
							if (this.state.deck.length < 60) {
								this.setState({ deck: this.state.deck.concat([code]) });
							}
						}}
					/>
					<Components.Card x={734} y={8} card={this.state.card} />
				</>
			);
		}
	},
);

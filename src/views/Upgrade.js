import { Component } from 'react';
import { connect } from 'react-redux';

import * as sock from '../sock.js';
import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import * as Components from '../Components/index.js';

export default connect(({ user }) => ({ user }))(
	class Upgrade extends Component {
		constructor(props) {
			super(props);
			this.state = { showbound: false };
		}

		static getDerivedStateFromProps(nextProps, prevState) {
			return {
				cardpool: etgutil.deck2pool(nextProps.user.pool),
				boundpool: etgutil.deck2pool(nextProps.user.accountbound),
			};
		}

		render() {
			const self = this;
			function upgradeCard(card) {
				if (!card.isFree()) {
					if (card.upped) return 'You cannot upgrade upgraded cards.';
					const use =
						~card.rarity && !(card.rarity === 4 && card.shiny) ? 6 : 1;
					if (
						self.state.cardpool[card.code] >= use ||
						self.state.boundpool[card.code] >= use
					) {
						sock.userExec('upgrade', { card: card.code });
					} else
						return `You need at least ${use} copies to be able to upgrade this card!`;
				} else if (self.props.user.gold >= 50) {
					sock.userExec('uppillar', { c: card.code });
				} else return 'You need 50$ to afford an upgraded pillar!';
			}
			function downgradeCard(card) {
				if (card.rarity || (card.shiny && card.upped)) {
					if (!card.upped) return 'You cannot downgrade downgraded cards.';
					sock.userExec('downgrade', { card: card.code });
				} else return 'You cannot downgrade pillars.';
			}
			function polishCard(card) {
				if (!card.isFree()) {
					if (card.shiny) return 'You cannot polish shiny cards.';
					if (card.rarity === 4) return 'You cannot polish Nymphs.';
					const use = card.rarity !== -1 ? 6 : 2;
					if (
						self.state.cardpool[card.code] >= use ||
						self.state.boundpool[card.code] >= use
					) {
						sock.userExec('polish', { card: card.code });
					} else
						return `You need at least ${use} copies to be able to polish this card!`;
				} else if (self.props.user.gold >= 50) {
					sock.userExec('shpillar', { c: card.code });
				} else return 'You need 50$ to afford a shiny pillar!';
			}
			function unpolishCard(card) {
				if (card.rarity || (card.shiny && card.upped)) {
					if (!card.shiny) return 'You cannot unpolish non-shiny cards.';
					if (!card.rarity === 4) return 'You cannot unpolish Nymphs.';
					sock.userExec('unpolish', { card: card.code });
				} else return 'You cannot unpolish pillars.';
			}
			function eventWrap(func) {
				return () => {
					const error = self.state.card1
						? func(self.state.card1)
						: 'Pick a card, any card.';
					if (error) self.setState({ error });
				};
			}
			function autoCards() {
				sock.userExec('upshall');
			}
			return (
				<>
					<Components.ExitBtn x={5} y={50} />
					{self.state.canGrade && (
						<input
							type="button"
							value={self.state.downgrade ? 'Downgrade' : 'Upgrade'}
							onClick={eventWrap(
								self.state.downgrade ? downgradeCard : upgradeCard,
							)}
							style={{
								position: 'absolute',
								left: '150px',
								top: '50px',
							}}
						/>
					)}
					{self.state.canLish && (
						<input
							type="button"
							value={self.state.downlish ? 'Unpolish' : 'Polish'}
							onClick={eventWrap(
								self.state.downlish ? unpolishCard : polishCard,
							)}
							style={{
								position: 'absolute',
								left: '150px',
								top: '95px',
							}}
						/>
					)}
					<input
						type="button"
						value="Autoconvert"
						onClick={autoCards}
						style={{
							position: 'absolute',
							left: '5px',
							top: '138px',
						}}
					/>
					<Components.Text
						text={this.props.user.gold + '$'}
						style={{
							position: 'absolute',
							left: '5px',
							top: '240px',
						}}
					/>
					<Components.Text
						text={this.state.info1}
						style={{
							position: 'absolute',
							left: '250px',
							top: '50px',
						}}
					/>
					<Components.Text
						text={this.state.info3}
						style={{
							position: 'absolute',
							left: '250px',
							top: '95px',
						}}
					/>
					<Components.Text
						text={this.state.error}
						style={{
							position: 'absolute',
							left: '100px',
							top: '170px',
						}}
					/>
					<Components.Card x={534} y={8} card={this.state.card1} />
					<Components.Card x={734} y={8} card={this.state.card2} />
					<input
						type="button"
						value="Toggle Bound"
						style={{
							position: 'absolute',
							left: '5px',
							top: '554px',
						}}
						onClick={() => {
							this.setState({ showbound: !this.state.showbound });
						}}
					/>
					<Components.CardSelector
						cards={Cards}
						cardpool={
							this.state.showbound ? this.state.boundpool : this.state.cardpool
						}
						maxedIndicator
						onClick={card => {
							const newstate = {
								card1: card,
								card2: card.asUpped(true),
								error: '',
								canGrade: true,
								canLish: true,
							};
							if (card.upped) {
								newstate.info1 = card.isFree()
									? ''
									: card.rarity !== -1
									? 'Convert into 6 downgraded copies.'
									: 'Convert into a downgraded version.';
								newstate.downgrade = true;
							} else {
								newstate.info1 = card.isFree()
									? '50$ to upgrade'
									: card.rarity !== -1
									? 'Convert 6 into an upgraded version.'
									: 'Convert into an upgraded version.';
								newstate.downgrade = false;
							}
							if (card.rarity === 4) {
								newstate.info3 =
									'This card cannot be ' +
									(card.shiny ? 'un' : '') +
									'polished.';
								newstate.canLish = false;
							} else if (card.shiny) {
								newstate.info3 = card.isFree()
									? ''
									: card.rarity !== -1
									? 'Convert into 6 non-shiny copies.'
									: 'Convert into 2 non-shiny copies.';
								newstate.downlish = true;
							} else {
								newstate.info3 = card.isFree()
									? '50$ to polish'
									: card.rarity === 4
									? 'This card cannot be polished.'
									: card.rarity !== -1
									? 'Convert 6 into a shiny version.'
									: 'Convert 2 into a shiny version.';
								newstate.downlish = false;
							}
							this.setState(newstate);
						}}
					/>
				</>
			);
		}
	},
);

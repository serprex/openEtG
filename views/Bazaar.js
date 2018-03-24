'use strict';
const chat = require('../chat'),
	sock = require('../sock'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	userutil = require('../userutil'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	h = React.createElement;

module.exports = class Bazaar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			code: null,
			deck: [],
		};
	}

	render() {
		const cost = Math.ceil(userutil.calcWealth(this.state.deck, true) * 3);
		return <>
			<Components.ExitBtn x={8} y={100} />
			{this.state.deck.length > 0 && sock.user.gold >= cost && (
				<input
					type='button'
					value='Buy'
					style={{
						position: 'absolute',
						left: '8px',
						top: '160px',
					}}
					onClick={() => {
						sock.userExec('bazaar', {
							cards: etgutil.encoderaw(this.state.deck),
						});
						store.store.dispatch(store.doNav(require('./MainMenu')));
					}}
				/>
			)}
			<Components.Text
				text={cost + '$'}
				style={{
					position: 'absolute',
					left: '100px',
					top: '235px',
					color: cost > sock.user.gold ? '#f44' : '#fff',
				}}
			/>
			<Components.Text
				text={sock.user.gold + '$'}
				style={{
					position: 'absolute',
					left: '8px',
					top: '240px',
				}}
			/>
			<Components.DeckDisplay
				deck={this.state.deck}
				onMouseOver={(i, code) => this.setState({ code })}
				onClick={(i) => {
					const newdeck = this.state.deck.slice();
					newdeck.splice(i, 1);
					this.setState({ deck: newdeck });
				}}
			/>
			<Components.CardSelector
				onMouseOver={(code) => this.setState({ code: code })}
				onClick={(code) => {
					const card = Cards.Codes[code];
					if (
						this.state.deck.length < 60 &&
						card.rarity > 0 &&
						card.rarity < 4 &&
						!card.isFree()
					) {
						this.setState({ deck: this.state.deck.concat([code]) });
					}
				}}
			/>
			{this.state.code && <Components.Card x={734} y={8} code={this.state.code} />}
		</>;
	}
};

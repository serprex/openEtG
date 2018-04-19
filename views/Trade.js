'use strict';
const chat = require('../chat'),
	sock = require('../sock'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	userutil = require('../userutil'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react');

module.exports = class Trade extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			confirm: 0,
			code: 0,
			deck: [],
			offer: [],
			cardminus: [],
		};
	}

	componentDidMount() {
		store.store.dispatch(store.setCmds({
			cardchosen: data => {
				this.setState({ offer: etgutil.decodedeck(data.c) });
			},
			tradedone: data => {
				sock.user.pool = etgutil.mergedecks(sock.user.pool, data.newcards);
				sock.user.pool = etgutil.removedecks(sock.user.pool, data.oldcards);
				store.store.dispatch(store.doNav(require('./MainMenu')));
			},
			tradecanceled: () => {
				store.store.dispatch(store.doNav(require('./MainMenu')));
			},
		}));
	}

	componentWillUnmount() {
		store.store.dispatch(store.setCmds({}));
	}

	render() {
		const cardminus = [];
		for (let i = 0; i < this.state.deck.length; i++) {
			cardminus[this.state.deck[i]]++;
		}
		const cardpool = etgutil.deck2pool(sock.user.pool);
		return <>
			{this.state.confirm < 2 ?
				<input
					type='button'
					value={this.state.confirm ? 'Confirm' : 'Trade'}
					onClick={this.state.confirm
						? () => {
								if (this.state.offer.length) {
									sock.userEmit('confirmtrade', {
										cards: etgutil.encoderaw(this.state.deck),
										oppcards: etgutil.encoderaw(this.state.offer),
									});
									this.setState({ confirm: 2 });
								} else chat('Wait for your friend to choose!', 'System');
							}
						: () => {
								if (this.state.deck.length) {
									sock.emit('cardchosen', {
										c: etgutil.encoderaw(this.state.deck),
									});
									this.setState({ confirm: 1 });
								} else chat('You have to choose at least a card!', 'System');
							}}
					style={{
						position: 'absolute',
						left: '10px',
						top: this.state.confirm ? '60px' : '40px',
					}}
				/>
				:
				<span style={{
					position: 'absolute',
					left: '10px',
					top: '60px',
				}}>Confirmed!</span>
			}
			<Components.DeckDisplay
				deck={this.state.deck}
				onMouseOver={(i, code) => this.setState({ code })}
				onClick={i => {
					const newdeck = this.state.deck.slice();
					newdeck.splice(i, 1);
					this.setState({ deck: newdeck });
				}}
			/>
			<Components.DeckDisplay
				deck={this.state.offer}
				x={450}
				onMouseOver={(i, code) => this.setState({ code })}
			/>
			<Components.Text
				text={userutil.calcWealth(this.state.deck, true) + '$'}
				style={{
					position: 'absolute',
					left: '100px',
					top: '235px',
				}}
			/>
			<Components.Text
				text={userutil.calcWealth(this.state.offer, true) + '$'}
				style={{
					position: 'absolute',
					left: '350px',
					top: '235px',
				}}
			/>
			<input type='button'
				value='Cancel'
				onClick={() => {
					sock.userEmit('canceltrade');
					store.store.dispatch(store.doNav(require('./MainMenu')));
				}}
				style={{
					position: 'absolute',
					left: '10px',
					top: '10px',
				}}
			/>
			<Components.CardSelector
				cardpool={cardpool}
				cardminus={cardminus}
				onMouseOver={code => this.setState({ code: code })}
				onClick={code => {
					const card = Cards.Codes[code];
					if (
						this.state.deck.length < 30 &&
						!card.isFree() &&
						code in cardpool &&
						!(code in cardminus && cardminus[code] >= cardpool[code])
					) {
						this.setState({ deck: this.state.deck.concat([code]) });
					}
				}}
			/>
			{!!this.state.code && <Components.Card x={734} y={8} code={this.state.code} />}
		</>;
	}
};

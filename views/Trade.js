'use strict';
const Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	userutil = require('../userutil'),
	Components = require('../Components'),
	sock = require('../sock'),
	store = require('../store'),
	React = require('react');

module.exports = class Trade extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			canconfirm: false,
			confirm: 0,
			code: 0,
			deck: [],
			gold: 0,
			offer: [],
			gopher: 0,
			cardminus: [],
		};
	}

	componentDidMount() {
		store.store.dispatch(store.setCmds({
			cardchosen: data => {
				this.setState({
					offer: etgutil.decodedeck(data.c),
					gopher: data.g|0,
					canconfirm: true,
				});
			},
			tradedone: data => {
				sock.user.pool = etgutil.mergedecks(sock.user.pool, data.newcards);
				sock.user.pool = etgutil.removedecks(sock.user.pool, data.oldcards);
				sock.user.gold += data.g;
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
		for (const code of this.state.deck) {
			cardminus[code] = (cardminus[code] || 0) + 1;
		}
		const cardpool = etgutil.deck2pool(sock.user.pool);
		return <>
			{!this.state.confirm || (this.state.confirm == 1 && this.state.canconfirm) ?
				<input type='button'
					value={this.state.confirm ? 'Confirm' : 'Trade'}
					onClick={this.state.confirm
						? () => {
								if (this.state.offer.length) {
									sock.userEmit('confirmtrade', {
										cards: etgutil.encoderaw(this.state.deck),
										g: this.state.gold,
										oppcards: etgutil.encoderaw(this.state.offer),
										gopher: this.state.gopher,
									});
									this.setState({ confirm: 2 });
								} else store.store.dispatch(store.chatMsg('Wait for your friend to choose!', 'System'));
							}
						: () => {
								if (this.state.deck.length) {
									sock.emit('cardchosen', {
										c: etgutil.encoderaw(this.state.deck),
										g: this.state.gold,
									});
									this.setState({ confirm: 1 });
								} else store.store.dispatch(store.chatMsg('You have to choose at least a card!', 'System'));
							}}
					style={{
						position: 'absolute',
						left: '10px',
						top: this.state.confirm ? '60px' : '40px',
					}}
				/>
				:
				(this.state.confirm == 2 && <span style={{
					position: 'absolute',
					left: '10px',
					top: '60px',
				}}>Confirmed!</span>)
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
				text={`${this.state.gold + userutil.calcWealth(this.state.deck, true)}$`}
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
				text={`${this.state.gopher + userutil.calcWealth(this.state.offer, true)}$`}
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
			<input type='number'
				placeholder='Gold'
				value={this.state.gold}
				onChange={e => this.setState({
					gold: Math.min(sock.user.gold, Math.abs(e.target.value|0)),
				})}
				style={{
					position: 'absolute',
					left: '8px',
					top: '235px',
					width: '84px',
				}}
			/>
			{!this.state.confirm && <Components.CardSelector
				cardpool={cardpool}
				cardminus={cardminus}
				onMouseOver={code => this.setState({ code })}
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
			/>}
			<Components.Card x={734} y={8} code={this.state.code} />
		</>;
	}
};

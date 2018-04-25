'use strict';
const etg = require('../etg'),
	Cards = require('../Cards'),
	Tutor = require('../Tutor'),
	etgutil = require('../etgutil'),
	Components = require('../Components'),
	sock = require('../sock'),
	store = require('../store'),
	{ connect } = require('react-redux'),
	React = require('react');

module.exports = connect()(class Editor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		const self = this,
			sortedDeck = self.props.deck.slice().sort(Cards.codeCmp),
			cardminus = [];
		if (this.props.pool) {
			for (let i = sortedDeck.length - 1; i >= 0; i--) {
				let code = sortedDeck[i],
					card = Cards.Codes[code];
				if (card.type != etg.Pillar) {
					if (sumCardMinus(code) == 6) {
						sortedDeck.splice(i, 1);
						continue;
					}
				}
				if (!card.isFree()) {
					if ((cardminus[code] || 0) < (self.props.pool[code] || 0)) {
						cardminus[code] = (cardminus[code] || 0) + 1;
					} else {
						code = etgutil.asShiny(code, !card.shiny);
						card = Cards.Codes[code];
						if (card.isFree()) {
							sortedDeck[i] = code;
						} else if ((cardminus[code] || 0) < (self.props.pool[code] || 0)) {
							sortedDeck[i] = code;
							cardminus[code] = (cardminus[code] || 0) + 1;
						} else {
							sortedDeck.splice(i, 1);
						}
					}
				}
			}
		}
		if (this.props.acard) {
			const acode = this.props.acard.code;
			sortedDeck.unshift(acode, acode, acode, acode, acode);
		}
		function sumCardMinus(code) {
			let sum = 0;
			for (let i = 0; i < 4; i++) {
				sum +=
					cardminus[etgutil.asShiny(etgutil.asUpped(code, i & 1), i & 2)] || 0;
			}
			return sum;
		}
		function setCardArt(code) {
			if (!self.state.card || self.state.card.code != code)
				self.setState({ card: Cards.Codes[code] });
		}
		const editorui = [
			<input type='button'
				value='Clear'
				onClick={() => self.props.setDeck([])}
				style={{
					position: 'absolute',
					left: '8px',
					top: '32px',
				}}
			/>
		];
		editorui.push(
			<span className={'ico e' + self.props.mark}
				style={{
					position: 'absolute',
					left: '66px',
					top: '200px',
				}}
			/>,
		);
		for (let i = 0; i < 13; i++) {
			editorui.push(
				<Components.IconBtn
					e={'e' + i}
					x={100 + i * 32}
					y={234}
					click={() => self.props.setMark(i)}
				/>,
			);
		}
		const decksprite = <Components.DeckDisplay
			onMouseOver={(_, code) => setCardArt(code)}
			onClick={(i, code) => {
				if (!self.props.acard || code != self.props.acard.code) {
					const newdeck = sortedDeck.slice();
					newdeck.splice(i, 1);
					self.props.setDeck(newdeck);
				}
			}}
			deck={sortedDeck}
		/>;
		const cardsel = <Components.CardSelector
			onMouseOver={setCardArt}
			onClick={code => {
				if (sortedDeck.length < 60) {
					const card = Cards.Codes[code];
					if (self.props.pool && !card.isFree()) {
						if (
							!(code in self.props.pool) ||
							(code in cardminus && cardminus[code] >= self.props.pool[code]) ||
							(card.type != etg.Pillar && sumCardMinus(code) >= 6)
						) {
							return;
						}
					}
					self.props.setDeck(self.props.deck.concat([code]));
				}
			}}
			maxedIndicator={!self.props.acard}
			filterboth={!!self.props.pool}
			cardpool={self.props.pool}
			cardminus={cardminus}
		/>;
		const cardArt = <Components.Card x={734} y={8} card={this.state.card} />;
		editorui.push(decksprite, cardsel, cardArt);
		return editorui;
	}
});

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

function sumCardMinus(cardMinus, code) {
	let sum = 0;
	for (let i = 0; i < 4; i++) {
		sum +=
			cardMinus[etgutil.asShiny(etgutil.asUpped(code, i & 1), i & 2)] || 0;
	}
	return sum;
}

module.exports = connect()(class Editor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			card: 0,
		};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		const sortedDeck = nextProps.deck.slice().sort(Cards.codeCmp),
			cardMinus = [];
		if (nextProps.pool) {
			for (let i = sortedDeck.length - 1; i >= 0; i--) {
				let code = sortedDeck[i],
					card = Cards.Codes[code];
				if (card.type != etg.Pillar) {
					if (sumCardMinus(cardMinus, code) == 6) {
						sortedDeck.splice(i, 1);
						continue;
					}
				}
				if (!card.isFree()) {
					if ((cardMinus[code] || 0) < (nextProps.pool[code] || 0)) {
						cardMinus[code] = (cardMinus[code] || 0) + 1;
					} else {
						code = etgutil.asShiny(code, !card.shiny);
						card = Cards.Codes[code];
						if (card.isFree()) {
							sortedDeck[i] = code;
						} else if ((cardMinus[code] || 0) < (nextProps.pool[code] || 0)) {
							sortedDeck[i] = code;
							cardMinus[code] = (cardMinus[code] || 0) + 1;
						} else {
							sortedDeck.splice(i, 1);
						}
					}
				}
			}
		}
		if (nextProps.acard) {
			const acode = nextProps.acard.code;
			sortedDeck.unshift(acode, acode, acode, acode, acode);
		}
		return {
			sortedDeck,
			cardMinus,
		};
	}

	setCardArt = code => {
		if (this.state.card != code)
			this.setState({ card: code });
	}

	render() {
		const { sortedDeck, cardMinus } = this.state;
		const marksel = [];
		for (let i = 0; i < 13; i++) {
			marksel.push(
				<Components.IconBtn key={i}
					e={'e' + i}
					x={100 + i * 32}
					y={234}
					click={() => this.props.setMark(i)}
				/>,
			);
		}
		return <>
			<Components.DeckDisplay
				onMouseOver={(_, code) => this.setCardArt(code)}
				onClick={(i, code) => {
					if (!this.props.acard || code != this.props.acard.code) {
						const newdeck = sortedDeck.slice();
						newdeck.splice(i, 1);
						this.props.setDeck(newdeck);
					}
				}}
				deck={sortedDeck}
			/>
			<Components.CardSelector
				onMouseOver={this.setCardArt}
				onClick={code => {
					if (sortedDeck.length < 60) {
						const card = Cards.Codes[code];
						if (this.props.pool && !card.isFree()) {
							if (
								!(code in this.props.pool) ||
								(code in cardMinus && cardMinus[code] >= this.props.pool[code]) ||
								(card.type != etg.Pillar && sumCardMinus(cardMinus, code) >= 6)
							) {
								return;
							}
						}
						this.props.setDeck(this.props.deck.concat([code]));
					}
				}}
				maxedIndicator={!this.props.acard}
				filterboth={!!this.props.pool}
				cardpool={this.props.pool}
				cardminus={cardMinus}
			/>
			<input type='button'
				value='Clear'
				onClick={() => this.props.setDeck([])}
				style={{
					position: 'absolute',
					left: '8px',
					top: '32px',
				}}
			/>
			<span className={'ico e' + this.props.mark}
				style={{
					position: 'absolute',
					left: '66px',
					top: '200px',
				}}
			/>
			{marksel}
			<Components.Card x={734} y={8} card={this.state.card} />
		</>;
	}
});

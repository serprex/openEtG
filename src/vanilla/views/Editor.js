const etg = require('../etg'),
	sock = require('../sock'),
	Cards = require('../Cards'),
	Components = require('../Components'),
	mkAi = require('../mkAi'),
	mkGame = require('../mkGame'),
	etgutil = require('../../etgutil'),
	store = require('../store'),
	util = require('../../util'),
	{ connect } = require('react-redux'),
	React = require('react');

function sumCardMinus(cardminus, code) {
	let sum = 0;
	for (let i = 0; i < 2; i++) {
		sum += cardminus[etgutil.asUpped(code, i == 0)] || 0;
	}
	return sum;
}

module.exports = connect(state => ({
	deck: state.opts.deck,
	aideck: state.opts.aideck,
}))(
	class Editor extends React.Component {
		state = {
			deckstr: '',
			deck: [],
			mark: 0,
			cardminus: [],
		};

		static getDerivedStateFromProps(nextProps, prevState) {
			if (nextProps.deck == prevState.deckstr) return null;
			const cardminus = [],
				deck = nextProps.deck.split(' ');
			let mark = 0;
			for (let i = deck.length - 1; i >= 0; i--) {
				const code = parseInt(deck[i], 32);
				if (!code || !(code in Cards.Codes)) {
					const index = etgutil.fromTrueMark(code);
					if (~index) {
						mark = index;
					}
					deck.splice(i, 1);
				} else {
					cardminus[code] = (cardminus[code] || 0) + 1;
					deck[i] = code;
				}
			}
			if (deck.length > 60) {
				deck.length = 60;
			}
			return { cardminus, mark, deck, deckstr: nextProps.deck };
		}

		setCardArt = code => {
			if (!this.state.card || this.state.card.code != code)
				this.setState({ card: Cards.Codes[code] });
		};

		saveDeck = (deck, mark) => {
			this.props.dispatch(
				store.setOpt(
					'deck',
					deck
						.sort(Cards.codeCmp)
						.map(x => x.toString(32))
						.join(' ') +
						' ' +
						etgutil.toTrueMark(mark).toString(32),
				),
			);
		};

		render() {
			const { deck, mark, cardminus } = this.state,
				ebuttons = [];
			for (let i = 0; i < 13; i++) {
				ebuttons.push(
					<Components.IconBtn
						key={i}
						e={'e' + i}
						x={100 + i * 32}
						y={234}
						click={() => this.saveDeck(deck.slice(), i)}
					/>,
				);
			}
			return (
				<>
					<input
						type="text"
						value={this.props.deck}
						onChange={e =>
							this.props.dispatch(store.setOpt('deck', e.target.value))
						}
						placeholder="Deck"
						style={{
							left: '0px',
							top: '600px',
							width: '900px',
							position: 'absolute',
						}}
					/>
					<input
						type="text"
						value={this.props.aideck}
						onChange={e =>
							this.props.dispatch(store.setOpt('aideck', e.target.value))
						}
						placeholder="AI Deck"
						style={{
							left: '0px',
							top: '624px',
							width: '900px',
							position: 'absolute',
						}}
					/>
					<input
						type="button"
						value="Clear"
						style={{ position: 'absolute', left: '8px', top: '32px' }}
						onClick={() => {
							this.props.dispatch(store.setOpt('deck', ''));
						}}
					/>
					<input
						type="button"
						style={{ position: 'absolute', left: '8px', top: '80px' }}
						value="Custom"
						onClick={() =>
							mkAi.run(
								mkGame(
									{
										deck: this.props.aideck
											.split(' ')
											.map(x => parseInt(x, 32)),
										urdeck: this.props.deck
											.split(' ')
											.map(x => parseInt(x, 32)),
										seed: util.randint(),
										foename: 'Custom',
									},
									true,
								),
							)
						}
					/>
					<input
						type="button"
						style={{ position: 'absolute', left: '8px', top: '110px' }}
						value="Commoner"
						onClick={() => mkAi.run(mkAi.mkAi(0))()}
					/>
					<input
						type="button"
						style={{ position: 'absolute', left: '8px', top: '140px' }}
						value="Mage"
						onClick={() => mkAi.run(mkAi.mkAi(1))()}
					/>
					<input
						type="button"
						style={{ position: 'absolute', left: '8px', top: '170px' }}
						value="Champion"
						onClick={() => mkAi.run(mkAi.mkAi(2))()}
					/>
					<input
						type="button"
						style={{ position: 'absolute', left: '8px', top: '200px' }}
						value="False God"
						onClick={() => mkAi.run(mkAi.mkPremade())()}
					/>
					{ebuttons}
					<span
						className={'ico e' + this.state.mark}
						style={{
							position: 'absolute',
							left: '66px',
							top: '200px',
						}}
					/>
					<Components.DeckDisplay
						deck={deck}
						onMouseOver={(_, code) => this.setCardArt(code)}
						onClick={(i, code) => {
							const newdeck = deck.slice();
							newdeck.splice(i, 1);
							this.saveDeck(newdeck, mark);
						}}
					/>
					<Components.CardSelector
						onMouseOver={this.setCardArt}
						onClick={code => {
							if (deck.length < 60) {
								const card = Cards.Codes[code];
								if (card.type != etg.PillarEnum) {
									if (
										Cards.Codes[code].type != etg.PillarEnum &&
										sumCardMinus(cardminus, code) >= 6
									) {
										return;
									}
								}
								this.saveDeck(deck.concat([code]), mark);
							}
						}}
					/>
					<Components.Card x={734} y={8} card={this.state.card} />
				</>
			);
		}
	},
);

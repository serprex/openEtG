const etg = require("../etg"),
	sock = require("../sock"),
	Cards = require("../Cards"),
	Components = require('../Components'),
	mkAi = require("../mkAi"),
	etgutil = require("../../etgutil"),
	store = require('../store'),
	{connect} = require('react-redux'),
	React = require('react');

module.exports = connect(state => ({ deck: state.opts.deck }))(class Editor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			deckstr: '',
			deck: [],
			mark: 0,
			cardminus: [],
		};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		if (nextProps.deck == prevState.deckstr) return null;
		const cardminus = [], mark = 0, deck = nextProps.deck.split(' ');
		for (var i = deck.length - 1;i >= 0;i--) {
			const code = +deck[i];
			if (!code || !(code in Cards.Codes)) {
				var index = etgutil.fromTrueMark(code);
				if (~index) {
					mark = index;
				}
				deck.splice(i, 1);
			}else cardminus[code] = (cardminus[code] || 0) + 1;
		}
		if (deck.length > 60){
			deck.length = 60;
		}
		return { cardminus, mark, deck, deckstr: nextProps.deck };
	}

	render() {
		const self = this, { deck, mark, cardminus } = this.state;
		function sumCardMinus(cardminus, code){
			var sum = 0;
			for (var i=0; i<2; i++){
				sum += cardminus[etgutil.asUpped(code, i==0)] || 0;
			}
			return sum;
		}
		function saveDeck(deck, mark) {
			self.props.dispatch(store.setOpt('deck',
				deck.slice().sort(Cards.codeCmp).map(x => x.toString(32)).join(" ") +
				" " + etgutil.toTrueMark(mark).toString(32)
			));
		};
		var editorui = [];
		editorui.push(
			<input type="text"
				value={this.props.deck}
				onChange={e => this.props.dispatch(store.setOpt('deck', e.target.value))}
				placeholder="Deck"
				style={{left:'0px',top:'600px',width:'900px',position:'absolute'}}
			/>,
			<input type="button"
				value="Clear"
				style={{ position: 'absolute', left: '8px', top: '32px' }}
				onClick={() => {
					this.props.dispatch(store.setOpt('deck', ''));
				}}
			/>,
			<input type="button"
				style={{position:'absolute', left: '8px', top: '110px'}}
				value="Commoner"
				onClick={mkAi.mkAi(0)}
			/>,
			<input type="button"
				style={{position:'absolute', left: '8px', top: '140px'}}
				value="Mage"
				onClick={mkAi.mkAi(1)}
			/>,
			<input type="button"
				style={{position:'absolute', left: '8px', top: '170px'}}
				value="Champion"
				onClick={mkAi.mkAi(2)}
			/>,
			<input type="button"
				style={{position:'absolute', left: '8px', top: '200px'}}
				value="False God"
				onClick={mkAi.mkPremade()}
			/>,
		);
		for (let i = 0; i < 13; i++) {
			editorui.push(
				<Components.IconBtn
					e={'e' + i}
					x={100 + i * 32}
					y={234}
					click={() => saveDeck(deck, i)}
				/>,
			);
		}
		editorui.push(
			<span className={'ico e' + self.state.mark}
				style={{
					position: 'absolute',
					left: '66px',
					top: '200px',
				}}
			/>,
		);
		function setCardArt(code) {
			if (!self.state.card || self.state.card.code != code)
				self.setState({ card: Cards.Codes[code] });
		}
		var decksprite = <Components.DeckDisplay
			deck={deck}
			onMouseOver={(_, code) => setCardArt(code)}
			onClick={(i, code) => {
				const newdeck = deck.slice();
				newdeck.splice(i, 1);
				saveDeck(newdeck, mark);
			}}
		/>;
		editorui.push(decksprite);
		var cardsel = <Components.CardSelector
			onMouseOver={setCardArt}
			onClick={function(code){
				if (deck.length < 60) {
					var card = Cards.Codes[code];
					if (card.type != etg.PillarEnum) {
						if (Cards.Codes[code].type != etg.PillarEnum && sumCardMinus(cardminus, code) >= 6) {
							return;
						}
					}
					saveDeck(deck.concat([code]), mark);
				}
			}}
		/>;
		editorui.push(cardsel);
		editorui.push(<Components.Card x={734} y={8} card={this.state.card} />);
		return editorui;
	}
})
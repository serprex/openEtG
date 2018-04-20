const etgutil = require('../etgutil'),
	store = require('../store'),
	Cards = require('../Cards'),
	Editor = require('../Components/Editor'),
	{connect} = require('react-redux'),
	React = require('react');

module.exports = connect(state => ({
	deck: state.opts.deck,
}))(class SandboxEditor extends React.Component {
	constructor(props) {
		super(props);

		let mark = 0,
			deck = etgutil.decodedeck(props.deck);
		for (let i = deck.length - 1; i >= 0; i--) {
			if (!(deck[i] in Cards.Codes)) {
				const index = etgutil.fromTrueMark(deck[i]);
				if (~index) {
					mark = index;
				}
				deck.splice(i, 1);
			}
		}
		this.state = { mark, deck };
	}

	render() {
		return  <>
			<Editor deck={this.state.deck} mark={this.state.mark} pool={this.state.pool}
				setDeck={deck => this.setState({deck})}
				setMark={mark => this.setState({mark})}
			/>
			<input type='button'
				value='Save & Exit'
				onClick={() => {
					this.props.dispatch(store.setOpt('deck',
						etgutil.encodedeck(this.state.deck) +
						etgutil.toTrueMarkSuffix(this.state.mark)));
					this.props.dispatch(store.doNav(require('../views/MainMenu')));
				}}
				style={{
					position: 'absolute',
					left: '8px',
					top: '58px',
				}}
			/>
		</>;
	}
});


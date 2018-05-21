const Cards = require('../Cards'),
	etg = require('../etg'),
	etgutil = require('../etgutil'),
	sock = require('../sock'),
	store = require('../store'),
	Components = require('../Components'),
	{connect} = require('react-redux'),
	React = require('react');

module.exports = connect(({user})=>({user}))(class Bazaar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			bz: null,
			bcode: 0,
			sell: 0,
			buy: 0,
		};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		return { cardpool: etgutil.deck2pool(nextProps.user.pool) };
	}

	componentDidMount() {
		sock.emit('bzread');
		this.props.dispatch(store.setCmds({
			bzread: data => {
				this.setState({ bz: data.bz });
				this.updateBuySell(this.state.bcode);
			},
			bzbid: data => {
				this.setState({ bz: data.bz });
				this.props.dispatch(store.updateUser({
					gold: data.g,
					pool: data.pool,
				}));
				this.updateBuySell(this.state.bcode);
			},
		}));
	}

	updateBuySell(code) {
		if (this.state.bz && this.state.bz[code] && this.state.bz[code].length) {
			const bc = this.state.bz[code];
			this.setState({
				buy: Math.max(-bc[0].p, 0),
				sell: Math.max(bc[bc.length-1].p, 0),
			});
		}
	}

	render() {
		return <>
			<Components.ExitBtn x={5} y={50} />
			{!!this.state.bcode && this.state.bz && <>
				<input type='button'
					value='Sell'
					onClick={() => {
						sock.userEmit('bzbid', { price: -this.state.sell, cards: '01' + this.state.bcode.toString(32) });
					}}
				/>
				<input placeholder='Sell' value={this.state.sell || ''}
					onChange={e => this.setState({sell: (+e.target.value)|0})} />
				<input type='button'
					value='Buy'
					onClick={() => {
						sock.userEmit('bzbid', { price: this.state.buy, cards: '01' + this.state.bcode.toString(32) });
					}}
				/>
				<input placeholder='Buy' value={this.state.buy || ''}
					onChange={e => this.setState({buy: (+e.target.value)|0})} />
			</>}
			<Components.Text
				text={this.props.user.gold + '$'}
				style={{
					position: 'absolute',
					left: '5px',
					top: '240px',
				}}
			/>
			<Components.Card
				x={534}
				y={8}
				code={this.state.bcode}
			/>
			<Components.CardSelector
				cardpool={this.state.cardpool}
				maxedIndicator
				onClick={code => {
					const card = Cards.Codes[code];
					if (card.rarity === -1 || card.type === etg.Pillar || card.rarity > 4 || card.isFree()) return;
					this.setState({ bcode: code });
					this.updateBuySell(code);
				}}
			/>
		</>;
	}
});
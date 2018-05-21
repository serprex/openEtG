const Cards = require('../Cards'),
	etg = require('../etg'),
	etgutil = require('../etgutil'),
	sock = require('../sock'),
	store = require('../store'),
	Components = require('../Components'),
	{connect} = require('react-redux'),
	React = require('react');

function Order({order}) {
	return <div>{order.q} @ {order.p}</div>;
}

function OrderBook({bc}) {
	if (!bc) return null;
	const sells = bc.filter(x => x.p < 0);
	const buys = bc.filter(x => x.p > 0);
	return <>
		<div style={{ position: 'absolute', left: '100px', top: '72px', width: '330px', height: '192px' }}>
			{buys.map((buy, i) =>
				<Order key={i} order={buy} />
			)}
		</div>
		<div style={{ position: 'absolute', left: '430px', top: '72px', width: '330px', height: '192px' }}>
			{sells.map((sell, i) =>
				<Order key={i} order={sell} />
			)}
		</div>
	</>;
}

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
			<Components.ExitBtn x={8} y={56} />
			{!!this.state.bcode && this.state.bz && <>
				<input type='button'
					value='Sell'
					onClick={() => {
						sock.userEmit('bzbid', { price: -this.state.sell, cards: '01' + this.state.bcode.toString(32) });
					}}
					style={{ position: 'absolute', left: '100px', top: '8px' }}
				/>
				<input placeholder='Sell' value={this.state.sell || ''}
					onChange={e => this.setState({sell: (+e.target.value)|0})}
					style={{ position: 'absolute', left: '200px', top: '8px' }}
				/>
				<input type='button'
					value='Buy'
					onClick={() => {
						sock.userEmit('bzbid', { price: this.state.buy, cards: '01' + this.state.bcode.toString(32) });
					}}
					style={{ position: 'absolute', left: '100px', top: '40px' }}
				/>
				<input placeholder='Buy' value={this.state.buy || ''}
					onChange={e => this.setState({buy: (+e.target.value)|0})}
					style={{ position: 'absolute', left: '200px', top: '40px' }}
				/>
				<OrderBook bc={this.state.bz[this.state.bcode]} />
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
				x={768}
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
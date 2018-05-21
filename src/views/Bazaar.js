const Cards = require('../Cards'),
	etg = require('../etg'),
	etgutil = require('../etgutil'),
	userutil = require('../userutil'),
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
	return <>
		<div style={{ position: 'absolute', left: '100px', top: '72px', width: '330px', height: '192px' }}>
			{bc.filter(x => x.p > 0).map((buy, i) =>
				<Order key={i} order={buy} />
			)}
		</div>
		<div style={{ position: 'absolute', left: '430px', top: '72px', width: '330px', height: '192px' }}>
			{bc.filter(x => x.p < 0).map((sell, i) =>
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
			sellq: 0,
			buyq: 0,
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
						sock.userEmit('bzbid', { price: -this.state.sell, cards: etgutil.encodeCount(this.state.sellq || 1) + this.state.bcode.toString(32) });
					}}
					style={{ position: 'absolute', left: '100px', top: '8px' }}
				/>
				<input placeholder='Price' value={this.state.sell || ''}
					onChange={e => this.setState({sell: (+e.target.value)|0})}
					style={{ position: 'absolute', left: '200px', top: '8px' }}
				/>
				<input placeholder='Quantity' value={this.state.sellq || ''}
					onChange={e => this.setState({sellq: (+e.target.value)|0})}
					style={{ position: 'absolute', left: '360px', top: '8px' }}
				/>
				<input type='button'
					value='Buy'
					onClick={() => {
						sock.userEmit('bzbid', { price: this.state.buy, cards: etgutil.encodeCount(this.state.buyq || 1) + this.state.bcode.toString(32) });
					}}
					style={{ position: 'absolute', left: '100px', top: '40px' }}
				/>
				<input placeholder='Price' value={this.state.buy || ''}
					onChange={e => this.setState({buy: (+e.target.value)|0})}
					style={{ position: 'absolute', left: '200px', top: '40px' }}
				/>
				<input placeholder='Quantity' value={this.state.buyq || ''}
					onChange={e => this.setState({buyq: (+e.target.value)|0})}
					style={{ position: 'absolute', left: '360px', top: '40px' }}
				/>
				<div style={{ position: 'absolute', left: '540px', top: '8px' }}>
					Autosell: {userutil.sellValues[Cards.Codes[this.state.bcode].rarity]}<span className="ico g" />
				</div>
				<div style={{ position: 'absolute', left: '540px', top: '40px' }}>
					Wealth value: {userutil.cardValues[Cards.Codes[this.state.bcode].rarity]}<span className="ico g" />
				</div>
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
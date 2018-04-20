const Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	sock = require('../sock'),
	store = require('../store'),
	Editor = require('../Components/Editor'),
	{connect} = require('react-redux'),
	React = require('react');

const artable = {
	hp: { min: 65, max: 200, incr: 45, cost: 1 },
	mark: { cost: 45 },
	draw: { cost: 135 },
};
function attrval(x, d) {
	x = +x;
	return x === 0 ? 0 : x || d;
}
function AttrUi({y, name, value, onChange}) {
	function mkmodattr(x) {
		return () => {
			const newval = value + x;
			if (
				newval >= (data.min || 0) &&
				(!data.max || newval <= data.max) &&
				sumscore +
					(newval - value) * artable[name].cost <=
					arpts
			) {
				onChange(newval);
			}
		};
	}
	y = 128 + y * 20 + 'px';
	const data = artable[name];
	return <>
		<div style={{
			position: 'absolute',
			left: '4px',
			top: y,
		}}>{name}</div>
		<input type='button'
			value='-'
			onClick={mkmodattr(-(data.incr || 1))}
			style={{
				position: 'absolute',
				left: '38px',
				top: y,
				width: '14px',
			}}
		/>
		<input type='button'
			value='+'
			onClick={mkmodattr(data.incr || 1)}
			style={{
				position: 'absolute',
				left: '82px',
				top: y,
				width: '14px',
			}}
		/>
		<div style={{
			position: 'absolute',
			left: '56px',
			top: y,
		}}>{value}</div>
	</>;
}

module.exports = connect()(class ArenaEditor extends React.Component {
	constructor(props) {
		super(props);
		const baseacard = props.acard.asUpped(false).asShiny(false);
		const pool = {};
		function incrpool(code, count) {
			if (
				code in Cards.Codes &&
				(!props.acard ||
					(!Cards.Codes[code].isOf(baseacard) &&
						(props.acard.upped || !Cards.Codes[code].upped)))
			) {
				pool[code] = (pool[code] || 0) + count;
			}
		}
		etgutil.iterraw(sock.user.pool, incrpool);
		etgutil.iterraw(sock.user.accountbound, incrpool);
		let mark = 0,
			deck = etgutil.decodedeck(props.adeck);
		for (let i = deck.length - 1; i >= 0; i--) {
			if (!(deck[i] in Cards.Codes)) {
				const index = etgutil.fromTrueMark(deck[i]);
				if (~index) {
					mark = index;
				}
				deck.splice(i, 1);
			}
		}
		this.state = {
			arattr: {
				hp: attrval(props.ainfo.hp, 200),
				mark: attrval(props.ainfo.mark, props.acard.upped ? 1 : 2),
				draw: attrval(props.ainfo.draw, props.acard.upped ? 2 : 1),
			},
			pool,
			deck,
			mark,
		};
	}

	componentDidMount() {
		this.props.dispatch(store.setCmds({
			arenainfo: data => {
				this.props.dispatch(store.doNav(require('../views/ArenaInfo'), data));
			},
		}));
	}

	render() {
		const self = this;
		const arpts = this.props.acard && this.props.acard.upped ? 515 : 425;
		let sumscore = 0;
		if (self.state.arattr) {
			for (const k in artable) {
				sumscore += self.state.arattr[k] * artable[k].cost;
			}
		}
		return <>
			<Editor acard={this.props.acard} deck={this.state.deck} mark={this.state.mark}
				pool={this.state.pool}
				setDeck={deck => this.setState({deck})}
				setMark={mark => this.setState({mark})}
			/>
			<AttrUi y={0} name='hp' value={self.state.arattr.hp}
				onChange={val =>
					self.setState({
						arattr: Object.assign({}, self.state.arattr, { [name]: val }),
					})
				}
			/>
			<AttrUi y={1} name='mark' value={self.state.arattr.mark}
				onChange={val =>
					self.setState({
						arattr: Object.assign({}, self.state.arattr, { [name]: val }),
					})
				}
			/>
			<AttrUi y={2} name='draw' value={self.state.arattr.draw}
				onChange={val =>
					self.setState({
						arattr: Object.assign({}, self.state.arattr, { [name]: val }),
					})
				}
			/>
			<div style={{
				position: 'absolute',
				left: '4px',
				top: '188px',
			}}>
				{(arpts - sumscore) / 45}
			</div>
			<input type='button'
				value='Save & Exit'
				onClick={() => {
					if (this.state.deck.length < 30 || sumscore > arpts) {
						this.props.dispatch(store.chatMsg('35 cards required before submission', 'System'));
						return;
					}
					const data = Object.assign(
						{
							d:
								etgutil.encodedeck(this.state.deck) +
								etgutil.toTrueMarkSuffix(this.state.mark),
							lv: this.props.acard.upped,
						},
						this.state.arattr,
					);
					if (!this.props.acreate) {
						data.mod = true;
					}
					sock.userEmit('setarena', data);
					this.props.dispatch(store.chatMsg('Arena deck submitted', 'System'));
					this.props.dispatch(store.doNav(require('../views/MainMenu')));
				}}
				style={{
					position: 'absolute',
					left: '8px',
					top: '58px',
				}}
			/>
			<input type='button'
				value='Exit'
				onClick={() => {
					sock.userEmit('arenainfo');
				}}
				style={{
					position: 'absolute',
					left: '8px',
					top: '84px',
				}}
			/>
		</>
	}
});

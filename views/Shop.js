const svg = require('../svg'),
	chat = require('../chat'),
	sock = require('../sock'),
	Tutor = require('../Tutor'),
	etgutil = require('../etgutil'),
	options = require('../options'),
	Components = require('../Components'),
	store = require('../store'),
	{ connect } = require('react-redux'),
	React = require('react'),
	h = React.createElement;

const packdata = [
	{ cost: 15, type: 'Bronze', info: '10 Commons', color: '#c73' },
	{ cost: 25, type: 'Silver', info: '3 Commons, 3 Uncommons', color: '#ccc' },
	{
		cost: 77,
		type: 'Gold',
		info: '1 Common, 2 Uncommons, 2 Rares',
		color: '#fd0',
	},
	{
		cost: 100,
		type: 'Platinum',
		info: '4 Commons, 3 Uncommons, 1 Rare, 1 Shard',
		color: '#eee',
	},
	{ cost: 250, type: 'Nymph', info: '1 Nymph', color: '#69b' },
];

module.exports = connect(({opts}) => ({ bulk: typeof opts.bulk === 'string' ? opts.bulk : '1' }))(class Shop extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			info1: 'Select from which element you want.',
			info2: 'Select which type of booster you want.',
			packele: -1,
			packrarity: -1,
			showbuy: false,
			cards: '',
		};
	}

	componentDidMount() {
		this.props.dispatch(store.setCmds({
			boostergive: data => {
				if (data.accountbound) {
					sock.user.accountbound = etgutil.mergedecks(
						sock.user.accountbound,
						data.cards,
					);
					if (sock.user.freepacks) {
						sock.user.freepacks[data.packtype]--;
					}
				} else {
					sock.user.pool = etgutil.mergedecks(sock.user.pool, data.cards);
					const bdata = {};
					options.parseInput(bdata, 'bulk', this.props.bulk, 99);
					sock.user.gold -= packdata[data.packtype].cost * (bdata.bulk || 1);
				}
				const dlen = etgutil.decklength(data.cards);
				if (dlen < 121) {
					this.setState({ cards: data.cards, showbuy: false });
				} else {
					this.setState({ showbuy: true });
				}
				chat.addSpan(<a style={{ display: 'block' }} href={`deck/${data.cards}`} target='_blank'>{data.cards}</a>, 'Packs');
			},
		}));
	}

	render() {
		const self = this;
		const children = [
			<Components.Box
				x={40}
				y={16}
				width={820}
				height={60}
			/>,
			<Components.Box
				x={40}
				y={89}
				width={494}
				height={168}
			/>,
			<Components.Box
				x={40}
				y={270}
				width={620}
				height={168}
			/>,
			<Components.Box
				x={770}
				y={90}
				width={90}
				height={184}
			/>,
			<Components.Text
				text={sock.user.gold + '$'}
				style={{
					position: 'absolute',
					left: '775px',
					top: '101px',
				}}
			/>,
			<Components.Text
				text={this.state.info1}
				style={{
					position: 'absolute',
					left: '50px',
					top: '25px',
				}}
			/>,
			<span
				style={{
					position: 'absolute',
					left: '50px',
					top: '50px',
				}}>{this.state.info2}</span>,
			<Components.ExitBtn x={775} y={246} />,
		];

		if (sock.user.freepacks) {
			children.push(
				<span
					style={{
						position: 'absolute',
						left: '350px',
						top: '26px',
					}}>{
					sock.user.freepacks[self.state.packrarity]
						? 'Free ' +
							packdata[self.state.packrarity].type +
							' packs left: ' +
							sock.user.freepacks[self.state.packrarity]
						: ''
					}
				</span>,
			);
		}

		const bget =
			self.state.cards &&
			<input type='button'
				value='Take Cards'
				onClick={() => {
					self.setState({ showbuy: true, hideget: true, cards: '' });
				}}
				style={{
					position: 'absolute',
					left: '775px',
					top: '156px',
				}}
			/>;

		function buyPack() {
			const pack = packdata[self.state.packrarity];
			const boostdata = {
				pack: self.state.packrarity,
				element: self.state.packele,
			};
			options.parseInput(boostdata, 'bulk', self.props.bulk, 99);
			if (
				sock.user.gold >= pack.cost * (boostdata.bulk || 1) ||
				(sock.user.freepacks && sock.user.freepacks[self.state.packrarity] > 0)
			) {
				sock.userEmit('booster', boostdata);
				self.setState({ showbuy: false });
			} else {
				self.setState({ info2: "You can't afford that!" });
			}
		}
		const bbuy =
			self.state.showbuy &&
			<input type='button'
				value='Buy Pack'
				onClick={buyPack}
				style={{
					position: 'absolute',
					left: '775px',
					top: '156px',
				}}
			/>;
		children.push(bget, bbuy);
		packdata.forEach((pack, n) => {
			children.push(
				<div className='imgb'
					onClick={() => {
						const update = {
							packrarity: n,
							info2: pack.type + ' Pack: ' + pack.info,
						};
						if (~self.state.packele) update.showbuy = true;
						self.setState(update);
					}}
					style={{
						color: '#000',
						position: 'absolute',
						left: 50 + 125 * n + 'px',
						top: 280 + 'px',
						borderRadius: '6px',
						border: '3px solid #000',
						width: '100px',
						height: '150px',
						backgroundColor: pack.color,
					}}>
					<span style={{
						fontSize: '18px',
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%,-50%)',
					}}>{pack.type}</span>
					<Components.Text
						text={pack.cost + '$'}
						style={{
							position: 'absolute',
							left: '7px',
							top: '122px',
						}}
					/>
				</div>
			);
		});

		for (let i = 0; i < 14; i++) {
			children.push(
				<Components.IconBtn
					e={'e' + i}
					x={75 + (i >> 1) * 64}
					y={117 + (i & 1) * 75}
					click={() => {
						const update = {
							packele: i,
							info1: 'Selected Element: ' + (i == 13 ? 'Random' : '1:' + i),
						};
						if (~self.state.packrarity) update.showbuy = true;
						self.setState(update);
					}}
				/>
			);
		}

		if (this.state.cards) {
			const dlen = etgutil.decklength(this.state.cards);
			let cardchildren;
			if (dlen < 11) {
				cardchildren = [];
				etgutil.iterdeck(this.state.cards, (code, i) => {
					const x = i % 5,
						y = Math.floor(i / 5);
					cardchildren.push(
						<Components.Card
							x={7 + x * 140}
							y={y ? 298 : 14}
							code={code}
						/>
					);
				});
			} else if (dlen < 61) {
				cardchildren = <Components.DeckDisplay
					deck={etgutil.decodedeck(this.state.cards)}
				/>;
			} else {
				const deck = etgutil.decodedeck(this.state.cards);
				cardchildren = <>
					<Components.DeckDisplay deck={deck.slice(0, 60)} />
					<Components.DeckDisplay y={244} deck={deck.slice(60)} />
				</>;
			}
			children.push(
				<Components.Box
					x={40}
					y={16}
					width={710}
					height={568}>
					{cardchildren}
				</Components.Box>
			);
		}

		const packmulti = <input type='number'
			placeholder='Bulk'
			value={this.props.bulk}
			onChange={e => this.props.dispatch(store.setOptTemp('bulk', e.target.value))}
			onKeyPress={e => {
				if (e.which == 13) buyPack();
			}}
			style={{
				position: 'absolute',
				top: '184px',
				left: '777px',
				width: '64px',
			}}
		/>;
		children.push(packmulti, <Tutor.Shop x={8} y={500} />);
		return children;
	}
});

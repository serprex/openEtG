const etgutil = require('../etgutil'),
	Cards = require('../Cards'),
	Tutor = require('../Tutor'),
	sock = require('../sock'),
	store = require('../store'),
	Editor = require('../Components/Editor'),
	{connect} = require('react-redux'),
	React = require('react');

function processDeck(dcode) {
	let mark = 0,
		deck = etgutil.decodedeck(dcode);
	for (let i = deck.length - 1; i >= 0; i--) {
		if (!(deck[i] in Cards.Codes)) {
			const index = etgutil.fromTrueMark(deck[i]);
			if (~index) {
				mark = index;
			}
			deck.splice(i, 1);
		}
	}
	return { mark, deck };
}

const DeckNames = connect(({user}) => ({user}))(function DeckNames({ user, name, onClick }) {
	let rx;
	try {
		rx = name && new RegExp(name);
	} catch (_e) {
		rx = name;
	}
	let names = Object.keys(user.decks);
	if (rx) names = names.filter(name => name.match(rx));
	return names.sort().slice(0, 84).map((name, i) => {
		const deck = user.decks[name];
		return <div key={i} style={{
			position: 'absolute',
			left: `${4+Math.floor(i/14)*150}px`,
			top: `${32+(i%14)*21}px`,
			width: '142px',
			overflow: 'hidden',
		}}>
			<a href={`deck/${deck}`} target='_blank' className={'ico ce' + etgutil.fromTrueMark(parseInt(deck.slice(-3), 32))} />
			<span onClick={() => onClick(name)}>{name}</span>
		</div>
	});
})

module.exports = connect(({user}) => ({
	user,
}))(class DeckEditor extends React.Component {
	constructor(props) {
		super(props);

		const aupped = props.acard && props.acard.upped;
		const baseacard = props.acard && props.acard.asUpped(false).asShiny(false);
		const pool = {};
		function incrpool(code, count) {
			if (
				code in Cards.Codes &&
				(!props.acard ||
					(!Cards.Codes[code].isOf(baseacard) &&
						(aupped || !Cards.Codes[code].upped)))
			) {
				pool[code] = (pool[code] || 0) + count;
			}
		}
		etgutil.iterraw(props.user.pool, incrpool);
		etgutil.iterraw(props.user.accountbound, incrpool);
		this.deckRef = React.createRef();
		this.state = {
			pool: pool,
			deckname: '',
			selectedDeck: null,
			setQeck: false,
		};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		if (nextProps.user.selectedDeck === prevState.selectedDeck) return null;
		return {
			selectedDeck: nextProps.user.selectedDeck,
			...processDeck(sock.getDeck()),
		};
	}

	componentDidMount() {
		this.deckRef.current.setSelectionRange(0, 999);
	}

	currentDeckCode() {
		return etgutil.encodedeck(this.state.deck) +
			etgutil.toTrueMarkSuffix(this.state.mark);
	}

	render() {
		const self = this;
		function saveDeck(name, force) {
			if (self.state.deck.length == 0) {
				sock.userExec('rmdeck', { name });
				return;
			}
			const dcode =
					etgutil.encodedeck(self.state.deck) +
					etgutil.toTrueMarkSuffix(self.state.mark);
			if (dcode !== self.props.user.decks[name]) {
				sock.userExec('setdeck', { d: dcode, name });
			} else if (force)
				sock.userExec('setdeck', { name });
		}
		function loadDeck(name) {
			if (!name) return;
			saveDeck(self.props.user.selectedDeck);
			sock.userExec('setdeck', { name });
		}
		const buttons = [];
		for (let i = 0; i < 10; i++) {
			buttons.push(
				<input type='button'
					key={i}
					value={i + 1 + ''}
					className={
						'editbtn' +
						(self.props.user.selectedDeck == self.props.user.qecks[i]
							? ' selectedbutton'
							: '')}
					onClick={() => {
						if (this.state.setQeck) {
							saveDeck(this.props.selectedDeck);
							sock.userExec('changeqeck', {
								number: i,
								name: self.props.user.selectedDeck,
							});
							self.props.user.qecks[i] = self.props.user.selectedDeck;
							self.setState({ setQeck: false });
						} else {
							loadDeck(self.props.user.qecks[i]);
						}
					}}
				/>
			);
		}
		return <>
			<Editor deck={this.state.deck} mark={this.state.mark} pool={this.state.pool}
				setDeck={deck => this.setState({deck})}
				setMark={mark => this.setState({mark})}
			/>
			<Tutor.Editor x={4} y={220} />
			<input placeholder='Deck'
				autoFocus
				value={this.currentDeckCode()}
				style={{
					position: 'absolute',
					left: '520px',
					top: '238px',
					width: '190px',
				}}
				onChange={e => this.setState(processDeck(e.target.value))}
				ref={this.deckRef}
				onClick={e => {
					e.target.setSelectionRange(0, 999);
				}}
			/>
			<div style={{
				position: 'absolute',
				top: '8px',
				left: '8px',
			}}>{self.props.user.selectedDeck}</div>
			<input type='button'
				value='Decks'
				onClick={() => this.setState({ deckmode: true })}
				style={{
					position: 'absolute',
					left: '8px',
					top: '58px',
				}}
			/>
			<input type='button'
				value='Revert'
				onClick={() => this.setState(processDeck(sock.getDeck()))}
				style={{
					position: 'absolute',
					left: '8px',
					top: '162px',
				}}
			/>
			<input type='button'
				value='Save to #'
				className={this.state.setQeck ? 'selectedbutton' : undefined}
				onClick={() => self.setState({ setQeck: !this.state.setQeck })}
				style={{
					position: 'absolute',
					left: '220px',
					top: '8px',
				}}
			/>
			<input type='button'
				value='Exit'
				onClick={() => {
					saveDeck(this.props.user.selectedDeck, true);
					this.props.dispatch(store.doNav(require('../views/MainMenu')));
				}}
				style={{
					position: 'absolute',
					left: '8px',
					top: '110px',
				}}
			/>
			<div style={{
				position: 'absolute',
				left: '300px',
				top: '8px',
			}}>{buttons}</div>
			{this.state.deckmode && <div className='bgbox' style={{
				position: 'absolute',
				top: '270px',
				width: '900px',
				height: '330px',
			}}>
				<input placeholder='Name'
					value={this.state.deckname}
					onChange={e => this.setState({ deckname: e.target.value })}
					onKeyPress={e => {
						if (e.which == 13) {
							loadDeck(e.target.value);
						}
					}}
					onClick={e => {
						e.target.setSelectionRange(0, 999);
					}}
					style={{
						position: 'absolute',
						left: '4px',
						top: '4px',
					}}
				/>
				<input type='button'
					value='Create'
					style={{
						position: 'absolute',
						left: '158px',
						top: '4px',
					}}
					onClick={() => {
						saveDeck(this.props.user.selectedDeck);
						saveDeck(this.state.deckname);
						this.setState({ deckmode: false, deckname: '' });
					}}
				/>
				<input type='button'
					value='Exit'
					style={{
						position: 'absolute',
						left: '794px',
						top: '4px',
					}}
					onClick={() => {
						this.setState({ deckmode: false, deckname: '' });
					}}
				/>
				<DeckNames name={this.state.deckname} onClick={loadDeck} />
			</div>}
		</>;
	}
});

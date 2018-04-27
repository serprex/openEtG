const etgutil = require('../etgutil'),
	Cards = require('../Cards'),
	Tutor = require('../Tutor'),
	sock = require('../sock'),
	store = require('../store'),
	Editor = require('../Components/Editor'),
	{connect} = require('react-redux'),
	React = require('react');

module.exports = connect(({user, opts}) => ({
	user,
	deck: opts.deck,
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
			selectedDeck: null,
			setQeck: false,
		};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		if (nextProps.user.selectedDeck === prevState.selectedDeck) return null;
		let mark = 0,
			deck = etgutil.decodedeck(nextProps.deck);
		for (let i = deck.length - 1; i >= 0; i--) {
			if (!(deck[i] in Cards.Codes)) {
				const index = etgutil.fromTrueMark(deck[i]);
				if (~index) {
					mark = index;
				}
				deck.splice(i, 1);
			}
		}
		return { mark, deck,
			deckname: nextProps.user.selectedDeck,
			selectedDeck: nextProps.user.selectedDeck,
		};
	}

	componentDidMount() {
		this.deckRef.current.setSelectionRange(0, 999);
	}

	render() {
		const self = this;
		function saveDeck(name, force) {
			if (self.state.deck.length == 0) {
				sock.userExec('rmdeck', { name });
				self.props.dispatch(store.setOpt('deck', ''));
				return;
			}
			const dcode =
					etgutil.encodedeck(self.state.deck) +
					etgutil.toTrueMarkSuffix(self.state.mark),
				olddeck = sock.getDeck();
			if (olddeck != dcode) {
				sock.userExec('setdeck', { d: dcode, name });
				self.props.dispatch(store.setOpt('deck', sock.getDeck()));
			} else if (force)
				sock.userExec('setdeck', { name });
		}
		function loadDeck(name) {
			if (!name) return;
			saveDeck(self.props.user.selectedDeck);
			sock.userExec('setdeck', { name });
			self.props.dispatch(store.setOpt('deck', sock.getDeck()));
		}
		function saveButton() {
			if (self.state.deckname) {
				saveDeck(self.state.deckname);
			}
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
						if (self.state.setQeck) {
							saveButton();
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
			<input
				placeholder='Name'
				value={self.state.deckname}
				onChange={e => self.setState({ deckname: e.target.value })}
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
					width: '80px',
				}}
			/>
			<Tutor.Editor x={4} y={220} />
			<input placeholder='Deck'
				autoFocus
				value={this.props.deck}
				style={{
					position: 'absolute',
					left: '520px',
					top: '238px',
					width: '190px',
				}}
				onChange={e => {
					self.props.dispatch(store.setOptTemp('deck', e.target.value));
					self.setState({selectedDeck: null});
				}}
				ref={this.deckRef}
				onClick={e => {
					e.target.setSelectionRange(0, 999);
				}}
			/>
			<div style={{
				position: 'absolute',
				top: '8px',
				left: '100px',
			}}>{self.props.user.selectedDeck}</div>
			<input type='button'
				value='Save'
				onClick={saveButton}
				style={{
					position: 'absolute',
					left: '8px',
					top: '110px',
				}}
			/>
			<input type='button'
				value='Load'
				onClick={() => loadDeck(this.state.deckname)}
				style={{
					position: 'absolute',
					left: '8px',
					top: '136px',
				}}
			/>
			<input type='button'
				value='Exit'
				onClick={function() {
					if (self.props.user)
						sock.userExec('setdeck', { name: self.props.user.selectedDeck });
					self.props.dispatch(store.doNav(require('../views/MainMenu')));
				}}
				style={{
					position: 'absolute',
					left: '8px',
					top: '162px',
				}}
			/>
			<input type='button'
				value='Save to #'
				className={self.state.setQeck ? 'selectedbutton' : undefined}
				onClick={() => self.setState({ setQeck: !self.state.setQeck })}
				style={{
					position: 'absolute',
					left: '220px',
					top: '8px',
				}}
			/>
			<input type='button'
				value='Save & Exit'
				onClick={() => {
					saveDeck(this.props.user.selectedDeck, true);
					this.props.dispatch(store.doNav(require('../views/MainMenu')));
				}}
				style={{
					position: 'absolute',
					left: '8px',
					top: '58px',
				}}
			/>
			<div style={{
				position: 'absolute',
				left: '300px',
				top: '8px',
			}}>{buttons}</div>
		</>;
	}
});

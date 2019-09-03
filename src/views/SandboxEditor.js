import React from 'react';
import { connect } from 'react-redux';

import * as etgutil from '../etgutil.js';
import * as store from '../store.js';
import Cards from '../Cards.js';
import Editor from '../Components/Editor.js';

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
	deck.splice(60);
	return { mark, deck };
}

export default connect(state => ({
	deck: state.opts.deck,
}))(
	class SandboxEditor extends React.Component {
		constructor(props) {
			super(props);

			this.deckRef = React.createRef();
			this.state = processDeck(props.deck);
		}

		componentDidMount() {
			this.deckRef.current.setSelectionRange(0, 999);
		}

		currentDeckCode() {
			return (
				etgutil.encodedeck(this.state.deck) +
				etgutil.toTrueMarkSuffix(this.state.mark)
			);
		}

		render() {
			return (
				<>
					<Editor
						deck={this.state.deck}
						mark={this.state.mark}
						pool={this.state.pool}
						setDeck={deck => this.setState({ deck: deck.sort(Cards.codeCmp) })}
						setMark={mark => this.setState({ mark })}
					/>
					<input
						placeholder="Deck"
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
						onClick={e => e.target.setSelectionRange(0, 999)}
					/>
					<input
						type="button"
						value="Save &amp; Exit"
						onClick={() => {
							this.props.dispatch(
								store.setOptTemp('deck', this.currentDeckCode()),
							);
							this.props.dispatch(store.doNav(import('../views/MainMenu.js')));
						}}
						style={{
							position: 'absolute',
							left: '8px',
							top: '58px',
						}}
					/>
				</>
			);
		}
	},
);

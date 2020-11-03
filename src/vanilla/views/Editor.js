import { createRef, Component } from 'react';
import { connect } from 'react-redux';

import { parseDeck } from './MainMenu.js';
import * as etg from '../../etg.js';
import Cards from '../Cards.js';
import * as Components from '../../Components/index.js';
import Editor from '../../Components/Editor.js';
import * as etgutil from '../../etgutil.js';
import * as store from '../../store.js';
import * as util from '../../util.js';
import { userEmit } from '../../sock.js';

function processDeck(pool, dcode) {
	let mark = 0,
		deck = etgutil.decodedeck(dcode);
	for (let i = deck.length - 1; i >= 0; i--) {
		if (!Cards.Codes[deck[i]]) {
			const index = etgutil.fromTrueMark(deck[i]);
			if (~index) {
				mark = index;
			}
			deck.splice(i, 1);
		}
	}
	deck.sort(Cards.codeCmp).splice(60);
	const cardMinus = Cards.filterDeck(deck, pool, true);
	return { mark, deck, cardMinus };
}

export default connect(({ orig }) => ({ orig }))(
	class OriginalEditor extends Component {
		constructor(props) {
			super(props);

			const pool = [];
			for (const [code, count] of etgutil.iterraw(props.orig.pool)) {
				if (Cards.Codes[code]) {
					pool[code] = (pool[code] ?? 0) + count;
				}
			}

			this.deckRef = createRef();
			this.state = {
				pool: pool,
				selectedDeck: '',
				deck: [],
				mark: 0,
			};
		}

		static getDerivedStateFromProps(nextProps, prevState) {
			if (nextProps.orig.deck === prevState.selectedDeck) return null;
			return {
				selectedDeck: nextProps.orig.deck,
				...processDeck(prevState.pool, nextProps.orig.deck),
			};
		}

		setCardArt = card => {
			if (this.state.card !== card) this.setState({ card });
		};

		componentDidMount() {
			this.deckRef.current.setSelectionRange(0, 999);
		}

		currentDeckCode() {
			return (
				etgutil.encodedeck(this.state.deck) +
				etgutil.toTrueMarkSuffix(this.state.mark)
			);
		}

		saveDeck = () => {
			const update = { deck: this.currentDeckCode() };
			userEmit('updateorig', update);
			this.props.dispatch(store.updateOrig(update));
		};

		render() {
			const { deck, mark, cardMinus } = this.state;
			return (
				<>
					<Editor
						cards={Cards}
						deck={this.state.deck}
						mark={this.state.mark}
						pool={this.state.pool}
						cardMinus={this.state.cardMinus}
						setDeck={deck => {
							deck.sort(Cards.codeCmp);
							const cardMinus = Cards.filterDeck(deck, this.state.pool, true);
							this.setState({ deck, cardMinus });
						}}
						setMark={mark => this.setState({ mark })}
					/>
					<input
						type="button"
						value="Exit"
						onClick={() => {
							this.saveDeck();
							this.props.dispatch(store.doNav(import('./MainMenu.js')));
						}}
						style={{
							position: 'absolute',
							left: '8px',
							top: '110px',
						}}
					/>
					<label
						style={{
							position: 'absolute',
							left: '536px',
							top: '238px',
						}}>
						Deck&nbsp;
						<input
							autoFocus
							value={this.currentDeckCode()}
							onChange={e => {
								this.setState(
									processDeck(this.state.pool, parseDeck(e.target.value)),
								);
							}}
							ref={this.deckRef}
							onClick={e => {
								e.target.setSelectionRange(0, 999);
							}}
						/>
					</label>
					<span
						className={'ico e' + this.state.mark}
						style={{
							position: 'absolute',
							left: '66px',
							top: '200px',
						}}
					/>
				</>
			);
		}
	},
);

import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import Cards from '../AllCards.js';
import { Card, DeckDisplay } from '../Components/index.jsx';
import { decodedeck } from '../etgutil.js';
import { calcWealth } from '../userutil.js';

class App extends Component {
	state = { deck: decodedeck(location.hash.slice(1)), card: null };

	hashChange = e => {
		this.setState({ deck: decodedeck(location.hash.slice(1)) });
	};

	componentDidMount() {
		window.addEventListener('hashchange', this.hashChange);
	}

	componentWillUnmount() {
		window.removeEventListener('hashchange', this.hashChange);
	}

	render() {
		return (
			<>
				<DeckDisplay
					cards={Cards}
					renderMark
					x={-64}
					y={-24}
					deck={this.state.deck}
					onMouseOver={(i, card) => this.setState({ card })}
				/>
				<Card x={36} y={206} card={this.state.card} />
				<span
					style={{
						position: 'absolute',
						left: '204px',
						top: '206px',
					}}>
					{calcWealth(Cards, this.state.deck, true)}
				</span>
			</>
		);
	}
}

createRoot(document.getElementById('deck')).render(<App />);

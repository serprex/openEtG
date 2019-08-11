import { Component } from 'react';
import reactDOM from 'react-dom';
import Cards from '../Cards.js';
import { Card, DeckDisplay } from '../Components/index.js';
import { decodedeck } from '../etgutil.js';
const deck = decodedeck(
	location.pathname.slice(location.pathname.lastIndexOf('/') + 1),
);

class App extends Component {
	constructor(props) {
		super(props);
		this.state = { card: null };
	}

	render() {
		return (
			<>
				<DeckDisplay
					cards={Cards}
					renderMark
					x={-64}
					y={-24}
					deck={deck}
					onMouseOver={(i, card) => this.setState({ card })}
				/>
				<Card x={36} y={206} card={this.state.card} />
			</>
		);
	}
}

reactDOM.render(<App />, document.getElementById('deck'));

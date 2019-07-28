import React from 'react';
import reactDOM from 'react-dom';
import { Card, DeckDisplay } from '../Components/index.js';
import { decodedeck } from '../etgutil.js';
const deck = decodedeck(
	location.pathname.slice(location.pathname.lastIndexOf('/') + 1),
);

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = { code: 0 };
	}

	render() {
		return (
			<>
				<DeckDisplay
					renderMark
					x={-64}
					y={-24}
					deck={deck}
					onMouseOver={(i, code) => this.setState({ code })}
				/>
				<Card x={36} y={206} code={this.state.code} />
			</>
		);
	}
}

reactDOM.render(<App />, document.getElementById('deck'));

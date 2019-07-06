import React from 'react';

import * as Components from '../Components/index.js';
import * as etgutil from '../etgutil.js';

export default class Editor extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			card: 0,
		};
	}

	setCardArt = code => {
		if (this.state.card != code) this.setState({ card: code });
	};

	addCard = code => {
		if (this.props.deck.length < 60)
			this.props.setDeck(this.props.deck.concat([code]));
	};

	rmCard = code => {
		const idx = this.props.deck.indexOf(code);
		if (~idx) {
			const newdeck = this.props.deck.slice();
			newdeck.splice(idx, 1);
			this.props.setDeck(newdeck);
		} else {
			code = etgutil.asShiny(code, 1);
			const idx = this.props.deck.indexOf(code);
			if (~idx) {
				const newdeck = this.props.deck.slice();
				newdeck.splice(idx, 1);
				this.props.setDeck(newdeck);
			}
		}
	};

	render() {
		const marksel = [];
		for (let i = 0; i < 13; i++) {
			marksel.push(
				<Components.IconBtn
					key={i}
					e={'e' + i}
					x={100 + i * 32}
					y={234}
					click={() => this.props.setMark(i)}
				/>,
			);
		}
		return (
			<>
				<Components.DeckDisplay
					onMouseOver={(_, code) => this.setCardArt(code)}
					onClick={(i, code) => {
						const newdeck = this.props.deck.slice();
						newdeck.splice(i, 1);
						this.props.setDeck(newdeck);
					}}
					deck={this.props.deck}
					pool={this.props.pool}
				/>
				<Components.CardSelector
					onMouseOver={this.setCardArt}
					onClick={this.addCard}
					onContextMenu={this.rmCard}
					maxedIndicator={!this.props.acard}
					filterboth={!!this.props.pool}
					cardpool={this.props.pool}
					cardminus={this.props.cardMinus}
				/>
				<input
					type="button"
					value="Clear"
					onClick={() => this.props.setDeck([])}
					style={{
						position: 'absolute',
						left: '8px',
						top: '32px',
					}}
				/>
				<span
					className={'ico e' + this.props.mark}
					style={{
						position: 'absolute',
						left: '66px',
						top: '200px',
					}}
				/>
				{marksel}
				<Components.Card x={734} y={8} code={this.state.card} />
			</>
		);
	}
}

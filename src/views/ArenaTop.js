import { Component } from 'react';

import Cards from '../Cards.js';
import * as Components from '../Components/index.js';
import * as sock from '../sock.js';
import * as store from '../store.js';

export default class ArenaTop extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		sock.emit({ x: 'arenatop', lv: this.props.lv });
		store.store.dispatch(
			store.setCmds({
				arenatop: info => this.setState(info),
			}),
		);
	}

	render() {
		const info = this.state.top ?? [];
		return (
			<>
				<ol
					className="atopol"
					style={{
						position: 'absolute',
						left: '90px',
						top: '16px',
					}}>
					{info.map((data, i) => {
						const card = Cards.Codes[data[5]].asUpped(this.props.lv);
						return (
							<li key={i}>
								<span className="atoptext">{data[0]}</span>
								<span className="atop1">{data[1]}</span>
								<span className="atop2">{data[2]}</span>
								<span className="atopdash">-</span>
								<span className="atop3">{data[3]}</span>
								<span className="atop4">{data[4]}</span>
								<span
									className="atoptext"
									onMouseEnter={e =>
										this.setState({
											card: card,
											cardx: e.pageX + 4,
											cardy: e.pageY + 4,
										})
									}
									onMouseLeave={() => this.setState({ card: null })}>
									{card.name}
								</span>
							</li>
						);
					})}
				</ol>
				<Components.ExitBtn x={8} y={300} />
				{this.state.card && (
					<Components.Card
						card={this.state.card}
						x={this.state.cardx}
						y={this.state.cardy}
					/>
				)}
			</>
		);
	}
}

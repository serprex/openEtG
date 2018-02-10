'use strict';
const sock = require('../sock'),
	chat = require('../chat'),
	Cards = require('../Cards'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react'),
	h = React.createElement;

module.exports = class ArenaTop extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		sock.emit('arenatop', this.props);
		store.store.dispatch(store.setCmds({
			arenatop: info => this.setState(info),
		}));
	}

	render() {
		const lv = this.props.lv;
		const info = this.state.top || [];
		const ol = (
			<ol
				className="atopol"
				style={{
					position: 'absolute',
					left: '90px',
					top: '50px',
				}}
				children={info.map((data, i) => {
					const lic = [<span className="atoptext">{data[0]}</span>];
					for (let i = 1; i <= 4; i++) {
						if (i == 3) {
							lic.push(<span className="atopdash">-</span>);
						}
						lic.push(<span className={'atop' + i}>{data[i]}</span>);
					}
					const card = Cards.Codes[data[5]].asUpped(lv);
					const cname = (
						<span
							className="atoptext"
							onMouseEnter={e =>
								this.setState({
									card: card,
									cardx: e.pageX + 4,
									cardy: e.pageY + 4,
								})
							}
							onMouseLeave={() => this.setState({ card: false })}>
							{card.name}
						</span>
					);
					lic.push(cname);
					return <li children={lic} />;
				})}
			/>
		);
		return (
			<React.Fragment>
				{ol}
				<Components.ExitBtn x={8} y={300} />
				{this.state.card && (
					<Components.Card
						card={this.state.card}
						x={this.state.cardx}
						y={this.state.cardy}
					/>
				)}
			</React.Fragment>
		);
	}
};

'use strict';
const px = require('../px'),
	sock = require('../sock'),
	chat = require('../chat'),
	Cards = require('../Cards'),
	Components = require('../Components'),
	h = preact.h;

module.exports = class ArenaTop extends preact.Component {
	componentDidMount() {
		sock.emit('arenatop', this.props);
		const self = this;
		px.view({
			cmds: {
				arenatop: info => self.setState(info),
			},
		});
	}

	render() {
		const self = this,
			lv = this.props.lv;
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
					for (var i = 1; i <= 4; i++) {
						if (i == 3) {
							lic.push(<span className="atopdash">'-'</span>);
						}
						lic.push(<span className={'atop' + i}>data[i]</span>);
					}
					const card = Cards.Codes[data[5]].asUpped(lv);
					const cname = (
						<span
							className="atoptext"
							onMouseEnter={e =>
								self.setState({
									card: card,
									cardx: e.pageX + 4,
									cardy: e.pageY + 4,
								})}
							onMouseLeave={() => self.setState({ card: false })}>
							{card.name}
						</span>
					);
					lic.push(cname);
					return <li children={lic} />;
				})}
			/>
		);
		return (
			<div>
				{ol}
				<Components.ExitBtn x={8} y={300} doNav={this.props.doNav} />
				{self.state.card && (
					<Components.Card
						card={self.state.card}
						x={self.state.cardx}
						y={self.state.cardy}
					/>
				)}
			</div>
		);
	}
};

'use strict';
const sock = require('../sock'),
	Components = require('../Components'),
	store = require('../store'),
	React = require('react');

module.exports = class WealthTop extends React.Component {
	constructor(props) {
		super(props);
		this.state = { top: null };
	}

	componentDidMount() {
		store.store.dispatch(
			store.setCmds({
				wealthtop: info => this.setState(info),
			}),
		);
		sock.emit({ x: 'wealthtop' });
	}

	render() {
		const ol1c = [],
			ol2c = [],
			{ top } = this.state;
		if (top) {
			for (let i = 0; i < top.length; i += 2) {
				const ol = i < 50 ? ol1c : ol2c;
				ol.push(
					<li key={i}>
						{top[i]}
						<span className="floatRight">{Math.round(top[i + 1])}</span>
					</li>,
				);
			}
		}
		return (
			<>
				<ol
					className="width400"
					style={{
						position: 'absolute',
						left: '80px',
						top: '8px',
					}}>
					{ol1c}
				</ol>
				<ol
					className="width400"
					start="26"
					style={{
						position: 'absolute',
						left: '480px',
						top: '8px',
					}}>
					{ol2c}
				</ol>
				<Components.ExitBtn x={8} y={300} />
			</>
		);
	}
};

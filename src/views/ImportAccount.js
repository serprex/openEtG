import React from 'react';

import * as sock from '../sock.js';
import { ExitBtn } from '../Components/index.js';

export default class ImportAccount extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			name: '',
			pass: '',
		};
	}

	render() {
		return (
			<div style={{ margin: '48px' }}>
				<input
					placeholder="Username"
					value={this.state.name}
					onChange={e => this.setState({ name: e.target.value })}
				/>
				<input
					type="password"
					placeholder="Password"
					value={this.state.pass}
					onChange={e => this.setState({ pass: e.target.value })}
				/>
				<input
					type="button"
					value="Submit"
					onClick={() => {
						sock.userEmit('importoriginal', {
							name: this.state.name,
							pass: this.state.pass,
						});
					}}
				/>
				<ExitBtn x={100} y={100} />
			</div>
		);
	}
}

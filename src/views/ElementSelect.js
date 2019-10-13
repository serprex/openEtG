import React from 'react';
import { connect } from 'react-redux';

import * as ui from '../ui.js';
import { run } from '../mkAi.js';
import * as sock from '../sock.js';
import RngMock from '../RngMock.js';
import { Card, ExitBtn } from '../Components/index.js';
import * as store from '../store.js';
import { mkQuestAi, quarks } from '../Quest.js';

const descriptions = [
	<>
		<Card x={168} y={48} code={5116} />
		<Card x={332} y={48} code={5106} />
		<Card x={168} y={324} code={5123} />
		<Card x={332} y={324} code={5122} />
		<Card x={496} y={324} code={5109} />
		<Card x={660} y={324} code={5111} />
	</>,
	<>
		<Card x={168} y={48} code={5208} />
		<Card x={332} y={48} code={5209} />
		<Card x={168} y={324} code={5217} />
		<Card x={332} y={324} code={5211} />
		<Card x={496} y={324} code={5204} />
		<Card x={660} y={324} code={5210} />
	</>,
	<>
		<Card x={168} y={48} code={5302} />
		<Card x={332} y={48} code={5313} />
		<Card x={168} y={324} code={5306} />
		<Card x={332} y={324} code={5314} />
		<Card x={496} y={324} code={5327} />
		<Card x={660} y={324} code={5307} />
	</>,
	<>
		<Card x={168} y={48} code={5428} />
		<Card x={332} y={48} code={5410} />
		<Card x={168} y={324} code={5404} />
		<Card x={332} y={324} code={5407} />
		<Card x={496} y={324} code={5412} />
		<Card x={660} y={324} code={5413} />
	</>,
	<>
		<Card x={168} y={48} code={5531} />
		<Card x={332} y={48} code={5510} />
		<Card x={168} y={324} code={5513} />
		<Card x={332} y={324} code={5507} />
		<Card x={496} y={324} code={5511} />
		<Card x={660} y={324} code={5512} />
	</>,
	<>
		<Card x={168} y={48} code={5612} />
		<Card x={332} y={48} code={5604} />
		<Card x={168} y={324} code={5606} />
		<Card x={332} y={324} code={5607} />
		<Card x={496} y={324} code={5608} />
		<Card x={660} y={324} code={5601} />
	</>,
	<>
		<Card x={168} y={48} code={5707} />
		<Card x={332} y={48} code={5705} />
		<Card x={168} y={324} code={5706} />
		<Card x={332} y={324} code={5710} />
		<Card x={496} y={324} code={5708} />
		<Card x={660} y={324} code={5701} />
	</>,
	<>
		<Card x={168} y={48} code={5810} />
		<Card x={332} y={48} code={5827} />
		<Card x={168} y={324} code={5811} />
		<Card x={332} y={324} code={5812} />
		<Card x={496} y={324} code={5803} />
		<Card x={660} y={324} code={5807} />
	</>,
	<>
		<Card x={168} y={48} code={5907} />
		<Card x={332} y={48} code={5908} />
		<Card x={168} y={324} code={5912} />
		<Card x={332} y={324} code={5913} />
		<Card x={496} y={324} code={5916} />
		<Card x={660} y={324} code={5906} />
	</>,
	<>
		<Card x={168} y={48} code={6012} />
		<Card x={332} y={48} code={6010} />
		<Card x={168} y={324} code={6005} />
		<Card x={332} y={324} code={6017} />
		<Card x={496} y={324} code={6008} />
		<Card x={660} y={324} code={6023} />
	</>,
	<>
		<Card x={168} y={48} code={6109} />
		<Card x={332} y={48} code={6102} />
		<Card x={168} y={324} code={6106} />
		<Card x={332} y={324} code={6105} />
		<Card x={496} y={324} code={6108} />
		<Card x={660} y={324} code={6126} />
	</>,
	<>
		<Card x={168} y={48} code={6213} />
		<Card x={332} y={48} code={6210} />
		<Card x={168} y={324} code={6205} />
		<Card x={332} y={324} code={6202} />
		<Card x={496} y={324} code={6211} />
		<Card x={660} y={324} code={6206} />
	</>,
	<span style={{ position: 'absolute', left: '200px', top: '508px' }}>
		Start without any cards, but gain several extra boosters instead!
	</span>,
	<span style={{ position: 'absolute', left: '200px', top: '548px' }}>
		This option picks one of the twelve elements randomly
	</span>,
];

export default connect(({ user }) => ({ user }))(
	class ElementSelect extends React.Component {
		constructor(props) {
			super(props);

			this.state = {
				eledesc: -1,
				skiptut: false,
				username: '',
				password: '',
				confirmpass: '',
				errmsg: '',
			};
		}

		componentDidMount() {
			store.store.dispatch(
				store.setCmds({
					login: data => {
						if (data.err) {
							this.setState({
								errmsg:
									'Failed to register. Try a different username. Server response: ' +
									data.err,
							});
						} else if (!data.accountbound && !data.pool) {
							delete data.x;
							this.props.dispatch(store.setUser(data));
							this.setState({ user: data });
						} else if (this.props.user) {
							delete data.x;
							store.store.dispatch(store.setUser(data));
							store.store.dispatch(store.setOptTemp('deck', sock.getDeck()));
							if (this.state.skiptut) {
								store.store.dispatch(store.doNav(import('./MainMenu.js')));
							} else {
								store.store.dispatch(store.setOptTemp('quest', [0]));
								run(mkQuestAi(quarks.basic_damage));
							}
						} else {
							this.setState({
								errmsg: `${data.name} already exists with that password. Click Exit to return to the login screen`,
							});
						}
					},
				}),
			);
		}

		render() {
			const mainc = [];
			if (this.props.user) {
				for (let i = 1; i <= 14; i++) {
					mainc.push(
						<span
							key={i}
							className={`imgb ico e${i === 14 ? 13 : i === 13 ? 14 : i}`}
							style={{
								position: 'absolute',
								left: '12px',
								top: `${24 + (i - 1) * 40}px`,
							}}
							onClick={() => {
								sock.emit({
									x: 'inituser',
									u: this.props.user.name,
									a: this.props.user.auth,
									e: i === 14 ? RngMock.upto(12) + 1 : i,
								});
							}}
							onMouseOver={() => this.setState({ eledesc: i - 1 })}>
							<span
								style={{
									position: 'absolute',
									left: '48px',
									top: '6px',
									width: '144px',
								}}>
								{ui.eleNames[i]}
							</span>
						</span>,
					);
				}
			}
			return (
				<>
					{this.props.user && (
						<>
							<span
								style={{
									position: 'absolute',
									left: '200px',
									top: '8px',
								}}>
								Select your starter element
							</span>
							{this.state.eledesc !== -1 && descriptions[this.state.eledesc]}
						</>
					)}
					{!this.props.user && (
						<div
							style={{
								position: 'absolute',
								left: '30px',
								top: '30px',
								width: '200px',
							}}>
							<input
								onChange={e => this.setState({ username: e.target.value })}
								value={this.state.username}
								placeholder="Username"
								style={{ display: 'block' }}
							/>
							<input
								onChange={e => this.setState({ password: e.target.value })}
								value={this.state.password}
								type="password"
								placeholder="Password"
								style={{ display: 'block' }}
							/>
							<input
								onChange={e =>
									this.setState({
										confirmpass: e.target.value,
									})
								}
								value={this.state.confirmpass}
								type="password"
								placeholder="Confirm"
								style={{ display: 'block' }}
							/>
							<input
								type="button"
								value="Register"
								style={{ display: 'block' }}
								onClick={e => {
									let errmsg = '';
									if (!this.state.username) {
										errmsg = 'Please enter a username';
									} else if (this.state.password !== this.state.confirmpass) {
										errmsg = 'Passwords do not match';
									} else {
										errmsg = 'Registering..';
										sock.emit({
											x: 'login',
											u: this.state.username,
											p: this.state.password,
										});
									}
									this.setState({ errmsg });
								}}
							/>
							{this.state.errmsg}
						</div>
					)}
					<ExitBtn
						x={800}
						y={200}
						onClick={() => {
							if (this.props.user) {
								sock.userEmit('delete');
								store.store.dispatch(store.setUser(null));
							}
							store.store.dispatch(store.setOpt('remember', false));
							store.store.dispatch(store.doNav(import('./Login.js')));
						}}
					/>
					<label
						style={{
							position: 'absolute',
							top: '30px',
							left: '500px',
							width: '396px',
						}}>
						<i style={{ display: 'block', marginBottom: '24px' }}>
							You will be taken to the tutorial after creating your account.
							<br />
							You can exit the tutorial at any time.
							<br />
							You can access the tutorial through Quests at any time.
						</i>
						<input
							type="checkbox"
							checked={this.state.skiptut}
							onChange={e => this.setState({ skiptut: e.target.checked })}
						/>{' '}
						Skip Tutorial
					</label>
					{mainc}
				</>
			);
		}
	},
);

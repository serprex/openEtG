import { Component } from 'react';
import { connect } from 'react-redux';

import * as ui from '../ui.js';
import { run } from '../mkAi.js';
import * as sock from '../sock.jsx';
import { Card, ExitBtn } from '../Components/index.jsx';
import * as store from '../store.jsx';
import { mkQuestAi, quarks } from '../Quest.js';
import Cards from '../Cards.js';

const descriptions = [
	<>
		<Card x={168} y={48} card={Cards.Names.SpiderCow} />
		<Card x={332} y={48} card={Cards.Names.ChaosSeed} />
		<Card x={168} y={324} card={Cards.Names.Alchemist} />
		<Card x={332} y={324} card={Cards.Names.UnstableShapeshifter} />
		<Card x={496} y={324} card={Cards.Names.Discord} />
		<Card x={660} y={324} card={Cards.Names.Antimatter} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.Poison} />
		<Card x={332} y={48} card={Cards.Names.Plague} />
		<Card x={168} y={324} card={Cards.Names.CommandSkeletons} />
		<Card x={332} y={324} card={Cards.Names.BoneWall} />
		<Card x={496} y={324} card={Cards.Names.Vulture} />
		<Card x={660} y={324} card={Cards.Names.Arsenic} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.Armagio} />
		<Card x={332} y={48} card={Cards.Names.Catapult} />
		<Card x={168} y={324} card={Cards.Names.Momentum} />
		<Card x={332} y={324} card={Cards.Names.Acceleration} />
		<Card x={496} y={324} card={Cards.Names.Boar} />
		<Card x={660} y={324} card={Cards.Names.Otyugh} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.IroncladBlacksmith} />
		<Card x={332} y={48} card={Cards.Names.ProtectArtifact} />
		<Card x={168} y={324} card={Cards.Names.TitaniumShield} />
		<Card x={332} y={324} card={Cards.Names.Pulverizer} />
		<Card x={496} y={324} card={Cards.Names.StoneSkin} />
		<Card x={660} y={324} card={Cards.Names.BasiliskBlood} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.AlphaWolf} />
		<Card x={332} y={48} card={Cards.Names.EmpathicBond} />
		<Card x={168} y={324} card={Cards.Names.Mitosis} />
		<Card x={332} y={324} card={Cards.Names.ThornCarapace} />
		<Card x={496} y={324} card={Cards.Names.Adrenaline} />
		<Card x={660} y={324} card={Cards.Names.Scorpion} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.Phoenix} />
		<Card x={332} y={48} card={Cards.Names.FireBolt} />
		<Card x={168} y={324} card={Cards.Names.Deflagration} />
		<Card x={332} y={324} card={Cards.Names.Fahrenheit} />
		<Card x={496} y={324} card={Cards.Names.RainofFire} />
		<Card x={660} y={324} card={Cards.Names.AshEater} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.ArcticSquid} />
		<Card x={332} y={48} card={Cards.Names.IceShield} />
		<Card x={168} y={324} card={Cards.Names.Purify} />
		<Card x={332} y={324} card={Cards.Names.Toadfish} />
		<Card x={496} y={324} card={Cards.Names.Trident} />
		<Card x={660} y={324} card={Cards.Names.Chrysaora} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.Miracle} />
		<Card x={332} y={48} card={Cards.Names.Byakko} />
		<Card x={168} y={324} card={Cards.Names.Luciferin} />
		<Card x={332} y={324} card={Cards.Names.Hope} />
		<Card x={496} y={324} card={Cards.Names.Pegasus} />
		<Card x={660} y={324} card={Cards.Names.Blessing} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.FireflyQueen} />
		<Card x={332} y={48} card={Cards.Names.Firefly} />
		<Card x={168} y={324} card={Cards.Names.Wings} />
		<Card x={332} y={324} card={Cards.Names.SkyBlitz} />
		<Card x={496} y={324} card={Cards.Names.Whim} />
		<Card x={660} y={324} card={Cards.Names.FlyingWeapon} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.Pharaoh} />
		<Card x={332} y={48} card={Cards.Names.Scarab} />
		<Card x={168} y={324} card={Cards.Names.GoldenHourglass} />
		<Card x={332} y={324} card={Cards.Names.Innovation} />
		<Card x={496} y={324} card={Cards.Names.Eternity} />
		<Card x={660} y={324} card={Cards.Names.MidassTouch} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.MinorVampire} />
		<Card x={332} y={48} card={Cards.Names.Devourer} />
		<Card x={168} y={324} card={Cards.Names.Nightfall} />
		<Card x={332} y={324} card={Cards.Names.Steal} />
		<Card x={496} y={324} card={Cards.Names.DrainLife} />
		<Card x={660} y={324} card={Cards.Names.ShankOfVoid} />
	</>,
	<>
		<Card x={168} y={48} card={Cards.Names.Psion} />
		<Card x={332} y={48} card={Cards.Names.Fractal} />
		<Card x={168} y={324} card={Cards.Names.PhaseShield} />
		<Card x={332} y={324} card={Cards.Names.Lightning} />
		<Card x={496} y={324} card={Cards.Names.Mindgate} />
		<Card x={660} y={324} card={Cards.Names.Lobotomizer} />
	</>,
	<span style={{ position: 'absolute', left: '200px', top: '508px' }}>
		Start without any cards, but gain several extra boosters instead!
	</span>,
	<span style={{ position: 'absolute', left: '200px', top: '548px' }}>
		This option picks one of the twelve elements randomly
	</span>,
];

export default connect(({ user }) => ({ user }))(
	class ElementSelect extends Component {
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
							if (this.state.skiptut) {
								store.store.dispatch(store.doNav(import('./MainMenu.jsx')));
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
									x: 'a',
									z: 'inituser',
									u: this.props.user.name,
									a: this.props.user.auth,
									e: i === 14 ? (Math.random() * 12 + 1) | 0 : i,
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
							store.store.dispatch(store.doNav(import('./Login.jsx')));
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

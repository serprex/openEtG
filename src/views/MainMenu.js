'use strict';
const etg = require('../etg'),
	Chat = require('../Components/Chat'),
	sock = require('../sock'),
	util = require('../util'),
	mkAi = require('../mkAi'),
	audio = require('../audio'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	store = require('../store'),
	RngMock = require('../RngMock'),
	Components = require('../Components'),
	userutil = require('../userutil'),
	{ connect } = require('react-redux'),
	React = require('react'),
	tipjar = [
		'Each card in your booster pack has a 50% chance of being from the chosen element',
		"Earn 5$ when your arena deck is faced, & another 10$ when it wins\nEarn 25$ for submitting a new arena deck, or 250$ if it's been a week",
		'Colosseum lets you compete in a number of daily events for extra prizes. The colosseum challenges reset daily',
		'Be sure to try the Proving Grounds Quests for some good cards',
		'Rarity ratings: Grey commons, green uncommons, blue rares, orange shard, & pink ultra rares',
		"The Library button allows you to see all of a user's cards & progress",
		'If you are a new user, be sure to get the free Bronze & Silver packs from the Shop',
		'Starter decks, cards from free packs, & all non-Common Daily Cards are account-bound; they cannot be traded or sold',
		'If you include account-bound cards in an upgrade, the upgrade will also be account-bound',
		"You'll receive a Daily Card upon logging in after midnight GMT0. If you submit an Arena deck, it contain 5 copies of that card",
		'Cards sell for around half as much as they cost to buy from a pack',
		'Quests are free to try, & you always face the same deck. Keep trying until you collect your reward',
		'You may mulligan at the start of the game to shuffle & redraw your hand with one less card',
		'Your account name is case sensitive',
		'Arena Tier 1 is unupgraded, while Tier 2 is upgraded. All decks in a tier have the same number of points',
		"Typing '/who' in chat you will get a list of the users who are online. '/w username message' will send your message only to one user",
		"Typing '/help' in chat will list all commands",
		'Keyboard shortcuts: space ends turn, backspace cancels, w targets opponent, s targets yourself, 1 through 8 cast cards in hand',
		'Remember that you may use the logout button to enter sandbox mode to review the card pool, check rarities & try out new decks',
		'Commoner & Mage are unupped, Champion has some upped, & Demigod is fully upped',
		'Decks submitted to arena lose hp exponentially per day, down to a minimum of a quarter of their original hp',
		"Rarity doesn't necessarily relate to card strength. You can go a long ways with commons & uncommons",
		'A ply is half a turn',
		'Mark cards are only obtainable through PvP events. A tournament deck verifier is at tournament.htm',
		"After an AI battle you will win a random common, uncommon, or rare from your opponent's deck",
		'Cards in packs have a (45/packsize)% chance to increment rarity',
		"At Wealth T50 you can see which players have the highest wealth. Wealth is a combination of current gold & one's cardpool",
		'Throttling means that the effect is limited to 2 procs when attacking multiple times with adrenaline',
	];

function Rect(props) {
	return <div style={{
		position: 'absolute',
		left: props.x + 'px',
		top: props.y + 'px',
		width: props.wid + 'px',
		height: props.hei + 'px',
	}}>
		{props.children}
	</div>;
};

function CostRewardHeaders(props) {
	return <Rect
		x={props.x}
		y={props.y}
		wid={props.wid}
		hei={props.hei}
	>
		{props.children}
		<span style={{
			position: 'absolute',
			top: '24px',
			right: '114px',
		}}>Cost</span>
		<span style={{
			position: 'absolute',
			top: '24px',
			right: '4px',
		}}>Base Reward</span>
	</Rect>;
}
function LabelText(props) {
	return <Components.Text
		text={props.text}
		style={{
			fontSize: '14px',
			pointerEvents: 'none',
			...props.style,
		}}
	/>;
}
function CostText(props) {
	return <LabelText
		text={userutil.pveCostReward[props.lv * 2 + props.n] + '$'}
		style={props.style}
	/>
}
function TitleText(props) {
	return <div style={{ fontSize: '20px', textAlign: 'center' }}>
		{props.text}
	</div>;
}
function AiButton(props) {
	const { name, onClick, onMouseOver, y, lv } = props;
	return <>
		<input type='button'
			value={name}
			onClick={onClick}
			onMouseOver={onMouseOver}
			style={{
				position: 'absolute',
				left: '4px',
				top: `${y}px`,
			}}
		/>
		<CostText
			n={0}
			lv={lv}
			style={{
				position: 'absolute',
				top: `${y}px`,
				right: '114px',
			}}
		/>
		<CostText
			n={1}
			lv={lv}
			style={{
				position: 'absolute',
				top: `${y}px`,
				right: '4px',
			}}
		/>
	</>;
}

module.exports = connect(({user, opts}) => ({
	user,
	remember: opts.remember,
	foename: opts.foename,
	enableSound: opts.enableSound,
	enableMusic: opts.enableMusic,
	hideRightpane: opts.hideRightpane,
	disableTut: opts.disableTut,
	lofiArt: opts.lofiArt,
}))(class MainMenu extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			showcard:
				props.nymph || (props.user && !props.user.daily && props.user.ocard),
			showsettings: false,
			changepass: false,
			newpass: '',
			newpass2: '',
			tipNumber: RngMock.upto(tipjar.length),
			tipText: '',
		};

		this.resetTip = e => {
			if (e.target.tagName && e.target.tagName.match(/^(DIV|CANVAS|HTML)$/)) {
				const tipText = this.props.user
					? tipjar[this.state.tipNumber]
					: "To register, just type desired username & password in the fields to the right, then click 'Login'";
				if (tipText !== this.state.tipText) this.setState({ tipText });
			}
		};
	}

	componentWillUnmount() {
		document.removeEventListener('mousemove', this.resetTip);
	}

	componentDidMount() {
		if (this.props.user && this.props.user.daily == 0 && this.props.user.ocard) {
			this.props.dispatch(store.updateUser({ daily: 128 }));
		}
		document.addEventListener('mousemove', this.resetTip);
		this.props.dispatch(store.setCmds({
			codecard: data => {
				this.props.dispatch(store.doNav(require('./Reward'), {
					type: data.type,
					amount: data.num,
					code: this.props.foename,
				}));
			},
			codegold: data => {
				this.props.dispatch(store.updateUser({ gold: this.props.user.gold + data.g }));
				this.props.dispatch(store.chat(<div>{data.g}<span className='ico gold' /> added!</div>));
			},
			codecode: data => {
				this.props.dispatch(store.updateUser({ pool: etgutil.addcard(this.props.user.pool, data.card) }));
				this.props.dispatch(store.chatMsg(Cards.Codes[data.card].name + ' added!', 'System'));
			},
		}));
	}

	mkSetTip(text) {
		return () => {
			if (this.state.tipText != text) {
				this.setState({ tipText: text });
			}
		};
	}

	render() {
		const self = this,
			leadc = [],
			arenac = [];
		for (let i = 0; i < 2; i++) {
			function arenaAi(e) {
				if (etgutil.decklength(sock.getDeck()) < 31) {
					self.props.dispatch(store.doNav(require('./DeckEditor')));
					return;
				}
				const cost = userutil.arenaCost(i);
				if (self.props.user.gold < cost) {
					self.props.dispatch(store.chatMsg(`Requires ${cost}$`, 'System'));
					return;
				}
				sock.userEmit('foearena', { lv: i });
				e.target.style.display = 'none';
			}
			if (self.props.user) {
				arenac.push(
					<AiButton name={'Arena' + (i + 1) + ' AI'}
						key={i}
						onClick={arenaAi}
						onMouseOver={this.mkSetTip(
							'In the arena you will face decks from other players',
						)}
						y={46+i*22}
						lv={4+i}
					/>
				);
			}
			leadc.push(
				<input type='button'
					key={i}
					value={'Arena' + (i + 1) + ' T20'}
					onClick={() => {
						this.props.dispatch(store.doNav(require('./ArenaTop'), { lv: i }));
					}}
					onMouseOver={this.mkSetTip(
						'See who the top players in arena are right now',
					)}
					style={{
						position: 'absolute',
						left: i ? '100px' : '10px',
					}}
				/>,
			);
		}

		function logout(cmd) {
			if (self.props.user) {
				sock.userEmit(cmd);
				self.props.dispatch(store.setUser(null));
				self.props.dispatch(store.setOpt('remember', false));
			}
			self.props.dispatch(store.doNav(require('./Login')));
		}
		audio.changeSound(this.props.enableSound);
		audio.changeMusic(this.props.enableMusic);
		const quickslots = [];
		if (self.props.user) {
			for (let i = 0; i < 10; i++) {
				quickslots.push(
					<input type='button'
						key={i}
						value={i + 1}
						className={
							'editbtn' +
							(self.props.user.selectedDeck == self.props.user.qecks[i]
								? ' selectedbutton'
								: '')}
						onClick={() => {
							sock.userExec('setdeck', { name: self.props.user.qecks[i] || '' });
							self.props.dispatch(store.setOpt('deck', sock.getDeck()));
						}}
					/>,
				);
			}
		}
		function changeFunc() {
			if (self.state.newpass === self.state.newpass2) {
				sock.userEmit('passchange', { p: self.state.newpass });
				self.setState({ changepass: false, newpass: '', newpass2: '' });
			} else {
				self.setState({ newpass: '', newpass2: '' });
				self.props.dispatch(store.chatMsg('Passwords do not match', 'System'));
			}
		}
		const customAi = (
			<div style={{
				width: '45%',
				float: 'right',
				marginTop: self.props.user ? undefined : '128px',
			}}>
				<input type='button'
					value='Custom AI'
					onClick={() => {
						this.props.dispatch(store.doNav(require('./Challenge'), { pvp: false }));
					}}
					onMouseOver={this.mkSetTip(
						'Play versus any deck you want, with custom stats for you & the AI',
					)}
				/>
				<LabelText text='Duel a custom AI' />
			</div>
		);
		return <div className='bg_main'>
			<>
				<Rect x={196} y={4} wid={504} hei={48}>
					<Components.Text text={this.state.tipText } />
					<input type='button'
						value='Next Tip'
						onClick={() => {
							const newTipNumber = (this.state.tipNumber + 1) % tipjar.length;
							this.setState({
								tipNumber: newTipNumber,
								tipText: tipjar[newTipNumber],
							});
						}}
						style={{
							position: 'absolute',
							right: '2px',
							bottom: '2px',
						}}
					/>
				</Rect>
				{self.props.user && <>
					<input type='button'
						value='Settings'
						style={{
							position: 'absolute',
							left: '620px',
							top: '558px',
						}}
						onClick={() => {
							this.setState({ showsettings: !this.state.showsettings, changepass: false, newpass: '', newpass2: '' });
						}}
					/>
					<Rect
						x={86}
						y={92}
						wid={196}
						hei={120}
					>
						<TitleText text='Stats' />
						<Components.Text
							text={
								`${self.props.user.gold}$ ${self.props.user.name}` +
								`\nPvE ${self.props.user.aiwins} - ${self.props.user.ailosses}` +
								`\nPvP ${self.props.user.pvpwins} - ${self.props.user.pvplosses}`
							}
						/>
					</Rect>
					<CostRewardHeaders x={304} y={380} wid={292} hei={130}>
						<TitleText text='Arena' />
						{self.props.user &&
							<input type='button'
								value='Arena Deck'
								onClick={() => {
									this.props.dispatch(store.doNav(require('./ArenaInfo')));
								}}
								onMouseOver={this.mkSetTip('Check how your arena decks are doing. Submitting a new deck earns 25$, while submitting after a week earns 250$')}
								style={{
									position: 'absolute',
									left: '20px',
									top: '100px',
								}}
							/>
						}
						{arenac}
					</CostRewardHeaders>
					{ this.state.showcard ?
						<Components.Card x={92} y={340} card={this.state.showcard} />
						: <>
							<Chat channel='Main'
								style={{
									position: 'absolute',
									left: '72px',
									top: '228px',
									width: '224px',
									height: '300px',
									overflow: 'hidden',
									background: 'transparent',
									fontSize: '14px',
									opacity: '0.6',
								}}
							/>
							<input
								placeholder='Chat'
								onKeyDown={e => {
									if (e.which == 13) {
										if (!e.target.value.match(/^\s*$/))
											sock.userEmit('chat', { msg: e.target.value });
										e.target.value = '';
									}
								}}
								style={{
									position: 'absolute',
									left: '99px',
									top: '532px',
								}}
							/>
						</>
					}
					</>
				}
				<Rect x={626} y={436} wid={196} hei={120}>
					<TitleText text='Leaderboards' />
					<input type='button'
						value='Wealth T50'
						onClick={() => {
							this.props.dispatch(store.doNav(require('./WealthTop')));
						}}
						onMouseOver={this.mkSetTip("See who's collected the most wealth")}
						style={{
							position: 'absolute',
							left: '52px',
						}}
					/>
					<br />
					{leadc}
				</Rect>
				<CostRewardHeaders x={304} y={120} wid={292} hei={240}>
					<TitleText text='AI Battle' />
					<AiButton name='Commoner'
						y={68} lv={0}
						onClick={mkAi.run(mkAi.mkAi(0))}
						onMouseOver={this.mkSetTip('Commoners have no upgraded cards & mostly common cards')}
					/>
					<AiButton name='Mage'
						y={90} lv={1}
						onClick={mkAi.run(mkAi.mkPremade(1))}
						onMouseOver={this.mkSetTip('Commoners have no upgraded cards & mostly common cards')}
					/>
					<AiButton name='Champion'
						y={112} lv={2}
						onClick={mkAi.run(mkAi.mkAi(2))}
						onMouseOver={this.mkSetTip('Commoners have no upgraded cards & mostly common cards')}
					/>
					<AiButton name='Demigod'
						y={134} lv={3}
						onClick={mkAi.run(mkAi.mkPremade(3))}
						onMouseOver={this.mkSetTip('Commoners have no upgraded cards & mostly common cards')}
					/>
					{self.props.user ? <>
						<div style={{
							marginTop: '132px',
							width: '45%',
							float: 'left',
							textAlign: 'right',
						}}>
							<input
								type='button'
								value='Colosseum'
								onClick={() => {
									this.props.dispatch(store.doNav(require('./Colosseum')));
								}}
								onMouseOver={this.mkSetTip('Try some daily challenges in the Colosseum')}
							/>
							<LabelText text='Daily Challenges' />
						</div>
						<div style={{
							marginTop: '132px',
							width: '45%',
							float: 'right',
						}}>
							<input type='button'
								value='Quests'
								onClick={() => {
									this.props.dispatch(store.doNav(require('./QuestMain')));
								}}
								onMouseOver={this.mkSetTip('Go on an adventure')}
							/>
							<LabelText text='Go on an adventure' />
						</div>
						{customAi}
					</> : customAi}
				</CostRewardHeaders>
				<Rect x={620} y={92} wid={196} hei={176}>
					<TitleText text='Cards & Decks' />
					<input type='button'
						value='Editor'
						onClick={() => {
							this.props.dispatch(store.doNav(self.props.user ? require('./DeckEditor') : require('./SandboxEditor')));
						}}
						onMouseOver={this.mkSetTip('Edit & manage your decks')}
						style={{
							position: 'absolute',
							left: '14px',
							top: '108px',
						}}
					/>
					{self.props.user && <>
						<LabelText
							text={'Deck: ' + self.props.user.selectedDeck}
							style={{
								width: '180px',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
								marginLeft: '16px',
							}}
						/>
						<div style={{ textAlign: 'center' }}>{quickslots}</div>
						<input type='button'
							value='Shop'
							onClick={() => {
								this.props.dispatch(store.doNav(require('./Shop')));
							}}
							onMouseOver={this.mkSetTip(
								'Buy booster packs which contain cards from the elements you choose',
							)}
							style={{
								position: 'absolute',
								left: '14px',
								top: '132px',
							}}
						/>
						<input type='button'
							value='Bazaar'
							onClick={() => {
								this.props.dispatch(store.doNav(require('./Bazaar')));
							}}
							onMouseOver={this.mkSetTip('Buy singles at a 300% premium')}
							style={{
								position: 'absolute',
								left: '114px',
								top: '132px',
							}}
						/>
						<input type='button'
							value='Upgrade'
							onClick={() => {
								this.props.dispatch(store.doNav(require('./Upgrade')));
							}}
							onMouseOver={this.mkSetTip('Upgrade or sell cards')}
							style={{
								position: 'absolute',
								left: '114px',
								top: '108px',
							}}
						/>
					</>}
				</Rect>
				<Rect x={616} y={300} wid={206} hei={130}>
					<TitleText text='Players' />
					<input
						placeholder='Trade/Library'
						value={this.props.foename}
						onChange={e => this.props.dispatch(store.setOptTemp('foename', e.target.value))}
						style={{ marginLeft: '24px' }}
					/>
					<input type='button'
						value='PvP'
						onClick={() => {
							this.props.dispatch(store.doNav(require('./Challenge'), { pvp: true }));
						}}
						style={{
							position: 'absolute',
							left: '10px',
							top: '100px',
						}}
					/>
					<input type='button'
						value='Library'
						onClick={() => {
							const name = self.props.foename || (self.props.user && self.props.user.name);
							if (name) this.props.dispatch(store.doNav(require('./Library'), { name }));
						}}
						onMouseOver={this.mkSetTip('See exactly what cards you or others own')}
						style={{
							position: 'absolute',
							left: '120px',
							top: '75px',
						}}
					/>
					{self.props.user && <>
						<input type='button'
							value='Trade'
							onClick={foe => {
								sock.trade = typeof foe === 'string' ? foe : self.props.foename;
								sock.userEmit('tradewant', { f: sock.trade });
							}}
							onMouseOver={this.mkSetTip('Initiate trading cards with another player')}
							style={{
								position: 'absolute',
								left: '10px',
								top: '75px',
							}}
						/>
						<input type='button'
							value='Reward'
							onClick={() => {
								sock.userEmit('codesubmit', { code: self.props.foename });
							}}
							onMouseOver={this.mkSetTip('Redeem a reward code')}
							style={{
								position: 'absolute',
								left: '120px',
								top: '100px',
							}}
						/>
					</>}
				</Rect>
				{typeof kongregateAPI === 'undefined' &&
					<input type='button'
						value='Logout'
						onClick={() => logout('logout')}
						onMouseOver={this.mkSetTip('Click here to log out')}
						style={{
							position: 'absolute',
							left: '744px',
							top: '558px',
						}}
					/>
				}
				{this.state.showsettings &&
					<Components.Box x={585} y={380} width={267} height={156}>
						<input
							type='button'
							value='Wipe Account'
							onClick={() => {
								if (this.props.foename == self.props.user.name + 'yesdelete') {
									logout('delete');
								} else {
									self.props.dispatch(store.chatMsg(
										`Input '${self.props.user.name}yesdelete' into Trade/Library to delete your account`,
										'System',
									));
								}
							}}
							onMouseOver={this.mkSetTip(
								'Click here to permanently remove your account',
							)}
							style={{
								position: 'absolute',
								left: '184px',
								top: '8px',
							}}
						/>
						{this.state.changepass ? <>
							<input
								placeholder='New Password'
								value={this.state.newpass}
								onChange={e => this.setState({ newpass: e.target.value })}
								onKeyPress={(e) => {
									if (e.which == 13) changeFunc();
								}}
								style={{
									position: 'absolute',
									left: '8px',
									top: '4px',
								}}
							/>
							<input
								placeholder='Confirm New'
								value={this.state.newpass2}
								onChange={e => this.setState({ newpass2: e.target.value })}
								onKeyPress={(e) => {
									if (e.which == 13) changeFunc();
								}}
								style={{
									position: 'absolute',
									left: '8px',
									top: '32px',
								}}
							/>
							<input
								type='button'
								value='Change Pass'
								onClick={changeFunc}
								style={{
									position: 'absolute',
									left: '8px',
									top: '56px',
								}}
							/>
						</> :
						<input
							type='button'
							value='Change Pass'
							onClick={() => this.setState({ changepass: true })}
							style={{
								position: 'absolute',
								left: '8px',
								top: '8px',
							}}
						/>}
						<label
							style={{
								position: 'absolute',
								left: '135px',
								top: '88px',
							}}>
							<input type='checkbox'
								value={this.props.enableSound}
								onChange={e => this.props.dispatch(store.setOpt('enableSound', e.target.value))}
							/>
							Enable sound
						</label>
						<label
							style={{
								position: 'absolute',
								left: '135px',
								top: '53px',
							}}>
							<input type='checkbox'
								value={this.props.enableMusic}
								onChange={e => this.props.dispatch(store.setOpt('enableMusic', e.target.value))}
							/>
							Enable music
						</label>
						<label
							style={{
								position: 'absolute',
								left: '8px',
								top: '88px',
							}}>
							<input type='checkbox'
								checked={this.props.hideRightpane}
								onChange={e => this.props.dispatch(store.setOpt('hideRightpane', e.target.checked))}
							/>
							Hide rightpane
						</label>
						<label
							style={{
								position: 'absolute',
								left: '8px',
								top: '123px',
							}}>
							<input
								type='checkbox'
								checked={this.props.disableTut}
								onChange={e => this.props.dispatch(store.setOpt('disableTut', e.target.checked))}
							/>
							Disable tutorial
						</label>
						<label
							style={{
								position: 'absolute',
								left: '135px',
								top: '123px',
							}}>
							<input
								type='checkbox'
								checked={this.props.lofiArt}
								onChange={e => this.props.dispatch(store.setOpt('lofiArt', e.target.checked))}
							/>
							Lofi Art
						</label>
					</Components.Box>
				}
			</>
		</div>;
	}
});

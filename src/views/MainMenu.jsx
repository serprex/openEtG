import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import * as audio from '../audio.js';
import Chat from '../Components/Chat.jsx';
import * as sock from '../sock.jsx';
import * as mkAi from '../mkAi.js';
import Cards from '../Cards.js';
import * as etgutil from '../etgutil.js';
import * as store from '../store.jsx';
import * as Components from '../Components/index.jsx';
import * as userutil from '../userutil.js';
import parseChat from '../parseChat.js';

const tipjar = [
	'Clicking on play by play rectangles will show the game state at that point of history',
	'Each card in your booster pack has a 50% chance of being from the chosen element',
	'Colosseum lets you compete in a number of daily events for extra prizes. The colosseum challenges reset daily',
	'Be sure to try the Proving Grounds Quests for some good cards',
	'Rarity ratings: Grey commons, green uncommons, blue rares, & pink ultra rares',
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
	"Typing '/who' in chat you will get a list of the users who are online. '/w user message' whispers that user",
	"Typing '/help' in chat will list all commands",
	'Keyboard shortcuts: space ends turn, backspace cancels, w targets opponent, s targets yourself, 1 through 8 cast cards in hand',
	'Commoner & Mage are unupped, Champion has some upped, & Demigod is fully upped',
	"Rarity doesn't necessarily relate to card strength. You can go a long ways with commons & uncommons",
	'A ply is half a turn',
	'Mark cards are only obtainable through PvP events. A tournament deck verifier is at tournament.htm',
	"After an AI battle you will win a random common, uncommon, or rare from your opponent's deck",
	'Wealth T60 is a leaderboard for player wealth. Wealth is a combination of current gold & cardpool',
];

function Rect(props) {
	return (
		<div
			style={{
				position: 'absolute',
				left: props.x + 'px',
				top: props.y + 'px',
				width: props.wid + 'px',
				height: props.hei + 'px',
			}}>
			{props.children}
		</div>
	);
}

const CostRewardHeadersText = (
	<>
		<span
			style={{
				position: 'absolute',
				top: '24px',
				right: '114px',
			}}>
			Cost
		</span>
		<span
			style={{
				position: 'absolute',
				top: '24px',
				right: '4px',
			}}>
			Reward
		</span>
	</>
);
function CostRewardHeaders(props) {
	return (
		<Rect x={props.x} y={props.y} wid={props.wid} hei={props.hei}>
			{props.children}
			{CostRewardHeadersText}
		</Rect>
	);
}
function LabelText(props) {
	return (
		<Components.Text
			text={props.text}
			style={{
				fontSize: '14px',
				pointerEvents: 'none',
				...props.style,
			}}
		/>
	);
}
function CostText(props) {
	return (
		<LabelText
			text={userutil.pveCostReward[props.lv * 2 + props.n] + '$'}
			style={props.style}
		/>
	);
}
function TitleText(props) {
	return (
		<div style={{ fontSize: '20px', textAlign: 'center' }}>{props.text}</div>
	);
}
function AiButton({ name, onClick, onMouseOver, y, lv }) {
	return (
		<>
			<input
				type="button"
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
		</>
	);
}

const chatStyle = {
	position: 'absolute',
	left: '72px',
	top: '228px',
	width: '226px',
	height: '300px',
	background: 'transparent',
	fontSize: '14px',
	opacity: '0.6',
};

function setPbpSetting(e) {
	store.store.dispatch(store.setOpt('playByPlayMode', e.target.value));
}

function logout(cmd) {
	sock.userEmit('logout');
	store.store.dispatch(store.setUser(null));
	store.store.dispatch(store.setOpt('remember', false));
	store.store.dispatch(store.doNav(import('./Login.jsx')));
}

export default function MainMenu(props) {
	const user = useSelector(({ user }) => user),
		opts = useSelector(({ opts }) => opts),
		foename = opts.foename ?? '',
		enableSound = !!opts.enableSound,
		enableMusic = !!opts.enableMusic,
		hideRightpane = !!opts.hideRightpane,
		hideMainchat = !!opts.hideMainchat,
		disableTut = !!opts.disableTut,
		lofiArt = !!opts.lofiArt,
		playByPlayMode = opts.playByPlayMode ?? '',
		expectedDamageSamples = opts.expectedDamageSamples || '4';

	const showcard = useMemo(
		() => props.nymph ?? (user.daily === 0 && user.ocard),
		[],
	);

	const [settings, setSettings] = useState(false);
	const [changepass, setChangepass] = useState(false);
	const [newpass, setNewpass] = useState(false);
	const [newpass2, setNewpass2] = useState(false);

	const [tipNumber, setTipNumber] = useState(
			() => (Math.random() * tipjar.length) | 0,
		),
		[tip, setTip] = useState('');

	const resetTip = useCallback(
		e => {
			if (e.target.tagName && e.target.tagName.match(/^(DIV|CANVAS|HTML)$/)) {
				setTip(tipjar[tipNumber]);
			}
		},
		[tipNumber],
	);

	useEffect(() => {
		if (user.daily === 0 && user.ocard) {
			store.store.dispatch(store.updateUser({ daily: 128 }));
		}
		document.addEventListener('mousemove', resetTip);
		return () => document.removeEventListener('mousemove', resetTip);
	}, [resetTip]);

	useEffect(() => {
		store.store.dispatch(
			store.setCmds({
				codecard: data => {
					store.store.dispatch(
						store.doNav(import('./Reward.jsx'), {
							type: data.type,
							amount: data.num,
							code: foename,
						}),
					);
				},
				codegold: data => {
					store.store.dispatch(
						store.updateUser({
							gold: user.gold + data.g,
						}),
					);
					store.store.dispatch(
						store.chat(
							<div>
								{data.g}
								<span className="ico gold" /> added!
							</div>,
						),
					);
				},
				codecode: data => {
					store.store.dispatch(
						store.updateUser({
							pool: etgutil.addcard(user.pool, data.card),
						}),
					);
					store.store.dispatch(
						store.chatMsg(Cards.Codes[data.card].name + ' added!', 'System'),
					);
				},
			}),
		);
	}, [user?.gold, user?.pool, foename]);

	const mkSetTip = tip => () => setTip(tip);

	const arenaAi = i => {
		const cost = userutil.arenaCost(i);
		return e => {
			if (!Cards.isDeckLegal(etgutil.decodedeck(sock.getDeck()), user)) {
				store.store.dispatch(store.chatMsg('Invalid deck', 'System'));
			} else if (user.gold < cost) {
				store.store.dispatch(store.chatMsg(`Requires ${cost}$`, 'System'));
			} else {
				sock.userEmit('foearena', { lv: i });
				e.target.style.display = 'none';
			}
		};
	};

	const changeFunc = () => {
		if (newpass === newpass2) {
			sock.userEmit('passchange', { p: newpass });
			setChangepass(false);
			setNewpass('');
			setNewpass2('');
		} else {
			setNewpass('');
			setNewpass2('');
			store.store.dispatch(store.chatMsg('Passwords do not match', 'System'));
		}
	};

	const CostRewardHeadersVdom = useMemo(
		() => (
			<CostRewardHeaders x={304} y={120} wid={292} hei={240}>
				<TitleText text="Battle" />
				<AiButton
					name="Commoner"
					y={48}
					lv={0}
					onClick={() => mkAi.run(mkAi.mkAi(0))}
					onMouseOver={mkSetTip(
						'Commoners have no upgraded cards & mostly common cards',
					)}
				/>
				<AiButton
					name="Mage"
					y={72}
					lv={1}
					onClick={() => mkAi.run(mkAi.mkPremade(1))}
					onMouseOver={mkSetTip(
						'Mages have preconstructed decks with a couple rares',
					)}
				/>
				<AiButton
					name="Champion"
					y={96}
					lv={2}
					onClick={() => mkAi.run(mkAi.mkAi(2))}
					onMouseOver={mkSetTip('Champions have some upgraded cards')}
				/>
				<AiButton
					name="Demigod"
					y={120}
					lv={3}
					onClick={() => mkAi.run(mkAi.mkPremade(3))}
					onMouseOver={mkSetTip(
						'Demigods are extremely powerful. Come prepared',
					)}
				/>
				<AiButton
					name="Arena 1"
					onClick={arenaAi(0)}
					onMouseOver={mkSetTip(
						'In the arena you will face decks from other players',
					)}
					y={144}
					lv={4}
				/>
				<AiButton
					name="Arena 2"
					onClick={arenaAi(1)}
					onMouseOver={mkSetTip(
						'In the arena you will face upgraded decks from other players',
					)}
					y={168}
					lv={5}
				/>
			</CostRewardHeaders>
		),
		[],
	);

	const leadc = [];
	for (let i = 0; i < 2; i++) {
		leadc.push(
			<input
				type="button"
				key={i}
				value={`Arena${i + 1} T30`}
				onClick={() => {
					store.store.dispatch(
						store.doNav(import('./ArenaTop.jsx'), { lv: i }),
					);
				}}
				onMouseOver={mkSetTip('See who the top players in arena are right now')}
				style={{
					position: 'absolute',
					left: i ? '92px' : '10px',
				}}
			/>,
		);
	}

	const quickslots = useMemo(() => {
		if (!user) return null;
		const slots = [];
		for (let i = 0; i < 10; i++) {
			slots.push(
				<input
					type="button"
					key={i}
					value={i + 1}
					className={`editbtn ${
						user.selectedDeck === user.qecks[i] ? ' selectedbutton' : ''
					}`}
					onMouseOver={() => setTip(user.qecks[i] ?? '')}
					onClick={() => {
						sock.userExec('setdeck', { name: user.qecks[i] ?? '' });
					}}
				/>,
			);
		}
		return slots;
	}, [user?.selectedDeck, user?.qecks]);

	return (
		user && (
			<div className="bg_main">
				<>
					<Rect x={196} y={4} wid={504} hei={48}>
						<Components.Text text={tip} />
						<input
							type="button"
							value="Next Tip"
							onClick={() => {
								const newTipNumber = (tipNumber + 1) % tipjar.length;
								setTipNumber(newTipNumber);
								setTip(tipjar[newTipNumber]);
							}}
							style={{
								position: 'absolute',
								right: '2px',
								bottom: '2px',
							}}
						/>
					</Rect>
					<input
						type="button"
						value="Settings"
						style={{
							position: 'absolute',
							left: '620px',
							top: '558px',
						}}
						onClick={() => {
							setSettings(!settings);
							setChangepass(false);
							setNewpass('');
							setNewpass2('');
						}}
					/>
					<Rect x={86} y={92} wid={196} hei={120}>
						<TitleText text="Stats" />
						<Components.Text
							text={`${user.name}\n${user.gold}$\nPvE ${user.aiwins} - ${user.ailosses}\nPvP ${user.pvpwins} - ${user.pvplosses}`}
						/>
					</Rect>
					<Rect x={304} y={380} wid={292} hei={130}>
						<TitleText text="Miscellaneous" />
						<div>
							<div
								style={{
									display: 'inline-block',
									width: '49%',
									textAlign: 'center',
								}}>
								<input
									type="button"
									value="Colosseum"
									onClick={() => {
										store.store.dispatch(
											store.doNav(import('./Colosseum.jsx')),
										);
									}}
									onMouseOver={mkSetTip(
										'Try some daily challenges in the Colosseum',
									)}
								/>
							</div>
							<div
								style={{
									display: 'inline-block',
									width: '49%',
									textAlign: 'center',
								}}>
								<input
									type="button"
									value="Quests"
									onClick={() =>
										store.store.dispatch(store.doNav(import('./Quest.jsx')))
									}
									onMouseOver={mkSetTip('Go on an adventure')}
								/>
							</div>
						</div>
						<div
							style={{
								marginTop: '4px',
							}}>
							<div
								style={{
									display: 'inline-block',
									width: '49%',
									textAlign: 'center',
								}}>
								<input
									type="button"
									value="Arena Deck"
									onClick={() =>
										store.store.dispatch(store.doNav(import('./ArenaInfo.jsx')))
									}
									onMouseOver={mkSetTip('Check how your arena decks are doing')}
								/>
							</div>
							<div
								style={{
									display: 'inline-block',
									width: '49%',
									textAlign: 'center',
								}}>
								<input
									type="button"
									value="Custom"
									onClick={() => {
										store.store.dispatch(
											store.doNav(import('./Challenge.jsx'), {
												pvp: false,
											}),
										);
									}}
									onMouseOver={mkSetTip(
										'Setup custom games vs AI or other players',
									)}
								/>
							</div>
						</div>
						<div
							style={{
								marginTop: '4px',
							}}>
							<div
								style={{
									display: 'inline-block',
									width: '49%',
									textAlign: 'center',
								}}>
								<input
									type="button"
									value="Legacy"
									onClick={() => {
										store.store.dispatch(
											store.doNav(import('../vanilla/views/Login.jsx')),
										);
									}}
									onMouseOver={mkSetTip(
										'A mode attempting to imitate the original EtG',
									)}
								/>
							</div>
						</div>
					</Rect>
					{showcard ? (
						<Components.Card x={92} y={340} card={Cards.Codes[showcard]} />
					) : (
						!hideMainchat && (
							<>
								<Chat channel="Main" style={chatStyle} />
								<input
									placeholder="Chat"
									onKeyDown={parseChat}
									style={{
										position: 'absolute',
										left: '99px',
										top: '532px',
									}}
								/>
							</>
						)
					)}
					<Rect x={626} y={420} wid={196} hei={120}>
						<TitleText text="Leaderboards" />
						<input
							type="button"
							value="Wealth T60"
							onClick={() => {
								store.store.dispatch(store.doNav(import('./WealthTop.jsx')));
							}}
							onMouseOver={mkSetTip("See who's collected the most wealth")}
							style={{ marginLeft: '25%' }}
						/>
						<div style={{ marginTop: '4px' }}>{leadc}</div>
					</Rect>
					{CostRewardHeadersVdom}
					<Rect x={620} y={92} wid={196} hei={176}>
						<TitleText text="Cards" />
						<input
							type="button"
							value="Editor"
							onClick={() => {
								store.store.dispatch(store.doNav(import('./DeckEditor.jsx')));
							}}
							onMouseOver={mkSetTip('Edit & manage your decks')}
							style={{
								position: 'absolute',
								left: '14px',
								top: '108px',
							}}
						/>
						<LabelText
							text={'Deck: ' + user.selectedDeck}
							style={{
								width: '180px',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
								marginLeft: '16px',
							}}
						/>
						<div style={{ textAlign: 'center' }}>{quickslots}</div>
						<input
							type="button"
							value="Shop"
							onClick={() => {
								store.store.dispatch(store.doNav(import('./Shop.jsx')));
							}}
							onMouseOver={mkSetTip(
								'Buy booster packs which contain cards from the elements you choose',
							)}
							style={{
								position: 'absolute',
								left: '14px',
								top: '132px',
							}}
						/>
						<input
							type="button"
							value="Upgrade"
							onClick={() => {
								store.store.dispatch(store.doNav(import('./Upgrade.jsx')));
							}}
							onMouseOver={mkSetTip('Upgrade or sell cards')}
							style={{
								position: 'absolute',
								left: '102px',
								top: '108px',
							}}
						/>
						<input
							type="button"
							value="Bazaar"
							onClick={() => {
								store.store.dispatch(store.doNav(import('./Bazaar.jsx')));
							}}
							onMouseOver={mkSetTip(
								"Put up cards for sale & review other players' offers",
							)}
							style={{
								position: 'absolute',
								left: '102px',
								top: '132px',
							}}
						/>
					</Rect>
					<Rect x={616} y={300} wid={206} hei={130}>
						<TitleText text="Players" />
						<input
							placeholder="Player's Name"
							value={foename}
							onChange={e =>
								store.store.dispatch(
									store.setOptTemp('foename', e.target.value),
								)
							}
							style={{ marginLeft: '24px' }}
						/>
						<input
							type="button"
							value="Library"
							onClick={() => {
								const name = foename || user.name;
								if (name)
									store.store.dispatch(
										store.doNav(import('./Library.jsx'), {
											name,
										}),
									);
							}}
							onMouseOver={mkSetTip('See exactly what cards you or others own')}
							style={{
								position: 'absolute',
								left: '112px',
								top: '64px',
							}}
						/>
						<input
							type="button"
							value="PvP"
							onClick={() => sock.sendChallenge(foename)}
							style={{
								position: 'absolute',
								left: '10px',
								top: '88px',
							}}
						/>
						<input
							type="button"
							value="Trade"
							onClick={() => {
								sock.userEmit('offertrade', {
									f: foename,
									cards: '',
									g: 0,
									forcards: null,
									forg: null,
								});
								store.store.dispatch(
									store.doNav(import('./Trade.jsx'), {
										foe: foename,
									}),
								);
							}}
							onMouseOver={mkSetTip('Trade cards/$ with another player')}
							style={{
								position: 'absolute',
								left: '10px',
								top: '64px',
							}}
						/>
						<input
							type="button"
							value="Reward"
							onClick={() => {
								sock.userEmit('codesubmit', {
									code: foename,
								});
							}}
							onMouseOver={mkSetTip('Redeem a reward code')}
							style={{
								position: 'absolute',
								left: '112px',
								top: '88px',
							}}
						/>
					</Rect>
					{typeof kongregateAPI === 'undefined' && (
						<input
							type="button"
							value="Logout"
							onClick={logout}
							onMouseOver={mkSetTip('Click here to log out')}
							style={{
								position: 'absolute',
								left: '744px',
								top: '558px',
							}}
						/>
					)}
					{settings && (
						<Components.Box x={580} y={300} width={300} height={240}>
							{changepass ? (
								<>
									<input
										placeholder="New Password"
										value={newpass}
										onChange={e => setNewpass(e.target.value)}
										onKeyPress={e => {
											if (e.which === 13) changeFunc();
										}}
										style={{
											position: 'absolute',
											left: '136px',
											top: '4px',
											width: '128px',
										}}
									/>
									<input
										placeholder="Confirm New"
										value={newpass2}
										onChange={e => setNewpass2(e.target.value)}
										onKeyPress={e => {
											if (e.which === 13) changeFunc();
										}}
										style={{
											position: 'absolute',
											left: '136px',
											top: '32px',
											width: '128px',
										}}
									/>
									<input
										type="button"
										value="Change Password"
										onClick={changeFunc}
										style={{
											position: 'absolute',
											left: '8px',
											top: '8px',
											width: '120px',
										}}
									/>
									<input
										type="button"
										value="Cancel Change"
										onClick={() => {
											setChangepass(false);
											setNewpass('');
											setNewpass2('');
										}}
										style={{
											position: 'absolute',
											left: '8px',
											top: '32px',
											width: '120px',
										}}
									/>
								</>
							) : (
								<input
									type="button"
									value="Change Password"
									onClick={() => setChangepass(true)}
									style={{
										position: 'absolute',
										left: '8px',
										top: '8px',
										width: '120px',
									}}
								/>
							)}
							<label
								style={{
									position: 'absolute',
									left: '136px',
									top: '88px',
								}}>
								<input
									type="checkbox"
									checked={enableSound}
									onChange={e => {
										audio.changeSound(e.target.checked);
										store.store.dispatch(
											store.setOpt('enableSound', e.target.checked),
										);
									}}
								/>
								Enable sound
							</label>
							<label
								style={{
									position: 'absolute',
									left: '136px',
									top: '53px',
								}}>
								<input
									type="checkbox"
									checked={enableMusic}
									onChange={e => {
										audio.changeMusic(e.target.checked);
										store.store.dispatch(
											store.setOpt('enableMusic', e.target.checked),
										);
									}}
								/>
								Enable music
							</label>
							<label
								style={{
									position: 'absolute',
									left: '8px',
									top: '53px',
								}}>
								<input
									type="checkbox"
									checked={hideMainchat}
									onChange={e =>
										store.store.dispatch(
											store.setOpt('hideMainchat', e.target.checked),
										)
									}
								/>
								Hide mainchat
							</label>
							<label
								style={{
									position: 'absolute',
									left: '8px',
									top: '88px',
								}}>
								<input
									type="checkbox"
									checked={hideRightpane}
									onChange={e =>
										store.store.dispatch(
											store.setOpt('hideRightpane', e.target.checked),
										)
									}
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
									type="checkbox"
									checked={disableTut}
									onChange={e =>
										store.store.dispatch(
											store.setOpt('disableTut', e.target.checked),
										)
									}
								/>
								Hide help
							</label>
							<label
								style={{
									position: 'absolute',
									left: '136px',
									top: '123px',
								}}>
								<input
									type="checkbox"
									checked={lofiArt}
									onChange={e =>
										store.store.dispatch(
											store.setOpt('lofiArt', e.target.checked),
										)
									}
								/>
								Lofi Art
							</label>
							<span
								style={{
									position: 'absolute',
									left: '8px',
									top: '158px',
								}}>
								Play by play
								<label>
									<input
										type="radio"
										name="settings-pbp"
										value=""
										checked={playByPlayMode === ''}
										onChange={setPbpSetting}
									/>
									On
								</label>
								<label>
									<input
										type="radio"
										name="settings-pbp"
										value="noline"
										checked={playByPlayMode === 'noline'}
										onChange={setPbpSetting}
									/>
									No line
								</label>
								<label>
									<input
										type="radio"
										name="settings-pbp"
										value="disabled"
										checked={playByPlayMode === 'disabled'}
										onChange={setPbpSetting}
									/>
									Off
								</label>
							</span>
							<label
								style={{ position: 'absolute', left: '8px', top: '193px' }}>
								Expected Damage Samples {expectedDamageSamples}
								<input
									type="range"
									style={{ width: '272px' }}
									min={1}
									max={5}
									value={expectedDamageSamples}
									onChange={e =>
										store.store.dispatch(
											store.setOpt('expectedDamageSamples', e.target.value),
										)
									}
								/>
							</label>
						</Components.Box>
					)}
				</>
			</div>
		)
	);
}
import { createSignal, onCleanup, onMount } from 'solid-js';

import { changeMusic, changeSound } from '../audio.js';
import Chat from '../Components/Chat.jsx';
import * as sock from '../sock.jsx';
import { mkAi, mkPremade } from '../mkAi.js';
import Cards from '../Cards.js';
import { addcard, decodedeck } from '../etgutil.js';
import * as store from '../store.jsx';
import Card from '../Components/Card.jsx';
import { arenaCost, pveCostReward } from '../userutil.js';
import parseChat from '../parseChat.js';

const hasflag = store.hasflag;
const tipjar = [
	'Clicking on play by play rectangles will show the game state at that point of history',
	'Each card in your booster pack has a \u2154 chance of being from the chosen element',
	'Colosseum lets you compete in a number of daily events for extra prizes. The colosseum challenges reset daily',
	'Be sure to try the Proving Grounds Quests for some good cards',
	'Rarity ratings: Grey commons, green uncommons, blue rares, & pink ultra rares',
	"The Library button allows you to see all of a user's cards & progress",
	'If you are a new user, be sure to get your free packs from the Shop',
	'Starter decks, cards from free packs, & all non-Common Daily Cards are account-bound; they cannot be traded or sold',
	'If you include account-bound cards in an upgrade, the upgrade will also be account-bound',
	"You'll receive a Daily Card upon logging in after midnight UTC. If you submit an Arena deck, it contain 5 copies of that card",
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
	'Wealth used by leaderboards is a combination of current gold & cardpool',
];

function AiButton({ name, onClick, onMouseOver, lv }) {
	return (
		<div style="display:flex;font-size:14px;padding-top:4px">
			<input
				type="button"
				value={name}
				onClick={onClick}
				onMouseOver={onMouseOver}
			/>
			<div class="costcolumn">
				{pveCostReward[lv * 2]}
				<span class="ico gold" />
			</div>
			<div class="costcolumn">
				{pveCostReward[lv * 2 + 1]}
				<span class="ico gold" />
			</div>
		</div>
	);
}

function setPbpSetting(e) {
	store.setOpt('playByPlayMode', e.target.value);
}

function logout() {
	sock.userEmit('logout');
	store.logout();
	store.setOpt('remember', false);
	store.doNav(store.Login);
}

export default function MainMenu(props) {
	const rx = store.useRx();
	const foename = () => (rx.opts.foename ?? '').trim(),
		expectedDamageSamples = () => rx.opts.expectedDamageSamples || '4';

	const [ocard, setocard] = createSignal(props.nymph);
	const [settings, setSettings] = createSignal(false);
	const [changepass, setChangepass] = createSignal(false);
	let newpass, newpass2;

	const [tipNumber, setTipNumber] = createSignal(
			(Math.random() * tipjar.length) | 0,
		),
		[tip, setTip] = createSignal('');

	const resetTip = e => {
		if (e.target.tagName && e.target.tagName.match(/^(DIV|CANVAS|HTML)$/)) {
			setTip(tipjar[tipNumber()]);
		}
	};

	onMount(() => {
		if (
			!hasflag(rx.user, 'no-oracle') &&
			((Date.now() / 86400000) | 0) > rx.user.oracle
		) {
			sock.userEmit('oracle', {});
		}
		document.addEventListener('mousemove', resetTip);
		sock.setCmds({
			oracle: data => {
				setocard(data.c);
				const update = {
					daily: 128,
					pool: addcard(rx.user.pool, data.c),
					dailymage: data.mage,
					dailydg: data.dg,
					oracle: data.day,
					ostreakday: 0,
					ostreakday2: data.day,
					ocard: data.c,
				};
				if (data.bound) {
					update.accountbound = addcard(rx.user.accountbound, data.c);
				} else {
					update.pool = addcard(rx.user.pool, data.c);
				}
				store.updateUser(update);
				store.chatMsg('Daily Reward: ' + Cards.Codes[data.c].name, 'System');
			},
			codecard: data => {
				store.doNav(import('./Reward.jsx'), {
					type: data.type,
					amount: data.num,
					code: foename(),
				});
			},
			codegold: data => {
				store.updateUser({ gold: rx.user.gold + data.g });
				store.chat(() => (
					<div>
						{data.g}
						<span class="ico gold" /> added!
					</div>
				));
			},
			codecode: data => {
				store.updateUser({
					pool: addcard(rx.user.pool, data.card),
				});
				store.chatMsg(Cards.Codes[data.card].name + ' added!', 'System');
			},
		});
	});

	onCleanup(() => document.removeEventListener('mousemove', resetTip));

	const arenaAi = i => {
		const cost = arenaCost(i);
		return e => {
			if (!Cards.isDeckLegal(decodedeck(store.getDeck()), rx.user)) {
				store.chatMsg('Invalid deck', 'System');
			} else if (rx.user.gold < cost) {
				store.requiresGold(cost);
			} else {
				sock.userEmit('foearena', { lv: i });
				e.target.style.display = 'none';
			}
		};
	};

	const changeFunc = () => {
		if (newpass.value === newpass2.value) {
			sock.userEmit('passchange', { p: newpass.value });
			setChangepass(false);
		} else {
			store.chatMsg('Passwords do not match', 'System');
		}
		newpass.value = '';
		newpass2.value = '';
	};

	const leadc = [];
	for (let i = 0; i < 2; i++) {
		leadc.push(
			<input
				type="button"
				value={`Arena${i + 1} T30`}
				onClick={() => store.doNav(import('./ArenaTop.jsx'), { lv: i })}
				onMouseOver={[setTip, 'See who the top players in arena are right now']}
				style={{
					position: 'absolute',
					left: i ? '92px' : '10px',
				}}
			/>,
		);
	}

	const quickslots = () => {
		const slots = [];
		if (rx.user) {
			for (let i = 0; i < 10; i++) {
				slots.push(
					<input
						type="button"
						value={i + 1}
						class={`editbtn ${
							rx.user.selectedDeck === rx.user.qecks[i] ? ' selectedbutton' : ''
						}`}
						onMouseOver={() => setTip(rx.user.qecks[i] ?? '')}
						onClick={() => {
							sock.userExec('setdeck', { name: rx.user.qecks[i] ?? '' });
						}}
					/>,
				);
			}
		}
		return slots;
	};

	return (
		rx.user && (
			<div class="bg_main">
				<div style="position:absolute;left:196px;top:4px;width:504px;height:48px">
					{tip()}
					<input
						type="button"
						value="Next Tip"
						onClick={() => {
							const newTipNumber = (tipNumber() + 1) % tipjar.length;
							setTipNumber(newTipNumber);
							setTip(tipjar[newTipNumber]);
						}}
						style="position:absolute;right:2px;bottom:2px"
					/>
				</div>
				<input
					type="button"
					value="Settings"
					style="position:absolute;left:620px;top:558px"
					onClick={() => {
						setSettings(settings => !settings);
						setChangepass(false);
						if (newpass) newpass.value = '';
						if (newpass2) newpass2.value = '';
					}}
				/>
				<div style="position:absolute;left:96px;top:92px;width:188px;height:120px">
					<div class="maintitle">Stats</div>
					<div>{rx.username}</div>
					{rx.uname && <div>{rx.uname}</div>}
					<div>
						{rx.user?.gold}
						<span class="ico gold" />
					</div>
					<div>
						PvE {rx.user?.aiwins} - {rx.user?.ailosses}
					</div>
					<div>
						PvP {rx.user?.pvpwins} - {rx.user?.pvplosses}
					</div>
				</div>
				<div style="position:absolute;left:304px;top:380px;width:292px;height:130px">
					<div class="maintitle">Miscellaneous</div>
					<div>
						<div style="display:inline-block;width:49%;text-align:center">
							{!hasflag(rx.user, 'no-oracle') && (
								<input
									type="button"
									value="Colosseum"
									onClick={() => store.doNav(import('./Colosseum.jsx'))}
									onMouseOver={[
										setTip,
										'Try some daily challenges in the Colosseum',
									]}
								/>
							)}
						</div>
						<div style="display:inline-block;width:49%;text-align:center">
							{!hasflag(rx.user, 'no-quest') && (
								<input
									type="button"
									value="Quests"
									onClick={() => store.doNav(import('./Quest.jsx'))}
									onMouseOver={[setTip, 'Go on an adventure']}
								/>
							)}
						</div>
					</div>
					<div style="margin-top:4px">
						<div style="display:inline-block;width:49%;text-align:center">
							{!rx.uname && (
								<input
									type="button"
									value="Arena Deck"
									onClick={() => store.doNav(import('./ArenaInfo.jsx'))}
									onMouseOver={[setTip, 'Check how your arena decks are doing']}
								/>
							)}
						</div>
						<div style="display:inline-block;width:49%;text-align:center">
							<input
								type="button"
								value="Custom"
								onClick={() =>
									store.doNav(import('./Challenge.jsx'), { pvp: false })
								}
								onMouseOver={[
									setTip,
									'Setup custom games vs AI or other players',
								]}
							/>
						</div>
					</div>
					<div style="margin-top:4px">
						<div style="display:inline-block;width:49%;text-align:center">
							<input
								type="button"
								value="Legacy"
								onClick={() =>
									store.doNav(import('../vanilla/views/Login.jsx'))
								}
								onMouseOver={[
									setTip,
									'A mode attempting to imitate original EtG',
								]}
							/>
						</div>
						<div style="display:inline-block;width:49%;text-align:center">
							<input
								type="button"
								value="Alts"
								onClick={() => store.doNav(import('./Alts.jsx'))}
								onMouseOver={[setTip, 'Manage subaccounts']}
							/>
						</div>
					</div>
				</div>
				{ocard() ?
					<>
						<div style="font-size:16px;user-select:none;position:absolute;pointer-events:none;left:95px;top:315px">
							Daily Login Reward
						</div>
						<Card x={92} y={340} card={Cards.Codes[ocard()]} />
					</>
				:	!rx.opts.hideMainchat && (
						<>
							<Chat
								channel="Main"
								style="position:absolute;left:72px;top:228px;width:226px;height:300px;background:transparent;font-size:14px;opacity:0.6"
							/>
							<input
								placeholder="Chat"
								onKeyDown={parseChat}
								style="position:absolute;left:99px;top:532px"
							/>
						</>
					)
				}
				<div style="position:absolute;left:626px;top:420px;width:196px;height:120px">
					<div class="maintitle">Leaderboards</div>
					<input
						type="button"
						value="View"
						onClick={() => store.doNav(import('./Leaderboards.jsx'))}
						onMouseOver={[
							setTip,
							"Leaderboards to see data such as who's collected the most wealth",
						]}
						style="margin-left:25%"
					/>
					<div style="margin-top:4px">{leadc}</div>
				</div>
				{!hasflag(rx.user, 'no-battle') && (
					<div style="position:absolute;left:308px;top:120px;width:288px;height:240px">
						<div class="maintitle">Battle</div>
						<div style="display:flex;padding-left:80px">
							<div class="costcolumn">Cost</div>
							<div class="costcolumn">Reward</div>
						</div>
						<AiButton
							name="Commoner"
							lv={0}
							onClick={() => store.navGame(mkAi(0))}
							onMouseOver={[
								setTip,
								'Commoners have no upgraded cards & mostly common cards',
							]}
						/>
						<AiButton
							name="Mage"
							lv={1}
							onClick={() => store.navGame(mkPremade(1))}
							onMouseOver={[
								setTip,
								'Mages have preconstructed decks with a couple rares',
							]}
						/>
						<AiButton
							name="Champion"
							lv={2}
							onClick={() => store.navGame(mkAi(2))}
							onMouseOver={[setTip, 'Champions have some upgraded cards']}
						/>
						<AiButton
							name="Demigod"
							lv={3}
							onClick={() => store.navGame(mkPremade(3))}
							onMouseOver={[
								setTip,
								'Demigods are extremely powerful. Come prepared',
							]}
						/>
						<AiButton
							name="Arena 1"
							onClick={arenaAi(0)}
							onMouseOver={[
								setTip,
								'In the arena you will face decks from other players',
							]}
							lv={4}
						/>
						<AiButton
							name="Arena 2"
							onClick={arenaAi(1)}
							onMouseOver={[
								setTip,
								'In the arena you will face upgraded decks from other players',
							]}
							lv={5}
						/>
					</div>
				)}
				<div style="position:absolute;left:620px;top:92px;width:196px;height:176px">
					<div class="maintitle">Cards</div>
					<input
						type="button"
						value="Editor"
						onClick={() => store.doNav(import('./DeckEditor.jsx'))}
						onMouseOver={[setTip, 'Edit & manage your decks']}
						style="position:absolute;left:14px;top:108px"
					/>
					<div style="font-size:14px;pointer-events:none;width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-left:16px;margin-top:12px">
						{`Deck: ${rx.user?.selectedDeck}`}
					</div>
					<div style="text-align:center">{quickslots}</div>
					{(!hasflag(rx.user, 'no-shop') ||
						(rx.user.freepacks && rx.user.freepacks.some(x => x))) && (
						<input
							type="button"
							value="Shop"
							onClick={() => store.doNav(import('./Shop.jsx'))}
							onMouseOver={[
								setTip,
								'Buy booster packs which contain cards from the elements you choose',
							]}
							style="position:absolute;left:14px;top:132px"
						/>
					)}
					{!(
						hasflag(rx.user, 'no-up-pillar') && hasflag(rx.user, 'no-up-merge')
					) && (
						<input
							type="button"
							value="Upgrade"
							onClick={() => store.doNav(import('./Upgrade.jsx'))}
							onMouseOver={[setTip, 'Upgrade or sell cards']}
							style="position:absolute;left:102px;top:108px"
						/>
					)}
					{!rx.uname && (
						<input
							type="button"
							value="Bazaar"
							onClick={() => store.doNav(import('./Bazaar.jsx'))}
							onMouseOver={[
								setTip,
								"Put up cards for sale & review other players' offers",
							]}
							style="position:absolute;left:102px;top:132px"
						/>
					)}
				</div>
				<div style="position:absolute;left:616px;top:300px;width:206px;height:130px">
					<div class="maintitle">Players</div>
					<input
						placeholder="Player's Name"
						value={rx.opts.foename ?? ''}
						onInput={e => store.setOptTemp('foename', e.target.value)}
						style="margin-left:24px"
					/>
					<input
						type="button"
						value="Library"
						onClick={() => {
							const name = foename() || rx.username;
							if (name) {
								const props = { name };
								if (!foename()) props.alt = rx.uname;
								store.doNav(import('./Library.jsx'), props);
							}
						}}
						onMouseOver={[setTip, 'See exactly what cards you or others own']}
						style="position:absolute;left:112px;top:64px"
					/>
					<input
						type="button"
						value="PvP"
						onClick={() => sock.sendChallenge(foename())}
						style="position:absolute;left:10px;top:88px"
					/>
					{!hasflag(rx.user, 'no-trade') && (
						<input
							type="button"
							value="Trade"
							onClick={() => {
								sock.userEmit('offertrade', {
									f: foename(),
									cards: '',
									g: 0,
									forcards: null,
									forg: null,
								});
								store.doNav(import('./Trade.jsx'), { foe: foename() });
							}}
							onMouseOver={[setTip, 'Trade cards/$ with another player']}
							style="position:absolute;left:10px;top:64px"
						/>
					)}
					<input
						type="button"
						value="Reward"
						onClick={() => {
							sock.userEmit('codesubmit', {
								code: foename(),
							});
						}}
						onMouseOver={[setTip, 'Redeem a reward code']}
						style="position:absolute;left:112px;top:88px"
					/>
				</div>
				{typeof kongregateAPI === 'undefined' && (
					<input
						type="button"
						value="Logout"
						onClick={logout}
						onMouseOver={[setTip, 'Click here to log out']}
						style="position:absolute;left:744px;top:558px"
					/>
				)}
				{settings() && (
					<div
						class="bgbox"
						style="position:absolute;left:580px;top:270px;width:300px;height:280px">
						{changepass() ?
							<>
								<input
									placeholder="New Password"
									ref={newpass}
									onKeyDown={e => {
										if (e.key === 'Enter') changeFunc();
									}}
									style="position:absolute;left:136px;top:4px;width:128px"
								/>
								<input
									placeholder="Confirm New"
									ref={newpass2}
									onKeyDown={e => {
										if (e.key === 'Enter') changeFunc();
									}}
									style="position:absolute;left:136px;top:32px;width:128px"
								/>
								<input
									type="button"
									value="Change Password"
									onClick={changeFunc}
									style="position:absolute;left:8px;top:8px;width:120px"
								/>
								<input
									type="button"
									value="Cancel Change"
									onClick={() => {
										setChangepass(false);
										newpass.value = '';
										newpass2.value = '';
									}}
									style="position:absolute;left:8px;top:32px;width:120px"
								/>
							</>
						:	<input
								type="button"
								value="Change Password"
								onClick={() => setChangepass(true)}
								style="position:absolute;left:8px;top:8px;width:120px"
							/>
						}
						<label style="position:absolute;left:136px;top:88px">
							<input
								type="checkbox"
								checked={!!rx.opts.enableSound}
								onChange={e => {
									changeSound(e.target.checked);
									store.setOpt('enableSound', e.target.checked);
								}}
							/>
							Enable sound
						</label>
						<label style="position:absolute;left:136px;top:53px">
							<input
								type="checkbox"
								checked={!!rx.opts.enableMusic}
								onChange={e => {
									changeMusic(e.target.checked);
									store.setOpt('enableMusic', e.target.checked);
								}}
							/>
							Enable music
						</label>
						<label style="position:absolute;left:8px;top:53px">
							<input
								type="checkbox"
								checked={!!rx.opts.hideMainchat}
								onChange={e => store.setOpt('hideMainchat', e.target.checked)}
							/>
							Hide mainchat
						</label>
						<label style="position:absolute;left:8px;top:88px">
							<input
								type="checkbox"
								checked={!!rx.opts.hideRightpane}
								onChange={e => store.setOpt('hideRightpane', e.target.checked)}
							/>
							Hide rightpane
						</label>
						<label style="position:absolute;left:8px;top:123px">
							<input
								type="checkbox"
								checked={!!rx.opts.disableTut}
								onChange={e => store.setOpt('disableTut', e.target.checked)}
							/>
							Hide help
						</label>
						<label style="position:absolute;left:136px;top:123px">
							<input
								type="checkbox"
								checked={!!rx.opts.lofiArt}
								onChange={e => store.setOpt('lofiArt', e.target.checked)}
							/>
							Lofi Art
						</label>
						<label style="position:absolute;left:8px;top:158px">
							<input
								type="checkbox"
								checked={!!rx.opts.shiftDrag}
								onChange={e => store.setOpt('shiftDrag', !e.target.checked)}
							/>
							Shift Drag
						</label>
						<span style="position:absolute;left:8px;top:200px">
							Play by play
							<label>
								<input
									type="radio"
									name="settings-pbp"
									value=""
									checked={!rx.opts.playByPlayMode}
									onChange={setPbpSetting}
								/>
								On
							</label>
							<label>
								<input
									type="radio"
									name="settings-pbp"
									value="noline"
									checked={rx.opts.playByPlayMode === 'noline'}
									onChange={setPbpSetting}
								/>
								No line
							</label>
							<label>
								<input
									type="radio"
									name="settings-pbp"
									value="disabled"
									checked={rx.opts.playByPlayMode === 'disabled'}
									onChange={setPbpSetting}
								/>
								Off
							</label>
						</span>
						<label style="position:absolute;left:8px;top:240px">
							Expected Damage Samples {expectedDamageSamples()}
							<input
								type="range"
								style="width:272px"
								min={1}
								max={5}
								value={expectedDamageSamples()}
								onChange={e =>
									store.setOpt('expectedDamageSamples', e.target.value)
								}
							/>
						</label>
					</div>
				)}
			</div>
		)
	);
}

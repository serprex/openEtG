"use strict";
const px = require('../px'),
	etg = require('../etg'),
	chat = require('../chat'),
	sock = require('../sock'),
	util = require('../util'),
	mkAi = require('../mkAi'),
	audio = require('../audio'),
	Cards = require('../Cards'),
	Thing = require('../Thing'),
	mkGame = require('../mkGame'),
	Status = require('../Status'),
	etgutil = require('../etgutil'),
	options = require('../options'),
	RngMock = require('../RngMock'),
	Components = require('../Components'),
	userutil = require('../userutil'),
	h = preact.h,
	tipjar = [
		"Each card in your booster pack has a 50% chance of being from the chosen element",
		"Your arena deck will earn you 3$ per win & 1$ per loss",
		"Colosseum lets you compete in a number of daily events for extra prizes. The colosseum challenges reset daily",
		"Be sure to try the Proving Grounds Quests for some good cards",
		"Rarity ratings: Grey commons, green uncommons, blue rares, orange shard, & pink ultra rares",
		"The Library button allows you to see all of a user's cards & progress",
		"If you are a new user, be sure to get the free Bronze & Silver packs from the Shop",
		"Starter decks, cards from free packs, & all non-Common Daily Cards are account-bound; they cannot be traded or sold",
		"If you include account-bound cards in an upgrade, the upgrade will also be account-bound",
		"You'll receive a Daily Card upon logging in after midnight GMT0. If you submit an Arena deck, it contain 5 copies of that card",
		"Unupgraded pillars & pendulums are free",
		"Cards sell for around half as much as they cost to buy from a pack",
		"Quests are free to try, & you always face the same deck. Keep trying until you collect your reward",
		"You may mulligan at the start of the game to shuffle & redraw your hand with one less card",
		"Your account name is case sensitive",
		"Arena Tier 1 is unupgraded, while Tier 2 is upgraded. All decks in a tier have the same number of points",
		"If you type '/who' in chat you will get a list of the users who are online. '/w username message' will send your message only to one user",
		"Chat commands: /who, /mute, /unmute, /clear, /w, /decks",
		"Keyboard shortcuts: space ends turn, backspace cancels, w targets opponent, s targets yourself, 1 through 8 cast cards in hand",
		"Remember that you may use the logout button to enter sandbox mode to review the card pool, check rarities & try out new decks",
		"Commoner & Mage are unupped, Champion has some upped, & Demigod is fully upped",
		"Decks submitted to arena lose hp exponentially per day, down to a minimum of a quarter of their original hp",
		"If you don't get what you want from the packs in the shop, ask to trade in chat or the openEtG forum",
		"Rarity doesn't necessarily relate to card strength. You can go a long ways with commons & uncommons",
		"A ply is half a turn",
		"Mark cards are only obtainable through PvP events. A tournament deck verifier is at tournament.htm",
		"After an AI battle you will win a random common, uncommon, or rare from your opponent's deck",
		"Cards in packs have a (45/packsize)% chance to increment rarity",
		"At Wealth T50 you can see which players have the highest wealth. Wealth is a combination of current gold & one's cardpool",
		"Throttling means that the effect is limited to 2 procs when attacking multiple times with adrenaline",
	];
const menuChat = chat.MainMenuChat;
function CostRewardHeaders(x, y, wid, hei) {
	return function(props){
		return h(Components.rect(x, y, wid, hei), Object.assign({}, props.props, {
			children: [
				h('span', { style: {
					position: 'absolute',
					top: '24px',
					right: '114px',
				}}, 'Cost'),
				h('span', { style: {
					position: 'absolute',
					top: '24px',
					right: '4px',
				}}, 'Base Reward'),
			].concat(props.children),
		}));
	}
}
function initEndless(){
	const gameData = mkGame({ deck: require("../ai/deck")(.5, 2, 5), urdeck: sock.getDeck(), seed: util.randint(), p2hp: 0x100000000, p2markpower: 2, foename: "The Invincible", p2drawpower: 2, level: 7, goldreward: 0, cardreward: "", ai: true });
	const game = gameData.game;
	const endlessRelic = Object.create(Thing.prototype);
	endlessRelic.card = Cards.Despair;
	endlessRelic.status = new Status();
	endlessRelic.status.set("immaterial", 1);
	function endlessAuto(c, t){
		var plies = c.owner.game.ply;
		if (c.rng() < .1){
			c.owner.markpower++;
		}
		if ((plies&15) == 13){
			c.owner.foe.addCrea(new Thing(Cards.Singularity.asUpped(c.rng() < plies/100)));
		}
		if ((plies&1) || c.rng() < .3) c.owner.foe.buffhp(-1);
	}
	function endlessDraw(c, t){
		var card = t.hand[t.hand.length-1].card;
		if (t == c.owner.game.player1 && c.rng() < .3) card = card.asUpped(false);
		t.deck.splice(t.upto(t.deck.length), 0, card);
	}
	endlessRelic.active = {auto:{name: ["@&%"], func: endlessAuto}, draw:{name: ["~~!"], func: endlessDraw}};
	game.player2.addPerm(endlessRelic);
	return gameData;
}
module.exports = class MainMenu extends preact.Component {
	constructor(props) {
		super(props);
		const self = this;
		self.state = {
			showcard: props.nymph || sock.user && !sock.user.daily && sock.user.ocard,
			showsettings: false,
			tipNumber: RngMock.upto(tipjar.length),
			tipText: '',
			selectedDeck: sock.user ? sock.user.selectedDeck : '',
		};
		this.resetTip = function (e) {
			if (e.target.tagName && e.target.tagName.match(/^(DIV|CANVAS|HTML)$/)) {
				const tipText = sock.user ? tipjar[self.state.tipNumber] : "To register, just type desired username & password in the fields to the right, then click 'Login'";
				if (tipText !== self.state.tipText) self.setState({ tipText: tipText });
			}
		};
	}

	componentWillUnmount() {
		document.removeEventListener("mousemove", this.resetTip);
		menuChat.style.display = "none";
	}

	componentDidMount() {
		document.addEventListener("mousemove", this.resetTip);
	}

	render() {
		const self = this;
		function mkSetTip(text){
			return function(){
				if (self.state.tipText != text) {
					self.setState({ tipText: text });
				}
			}
		}

		function TitleText(props){
			return h('div', {
				style: { fontSize: '20px', textAlign: 'center' },
			}, props.text);
		}
		function LabelText(props) {
			return h(Components.Text, {
				text: props.text,
				style: Object.assign({}, props.style, { fontSize: '14px', pointerEvents: 'none' }),
			});
		}
		function CostText(props){
			return h(LabelText, {
				text: userutil.pveCostReward[props.lv*2+props.n] + "$",
				style: props.style,
			});
		}
		var nextTip = h('input', {
			type: 'button',
			value: 'Next Tip',
			onClick: function() {
				let newTipNumber = (self.state.tipNumber+1) % tipjar.length;
				self.setState({
					tipNumber: newTipNumber,
					tipText: tipjar[newTipNumber],
				});
			},
			style: {
				position: 'absolute',
				right: '2px',
				bottom: '2px',
			}
		});
		const bwealth = h('input', {
			type: 'button',
			value: 'Wealth T50',
			onClick: function() { self.props.doNav(require('./WealthTop')); },
			onMouseOver: mkSetTip("See who's collected the most wealth"),
			style: {
				position: 'absolute',
				left: '52px'
			}
		});
		const deckc = [h(TitleText, { text: 'Cards & Decks' })],
			leadc = [h(TitleText, { text: 'Leaderboards' }), bwealth, h('br')],
			aic = [h(TitleText, { text: 'AI Battle' })],
			arenac = [h(TitleText, { text: 'Arena' })],
			playc = [h(TitleText, { text: 'Players' })],
			mainc = [h(Components.rect(196, 4, 504, 48), {},
				h(Components.Text, { text: self.state.tipText }),
				nextTip
			)];
		[["Commoner", mkAi.run(self.props.doNav, mkAi.mkAi(0)), mkSetTip("Commoners have no upgraded cards & mostly common cards")],
			["Mage", mkAi.run(self.props.doNav, mkAi.mkPremade(1)), mkSetTip("Mages have preconstructed decks with a couple rares")],
			["Champion", mkAi.run(self.props.doNav, mkAi.mkAi(2)), mkSetTip("Champions have some upgraded cards")],
			["Demigod", mkAi.run(self.props.doNav, mkAi.mkPremade(3)), mkSetTip("Demigods are extremely powerful. Come prepared for anything")],
		].forEach(function(b,i){
			const y = 46+i*22+'px';
			aic.push(
				h('input', {
					type: 'button',
					value: b[0],
					onClick: b[1],
					onMouseOver: b[2],
					style: {
						position: 'absolute',
						left: '4px',
						top: y,
					},
				}),
				h(CostText, {
					n: 0,
					lv: i,
					style: {
						position: 'absolute',
						top: y,
						right: '114px',
					},
				}),
				h(CostText, {
					n: 1,
					lv: i,
					style: {
						position: 'absolute',
						top: y,
						right: '4px',
					},
				})
			);
		});
		for (let i=0; i<2; i++){
			function arenaAi(e) {
				if (etgutil.decklength(sock.getDeck()) < 31) {
					self.props.doNav(require("./Editor"));
					return;
				}
				const cost = userutil.arenaCost(i);
				if (sock.user.gold < cost) {
					chat("Requires " + cost + "$", "System");
					return;
				}
				sock.userEmit("foearena", {lv:i});
				e.target.style.display = "none";
			}
			if (sock.user){
				const y = 46+i*22+'px';
				arenac.push(
					h('input', {
						type: 'button',
						value: 'Arena' + (i+1) + ' AI',
						onClick: arenaAi,
						onMouseOver: mkSetTip("In the arena you will face decks from other players"),
						style: {
							position: 'absolute',
							left: '4px',
							top: y,
						}
					}),
					h(CostText, { n: 0, lv: 4+i, style: {
						position: 'absolute',
						top: y,
						right: '114px',
					}}),
					h(CostText, { n: 1, lv: 4+i, style: {
						position: 'absolute',
						top: y,
						right: '4px',
					}}),
				);
			}
			leadc.push(h('input', {
				type: 'button',
				value: 'Arena'+(i+1) + ' T20',
				onClick: function(){ self.props.doNav(require('./ArenaTop'), {lv: i}); },
				onMouseOver: mkSetTip("See who the top players in arena are right now"),
				style: {
					position: 'absolute',
					left: i?'100px':'10px',
				},
			}));
		}
		function arenaInfo(e) {
			sock.userEmit("arenainfo");
			e.target.style.display = "none";
		}
		if (sock.user){
			arenac.push(
				h('input', {
					type: 'button',
					value: 'Arena Deck',
					onClick: arenaInfo,
					onMouseOver: mkSetTip("Check how your arena decks are doing"),
					style: {
						position: 'absolute',
						left: '20px',
						top: '100px',
					},
				})
			);
			if (self.state.showcard) {
				mainc.push(h(Components.Card, { x: 92, y: 340, card: self.state.showcard }));
				if (sock.user.daily == 0) sock.user.daily = 128;
			} else {
				menuChat.style.display = "";
				menuChat.scrollTop = menuChat.scrollHeight;
				mainc.push(h('input', {
					placeholder: 'Chat',
					onKeyDown: function(e) {
						if (e.keyCode == 13){
							if (!e.target.value.match(/^\s*$/)) sock.userEmit("chat", {msg:e.target.value});
							e.target.value = "";
						}
					},
					style: {
						position: 'absolute',
						left: '99px',
						top: '532px',
					},
				}));
			}
		}

		function logout(cmd) {
			if (sock.user){
				sock.userEmit(cmd);
				sock.user = undefined;
				options.remember = false;
			}
			self.props.doNav(require("./Login"));
		}
		mainc.push(h('input', {
			type: 'button',
			value: 'Logout',
			onClick: logout.bind(null, 'logout'),
			onMouseOver: mkSetTip("Click here to log out"),
			style: {
				position: 'absolute',
				left: '744px',
				top: '558px',
			},
		}));
		const stage = { cmds: {
			librarygive: function(data) { self.props.doNav(require("./Library"), data) },
			arenainfo: function(data) { self.props.doNav(require("./ArenaInfo"), data) },
			codecard:function(data){
				self.props.doNav(require("./Reward"), { type: data.type, amount: data.num, code: options.foename });
			},
			codegold:function(data) {
				sock.user.gold += data.g;
				const goldspan = document.createElement('span');
				goldspan.className = 'ico gold';
				const msg = document.createElement('div');
				msg.appendChild(document.createTextNode(data.g));
				msg.appendChild(goldspan);
				msg.appendChild(document.createTextNode(' added!'));
				chat.addSpan(msg);
			},
			codecode:function(data) {
				sock.user.pool = etgutil.addcard(sock.user.pool, data.card);
				chat(Cards.Codes[data.card].name + " added!", "System");
			},
		}};
		function tradeClick(foe) {
			sock.trade = typeof foe === "string" ? foe : options.foename;
			sock.userEmit("tradewant", { f: sock.trade });
		}
		function rewardClick() {
			sock.userEmit("codesubmit", { code: options.foename });
		}
		function libraryClick() {
			const name = options.foename || sock.user && sock.user.name;
			if (name) sock.emit("librarywant", { f: name });
		}
		function soundChange() {
			audio.changeSound(options.enableSound);
		}
		function musicChange() {
			audio.changeMusic(options.enableMusic);
		}
		function hideRightpaneChange(){
			document.getElementById("rightpane").style.display = options.hideRightpane ? "none" : "";
			sock.emit("chatus", {hide: !!options.offline || !!options.hideRightpane});
		}
		var foectrl = h('input', {
			ref: function(x) {
				if (x) options.register('foename', x, true);
			},
			placeholder: 'Trade/Library',
			style: {
				marginLeft: '24px',
			},
		});
		playc.push(foectrl);
		soundChange();
		musicChange();
		function loadQuickdeck(x) {
			return function() {
				sock.userExec("setdeck", { name: sock.user.qecks[x] || "" });
				self.setState({ selectedDeck: sock.user.selectedDeck });
			}
		}
		playc.push(
			h('input', {
				type: 'button',
				value: 'PvP',
				onClick: function() { self.props.doNav(require('./Challenge'), {pvp:true}); },
				style: {
					position: 'absolute',
					left: '10px',
					top: '100px',
				},
			}),
			h('input', {
				type: 'button',
				value: 'Library',
				onClick: libraryClick,
				onMouseOver: mkSetTip("See exactly what cards you or others own"),
				style: {
					position: 'absolute',
					left: '120px',
					top: '75px',
				},
			})
		);
		if (sock.user) {
			const quickslots = [];
			for (var i = 0;i < 10;i++) {
				quickslots.push(h('input', {
					type: 'button',
					value: i+1,
					className: 'editbtn' + ((sock.user.selectedDeck == sock.user.qecks[i]) ? ' selectedbutton' : ''),
					onClick: loadQuickdeck(i),
				}));
			}
			deckc.push(h(LabelText, {
				text: "Deck: " + self.state.selectedDeck,
				style: {
					whiteSpace: 'nowrap',
					marginLeft: '16px',
				},
			}), h('div', { style: { textAlign: 'center' }, children: quickslots }));
			var bsettings = h('input', {
				type: 'button',
				value: 'Settings',
				style: {
					position: 'absolute',
					left: '620px',
					top: '558px',
				},
				onClick: function() {
					self.setState({ showsettings: !self.state.showsettings });
				},
			});
			mainc.push(bsettings);
			const bquest = h('input', {
				type: 'button',
				value: 'Quests',
				onClick: function() { self.props.doNav(require('./QuestMain')) },
				onMouseOver: mkSetTip('Go on an adventure'),
			}), bcolo = h('input', {
				type: 'button',
				value: 'Colosseum',
				onClick: function() { self.props.doNav(require("./Colosseum")); },
				onMouseOver: mkSetTip("Try some daily challenges in the Colosseum")
			}), bendless = h('input', {
				type: 'button',
				value: 'Endless',
				onClick: function() { self.props.doNav(require('./Match'), initEndless()) },
				onMouseOver: mkSetTip("See how long you last against The Invincible")
			});
			const colocol = h('div', {
				style: {
					marginTop: '132px',
					width: '45%',
					float: 'left',
					textAlign: 'right',
				},
			}, bcolo, h(LabelText, { text: "Daily Challenges" }),
				bendless, h(LabelText, { text: "The Invincible" })
			);
			const questcol = h('div', {
				style: {
					marginTop: '132px',
					width: '45%',
					float: 'right',
				},
			}, bquest, h(LabelText, { text: "Go on an adventure" }));
			aic.push(colocol, questcol);
			deckc.push(
				h('input', {
					type: 'button',
					value: 'Shop',
					onClick: function() { self.props.doNav(require('./Shop')) },
					onMouseOver: mkSetTip("Buy booster packs which contain cards from the elements you choose"),
					style: {
						position: 'absolute',
						left: '14px',
						top: '132px',
					},
				}),
				h('input', {
					type: 'button',
					value: 'Bazaar',
					onClick: function() { self.props.doNav(require('./Bazaar')) },
					onMouseOver: mkSetTip("Buy singles at a 300% premium"),
					style: {
						position: 'absolute',
						left: '114px',
						top: '132px',
					},
				}),
				h('input', {
					type: 'button',
					value: 'Upgrade',
					onClick: function() { self.props.doNav(require('./Upgrade')) },
					onMouseOver: mkSetTip("Upgrade or sell cards"),
					style: {
						position: 'absolute',
						left: '114px',
						top: '108px',
					},
				})
			);
			playc.push(
				h('input', {
					type: 'button',
					value: 'Trade',
					onClick: tradeClick,
					onMouseOver: mkSetTip("Initiate trading cards with another player"),
					style: {
						position: 'absolute',
						left: '10px',
						top: '75px',
					},
				}),
				h('input', {
					type: 'button',
					value: 'Reward',
					onClick: rewardClick,
					onMouseOver: mkSetTip("Redeem a reward code"),
					style: {
						position: 'absolute',
						left: '120px',
						top: '100px',
					}
				})
			);
			mainc.push(
				h(Components.rect(86, 92, 196, 120), {},
					h(TitleText, { text: 'Stats' }),
					h(Components.Text, { text: sock.user.gold + "$ " + sock.user.name + "\nPvE " + sock.user.aiwins + " - " + sock.user.ailosses + "\nPvP " + sock.user.pvpwins + " - " + sock.user.pvplosses }),
				),
				h(CostRewardHeaders(304, 380, 292, 130), { children: arenac })
			);
		}
		let customprops = {style:sock.user ? {} : {marginTop:'128px'}};
		customprops.style.width = '45%';
		customprops.style.float = 'right';
		aic.push(h('div', customprops,
			h('input', {
				type: 'button',
				value: 'Custom AI',
				onClick: function() {
					self.props.doNav(require('./Challenge'), {pvp:false});
				},
				onMouseOver: mkSetTip("Play versus any deck you want, with custom stats for you & the AI")
			}),
			h(LabelText, { text: 'Duel a custom AI' })
		));
		deckc.push(
			h('input', {
				type: 'button',
				value: 'Editor',
				onClick: function() { self.props.doNav(require('./Editor')) },
				onMouseOver: mkSetTip("Edit & manage your decks"),
				style: {
					position: 'absolute',
					left: '14px',
					top: '108px',
				},
			})
		);
		px.view(stage);
		mainc.push(
			h(Components.rect(626, 436, 196, 120), { children: leadc }),
			h(CostRewardHeaders(304, 120, 292, 240), { children: aic }),
			h(Components.rect(620, 92, 196, 176), { children: deckc }),
			h(Components.rect(616, 300, 206, 130), { children: playc })
		);
		if (self.state.showsettings) {
			function changeFunc(){
				if (this.value == "Change Pass") this.value = "Confirm";
				else {
					this.value = "Change Pass";
					sock.userEmit("passchange", { p: changePass.value });
				}
			}
			const wipe = h('input', {
				type: 'button',
				value: 'Wipe Account',
				onClick: function() {
					if (options.foename == sock.user.name + "yesdelete") {
						logout('delete');
					} else {
						chat("Input '" + sock.user.name + "yesdelete' into Trade/Library to delete your account", "System");
					}
				},
				onMouseOver: mkSetTip("Click here to permanently remove your account"),
				style: {
					position: 'absolute',
					left: '184px',
					top: '123px',
				},
			}), changePass = h('input', {
				placeholder: 'New Password',
				onKeyPress: function(e) {
					if (e.keyCode == 13) changeFunc();
				},
				style: {
					position: 'absolute',
					left: '8px',
					top: '8px',
				},
			}), changeBtn = h('input', {
				type: 'button',
				value: 'Change Pass',
				onClick: changeFunc,
				style: {
					position: 'absolute',
					left: '184px',
					top: '8px',
				},
			}), enableSound = h('label', {
				style: {
					position: 'absolute',
					left: '8px',
					top: '53px',
				},
			}, h('input', {
				type: 'checkbox',
				ref: function(ctrl) { ctrl && options.register('enableSound', ctrl); },
				onChange: soundChange,
			}), 'Enable sound'), enableMusic = h('label', {
				style: {
					position: 'absolute',
					left: '135px',
					top: '53px',
				},
			}, h('input', {
				type: 'checkbox',
				ref: function(ctrl) { ctrl && options.register('enableMusic', ctrl); },
				onChange: musicChange,
			}), 'Enable music'), hideRightpane = h('label', {
				style: {
					position: 'absolute',
					left: '8px',
					top: '88px',
				},
			}, h('input', {
				type: 'checkbox',
				ref: function(ctrl) { ctrl && options.register('hideRightpane', ctrl); },
				onChange: hideRightpaneChange,
			}), 'Hide rightpane'), disableTut = h('label', {
				style: {
					position: 'absolute',
					left: '8px',
					top: '123px',
				},
			}, h('input', {
				type: 'checkbox',
				ref: function(ctrl) { ctrl && options.register('disableTut', ctrl); },
			}), 'Disable tutorial');
			mainc.push(h('div', {
				className: 'bgbox',
				style: {
					position: 'absolute',
					left: '585px',
					top: '380px',
					width: '267px',
					height: '156px',
				},
			}, wipe, changePass, enableSound, enableMusic, hideRightpane, disableTut));
		}
		return h('div', { className: 'bg_main', children: mainc });
	}
}
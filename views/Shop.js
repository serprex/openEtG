const px = require("../px"),
	svg = require("../svg"),
	chat = require("../chat"),
	sock = require("../sock"),
	tutor = require("../tutor"),
	etgutil = require("../etgutil"),
	options = require("../options"),
	Components = require('../Components'),
	h = preact.h;

const packdata = [
	{cost: 15, type: "Bronze", info: "10 Commons", color: "#c73"},
	{cost: 25, type: "Silver", info: "3 Commons, 3 Uncommons", color: "#ccc"},
	{cost: 77, type: "Gold", info: "1 Common, 2 Uncommons, 2 Rares", color: "#fd0"},
	{cost: 100, type: "Platinum", info: "4 Commons, 3 Uncommons, 1 Rare, 1 Shard", color: "#eee"},
	{cost: 250, type: "Nymph", info: "1 Nymph", color: "#69b"},
];

module.exports = class Shop extends preact.Component {
	constructor(props) {
		super(props);
		this.state = {
			info1: "Select from which element you want.",
			info2: "Select which type of booster you want.",
			packele: -1,
			packrarity: -1,
			showbuy: false,
			cards: '',
		};
	}

	render() {
		const self = this;
		const children = [
			h(Components.Box, {
				x: 40, y: 16,
				width: 820, height: 60,
			}),
			h(Components.Box, {
				x: 40, y: 89,
				width: 494, height: 168,
			}),
			h(Components.Box, {
				x: 40, y: 270,
				width: 620, height: 168,
			}),
			h(Components.Box, {
				x: 770, y: 90,
				width: 90, height: 184,
			}),
			h(Components.Text, {
				text: sock.user.gold + '$',
				style: {
					position: 'absolute',
					left: '775px',
					top: '101px',
				},
			}),
			h(Components.Text, {
				text: this.state.info1,
				style: {
					position: 'absolute',
					left: '50px',
					top: '25px',
				},
			}),
			h('span', {
				style: {
					position: 'absolute',
					left: '50px',
					top: '50px',
				},
			}, this.state.info2),
			h(Components.ExitBtn, { x: 775, y: 246, doNav: this.props.doNav }),
		];

		if (sock.user.freepacks){
			children.push(h('span', {
				style: {
					position: 'absolute',
					left: '350px',
					top: '26px',
				},
			}, sock.user.freepacks[self.state.packrarity] ? "Free " + packdata[self.state.packrarity].type + " packs left: " + sock.user.freepacks[self.state.packrarity] : ""));
		}

		const bget = self.state.cards && h('input', {
			type: 'button',
			value: 'Take Cards',
			onClick: function() {
				self.setState({ showbuy: true, hideget: true, cards: '' });
			},
			style: {
				position: 'absolute',
				left: '775px',
				top: '156px',
			},
		});

		function buyPack() {
			const pack = packdata[self.state.packrarity];
			const boostdata = { pack: self.state.packrarity, element: self.state.packele };
			options.parseInput(boostdata, "bulk", options.bulk, 99);
			if (sock.user.gold >= pack.cost * (boostdata.bulk || 1) || (sock.user.freepacks && sock.user.freepacks[self.state.packrarity] > 0)) {
				sock.userEmit("booster", boostdata);
				self.setState({ showbuy: false });
			} else {
				self.setState({info2: "You can't afford that!"});
			}
		}
		const bbuy = self.state.showbuy && h('input', {
			type: 'button',
			value: 'Buy Pack',
			onClick: buyPack,
			style: {
				position: 'absolute',
				left: '775px',
				top: '156px',
			},
		});
		children.push(bget, bbuy);
		packdata.forEach(function(pack, n){
			const g = h('div', {
				class: 'imgb',
				onClick: function() {
					const update = { packrarity: n, info2: pack.type + " Pack: " + pack.info};
					if (~self.state.packele) update.showbuy = true;
					self.setState(update);
				},
				style: {
					color: '#000',
					position: 'absolute',
					left: 50+125*n+'px',
					top: 280+'px',
					borderRadius: "6px",
					border: "3px solid #000",
					width: "100px",
					height: "150px",
					backgroundColor: pack.color,
				},
			},
				h('span', {
					style: {
						fontSize: "18px",
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%,-50%)",
					}
				}, pack.type),
				h(Components.Text, {
					text: pack.cost + '$',
					style: {
						position: 'absolute',
						left: '7px',
						top: '122px',
					},
				}));
			children.push(g);
		});

		for (let i = 0;i < 14;i++) {
			children.push(h(Components.IconBtn, {
				e: 'e'+i,
				x: 75 + (i>>1)*64,
				y: 117 + (i&1)*75,
				click: function() {
					const update = {
						packele: i,
						info1: "Selected Element: " + (i == 13 ? "Random" : "1:" + i),
					};
					if (~self.state.packrarity) update.showbuy = true;
					self.setState(update);
				},
			}));
		}

		if (this.state.cards) {
			const cardchildren = [];
			etgutil.iterdeck(this.state.cards, function(code, i){
				const x = i % 5, y = Math.floor(i/5);
				cardchildren.push(h(Components.Card, {
					x: 7+x*140,
					y: y?298:14,
					code: code,
				}));
			});
			children.push(h(Components.Box, {
				x: 40, y: 16,
				width: 710, height: 568,
				children: cardchildren,
			}));
		}

		const cmds = {
			boostergive: function(data) {
				if (data.accountbound) {
					sock.user.accountbound = etgutil.mergedecks(sock.user.accountbound, data.cards);
					if (sock.user.freepacks){
						sock.user.freepacks[data.packtype]--;
					}
				}
				else {
					sock.user.pool = etgutil.mergedecks(sock.user.pool, data.cards);
					const bdata = {};
					options.parseInput(bdata, "bulk", options.bulk, 99);
					sock.user.gold -= packdata[data.packtype].cost * (bdata.bulk || 1);
				}
				if (etgutil.decklength(data.cards) < 11){
					self.setState({ cards: data.cards, showbuy: false });
				}else{
					self.setState({});
					const link = document.createElement("a");
					link.style.display = 'block';
					link.href = "deck/" + data.cards;
					link.target = "_blank";
					link.appendChild(document.createTextNode(data.cards));
					chat.addSpan(link);
				}
			},
		};
		const packmulti = h('input', {
			placeholder: 'Bulk',
			ref: function(ctrl) { ctrl && options.register('bulk', ctrl, true); },
			onKeyPress: function(e) {
				if (e.keyCode == 13){
					buyPack();
				}
			},
			style: {
				position: 'absolute',
				top: '184px',
				left: '777px',
				width: '64px',
			},
		});
		const tut = h(tutor.Tutor, {
			x: 8,
			y: 500,
			data: tutor.Shop,
		});
		children.push(packmulti, tut);
		px.view({ cmds:cmds });
		return h('div', { children: children });
	}
}

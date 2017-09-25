"use strict";
const sock = require("../sock"),
	Quest = require("../Quest"),
	options = require("../options"),
	Components = require('../Components'),
	h = preact.h;

function isLeft(p0x, p0y, p1x, p1y, p2x, p2y) {
	return (p1x - p0x) * (p2y - p0y) - (p2x - p0x) * (p1y - p0y);
}
function polytest(v, x, y) {
	let wn = 0;
	const n = v.length / 2;
	for (let i=0; i<n; i++) {
		const vx1 = v[i*2], vy1 = v[i*2+1], vx2 = i == n-1 ? v[0] : v[i*2+2], vy2 = i == n-1 ? v[1] : v[i*2+3];
		if (vy1 <= y) {
			if (vy2 > y && isLeft(vx1, vy1, vx2, vy2, x, y) > 0) wn++;
		} else {
			if (vy2 <= y && isLeft(vx1, vy1, vx2, vy2, x, y) < 0) wn--;
		}
	}
	return wn;
}
const areainfo = {
	forest: ["Spooky Forest", new Uint16Array([555, 221, 456, 307, 519, 436, 520, 472, 631, 440, 652, 390, 653, 351, 666, 321, 619, 246])],
	city: ["Capital City", new Uint16Array([456, 307, 519, 436, 520, 472, 328, 496, 258, 477, 259, 401])],
	provinggrounds: ["Proving Grounds", new Uint16Array([245, 262, 258, 477, 205, 448, 179, 397, 180, 350, 161, 313])],
	ice: ["Icy Caves", new Uint16Array([161, 313, 245, 262, 283, 190, 236, 167, 184, 186, 168, 213, 138, 223, 131, 263])],
	desert: ["Lonely Desert", new Uint16Array([245, 262, 283, 190, 326, 202, 466, 196, 511, 219, 555, 221, 456, 307, 259, 401])],
};

module.exports = class QuestMain extends preact.Component {
	constructor(props) {
		super(props);
		this.state = { area: null };
	}

	render() {
		const self = this;
		const questmap = h('img', {
			src: 'assets/bg_questmap.png',
			onMouseMove: function(e) {
				for (let key in areainfo) {
					const info = areainfo[key];
					if (polytest(areainfo[key][1], e.pageX, e.pageY)) {
						if (self.state.area != key) {
							self.setState({ area: key });
						}
						return;
					}
				}
				self.setState({ area: null });
			},
			onClick: function() {
				if (self.state.area) {
					self.props.doNav(require("./QuestArea"), { area: self.state.area });
				}
			},
			style: {
				position: 'absolute',
				left: '124px',
				top: '162px',
			},
		});
		const tinfo = h(Components.Text, {
			text: self.state.area ? areainfo[self.state.area][0] : "Welcome to Potatotal Island. The perfect island for adventuring!",
			style: {
				position: 'absolute',
				left: '26px',
				top: '26px',
				maxWidth: '850px',
			},
		});
		const children = [
			questmap,
			h(Components.Box, {
				x: 9, y: 9,
				width: 880, height: 111,
			}),
			tinfo,
			h(Components.ExitBtn, {
				doNav: this.props.doNav,
				x: 750,
				y: 246,
			}),
		];
		for (let key in areainfo) {
			if (!(key in Quest.areas)) continue;
			const ainfo = areainfo[key], points = ainfo[1];
			if (options.aideck == "quest"){
				children.push(h('svg', {
					width: '900px',
					height: '600px',
					style: {
						position: 'absolute',
						left: '0px',
						top: '0px',
						pointerEvents: 'none',
					},
				}, h('polygon', {
					points: points.join(' '),
					fill: 'none',
					stroke: '#f00',
					strokeWidth: '4',
				})));
			}
			if (Quest.areas[key].some(function(quest) {
				return (Quest[quest][0].dependency === undefined || Quest[quest][0].dependency(sock.user)) && ((sock.user.quests[quest] || 0) < Quest[quest].length);
			})) {
				var xtot = 0, ytot = 0;
				for (var i = 0;i < points.length; i+=2) {
					xtot += points[i];
					ytot += points[i+1];
				}
				const icon = h('div', {
					class: 'ico e13',
					style: {
						transform: "translate(-50%,-50%)",
						pointerEvents: "none",
						position: "absolute",
						left: (xtot*2/points.length)+"px",
						top: (ytot*2/points.length)+"px",
					},
				});
				children.push(icon);
			}
		}
		return h('div', { children: children });
	}
}
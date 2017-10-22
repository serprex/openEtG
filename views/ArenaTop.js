"use strict";
const px = require("../px"),
	sock = require("../sock"),
	chat = require("../chat"),
	Cards = require("../Cards"),
	Components = require('../Components'),
	h = preact.h;

module.exports = class ArenaTop extends preact.Component {
	componentDidMount() {
		sock.emit("arenatop", this.props);
		const self = this;
		px.view({
			cmds: {
				arenatop: function(info){
					self.setState(info);
				}
			}
		});
	}

	render() {
		const self = this, lv = this.props.lv;
		const info = this.state.top || [];
		const ol = h('ol', {
			className: "atopol",
			style: {
				position: 'absolute',
				left: '90px',
				top: '50px'
			},
			children: info.map(function(data, i){
				const lic = [h('span', { className: 'atoptext' }, data[0])];
				for(var i=1; i<=4; i++){
					if (i == 3){
						lic.push(h('span', { className: 'atopdash' }, '-'));
					}
					lic.push(h('span', { className: 'atop'+i }, data[i]));
				}
				const card = Cards.Codes[data[5]].asUpped(lv);
				const cname = h('span', {
					className: 'atoptext',
					onMouseEnter: function(e) {
						self.setState({card: card, cardx: e.clientX+4, cardy: e.clientY+4});
					},
					onMouseLeave: function() {
						self.setState({card: false});
					},
				}, card.name);
				lic.push(cname);
				return h("li", { className: i != info.length-1 && 'underline', children: lic });
			}),
		});
		return h('div', {},
			ol,
			h(Components.ExitBtn, { x: 8, y: 300, doNav: this.props.doNav, }),
			self.state.card && h(Components.Card, {
				card: self.state.card,
				x: self.state.cardx,
				y: self.state.cardy,
			})
		);
	}
}
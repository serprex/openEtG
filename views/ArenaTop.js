"use strict";
const px = require("../px"),
	dom = require("../dom"),
	sock = require("../sock"),
	svg = require("../svg"),
	chat = require("../chat"),
	Cards = require("../Cards"),
	Components = require('../Components'),
	h = preact.h;

module.exports = class ArenaTop extends preact.Component {
	componentDidMount() {
		if (!this.svg) {
			const s = this.svg = dom.svg();
			s.setAttribute("width", "128");
			s.setAttribute("height", "256");
			s.style.pointerEvents = "none";
			s.style.position = 'absolute';
			s.style.display = 'none';
		}
		document.body.appendChild(this.svg);
	}

	componentWillUnmount() {
		document.body.removeChild(this.svg);
	}

	render() {
		const self = this, lv = this.props.lv;
		px.view({
			cmds: {
				arenatop: function(info){
					self.setState(info);
				}
			}
		});
		const info = this.state.top || [];
		sock.emit("arenatop", this.props);
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
						dom.svgToSvg(this.svg, svg.card(card.code));
						this.svg.style.left = e.clientX+4+'px';
						this.svg.style.top = e.clientY+4+'px';
						this.svg.style.display = '';
					},
					onMouseLeave: function() {
						this.svg.style.display = 'none';
					},
				}, card.name);
				cname.attributes.onMouseEnter = function(e){
				};
				cname.attributes.onMouseLeave = function(){
					s.style.display = "none";
				};
				lic.push(cname);
				return h("li", { className: i != info.length-1 && 'underline', children: lic });
			}),
		});
		return h('div', {}, ol, h(Components.ExitBtn, { x: 8, y: 300, doNav: this.props.doNav, }));
	}
}
'use strict';
const px = require('../px'),
	chat = require('../chat'),
	sock = require('../sock'),
	Components = require('../Components'),
	h = preact.h;

module.exports = class WealthTop extends preact.Component {
	componentDidMount() {
		const self = this;
		px.view({
			cmds: {
				wealthtop: function(info) {
					self.setState(info);
				},
			},
		});
		sock.emit('wealthtop');
	}

	render() {
		const self = this,
			ol1c = [],
			ol2c = [],
			top = this.state.top;
		if (top) {
			for (var i = 0; i < top.length; i += 2) {
				const ol = i < 50 ? ol1c : ol2c;
				const li = h(
					'li',
					{},
					top[i],
					h('span', { className: 'floatRight' }, Math.round(top[i + 1])),
				);
				ol.push(li);
			}
		}
		const ol1 = h('ol', {
			className: 'width400',
			children: ol1c,
			style: {
				position: 'absolute',
				left: '80px',
				top: '8px',
			},
		});
		const ol2 = h('ol', {
			className: 'width400',
			start: '26',
			children: ol2c,
			style: {
				position: 'absolute',
				left: '480px',
				top: '8px',
			},
		});
		return h(
			'div',
			{},
			ol1,
			ol2,
			h(Components.ExitBtn, { x: 8, y: 300, doNav: this.props.doNav }),
		);
	}
};

"use strict";
var px = require('../px'),
	dom = require('../dom'),
	chat = require('../chat'),
	sock = require('../sock');

module.exports = function() {
	var h = preact.h;
	var ol1 = h('ol', {
		className: 'width400',
		style: {
			position: 'absolute',
			left: '80px',
			top: '8px',
		},
	});
	var ol2 = h('ol', {
		className: 'width400',
		start: '26',
		style: {
			position: 'absolute',
			left: '480px',
			top: '8px',
		},
	});
	var view = h('div', { id: 'app', style: { display: '' } }, ol1, ol2, h(dom.ExitBtn, { x: 8, y: 300, }));
	px.view({
		endnext: px.hideapp,
		cmds:{
			wealthtop:function(info){
				info = info.top;
				var ol1c = [], ol2c = [];
				for (var i = 0; i < info.length; i+=2) {
					var ol = i<50?ol1c:ol2c;
					var li = h('li', {}, info[i], h('span', { className: 'floatRight' }, Math.round(info[i+1])));
					if (i%50 != 48) li.className = "underline";
					ol.push(li);
				}
				ol1.children = ol1c;
				ol2.children = ol2c;
				px.render(view);
			}
		}
	});
	px.render(view);
	sock.emit("wealthtop");
}
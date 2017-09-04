"use strict";
var px = require("../px");
var chat = require("../chat");
var sock = require("../sock");

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
	var view = h('div', { id: 'app', style: { display: '' } }, ol1, ol2,
		h('input', {
			type: 'button',
			value: 'Exit',
			onClick: function(){require('./MainMenu')()},
			style: {
				position: 'absolute',
				left: '8px',
				top: '300px',
			},
		})
	);
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
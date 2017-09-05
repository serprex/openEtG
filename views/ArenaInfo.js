"use strict";
var px = require("../px");
var dom = require("../dom");
var gfx = require("../gfx");
var sock = require("../sock");
var util = require("../util");
var etgutil = require("../etgutil");
module.exports = function(data) {
	var stage = new PIXI.Container(), h = preact.h;
	var div = h('div', { id: 'app', style: { display: '' }},
		h('span', { style: { position: 'absolute', left: '96px', top: '576px' }}, "Earn 1$ when your arena deck is faced, & another 2$ when it wins"),
		h(dom.ExitBtn, { x: 8, y: 300 })
	);
	function renderInfo(info, y){
		if (info){
			if (y) info.card = etgutil.asUpped(info.card, true);
			var mark, i = 0, adeck = "05" + info.card.toString(32) + info.deck;
			etgutil.iterdeck(adeck, function(code){
				var ismark = etgutil.fromTrueMark(code);
				if (~ismark){
					mark = ismark;
					return;
				}
				var spr = new PIXI.Sprite(gfx.getCardImage(code));
				spr.position.set(100 + Math.floor(i / 10) * 99, y + 32 + (i % 10) * 19);
				stage.addChild(spr);
				i++;
			});
			div.children.push(
				h('span', { style: { position: 'absolute', left: '100px', top: 4+y+'px' }}, "W-L: " + (info.win || 0) + " - " + (info.loss || 0) + ", Rank: " + (info.rank == undefined ? "Inactive" : (info.rank + 1)) + ", " + ((info.win || 0) * 3 + (info.loss || 0) * 1) + "$"),
				h('span', { style: { position: 'absolute', left: '330px', top: 4+y+'px' }}, adeck),
				h('span', { style: { position: 'absolute', left: '400px', top: 224+y+'px' }}, 'Age: ' + info.day),
				h('span', { style: { position: 'absolute', left: '100px', top: 224+y+'px' }}, "HP: " + info.curhp + ' / ' + info.hp),
				h('span', { style: { position: 'absolute', left: '200px', top: 224+y+'px' }}, "Mark: " + info.mark),
				h('span', { style: { position: 'absolute', left: '300px', top: 224+y+'px' }}, "Draw: " + info.draw),
				h('input', {
					type: 'button',
					value: 'Modify',
					style: {
						position: 'absolute',
						left: '500px',
						top: 224+y+'px',
					},
					onClick: function(){
						require("./Editor")(data, info, info.card);
					}
				}),
				h('input', {
					type: 'button',
					value: 'Test',
					style: {
						position: 'absolute',
						left: '600px',
						top: 224+y+'px',
					},
					onClick: function(){
						var deck = sock.getDeck();
						if (etgutil.decklength(deck) < 9 || etgutil.decklength(adeck) < 9) {
							require("./Editor")();
							return;
						}
						var gameData = { deck: adeck, urdeck: deck, seed: util.randint(), foename: "Test", cardreward: "",
							p2hp:info.curhp, p2markpower:info.mark, p2drawpower:info.draw };
						require("./Match")(gameData, true);
					}
				}),
				h('span', { className: 'ico e' + mark, style: { position: 'absolute', left: '66px', top: 200+y+'px' } })
			);
		}
	}
	renderInfo(data.A, 0);
	renderInfo(data.B, 300);
	if (sock.user.ocard){
		for(var i=0; i<2; i++){
			let uocard = etgutil.asUpped(sock.user.ocard, i == 1);
			div.children.push(h('input', {
				type: 'button',
				value: 'Create',
				style: {
					position: 'absolute',
					left: '734px',
					top: 268+i*292+'px',
				},
				onClick: function(){
					require("./Editor")(data, data[uocard>6999?"B":"A"] || {}, uocard, true);
				}
			}));
			var ocard = new PIXI.Sprite(gfx.getArt(uocard));
			ocard.position.set(734, 8+i*292);
			stage.addChild(ocard);
		}
	}
	px.view({endnext: px.hideapp, view:stage});
	px.render(div);
}
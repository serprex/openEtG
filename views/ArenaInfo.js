"use strict";
const px = require('../px'),
	Cards = require('../Cards'),
	sock = require('../sock'),
	util = require('../util'),
	etgutil = require('../etgutil'),
	Components = require('../Components'),
	h = preact.h;

module.exports = function(props) {
	const children = [
		h(Components.Text, { style: { position: 'absolute', left: '96px', top: '576px' }, text: "Earn 1$ when your arena deck is faced, & another 2$ when it wins"}),
		h(Components.ExitBtn, { x: 8, y: 300, doNav: props.doNav }),
	];
	function renderInfo(info, y){
		if (info){
			if (y) info.card = etgutil.asUpped(info.card, true);
			var mark, i = 0, adeck = '05' + info.card.toString(32) + info.deck;
			etgutil.iterdeck(adeck, function(code){
				const ismark = etgutil.fromTrueMark(code);
				if (~ismark){
					mark = ismark;
					return;
				}
				children.push(h(Components.CardImage, {
					x: 100 + Math.floor(i / 10) * 99,
					y: y + 32+ (i % 10) * 19,
					card: Cards.Codes[code],
				}));
				i++;
			});
			children.push(
				h(Components.Text, { style: { position: 'absolute', left: '100px', top: 4+y+'px' }, text: "W-L: " + (info.win || 0) + " - " + (info.loss || 0) + ", Rank: " + (info.rank == undefined ? "Inactive" : (info.rank + 1)) + ", " + ((info.win || 0) * 3 + (info.loss || 0) * 1) + "$"}),
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
						require("./Editor")(props, info, info.card);
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
						const gameData = { deck: adeck, urdeck: deck, seed: util.randint(), foename: "Test", cardreward: "",
							p2hp:info.curhp, p2markpower:info.mark, p2drawpower:info.draw };
						require("./Match")(gameData, true);
					}
				}),
				h('span', { className: 'ico e' + mark, style: { position: 'absolute', left: '66px', top: 200+y+'px' } })
			);
		}
	}
	renderInfo(props.A, 0);
	renderInfo(props.B, 300);
	if (sock.user.ocard){
		for(let i=0; i<2; i++){
			let uocard = etgutil.asUpped(sock.user.ocard, i == 1);
			children.push(h('input', {
				type: 'button',
				value: 'Create',
				style: {
					position: 'absolute',
					left: '734px',
					top: 268+i*292+'px',
				},
				onClick: function(){
					require("./Editor")(props, props[uocard>6999?"B":"A"] || {}, uocard, true);
				}
			}));
			children.push(h(Components.Card, { x: 734, y: 8+i*292, code: uocard }));
		}
	}
	return h('div', { children: children });
}
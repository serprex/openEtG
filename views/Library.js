"use strict";
var px = require("../px");
var dom = require("../dom");
var gfx = require("../gfx");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var userutil = require("../userutil");
var CardSelector = require("../CardSelector");

module.exports = function(data){
	var h = preact.h, view = px.mkView(), showbound = false,
		cardpool = etgutil.deck2pool(data.pool), boundpool = etgutil.deck2pool(data.bound),
		cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	view.addChild(cardArt);
	var progressmax = 0, progress = 0, shinyprogress = 0;
	Cards.Codes.forEach(function(card, code){
		if (!card.upped && !card.shiny && card.type && !card.status.get("token")){
			progressmax += 42;
			var upcode = etgutil.asUpped(code, true);
			progress += Math.min((cardpool[code] || 0) + (boundpool[code] || 0) + ((cardpool[upcode] || 0) + (boundpool[upcode] || 0))*6, 42);
			code = etgutil.asShiny(code, true);
			upcode = etgutil.asUpped(code, true);
			shinyprogress += Math.min((cardpool[code] || 0) + (boundpool[code] || 0) + ((cardpool[upcode] || 0) + (boundpool[upcode] || 0))*6, 42);
		}
	});
	var wealth = data.gold + userutil.calcWealth(cardpool);
	var domview = h('div', { id: 'app', style: {display: '' }},
		h('span', { style: { position: 'absolute', left: '100px', top: '16px' } }, "Cumulative wealth: " + Math.round(wealth) + "\nZE Progress: " + progress + " / " + progressmax + "\nSZE Progress: " + shinyprogress + " / " + progressmax),
		h('input', {
			type: 'button',
			value: 'Toggle Bound',
			style: {
				position: 'absolute',
				left: '5px',
				top: '554px',
			},
			onClick: function() {
				cardsel.cardpool = (showbound ^= true) ? boundpool : cardpool
			}
		}),
		h('input', {
			type: 'button',
			value: 'Exit',
			style: {
				position: 'absolute',
				left: '10px',
				top: '10px',
			},
			onClick: function() { require('./MainMenu')(); },
		})
	);
	var stage = {
		endnext:px.hideapp,
		dom:dom.div(),
		view:view,
	};
	var cardsel = new CardSelector(stage, function(code){
		cardArt.texture = gfx.getArt(code);
	}, null, null, true);
	cardsel.cardpool = cardpool;
	view.addChild(cardsel);
	px.view(stage);
	px.render(domview);
}
"use strict";
const px = require('../px'),
	gfx = require('../gfx'),
	Cards = require('../Cards'),
	etgutil = require('../etgutil'),
	userutil = require('../userutil'),
	Components = require('../Components'),
	h = preact.h;

module.exports = class Library extends preact.Component {
	render() {
		const self = this;
		const cardpool = etgutil.deck2pool(this.props.pool),
			boundpool = etgutil.deck2pool(this.props.bound);
		let progressmax = 0, progress = 0, shinyprogress = 0;
		Cards.Codes.forEach(function(card, code){
			if (!card.upped && !card.shiny && card.type && !card.status.get("token")){
				progressmax += 42;
				let upcode = etgutil.asUpped(code, true);
				progress += Math.min((cardpool[code] || 0) + (boundpool[code] || 0) + ((cardpool[upcode] || 0) + (boundpool[upcode] || 0))*6, 42);
				code = etgutil.asShiny(code, true);
				upcode = etgutil.asUpped(code, true);
				shinyprogress += Math.min((cardpool[code] || 0) + (boundpool[code] || 0) + ((cardpool[upcode] || 0) + (boundpool[upcode] || 0))*6, 42);
			}
		});
		const wealth = this.props.gold + userutil.calcWealth(cardpool);
		return h('div', {},
			h('span', { style: { position: 'absolute', left: '100px', top: '16px', whiteSpace: 'pre' } }, "Cumulative wealth: " + Math.round(wealth) + "\nZE Progress: " + progress + " / " + progressmax + "\nSZE Progress: " + shinyprogress + " / " + progressmax),
			h(Components.Card, { x: 734, y: 8, code: this.state.code }),
			h('input', {
				type: 'button',
				value: 'Toggle Bound',
				style: {
					position: 'absolute',
					left: '5px',
					top: '554px',
				},
				onClick: function() {
					self.setState(Object.assign({}, self.state, { showbound: !self.state.showbound }));
				}
			}),
			h(Components.ExitBtn, { x: 8, y: 8, doNav: self.props.doNav }),
			h(Components.CardSelector, {
				cardpool: this.state.showbound ? cardpool : boundpool,
				filterboth: true,
				onMouseOver: function(code){
					self.setState(Object.assign({}, self.state, { code: code }));
				},
			})
		);
	}
}
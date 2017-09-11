"use strict";
const ui = require('./ui'),
	audio = require('./audio'),
	Cards = require('./Cards'),
	options = require('./options'),
	h = preact.h, Component = preact.Component;

exports.App = function App(props) {
	return h('div', { id: 'app', style: { display: '' }, children: props.children });
}

exports.rect = function(x, y, wid, hei) {
	let style = {
		position: 'absolute',
		left: x+'px',
		top: y+'px',
		width: wid+'px',
		height: hei+'px',
	};
	return function(props) {
		return h('div', Object.assign({}, props, { style: props.style ? Object.assign({}, props.style, style) : style }));
	}
}

function CardImage(props) {
	let card = props.card, spans = [h('span', { style: { color: card.upped && "#000" } }, card.name)];
	let bordcol = card && card.shiny ? '#daa520' : '#222';
	let bgcol = card ? ui.maybeLightenStr(card) : card === null ? '#876' : '#111';
	if (card && card.cost) {
		spans.push(h('span', { style: { float: 'right', marginRight: '2px', color: card.upped && '#000' }}, card.cost));
		if (card.costele !== card.element) {
			span.push(h('span', { className: 'ico ce' + card.costele, style: { float: 'right' }}));
		}
	}
	return h('div', {
		className: 'cardslot',
		onMouseOver: props.onMouseOver,
		onClick: props.onClick,
		style: {
			backgroundColor: bgcol,
			borderColor: bordcol,
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
		children: spans,
	});
}
exports.CardImage = CardImage;

exports.Input = function(props){
	var ele = h('input', {
		placeholder: props.placeholder,
		onKeyPress: props.onKeyPress,
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
	});
	if (props.num) ele.className = 'numput';
	if (props.opt) options.register(props.opt, ele, props.nopersist);
	return ele;
}

exports.Text = function(props){
	var text = props.text.toString().replace(/\|/g, ' / ');
	var sep = /\d\d?:\d\d?|\$|\n/g, reres, lastindex = 0;
	var ele = h('div', { style: props.style }), elec = [];
	while (reres = sep.exec(text)){
		var piece = reres[0];
		if (reres.index != lastindex){
			elec.push(text.slice(lastindex, reres.index));
		}
		if (piece == "\n") {
			elec.push(h('br'))
		}else if (piece == "$") {
			elec.push(h('span', { className: 'ico gold' }));
		}else if (/^\d\d?:\d\d?$/.test(piece)) {
			var parse = piece.split(":");
			var num = parseInt(parse[0]);
			if (num == 0) {
				elec.push(h('0'));
			} else if (num < 4) {
				var icon = h('span', { className: 'ico ce'+parse[1] });
				for (var j = 0;j < num;j++) {
					elec.push(icon);
				}
			}else{
				elec.push(parse[0], h('span', { className: 'ico ce'+parse[1] }))
			}
		}
		lastindex = reres.index + piece.length;
	}
	if (lastindex != text.length){
		elec.push(text.slice(lastindex));
	}
	ele.children = elec;
	return ele;
}

exports.IconBtn = function(props) {
	return h('span', {
		className: 'imgb ico ' + props.e,
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		},
		onClick: function(e){
			audio.playSound('buttonClick');
			if (props.click) props.click.call(e.target, e);
		},
		onMouseOver: props.onMouseOver,
	});
}

exports.ExitBtn = function(props) {
	return h('input', {
		type: 'button',
		value: 'Exit',
		onClick: props.onClick || function() { props.doNav(require('./views/MainMenu')); },
		style: {
			position: 'absolute',
			left: props.x + 'px',
			top: props.y + 'px',
		}
	});
}

class DeckDisplay extends Component {
	constructor(props) {
		super(props)
		this.state = { deck: props.deck || [] };
	}

	render() {
		return h('div', {
			children: this.state.deck.map(function(code, i){
				let card = Cards.Codes[code];
				return card ? h(CardImage, {
					card: card,
					onMouseOver: this.props.onMouseOver,
					onClick: this.props.onClick,
					x: 100 + Math.floor(i / 10) * 99,
					y: 32 + (i % 10) * 19,
				}) : null;
			}, this),
		});
	}
}
exports.DeckDisplay = DeckDisplay;
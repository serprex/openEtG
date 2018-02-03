'use strict';
const ui = require('./ui'),
	Thing = require('./Thing'),
	Components = require('./Components'),
	h = require('react').createElement;
const anims = [];

function maybeTgtPos(pos) {
	return pos instanceof Thing ? ui.tgtToPos(pos) : pos;
}
function Death(pos) {
	this.step = 0;
	this.position = maybeTgtPos(pos);
}
function Text(text, pos) {
	this.step = 0;
	this.position = maybeTgtPos(pos);
	this.text = text;
	for (var i = 0; i < anims.length; i++) {
		var a = anims[i];
		if (
			a.position &&
			a.position.x == this.position.x &&
			a.position.y == this.position.y
		) {
			this.position.y += 16;
			i = -1;
		}
	}
}
function SpriteFade(child) {
	this.step = 0;
	this.child = child;
}
function SpriteFadeText(text, pos) {
	return new SpriteFade(
		h(
			'div',
			{
				style: {
					position: 'absolute',
					left: pos.x + 'px',
					top: pos.y + 'px',
					transform: 'translate(-50%,-50%)',
					fontSize: '16px',
					color: '#fff',
					backgroundColor: '#000',
					padding: '32px',
				},
			},
			text,
		),
	);
}
function SpriteFadeHandImage(card, pos, anchor) {
	return new SpriteFade(
		h(Components.CardImage, {
			card: card,
			x: pos.x + anchor.x * 100,
			y: pos.y + anchor.y * 20,
		}),
	);
}
function nop() {}
function make(cons) {
	return !h
		? nop
		: function() {
				if (exports.disable || !anims) return;
				var effect = Object.create(cons.prototype);
				var effectOverride = cons.apply(effect, arguments);
				anims.push(effectOverride || effect);
			};
}
if (!h) {
	exports.disable = true;
	exports.register = exports.next = nop;
} else {
	exports.disable = false;
	exports.clear = function(doc) {
		anims.length = 0;
	};
	exports.next = function(p2cloaked) {
		const result = [];
		for (let i = anims.length - 1; i >= 0; i--) {
			const anim = anims[i];
			if (anim.position && p2cloaked) {
				const pos = anim.position;
				if (pos.x > 130 && pos.x < 660 && pos.y > 20 && pos.y < 280) {
					anims.splice(i, 1);
				}
			}
			let r = anim.next();
			if (r === null) {
				anims.splice(i, 1);
			}
			result.push(r);
		}
		return result.length ? result : null;
	};
	Death.prototype.next = function() {
		if (++this.step >= 15) return null;
		return h('div', {
			style: {
				position: 'absolute',
				left: this.position.x + 'px',
				top: this.position.y + 'px',
				opacity: 1 - this.step / 15,
				backgroundColor: '#000',
			},
		});
	};
	Text.prototype.next = function() {
		if (++this.step >= 36) return null;
		this.position.y -= 2;
		return h(Components.Text, {
			text: this.text,
			style: {
				position: 'absolute',
				left: this.position.x + 'px',
				top: this.position.y + 'px',
				opacity: 1 - Math.sqrt(this.step) / 6,
				fontSize: '16px',
			},
		});
	};
	SpriteFade.prototype.next = function() {
		if (++this.step >= 128) return null;
		return h(
			'div',
			{
				style: {
					opacity: this.step > 64 ? 2 - this.step / 64 : 1,
				},
			},
			this.child,
		);
	};
}
exports.mkDeath = make(Death);
exports.mkText = make(Text);
exports.mkSpriteFade = make(SpriteFade);
exports.mkSpriteFadeText = make(SpriteFadeText);
exports.mkSpriteFadeHandImage = make(SpriteFadeHandImage);

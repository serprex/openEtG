import enums from './enum.json' assert { type: 'json' };
import * as etg from './etg.js';
import * as etgutil from './etgutil.js';
import * as wasm from './rs/pkg/etg.js';

export default class Card {
	constructor(Cards, code, realcode) {
		this.Cards = Cards;
		this.index = wasm.card_index(Cards.set, code);
		this.code = realcode;
	}

	get type() {
		return wasm.card_type(this.Cards.set, this.index);
	}

	get element() {
		return wasm.card_element(this.Cards.set, this.index);
	}

	get rarity() {
		return wasm.card_rarity(this.Cards.set, this.index);
	}

	get cost() {
		return wasm.card_cost(this.Cards.set, this.index);
	}

	get costele() {
		return wasm.card_costele(this.Cards.set, this.index);
	}

	get name() {
		return wasm.card_name(this.Cards.set, this.index);
	}

	get shiny() {
		return !!(this.code & 16384);
	}

	get upped() {
		return ((this.code & 0x3fff) - 1000) % 4000 > 1999;
	}

	get token() {
		return wasm.card_token(this.Cards.set, this.index);
	}

	get pillar() {
		return wasm.card_pillar(this.Cards.set, this.index);
	}

	valueOf() {
		return this.code;
	}

	isFree() {
		return this.pillar && !this.upped && !this.rarity && !this.shiny;
	}

	info() {
		return wasm.cardText(this.Cards.set, this.index);
	}

	toString() {
		return this.code.toString();
	}

	asUpped(upped) {
		return this.upped === !!upped
			? this
			: this.Cards.Codes[etgutil.asUpped(this.code, upped)];
	}

	asShiny(shiny) {
		return this.shiny === !!shiny
			? this
			: this.Cards.Codes[etgutil.asShiny(this.code, shiny)];
	}
}

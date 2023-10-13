import { asShiny, asUpped } from './etgutil.js';
import * as wasm from './rs/pkg/etg.js';

export default class Card {
	constructor(Cards, code, realcode) {
		this.Cards = Cards;
		this.idx = wasm.card_index(Cards.set, code);
		this.code = realcode;
	}

	get shiny() {
		return !!(this.code & 16384);
	}

	get upped() {
		return ((this.code & 0x3fff) - 1000) % 4000 > 1999;
	}

	isFree() {
		return this.pillar && !this.upped && !this.rarity && !this.shiny;
	}

	asUpped(upped) {
		return this.Cards.Codes[asUpped(this.code, upped)];
	}

	asShiny(shiny) {
		return this.Cards.Codes[asShiny(this.code, shiny)];
	}
}

for (const k of Object.getOwnPropertyNames(wasm)) {
	if (k.startsWith('card_')) {
		Object.defineProperty(Card.prototype, k.slice(5), {
			get() {
				return wasm[k](this.Cards.set, this.idx);
			},
		});
	}
}

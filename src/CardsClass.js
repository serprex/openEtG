import Card from './Card.js';
import * as wasm from './rs/pkg/etg.js';
import * as etgutil from './etgutil.js';

export default class Cards {
	constructor(set) {
		this.cardSet = set;
		this.set = wasm.CardSet[set];
		this.Codes = [];

		for (const code of wasm.card_codes(this.set)) {
			for (let shiny = 0; shiny < 2; shiny++) {
				for (let upped = 0; upped < 2; upped++) {
					const upcode = etgutil.asUpped(code, upped),
						realcode = etgutil.asShiny(upcode, shiny),
						card = new Card(this, upcode, realcode);
					this.Codes[realcode] = card;
				}
			}
		}
	}

	codeCmp = (x, y) =>
		wasm.code_cmp(
			this.set,
			etgutil.asShiny(x, false),
			etgutil.asShiny(y, false),
		) || (x > y) - (x < y);

	checkPool(pool, cardCount, cardMinus, card) {
		const uncode = etgutil.asShiny(etgutil.asUpped(card.code, false), false);

		if ((cardMinus[card.code] ?? 0) + 1 <= pool[card.code]) {
			cardMinus[card.code] = (cardMinus[card.code] ?? 0) + 1;
			cardCount[uncode] = (cardCount[uncode] ?? 0) + 1;
			return true;
		}

		if ((!card.upped && !card.shiny) || this.cardSet === 'Original') {
			return false;
		}

		if (card.rarity === 4 && card.shiny) {
			const scode = etgutil.asShiny(uncode, true);
			if ((cardMinus[scode] ?? 0) + 1 <= pool[scode]) {
				cardMinus[scode] = (cardMinus[scode] ?? 0) + 1;
				cardCount[scode] = (cardCount[scode] ?? 0) + 1;
				return true;
			}
			return false;
		}

		const amount =
			(card.rarity === -1 ? 1 : 6) * (card.upped && card.shiny ? 6 : 1);
		if ((cardMinus[uncode] ?? 0) + amount <= pool[uncode]) {
			cardMinus[uncode] = (cardMinus[uncode] ?? 0) + amount;
			cardCount[uncode] = (cardCount[uncode] ?? 0) + 1;
			return true;
		}
		return false;
	}

	filterDeck(deck, pool, preserve) {
		const cardMinus = [],
			cardCount = [];
		for (let i = deck.length - 1; i >= 0; i--) {
			let code = deck[i],
				card = this.Codes[code];
			if (!card.pillar) {
				if (etgutil.cardCount(cardCount, code) >= 6) {
					deck.splice(i, 1);
					continue;
				}
			}
			if (!card.isFree()) {
				if (!this.checkPool(pool, cardCount, cardMinus, card)) {
					code = etgutil.asShiny(code, !card.shiny);
					card = this.Codes[code];
					if (
						card.isFree() ||
						this.checkPool(pool, cardCount, cardMinus, card)
					) {
						deck[i] = code;
					} else if (!preserve) {
						deck.splice(i, 1);
					}
				}
			}
		}
		return cardMinus;
	}

	isDeckLegal(deck, user, minsize = 30) {
		if (!user) return false;
		let pool = etgutil.deck2pool(
			user.accountbound ?? '',
			etgutil.deck2pool(user.pool),
		);
		const cardMinus = [],
			cardCount = [];
		let dlen = 0;
		for (let i = deck.length - 1; i >= 0; i--) {
			const code = deck[i];
			if (~etgutil.fromTrueMark(code)) continue;
			dlen++;
			const card = this.Codes[code];
			if (!card || (!card.pillar && etgutil.cardCount(cardCount, card) >= 6)) {
				return false;
			}
			if (
				!card.isFree() &&
				pool &&
				!this.checkPool(pool, cardCount, cardMinus, card)
			) {
				return false;
			}
		}
		if (dlen < minsize || dlen > 60) return false;
		return true;
	}
}

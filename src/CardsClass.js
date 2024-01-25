import Card from './Card.js';
import * as wasm from './rs/pkg/etg.js';
import { asShiny, asUpped, deck2pool, fromTrueMark } from './etgutil.js';

export default class Cards {
	constructor(set) {
		this.cardSet = set;
		this.set = wasm.CardSet[set];
		this.Codes = [];

		for (const code of wasm.card_codes(this.set)) {
			for (let shiny = 0; shiny < 2; shiny++) {
				for (let upped = 0; upped < 2; upped++) {
					const upcode = asUpped(code, upped),
						realcode = asShiny(upcode, shiny),
						card = new Card(this, upcode, realcode);
					this.Codes[realcode] = card;
				}
			}
		}
	}

	codeCmp = (x, y) =>
		wasm.code_cmp(this.set, asShiny(x, false), asShiny(y, false)) ||
		(x > y) - (x < y);

	checkPool(pool, cardCount, cardMinus, card, autoup) {
		const uncode = asUpped(asShiny(card.code, false), false);

		if ((cardMinus[card.code] ?? 0) + 1 <= pool[card.code]) {
			cardMinus[card.code] = (cardMinus[card.code] ?? 0) + 1;
			cardCount[uncode] = (cardCount[uncode] ?? 0) + 1;
			return true;
		}

		if ((!card.upped && !card.shiny) || this.cardSet === 'Original') {
			return false;
		}

		if (card.rarity === 4 && card.shiny) {
			const scode = asShiny(uncode, true);
			if ((cardMinus[scode] ?? 0) + 1 <= pool[scode]) {
				cardMinus[scode] = (cardMinus[scode] ?? 0) + 1;
				cardCount[scode] = (cardCount[scode] ?? 0) + 1;
				return true;
			}
			return false;
		}

		if (autoup) {
			const amount =
				(card.rarity === -1 ? 1 : 6) * (card.upped && card.shiny ? 6 : 1);
			if ((cardMinus[uncode] ?? 0) + amount <= pool[uncode]) {
				cardMinus[uncode] = (cardMinus[uncode] ?? 0) + amount;
				cardCount[uncode] = (cardCount[uncode] ?? 0) + 1;
				return true;
			}
		}
		return false;
	}

	filterDeck(deck, pool, preserve, autoup) {
		const cardMinus = [],
			cardCount = [];
		for (let i = deck.length - 1; i >= 0; i--) {
			let code = deck[i],
				card = this.Codes[code];
			if (
				!card.pillar &&
				cardCount[asUpped(asShiny(code, false), false)] >= 6
			) {
				deck.splice(i, 1);
				continue;
			}
			if (
				!card.isFree() &&
				!this.checkPool(pool, cardCount, cardMinus, card, autoup)
			) {
				code = asShiny(code, !card.shiny);
				card = this.Codes[code];
				if (
					card.isFree() ||
					this.checkPool(pool, cardCount, cardMinus, card, autoup)
				) {
					deck[i] = code;
				} else if (!preserve) {
					deck.splice(i, 1);
				}
			}
		}
		return cardMinus;
	}

	isDeckLegal(deck, user, minsize = 30) {
		if (!user) return false;
		let pool = deck2pool(user.accountbound ?? '', deck2pool(user.pool));
		const cardMinus = [],
			cardCount = [];
		let dlen = 0;
		for (let i = deck.length - 1; i >= 0; i--) {
			const code = deck[i];
			if (~fromTrueMark(code)) continue;
			dlen++;
			const card = this.Codes[code];
			if (
				!card ||
				(!card.pillar && cardCount[asUpped(asShiny(code, false), false)] >= 6)
			) {
				return false;
			}
			if (
				!card.isFree() &&
				pool &&
				!this.checkPool(
					pool,
					cardCount,
					cardMinus,
					card,
					!user?.flags?.includes?.('no-up-merge'),
				)
			) {
				return false;
			}
		}
		if (dlen < minsize || dlen > 60) return false;
		return true;
	}
}

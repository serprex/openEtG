import * as etg from './etg.js';
import * as etgutil from './etgutil.js';
import Card from './Card.js';
import CardsJson from './Cards.json';

export default class Cards {
	constructor(CardsJson) {
		this.filtercache = [[], [], [], []];
		this.Codes = [];
		this.Names = Object.create(null);

		CardsJson.forEach((data, type) => {
			const keys = data[0],
				cardinfo = {};
			for (let i = 1; i < data.length; i++) {
				cardinfo.E = i - 1;
				for (const carddata of data[i]) {
					keys.forEach((key, i) => {
						cardinfo[key] = carddata[i];
					});
					const cardcode = cardinfo.Code,
						card = new Card(this, type + 1, cardinfo);
					this.Codes[cardcode] = card;
					if (!card.upped) this.Names[cardinfo.Name.replace(/\W/g, '')] = card;
					cardinfo.Code = etgutil.asShiny(cardcode, true);
					const shiny = new Card(this, type + 1, cardinfo);
					this.Codes[cardinfo.Code] = shiny;
					const cacheidx = card.upped ? 1 : 0;
					if (!card.getStatus('token')) {
						this.filtercache[cacheidx].push(card);
						this.filtercache[cacheidx | 2].push(shiny);
					}
				}
			}
		});
		for (const fc of this.filtercache) {
			fc.sort(this.cardCmp, this);
		}
	}

	codeCmp = (x, y) => {
		const cx = this.Codes[etgutil.asShiny(x, false)],
			cy = this.Codes[etgutil.asShiny(y, false)];
		return (
			cx.upped - cy.upped ||
			cx.element - cy.element ||
			cx.cost - cy.cost ||
			cx.type - cy.type ||
			(cx.code > cy.code) - (cx.code < cy.code) ||
			(x > y) - (x < y)
		);
	};

	cardCmp = (x, y) => this.codeCmp(x.code, y.code);

	filter(upped, filter, cmp, shiny) {
		const keys = this.filtercache[(upped ? 1 : 0) | (shiny ? 2 : 0)].filter(
			filter,
		);
		return cmp ? keys.sort(cmp) : keys;
	}

	sumCardMinus(cardMinus, code) {
		let sum = 0;
		for (let i = 0; i < 4; i++) {
			sum +=
				cardMinus[etgutil.asShiny(etgutil.asUpped(code, i & 1), i & 2)] ?? 0;
		}
		return sum;
	}

	filterDeck(deck, pool, preserve) {
		const cardMinus = [];
		for (let i = deck.length - 1; i >= 0; i--) {
			let code = deck[i],
				card = this.Codes[code];
			if (!card.getStatus('pillar')) {
				if (this.sumCardMinus(cardMinus, code) === 6) {
					deck.splice(i, 1);
					continue;
				}
			}
			if (!card.isFree()) {
				if ((cardMinus[code] ?? 0) < (pool[code] ?? 0)) {
					cardMinus[code] = (cardMinus[code] ?? 0) + 1;
				} else {
					code = etgutil.asShiny(code, !card.shiny);
					card = this.Codes[code];
					if (card.isFree()) {
						deck[i] = code;
					} else if ((cardMinus[code] ?? 0) < (pool[code] ?? 0)) {
						deck[i] = code;
						cardMinus[code] = (cardMinus[code] ?? 0) + 1;
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
		const cardMinus = [];
		let dlen = 0;
		for (let i = deck.length - 1; i >= 0; i--) {
			const code = deck[i];
			if (~etgutil.fromTrueMark(code)) continue;
			dlen++;
			const card = this.Codes[code];
			if (
				!card ||
				(!card.getStatus('pillar') && this.sumCardMinus(cardMinus, code) === 6)
			) {
				return false;
			}
			if (!card.isFree() && pool) {
				if ((cardMinus[code] ?? 0) < (pool[code] ?? 0)) {
					cardMinus[code] = (cardMinus[code] ?? 0) + 1;
				} else {
					return false;
				}
			}
		}
		if (dlen < minsize || dlen > 60) return false;
		return true;
	}
}

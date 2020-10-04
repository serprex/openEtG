import * as etg from './etg.js';
import * as etgutil from './etgutil.js';
import Card from './Card.js';
import CardsJson from './Cards.json';

export default class Cards {
	constructor(CardsJson) {
		this.filtercache = [];
		this.Codes = [];
		this.Names = {};

		CardsJson.forEach((cards, type) => this.parseCsv(type, cards));
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

	filter(upped, filter, cmp, showshiny) {
		const cacheidx = (upped ? 1 : 0) | (showshiny ? 2 : 0);
		if (!this.filtercache[cacheidx]) {
			this.filtercache[cacheidx] = [];
			for (const key in this.Codes) {
				const card = this.Codes[key];
				if (
					!card.upped === !upped &&
					!card.shiny === !showshiny &&
					!card.getStatus('token')
				) {
					this.filtercache[cacheidx].push(card);
				}
			}
			this.filtercache[cacheidx].sort();
		}
		const keys = this.filtercache[cacheidx].filter(filter);
		if (cmp) keys.sort(cmp);
		return keys;
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
			if (card.type !== etg.Pillar) {
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
				(card.type !== etg.Pillar && this.sumCardMinus(cardMinus, code) === 6)
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

	parseCsv(type, data) {
		const keys = data[0],
			cardinfo = {};
		for (let i = 1; i < data.length; i++) {
			cardinfo.E = i - 1;
			data[i].forEach(carddata => {
				keys.forEach((key, i) => {
					cardinfo[key] = carddata[i];
				});
				const cardcode = cardinfo.Code,
					card = new Card(this, type, cardinfo);
				this.Codes[cardcode] = card;
				if (!card.upped)
					this.Names[cardinfo.Name.replace(/\W/g, '')] = this.Codes[cardcode];
				cardinfo.Code = etgutil.asShiny(cardcode, true);
				this.Codes[cardinfo.Code] = new Card(this, type, cardinfo);
			});
		}
	}
}

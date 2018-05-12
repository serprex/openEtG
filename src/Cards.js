'use strict';
const etg = require('./etg'),
	etgutil = require('./etgutil');
exports.Codes = [];
exports.Targeting = null;
exports.codeCmp = function(x, y) {
	const cx = exports.Codes[etgutil.asShiny(x, false)],
		cy = exports.Codes[etgutil.asShiny(y, false)];
	return (
		cx.upped - cy.upped ||
		cx.element - cy.element ||
		cx.cost - cy.cost ||
		cx.type - cy.type ||
		(cx.code > cy.code) - (cx.code < cy.code) ||
		(x > y) - (x < y)
	);
};
exports.cardCmp = function(x, y) {
	return exports.codeCmp(x.code, y.code);
};
const filtercache = [];
exports.filter = function(upped, filter, cmp, showshiny) {
	const cacheidx = (upped ? 1 : 0) | (showshiny ? 2 : 0);
	if (!(cacheidx in filtercache)) {
		filtercache[cacheidx] = [];
		for (const key in exports.Codes) {
			const card = exports.Codes[key];
			if (
				card.upped == upped &&
				!card.shiny == !showshiny &&
				!card.getStatus('token')
			) {
				filtercache[cacheidx].push(card);
			}
		}
		filtercache[cacheidx].sort();
	}
	const keys = filtercache[cacheidx].filter(filter);
	if (cmp) keys.sort(cmp);
	return keys;
};
function sumCardMinus(cardMinus, code) {
	let sum = 0;
	for (let i = 0; i < 4; i++) {
		sum +=
			cardMinus[etgutil.asShiny(etgutil.asUpped(code, i & 1), i & 2)] || 0;
	}
	return sum;
}
exports.filterDeck = function(deck, pool, preserve) {
	const cardMinus = [];
	for (let i = deck.length - 1; i >= 0; i--) {
		let code = deck[i],
			card = exports.Codes[code];
		if (card.type != etg.Pillar) {
			if (sumCardMinus(cardMinus, code) == 6) {
				deck.splice(i, 1);
				continue;
			}
		}
		if (!card.isFree()) {
			if ((cardMinus[code] || 0) < (pool[code] || 0)) {
				cardMinus[code] = (cardMinus[code] || 0) + 1;
			} else {
				code = etgutil.asShiny(code, !card.shiny);
				card = exports.Codes[code];
				if (card.isFree()) {
					deck[i] = code;
				} else if ((cardMinus[code] || 0) < (pool[code] || 0)) {
					deck[i] = code;
					cardMinus[code] = (cardMinus[code] || 0) + 1;
				} else if (!preserve) {
					deck.splice(i, 1);
				}
			}
		}
	}
	return cardMinus;
}
exports.isDeckLegal = function(deck, user, minsize = 30) {
	function incrpool(code, count) {
		if (code in exports.Codes) {
			pool[code] = (pool[code] || 0) + count;
		}
	}
	let pool;
	if (user) {
		pool = [];
		etgutil.iterraw(user.pool, incrpool);
		etgutil.iterraw(user.accountbound, incrpool);
	}
	const cardMinus = [];
	if (deck.length < minsize || deck.length > 60) return false;
	for (let i = deck.length - 1; i >= 0; i--) {
		let code = deck[i],
			card = exports.Codes[code];
		if (~etgutil.fromTrueMark(deck[i])) continue;
		if (!card || (card.type != etg.Pillar && sumCardMinus(cardMinus, code) == 6)) {
			return false;
		}
		if (!card.isFree() && pool) {
			if ((cardMinus[code] || 0) < (pool[code] || 0)) {
				cardMinus[code] = (cardMinus[code] || 0) + 1;
			} else {
				return false;
			}
		}
	}
	return true;
}
function parseCsv(type, data) {
	const keys = data[0],
		cardinfo = {};
	for (let i = 1; i < data.length; i++) {
		cardinfo.E = i - 1;
		data[i].forEach(carddata => {
			keys.forEach((key, i) => {
				cardinfo[key] = carddata[i];
			});
			const cardcode = cardinfo.Code;
			exports.Codes[cardcode] = new Card(type, cardinfo);
			if (cardcode < 7000)
				exports[cardinfo.Name.replace(/\W/g, '')] = exports.Codes[cardcode];
			cardinfo.Code = etgutil.asShiny(cardcode, true);
			exports.Codes[cardinfo.Code] = new Card(type, cardinfo);
		});
	}
}
function parseTargeting(data) {
	for (const key in data) {
		data[key] = getTargetFilter(data[key]);
	}
	exports.Targeting = data;
}
const TargetFilters = {
	own: (c, t) => c.owner == t.owner,
	foe: (c, t) => c.owner != t.owner,
	notself: (c, t) => c != t,
	all: (c, t) => true,
	card: (c, t) => c != t && t.type == etg.Spell,
	pill: (c, t) => t.isMaterial(etg.Permanent) && t.card.type == etg.Pillar,
	weap: (c, t) =>
		t.isMaterial() &&
			(t.type == etg.Weapon ||
				(t.type != etg.Spell && t.card.type == etg.Weapon)),
	shie: (c, t) =>
		t.isMaterial() &&
			(t.type == etg.Shield ||
				(t.type != etg.Spell && t.card.type == etg.Shield)),
	playerweap: (c, t) => t.type == etg.Weapon,
	perm: (c, t) => t.isMaterial(etg.Permanent),
	permnonstack: (c, t) => t.isMaterial(etg.Permanent) && !t.getStatus('stackable'),
	stack: (c, t) => t.isMaterial(etg.Permanent) && t.getStatus('stackable'),
	crea: (c, t) => t.isMaterial(etg.Creature),
	play: (c, t) => t.type == etg.Player,
	notplay: (c, t) => t.type != etg.Player,
	sing: (c, t) => t.isMaterial(etg.Creature) && t.active.get('cast') !== c.active.get('cast'),
	notskele: (c, t) => t.isMaterial(etg.Creature) && !t.card.isOf(exports.Skeleton),
	butterfly: (c, t) => (
		(t.type == etg.Creature || t.type == etg.Weapon) &&
		!t.getStatus('immaterial') &&
		!t.getStatus('burrowed') &&
		(t.trueatk() < 3 || (t.type == etg.Creature && t.truehp() < 3))
	),
	devour: (c, t) => t.isMaterial(etg.Creature) && t.truehp() < c.truehp(),
	paradox: (c, t) => t.isMaterial(etg.Creature) && t.truehp() < t.trueatk(),
	forceplay: (c, t) => t.type == etg.Spell || (t.isMaterial() && t.active.get('cast')),
	shuffle3: (c, t) => t.isMaterial() && (t.type == etg.Creature || t.owner != c.owner),
	airbornecrea: (c, t) => t.isMaterial(etg.Creature) && t.getStatus('airborne'),
	golem: (c, t) => t.getStatus('golem') && t.attack,
	groundcrea: (c, t) => t.isMaterial(etg.Creature) && !t.getStatus('airborne'),
	wisdom: (c, t) => (
		(t.type == etg.Creature || t.type == etg.Weapon) &&
		!t.getStatus('burrowed')
	),
	quinttog: (c, t) => t.type == etg.Creature && !t.getStatus('burrowed'),
};
function getTargetFilter(str) {
	function getFilterFunc(funcname) {
		return TargetFilters[funcname];
	}
	if (str in TargetFilters) {
		return TargetFilters[str];
	} else {
		const splitIdx = str.lastIndexOf(':');
		const prefixes = ~splitIdx
				? str
						.substr(0, splitIdx)
						.split(':')
						.map(getFilterFunc)
				: [],
			filters = (~splitIdx ? str.substr(splitIdx + 1) : str)
				.split('+')
				.map(getFilterFunc);
		return (TargetFilters[str] = function(c, t) {
			function check(f) {
				return f(c, t);
			}
			return prefixes.every(check) && filters.some(check);
		});
	}
}
var Card = require('./Card');

require('./Cards.json').forEach((cards, type) => {
	if (type == 6) parseTargeting(cards);
	else parseCsv(type, cards);
});

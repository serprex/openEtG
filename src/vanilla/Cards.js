'use strict';
exports.Targeting = null;
exports.Codes = [];
const etg = require('./etg'),
	smth = require('./Thing'),
	Card = require('./Card'),
	etgutil = require('../etgutil');
exports.codeCmp = function(x, y) {
	const cx = exports.Codes[x],
		cy = exports.Codes[y];
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
exports.filter = function(upped, filter, cmp) {
	const cacheidx = upped ? 1 : 0;
	if (!(cacheidx in filtercache)) {
		filtercache[cacheidx] = [];
		for (const key in exports.Codes) {
			const card = exports.Codes[key];
			if (card.upped == upped && !card.status.get('token')) {
				filtercache[cacheidx].push(card);
			}
		}
		filtercache[cacheidx].sort();
	}
	const keys = filtercache[cacheidx].filter(filter);
	if (cmp) keys.sort(cmp);
	return keys;
};
function parseCsv(type, data) {
	var keys = data[0],
		cardinfo = {};
	for (var i = 1; i < data.length; i++) {
		cardinfo.E = i - 1;
		data[i].forEach(function(carddata) {
			keys.forEach(function(key, i) {
				cardinfo[key] = carddata[i];
			});
			var cardcode = cardinfo.Code;
			exports.Codes[cardcode] = new Card(type, cardinfo);
			if (cardcode < 7000)
				exports[cardinfo.Name.replace(/\W/g, '')] = exports.Codes[cardcode];
		});
	}
}
function parseTargeting(data) {
	for (const key in data) {
		data[key] = getTargetFilter(data[key]);
	}
	exports.Targeting = data;
}
function getTargetFilter(str) {
	function getFilterFunc(funcname) {
		return TargetFilters[funcname];
	}
	if (str in TargetFilters) {
		return TargetFilters[str];
	} else {
		var splitIdx = str.lastIndexOf(':');
		var prefixes = ~splitIdx
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
const TargetFilters = {
	own: function(c, t) {
		return c.owner == t.owner;
	},
	foe: function(c, t) {
		return c.owner != t.owner;
	},
	notself: function(c, t) {
		return c != t;
	},
	all: function(c, t) {
		return true;
	},
	pill: function(c, t) {
		return t.isMaterial(etg.Permanent) && t.card.type === etg.Pillar;
	},
	weap: function(c, t) {
		return (
			(t.type === etg.Weapon ||
				(t.type === etg.Creature && t.card.type == etg.WeaponEnum)) &&
			!t.status.get('immaterial') &&
			!t.status.get('burrowed')
		);
	},
	perm: function(c, t) {
		return t.isMaterial(etg.Permanent);
	},
	crea: function(c, t) {
		return t.isMaterial(etg.Creature);
	},
	creaonly: function(c, t) {
		return t.isMaterial(etg.Creature) && t.card.type == etg.CreatureEnum;
	},
	creanonspell: function(c, t) {
		return t.isMaterial(etg.Creature) && t.card.type != etg.SpellEnum;
	},
	play: function(c, t) {
		return t.type == etg.Player;
	},
	notplay: function(c, t) {
		return t.type != etg.Player;
	},
	butterfly: function(c, t) {
		return t.isMaterial(etg.Creature) && t.trueatk() < 3;
	},
	devour: function(c, t) {
		return t.isMaterial(etg.Creature) && t.truehp() < c.truehp();
	},
	law: function(c, t) {
		return t.isMaterial(etg.Creature) && t.truehp() < 5;
	},
	paradox: function(c, t) {
		return t.isMaterial(etg.Creature) && t.truehp() < t.trueatk();
	},
	permnonstack: function(c, t) {
		return t.type === etg.Permanent && !t.status.get('stackable');
	},
	wisdom: function(c, t) {
		return t.type === etg.Creature && !t.status.get('burrowed');
	},
};

require('./Cards.json').forEach(function(cards, type) {
	if (type == 6) parseTargeting(cards);
	else parseCsv(type, cards);
});

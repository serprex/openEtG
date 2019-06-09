const Cards = require('./Cards'),
	etgutil = require('./etgutil'),
	userutil = require('./userutil');

function transmute(user, oldcard, func, use) {
	const poolCount = etgutil.count(user.pool, oldcard);
	const newcard = func(oldcard, true);
	if (poolCount < use) {
		const boundCount = etgutil.count(user.accountbound, oldcard);
		if (poolCount + boundCount >= use) {
			const result = {};
			result.accountbound = etgutil.addcard(user.accountbound, oldcard, -use);
			if (boundCount < use)
				result.pool = etgutil.addcard(user.pool, oldcard, boundCount - use);
			result.accountbound = etgutil.addcard(result.accountbound, newcard);
			return result;
		}
	} else {
		return {
			pool: etgutil.addcard(etgutil.addcard(user.pool, oldcard, -use), newcard),
		};
	}
}
function untransmute(user, oldcard, func, use) {
	const poolCount = etgutil.count(user.pool, oldcard);
	const newcard = func(oldcard, false);
	if (poolCount == 0) {
		const boundCount = etgutil.count(user.accountbound, oldcard);
		if (boundCount) {
			return {
				accountbound: etgutil.addcard(
					etgutil.addcard(user.accountbound, oldcard, -1),
					newcard,
					use,
				),
			};
		}
	} else {
		return {
			pool: etgutil.addcard(
				etgutil.addcard(user.pool, oldcard, -1),
				newcard,
				use,
			),
		};
	}
}
exports.upgrade = function(data, user) {
	const card = Cards.Codes[data.card];
	if (!card || card.upped) return;
	const use = ~card.rarity ? 6 : 1;
	return transmute(user, card.code, etgutil.asUpped, use);
};
exports.downgrade = function(data, user) {
	const card = Cards.Codes[data.card];
	if (!card || !card.upped) return;
	const use = ~card.rarity ? 6 : 1;
	return untransmute(user, card.code, etgutil.asUpped, use);
};
exports.polish = function(data, user) {
	const card = Cards.Codes[data.card];
	if (!card || card.shiny || card.rarity == 5) return;
	const use = ~card.rarity ? 6 : 2;
	return transmute(user, card.code, etgutil.asShiny, use);
};
exports.unpolish = function(data, user) {
	const card = Cards.Codes[data.card];
	if (!card || !card.shiny || card.rarity == 5) return;
	const use = ~card.rarity ? 6 : 2;
	return untransmute(user, card.code, etgutil.asShiny, use);
};
function upshpi(cost, func) {
	return (data, user) => {
		const card = Cards.Codes[data.c];
		if (card && user.gold >= cost && card.isFree()) {
			return {
				gold: user.gold - cost,
				pool: etgutil.addcard(user.pool, func(data.c)),
			};
		}
	};
}
exports.uppillar = upshpi(50, code => etgutil.asUpped(code, true));
exports.shpillar = upshpi(50, code => etgutil.asShiny(code, true));
exports.upshpillar = upshpi(300, code =>
	etgutil.asUpped(etgutil.asShiny(code, true), true),
);
exports.upshall = function(data, user) {
	const pool = etgutil.deck2pool(user.pool);
	const bound = etgutil.deck2pool(user.accountbound);
	pool.forEach((count, code) => {
		const card = Cards.Codes[code];
		if (!card || (card.rarity == 5 && card.shiny) || card.rarity < 1) return;
		const dcode = etgutil.asShiny(etgutil.asUpped(card.code, false), false);
		if (code == dcode) return;
		if (!(dcode in pool)) pool[dcode] = 0;
		pool[dcode] += count * (card.upped && card.shiny ? 36 : 6);
		pool[code] = 0;
	});
	bound.forEach((count, code) => {
		if (!(code in pool)) return;
		const card = Cards.Codes[code];
		if (
			!card ||
			card.rarity == 5 ||
			card.rarity < 1 ||
			card.upped ||
			card.shiny
		)
			return;
		pool[code] += Math.min(count, 6);
	});
	pool.forEach((count, code) => {
		const card = Cards.Codes[code];
		if (!card || card.rarity < 1 || card.upped || card.shiny) return;
		if (!data.up) count -= 6;
		let pc = 0;
		for (let i = 1; i < 4; i++) {
			if (card.rarity == 5 && i & 2) continue;
			const upcode = etgutil.asShiny(etgutil.asUpped(code, i & 1), i & 2);
			pool[upcode] = Math.max(
				Math.min(Math.floor(count / (i == 3 ? 36 : 6)), 6),
				0,
			);
			pc += pool[upcode] * (i == 3 ? 36 : 6);
			count -= i === 1 && data.up ? 42 : 36;
		}
		pool[code] -= pc;
	});
	bound.forEach((count, code) => {
		if (!(code in pool)) return;
		const card = Cards.Codes[code];
		if (
			!card ||
			card.rarity == 5 ||
			card.rarity < 1 ||
			card.upped ||
			card.shiny
		)
			return;
		pool[code] -= Math.min(count, 6);
	});
	let newpool = '';
	pool.forEach((count, code) => {
		if (count) newpool = etgutil.addcard(newpool, code, count);
	});
	return { pool: newpool };
};
exports.addgold = function(data, user) {
	return { gold: user.gold + data.g };
};
exports.addloss = function(data, user) {
	const losses = data.pvp ? 'pvplosses' : 'ailosses';
	const result = {
		[losses]: user[losses] + 1,
	};
	if (data.l !== undefined) {
		result.streak = user.streak.slice();
		result.streak[data.l] = 0;
	}
	if (data.g) result.gold = user.gold + data.g;
	return result;
};
exports.addwin = function(data, user) {
	const prefix = data.pvp ? 'pvp' : 'ai';
	return {
		[`${prefix}wins`]: user[`${prefix}wins`] + 1,
		[`${prefix}losses`]: user[`${prefix}losses`] - 1,
	};
};
exports.setstreak = function(data, user) {
	const streak = user.streak.slice();
	streak[data.l] = data.n;
	return { streak };
};
exports.addcards = function(data, user) {
	return { pool: etgutil.mergedecks(user.pool, data.c) };
};
exports.addbound = function(data, user) {
	return { accountbound: etgutil.mergedecks(user.accountbound, data.c) };
};
exports.donedaily = function(data, user) {
	const result = {};
	if (
		typeof user.ostreak === 'number' &&
		(data.daily < 3 || data.daily == 5) &&
		!user.ostreakday
	) {
		result.gold = user.gold + [15, 25, 77, 100, 250][user.ostreak % 5];
		result.ostreak = user.ostreak + 1;
		result.ostreakday = user.ostreakday2;
		result.ostreakday2 = 0;
	}
	if (data.daily == 6 && !(user.daily & 64)) {
		result.pool = etgutil.addcard(user.pool, data.c);
	}
	result.daily = user.daily | (1 << data.daily);
	return result;
};
exports.changeqeck = function(data, user) {
	const qecks = user.qecks.slice();
	qecks[data.number] = data.name;
	return { qecks };
};
exports.setdeck = function(data, user) {
	const result = {};
	if (data.d !== undefined) {
		result.decks = {
			...user.decks,
			[data.name]: data.d,
		};
	}
	result.selectedDeck = data.name;
	return result;
};
exports.rmdeck = function(data, user) {
	const result = { decks: { ...user.decks } };
	delete result.decks[data.name];
	return result;
};
exports.setquest = function(data, user) {
	return {
		quests: {
			...user.quests,
			[data.quest]: 1,
		},
	};
};

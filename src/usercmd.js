import Cards from './Cards.js';
import * as etgutil from './etgutil.js';

function transmute(user, oldcard, func, use) {
	const poolCount = etgutil.count(user.pool, oldcard);
	const newcard = func(oldcard, true);
	if (poolCount < use) {
		const boundCount = etgutil.count(user.accountbound, oldcard);
		if (boundCount >= use) {
			return {
				accountbound: etgutil.addcard(
					etgutil.addcard(user.accountbound, oldcard, -use),
					newcard,
				),
			};
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
	if (poolCount === 0) {
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
export function upgrade(data, user) {
	const card = Cards.Codes[data.card];
	if (!card || card.upped) return;
	const use = ~card.rarity && !(card.rarity === 4 && card.shiny) ? 6 : 1;
	return transmute(user, card.code, etgutil.asUpped, use);
}
export function downgrade(data, user) {
	const card = Cards.Codes[data.card];
	if (!card || !card.upped) return;
	const use = ~card.rarity && !(card.rarity === 4 && card.shiny) ? 6 : 1;
	return untransmute(user, card.code, etgutil.asUpped, use);
}
export function polish(data, user) {
	const card = Cards.Codes[data.card];
	if (!card || card.shiny || card.rarity === 4) return;
	const use = ~card.rarity ? 6 : 2;
	return transmute(user, card.code, etgutil.asShiny, use);
}
export function unpolish(data, user) {
	const card = Cards.Codes[data.card];
	if (!card || !card.shiny || card.rarity === 4) return;
	const use = ~card.rarity ? 6 : 2;
	return untransmute(user, card.code, etgutil.asShiny, use);
}
function upshpi(func) {
	return (data, user) => {
		const card = Cards.Codes[data.c];
		if (card && user.gold >= 50 && card.isFree()) {
			return {
				gold: user.gold - 50,
				pool: etgutil.addcard(user.pool, func(data.c)),
			};
		}
	};
}
export const uppillar = upshpi(code => etgutil.asUpped(code, true));
export const shpillar = upshpi(code => etgutil.asShiny(code, true));
function convert(pool, oldcode, oldamt, newcode) {
	const oldnew = pool[newcode] ?? 0;
	if (oldnew >= 65535 || (pool[oldcode] ?? 0) < oldamt) {
		return false;
	}
	pool[newcode] = oldnew + 1;
	pool[oldcode] -= oldamt;
	return true;
}
export function upshall(data, user) {
	const pool = etgutil.deck2pool(user.pool);
	const bound = etgutil.deck2pool(user.accountbound);
	const base = new Set();
	pool.forEach((count, code) => {
		base.add(etgutil.asShiny(etgutil.asUpped(code, false), false));
	});
	for (const code of base) {
		const card = Cards.Codes[code];
		if (card && card.rarity > 0) {
			const upcode = etgutil.asUpped(code, true);
			const shcode = etgutil.asShiny(code, true);
			const uhcode = etgutil.asShiny(etgutil.asUpped(code, true), true);
			let un = (pool[code] ?? 0) + (bound[code] ?? 0);
			let up = (pool[upcode] ?? 0) + (bound[upcode] ?? 0);
			let sh = (pool[shcode] ?? 0) + (bound[shcode] ?? 0);
			while (un >= 12 && up < 6 && convert(pool, code, 6, upcode)) {
				un -= 6;
				up += 1;
			}
			if (card.rarity < 4) {
				while (un >= 12 && sh < 6 && convert(pool, code, 6, shcode)) {
					un -= 6;
					sh += 1;
				}
				while (un >= 42 && convert(pool, code, 36, uhcode)) {
					un -= 36;
				}
			}
		}
	}
	let newpool = '';
	pool.forEach((count, code) => {
		if (count) newpool = etgutil.addcard(newpool, code, count);
	});
	return { pool: newpool };
}
export function addgold(data, user) {
	return { gold: user.gold + (data.g | 0) };
}
export function addloss(data, user) {
	const losses = data.pvp ? 'pvplosses' : 'ailosses';
	const result = {
		[losses]: user[losses] + 1,
	};
	if (data.l !== undefined) {
		result.streak = user.streak.slice();
		result.streak[data.l] = 0;
	}
	if (data.g) result.gold = user.gold + (data.g | 0);
	if (data.c) {
		const key = data.bound ? 'accountbound' : 'pool';
		result[key] = etgutil.addcard(user[key], data.c, -1);
	}
	return result;
}
export function addwin(data, user) {
	const prefix = data.pvp ? 'pvp' : 'ai';
	return {
		[`${prefix}wins`]: user[`${prefix}wins`] + 1,
		[`${prefix}losses`]: user[`${prefix}losses`] - 1,
	};
}
export function setstreak(data, user) {
	const streak = user.streak.slice();
	streak[data.l] = data.n;
	return { streak };
}
export function addcards(data, user) {
	const key = data.bound ? 'accountbound' : 'pool';
	return { [key]: etgutil.mergedecks(user[key], data.c) };
}
export function rmcard(data, user) {
	const key = data.bound ? 'accountbound' : 'pool';
	return { [key]: etgutil.addcard(user[key], data.c, -1) };
}
export function donedaily(data, user) {
	const result = {};
	if (
		typeof user.ostreak === 'number' &&
		(data.daily < 3 || data.daily === 5) &&
		!user.ostreakday
	) {
		result.gold = user.gold + [15, 25, 77, 100, 250][user.ostreak % 5];
		result.ostreak = user.ostreak + 1;
		result.ostreakday = user.ostreakday2;
		result.ostreakday2 = 0;
	}
	if (data.daily === 6 && !(user.daily & 64)) {
		result.pool = etgutil.addcard(user.pool, data.c);
	}
	result.daily = user.daily | (1 << data.daily);
	return result;
}
export function changeqeck(data, user) {
	const qecks = user.qecks.slice();
	qecks[data.number] = data.name;
	return { qecks };
}
export function setdeck(data, user) {
	const result = {};
	if (data.d !== undefined) {
		result.decks = {
			...user.decks,
			[data.name]: data.d,
		};
	}
	result.selectedDeck = data.name;
	return result;
}
export function rmdeck(data, user) {
	const result = { decks: { ...user.decks } };
	delete result.decks[data.name];
	return result;
}
export function setquest(data, user) {
	return {
		quests: {
			...user.quests,
			[data.quest]: 1,
		},
	};
}

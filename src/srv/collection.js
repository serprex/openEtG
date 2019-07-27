import gzip from './gzip.js';
import Cards from '../Cards.js';
import * as Us from './Us.js';
import * as etgutil from '../etgutil.js';

export default async function(url, stime) {
	const user = await Us.load(url),
		result = [],
		pool = etgutil.deck2pool(user.pool),
		bound = etgutil.deck2pool(user.accountbound);
	Cards.Codes.forEach((card, code) => {
		if (!card.upped && !card.shiny && !card.getStatus('token')) {
			result.push(
				[
					code,
					card.name,
					pool[code] || 0,
					pool[etgutil.asUpped(code, true)] || 0,
					pool[etgutil.asShiny(code, true)] || 0,
					pool[etgutil.asShiny(etgutil.asUpped(code, true), true)] || 0,
					bound[code] || 0,
					bound[etgutil.asUpped(code, true)] || 0,
					bound[etgutil.asShiny(code, true)] || 0,
					bound[etgutil.asShiny(etgutil.asUpped(code, true), true)] || 0,
					card.element,
					card.rarity,
					card.type,
				].join(','),
			);
		}
	});
	return {
		buf: await gzip(result.join('\n'), { level: 1 }),
		head: { 'Content-Encoding': 'gzip', 'Content-Type': 'text/plain' },
		date: new Date(),
	};
}

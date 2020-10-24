import mkTable from '../mkTable.js';
import Cards from '../Cards.js';

const infobox = document.getElementById('infobox');
document.getElementById('deckinput').addEventListener('input', printstat);
function printstat() {
	document.getElementById('deckpreview').src =
		'http://dek.im/deck/' + this.value;
	let summon = 0,
		buy = 0,
		norarebuy = 0,
		sell = 0,
		rares = 0,
		nymphs = 0,
		pillars = 0,
		ups = 0,
		total = 0;
	for (const code32 of this.value.split(' ')) {
		const code = parseInt(code32, 32) - 4000;
		if (code in Cards.Codes) {
			const card = Cards.Codes[code],
				uncard = card.asUpped(false);
			total++;
			summon += card.cost;
			const buycost =
				6 * uncard.rarity ** 2 + uncard.cost + (card.upped ? 1500 : 0);
			buy += buycost;
			sell += 4 * card.rarity ** 2 + card.cost;
			if (card.upped) ups++;
			if (card.getStatus('pillar')) pillars++;
			if ([6, 8, 15, 18, 20].indexOf(card.rarity) === -1) norarebuy += buycost;
			else if (card.rarity === 6 || card.rarity === 8 || card.rarity === 18)
				rares++;
			else if (card.rarity === 15 || card.rarity === 20) nymphs++;
		}
	}
	while (infobox.firstChild) infobox.firstChild.remove();
	infobox.appendChild(
		mkTable([
			['Cards', total],
			['Upgraded', ups],
			['Summoning cost', summon],
			['Cost to buy (rareless)', norarebuy],
			['Cost to buy', buy],
			['Sell price', sell],
			['Pillars', pillars],
			['Non-nymph rares', rares],
			['Nymphs', nymphs],
		]),
	);
}

const infobox = document.getElementById('infobox');
function setInfo(x) {
	infobox.appendChild(typeof x === 'string' ? document.createTextNode(x) : x);
}
import Cards from '../Cards.js';
document.getElementById('deckinput').addEventListener('keydown', printstat);
function mkTable() {
	var tbl = document.createElement('table');
	for (var i = 0; i < arguments.length; i += 2) {
		var row = document.createElement('tr');
		var col1 = document.createElement('td');
		var col2 = document.createElement('td');
		col1.appendChild(document.createTextNode(arguments[i]));
		col2.appendChild(document.createTextNode(arguments[i + 1]));
		row.appendChild(col1);
		row.appendChild(col2);
		tbl.appendChild(row);
	}
	return tbl;
}
function printstat(e) {
	if (e.keyCode != 13) return;
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
	this.value.split(' ').forEach(function(code32) {
		const code = parseInt(code32, 32);
		if (code in Cards.Codes) {
			var card = Cards.Codes[code],
				uncard = card.asUpped(false);
			total++;
			summon += card.cost;
			var buycost =
				6 * uncard.tier * uncard.tier + uncard.cost + (card.upped ? 1500 : 0);
			buy += buycost;
			sell += 4 * card.tier * card.tier + card.cost;
			if (card.upped) ups++;
			if (!card.type) pillars++;
			if ([6, 8, 15, 18, 20].indexOf(card.tier) == -1) norarebuy += buycost;
			else if (card.tier == 6 || card.tier == 8 || card.tier == 18) rares++;
			else if (card.tier == 15 || card.tier == 20) nymphs++;
		}
	});
	while (infobox.firstChild) infobox.firstChild.remove();
	setInfo(
		mkTable(
			'Cards',
			total,
			'Upgraded',
			ups,
			'Summoning cost',
			summon,
			'Cost to buy (rareless)',
			norarebuy,
			'Cost to buy',
			buy,
			'Sell price',
			sell,
			'Pillars',
			pillars,
			'Non-nymph rares',
			rares,
			'Nymphs',
			nymphs,
		),
	);
}

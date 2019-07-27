import Cards from '../Cards.js';

const infobox = document.getElementById('infobox');
document.getElementById('nameinput').addEventListener('keydown', printstat);
function printstat(e) {
	if (e.keyCode != 13) return;
	const hide = new Set(
		['pillar', 'mark', 'shard', 'rare', 'nymph'].filter(
			x => document.getElementById('hide' + x).checked,
		),
	);
	let letter,
		ignore = name => name;
	['Elite', 'Improved', 'Shard', 'Mark'].forEach(function(x) {
		if (document.getElementById('ignore' + x).checked) {
			const oldignore = ignore;
			ignore = name => oldignore(name).replace(new RegExp(`^${x}( of)? `), '');
		}
	});
	const upped = document.querySelector("input[name='upped']:checked").value;
	function cardfilter(card) {
		if (ignore(card.name).charAt(0) != letter) return false;
		if (hide.has('pillar') && !card.type) return false;
		if (hide.has('mark') && card.name.match(/^Mark of /)) return false;
		if (hide.has('shard') && card.name.match(/^Shard of /)) return false;
		if (
			hide.has('rare') &&
			(card.tier == 6 || card.tier == 8 || card.tier == 18)
		)
			return false;
		if (hide.has('nymph') && (card.tier == 15 || card.tier == 20)) return false;
		return true;
	}
	while (infobox.firstChild) infobox.firstChild.remove();
	const deck = [],
		letters = new Set();
	for (let i = 0; i < this.value.length; i++) {
		letter = this.value.charAt(i).toUpperCase();
		if (letters.has(letter)) continue;
		letters.add(letter);
		if (upped == 'no' || upped == 'both')
			deck.push(...Cards.filter(false, cardfilter));
		if (upped == 'yes' || upped == 'both')
			deck.push(...Cards.filter(true, cardfilter));
	}
	if (document.getElementById('sortele').checked)
		deck.sort((x, y) => x.element - y.element);
	for (let i = 0; i < deck.length; i += 70) {
		const img = document.createElement('img');
		img.src =
			'http://dek.im/deck/' +
			deck
				.slice(i, i + 70)
				.map(x => x.code.toString(32))
				.join(' ');
		infobox.appendChild(img);
	}
	if (!deck.length) infobox.appendChild(document.createTextNode('No matches'));
}

import Cards from '../Cards.js';
const infobox = document.getElementById('infobox');
function prValue(id, sid) {
	document.getElementById(id).addEventListener('input', function() {
		document.getElementById(sid).textContent = this.value;
	});
}
prValue('Elements', 'txte');
prValue('Cards', 'txtc');
document.getElementById('go').addEventListener('click', printstat);
function printstat() {
	const hide = new Set(
		['pillar', 'shard', 'rare', 'nymph'].filter(
			x => document.getElementById('hide' + x).checked,
		),
	);
	function cardfilter(card) {
		if (hide.has('pillar') && !card.type) return false;
		if (hide.has('shard') && card.name.match(/^Shard of /)) return false;
		if (
			hide.has('rare') &&
			(card.tier == 6 || card.tier == 8 || card.tier == 18)
		)
			return false;
		if (hide.has('nymph') && (card.tier == 15 || card.tier == 20)) return false;
		return !card.name.match(/^Mark of /);
	}
	while (infobox.firstChild) infobox.firstChild.remove();
	const deck = [],
		elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		eles = +document.getElementById('Elements').value,
		many = +document.getElementById('Cards').value;
	while (eles < elements.length) {
		elements.splice((Math.random() * elements.length) | 0, 1);
	}
	for (let i = 0; i < elements.length; i++) {
		const ele = elements[i],
			cards = Cards.filter(false, x => x.element == ele && cardfilter(x));
		while (many < cards.length) {
			cards.splice((Math.random() * cards.length) | 0, 1);
		}
		deck.push(...cards);
	}
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
	else
		infobox.appendChild(
			document.createTextNode(deck.map(x => x.code.toString(32)).join(' ')),
		);
}
printstat();

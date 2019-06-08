var Cards = require('../Cards');
var infobox = document.getElementById('infobox');
function prValue(id, sid) {
	document.getElementById(id).addEventListener('input', function() {
		document.getElementById(sid).textContent = this.value;
	});
}
prValue('Elements', 'txte');
prValue('Cards', 'txtc');
document.getElementById('go').addEventListener('click', printstat);
function printstat() {
	var hide = new Set(
		['pillar', 'shard', 'rare', 'nymph'].filter(
			x => document.getElementById('hide' + x).checked,
		),
	);
	//var upped = document.querySelector("input[name='upped']:checked").value;
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
	var deck = [],
		elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
	var eles = +document.getElementById('Elements').value;
	var many = +document.getElementById('Cards').value;
	while (eles < elements.length) {
		var n = (Math.random() * elements.length) | 0;
		elements.splice(n, 1);
	}
	for (var i = 0; i < elements.length; i++) {
		var ele = elements[i];
		var cards = Cards.filter(false, function(x) {
			return x.element == ele && cardfilter(x);
		});
		while (many < cards.length) {
			var n = (Math.random() * cards.length) | 0;
			cards.splice(n, 1);
		}
		Array.prototype.push.apply(deck, cards);
	}
	deck.sort(function(x, y) {
		return x.element - y.element;
	});
	for (var i = 0; i < deck.length; i += 70) {
		var img = document.createElement('img');
		img.src =
			'http://dek.im/deck/' +
			deck
				.slice(i, i + 70)
				.map(function(x) {
					return x.code.toString(32);
				})
				.join(' ');
		infobox.appendChild(img);
	}
	if (!deck.length) infobox.appendChild(document.createTextNode('No matches'));
	else
		infobox.appendChild(
			document.createTextNode(
				deck
					.map(function(x) {
						return x.code.toString(32);
					})
					.join(' '),
			),
		);
}
printstat();

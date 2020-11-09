import OrigCards from '../Cards.js';
import OpenCards from '../../Cards.js';
import { encodedeck } from '../../etgutil.js';
import { deck } from '../../svg.js';

const infobox = document.getElementById('infobox');
document.getElementById('nameinput').addEventListener('input', printstat);
function printstat(e) {
	const hide = new Set(
		['pillar', 'mark', 'shard', 'rare', 'nymph'].filter(
			x => document.getElementById('hide' + x).checked,
		),
	);
	let letter,
		ignore = name => name;
	for (const x of ['Elite', 'Improved', 'Shard', 'Mark']) {
		if (document.getElementById('ignore' + x).checked) {
			const oldignore = ignore;
			ignore = name => oldignore(name).replace(new RegExp(`^${x}( of)? `), '');
		}
	}
	const upped = document.querySelector("input[name='upped']:checked").value;
	const set = document.querySelector("input[name='set']:checked").value;
	function cardfilter(card) {
		if (ignore(card.name).charAt(0) !== letter) return false;
		if (hide.has('pillar') && !card.type) return false;
		if (hide.has('mark') && card.name.match(/^Mark of /)) return false;
		if (hide.has('shard') && card.name.match(/^Shard of /)) return false;
		if (
			hide.has('rare') &&
			(card.rarity == 6 || card.rarity == 8 || card.rarity == 18)
		)
			return false;
		if (hide.has('nymph') && (card.rarity == 15 || card.rarity == 20))
			return false;
		return true;
	}
	while (infobox.firstChild) infobox.firstChild.remove();
	const cards = [],
		letters = new Set();
	for (let i = 0; i < this.value.length; i++) {
		letter = this.value.charAt(i).toUpperCase();
		if (letters.has(letter)) continue;
		letters.add(letter);
		if (set == 'open' || set == 'both') {
			if (upped == 'no' || upped == 'both')
				cards.push(...OpenCards.filter(false, cardfilter));
			if (upped == 'yes' || upped == 'both')
				cards.push(...OpenCards.filter(true, cardfilter));
		}
		if (set == 'orig' || set == 'both') {
			if (upped == 'no' || upped == 'both')
				cards.push(...OrigCards.filter(false, cardfilter));
			if (upped == 'yes' || upped == 'both')
				cards.push(...OrigCards.filter(true, cardfilter));
		}
	}
	if (document.getElementById('sortele').checked)
		cards.sort((x, y) => x.element - y.element);
	if (!cards.length) infobox.appendChild(document.createTextNode('No matches'));
	else {
		const div = document.createElement('div');
		div.innerHtml = deck(encodedeck(cards));
		infobox.appendChild(div);
	}
}

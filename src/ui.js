export const eleNames = [
	'Chroma',
	'Entropy',
	'Death',
	'Gravity',
	'Earth',
	'Life',
	'Fire',
	'Water',
	'Light',
	'Air',
	'Time',
	'Darkness',
	'Aether',
	'Build your own',
	'Random',
];
export const strcols = [
	'#986',
	'#a59',
	'#768',
	'#963',
	'#654',
	'#480',
	'#a31',
	'#248',
	'#776',
	'#38d',
	'#a80',
	'#333',
	'#49b',
	'#dcb',
	'#dbc',
	'#bac',
	'#ca9',
	'#ba9',
	'#ac7',
	'#da8',
	'#8ac',
	'#ccb',
	'#9be',
	'#ed8',
	'#999',
	'#ade',
];
export function maybeLightenStr(card) {
	return card && strcols[card.element + card.upped * 13];
}
const avgcols = [];
for (let i = 0; i < 13; i++) {
	const s1 = strcols[i],
		s2 = strcols[i + 13];
	let c = '#';
	for (let j = 1; j <= 3; j++) {
		c += Math.round(
			Math.sqrt((parseInt(s1[j], 16) ** 2 + parseInt(s2[j], 16) ** 2) / 2),
		).toString(16);
	}
	avgcols.push(c);
}
export function gradientStr(card) {
	return card.shiny ?
			strcols[card.element + !card.upped * 13]
		:	avgcols[card.element];
}

export const presets = [
	[
		'No Shop',
		['no-shop'].sort(),
		'Shop is disabled, so no buying packs! Trading is allowed, but only with other No Shop alts.',
	],
	[
		'No Shop Self-found',
		['no-shop', 'no-trade'].sort(),
		"Just like No Shop, but trading is also disabled. You're truly limited to what you can win from the AI.",
	],
	[
		'Spins-only Hard',
		['no-shop', 'no-up-merge', 'hardcore'].sort(),
		'Shop is disabled, as is upgrading non-pillars. Everytime you lose, you permanently lost a card form your deck. Trading is allowed, but only with other Spins-only Hardcore alts.',
	],
	[
		'Spins-only Self-found Hard',
		['no-shop', 'no-up-merge', 'no-trade', 'hardcore'].sort(),
		'Like Spins-only Hard, but trading is also disabled.',
	],
];

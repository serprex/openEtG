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
	return strcols[card.element + card.upped * 13];
}
export const presets = [
	[
		'Spins-only',
		['no-shop', 'no-up-pillar'].sort(),
		'Spending money is not allowed other than battle entry fees. That means no buying packs, & no upgrading pillars! Trading is allowed, but only with other Spins-Only alts.',
	],
	[
		'Spins-only Self-found',
		['no-shop', 'no-up-pillar', 'no-trade'].sort(),
		"Just like Spins-only, but trading is also disabled. You're truly limited to what you can win from the AI.",
	],
	[
		'Spins-only Hard',
		['no-shop', 'no-up-pillar', 'no-up-merge', 'hardcore'].sort(),
		'Like Spins-only, but no upgrading cards (can still spin upgraded cards), and everytime you lose, you permanently lost a card form your deck. Trading is allowed, but only with other Spins-only Hardcore alts.',
	],
	[
		'Spins-only Self-found Hard',
		['no-shop', 'no-up-pillar', 'no-up-merge', 'no-trade', 'hardcore'].sort(),
		'Like Spins-only Self-found, but no upgrading cards (can still spin upgraded cards), and everytime you lose, you permanently lose a card from your deck. Roguelike mode!',
	],
];

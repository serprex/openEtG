import * as etg from '../etg.js';
import Card from '../Card.js';

export const skillText = {
	v_ablaze: 'Gain 2|0',
	v_accelerationspell:
		'Replaces target creature\'s skills with "Acceleration: gain +2|-1 per turn"',
	v_accretion:
		"Destroy target permanent & gain 0|15. Return to owner's hand as a Blackhole if health exceeds 45",
	v_adrenaline:
		'Target creature attacks multiple times per turn. Weaker creatures gain more attacks',
	v_aflatoxin:
		'Apply 2 poison to target. When target dies, it turns into a malignant cell',
	v_antimatter: 'Invert strength of target',
	v_bblood: 'Target creature gains 0|20 & is delayed 6 turns',
	v_blackhole:
		'Absorb 3 quanta per element from target player. Heal 1 per absorbed quantum',
	v_bless: 'Target gains 3|3',
	v_blockwithcharge: 'Block attack per stack',
	v_boneyard: c =>
		`When a creature dies, summon a ${c.upped ? '1|1' : '2|2'} Skeleton`,
	v_bravery:
		'Foe draws 2, 3 if own mark is 1:6, cards, you draw an equal amount of cards',
	v_burrow: 'Burrow. Burrowed creatures attack with half strength',
	v_butterfly:
		'Target something smaller than, or weaker than, 3. Replace target\'s skills with "3:1 Destroy target permanent"',
	v_catapult:
		'Sacrifice target creature to deal 100HP/(100+HP) damage foe. Frozen creatures increase damage by 50%. Poisoned creatures transfer poison',
	v_chimera:
		'Combine all your creatures to form a Chimera with momentum & gravity pull',
	v_cold: '30% chance to freeze attackers for 3',
	v_cpower: 'Target gains 1 to 5 strength. Target gains 1 to 5 largeness',
	v_cseed: 'A random effect is inflicted to target creature',
	v_deadalive: 'Trigger a death effect',
	v_decrsteam: 'Decrement strength from steam after attack',
	v_deja: 'Remove active & summon copy',
	v_dessication:
		"Deal 2 damage to opponent's creatures. Gain 1:7 per damage dealt. Removes cloak",
	v_destroy: 'Destroy target permanent',
	v_devour: 'Kill smaller target creature & gain 1|1',
	v_die: 'Sacrifice',
	v_disfield: 'Absorb damage. Consume 1:0 per damage absorbed',
	v_disshield: 'Absorb damage. Consume 1:1 per 3 damage absorbed',
	v_divinity: 'Add 24 to maximum health if mark 1:8, otherwise 16 & heal same',
	v_dive: 'Double strength until next attack',
	v_drainlife: 'Drattins 2HP from target. Increment drain per 5:11 owned',
	v_dryspell: [
		'Deal 1 damage to all creatures. Gain 1:7 per damage dealt. Removes cloak',
		"Deal 2 damage to all opponent's creatures. Gain 1:7 per damage dealt. Removes cloak",
	],
	v_dshield: 'Become immaterial until next turn',
	v_duality: "Generate a copy of foe's next draw",
	v_earthquake: 'Destroy up to 3 stacks from target permanent',
	v_empathy: 'Heal owner per creature owned per turn. Upkeep per 8 creatures',
	v_enchant: 'Target permanent becomes immaterial',
	v_endow: 'Replicate attributes of target weapon',
	v_evade40: '40% chance to evade',
	v_evade50: '50% chance to evade',
	v_evade100: '100% chance to evade',
	v_evolve: 'Become an unburrowed Shrieker',
	v_fiery: 'Increment damage per 5:6 owned',
	v_firebolt: 'Deals 3 damage to target. Deal 3 more per 10:6 remaining',
	v_firewall: 'Damage attackers',
	v_flyingweapon: 'Own weapon becomes a flying creature',
	v_fractal:
		"Fill hand with copies of target creature's card. Consumes remaining 1:12",
	v_freeze: c =>
		`Freeze target for ${
			c.upped ? 4 : 3
		} turns. Being frozen disables attacking & per turn skills`,
	v_gaincharge2: 'Gain 2 stacks per death',
	v_gas: 'Summon an Unstable Gas',
	v_gpull: 'Intercept attacks directed to owner',
	v_gpullspell: 'Target creature intercepts attacks directed to its owner',
	v_gratitude: 'Heal owner 3, 5 if 1:5',
	v_growth1: {
		death: 'When a creature dies, gain 1|1',
		cast: 'Gain 1|1',
	},
	v_growth: 'Gain 2|2',
	v_guard: 'Delay target creature & attack target if grounded. Delay self',
	v_hasten: 'Draw',
	v_hatch: 'Become a random creature',
	v_heal: 'Heal self 20',
	v_holylight: 'Heal target 10. Nocturnal targets are damaged instead',
	v_hope:
		'Blocks one additional damage for each creature you control that produces 1:8 every turn.',
	v_icebolt:
		'Deal 2 damage to target, plus an additional 2 per 10:7 remaining. 25% plus 5% per point of damage chance to freeze target',
	v_ignite: 'Deal 20 spell damage to foe & 1 damage to all creatures',
	v_immolate: c =>
		`Sacrifice a creature to produce ${
			c.upped ? 7 : 5
		}:6 & 1 quanta of each other element`,
	v_improve: 'Mutate target creature',
	v_infect: 'Poison target creature',
	v_ink: 'Summon a Cloak which lasts 1 turn',
	v_integrity: 'Combine all shards in hand to form a Shard Golem',
	v_lightning: 'Deal 5 spell damage to target',
	v_liquid:
		'Target creature is poisoned & skills replaced with "Heal owner per damage dealt"',
	v_lobotomize: 'Remove skills from target creature',
	v_losecharge: (c, inst) => {
		const charges = c.getStatus('charges');
		return `Lasts ${charges} turn ${charges == 1 ? '' : 's'}`;
	},
	v_luciferin: 'All your creatures without skills produce 1:8. Heal self 10',
	v_lycanthropy: 'Gain 5|5',
	v_mend: 'Heal target creature 5',
	v_miracle: 'Heal self to one below maximum HP. Consumes remaining 1:8',
	v_mitosis: 'Summon a daughter creature',
	v_mitosisspell:
		'Non-weapon creature gains active "Mitosis: Summon a daughter creature" costing target\'s card\'s cost',
	v_momentum: 'Target ignores shield effects & gains 1|1',
	v_mutation:
		'Mutate target creature into an abomination, or maybe something more. Slight chance of death',
	v_neuro:
		'Apply poison on hit, also inflicting neurotoxin. Neurotoxin applies poison per card played by victim. Throttled',
	v_nightmare:
		"Fill foe's hand with copies of target creature's card. Drain 2HP per added card",
	v_nova:
		'Gain 1 quanta of each element. If you play three or more of this card in one turn, summon a Singularity on your side.',
	v_nova2:
		'Gain 2 quanta of each element. If you play two or more of this card in one turn, summon a Singularity on your side.',
	v_nymph: 'Turn target pillar into a Nymph of same element',
	v_obsession: c => `Damage owner ${c.upped ? 13 : 10} on discard`,
	v_overdrivespell:
		'Replaces target creature\'s skills with "Overdrive: gain +3|-1 per turn"',
	v_pandemonium: c =>
		`Random effects are inflicted to ${
			c.upped ? "oppenent's" : 'all'
		} creatures. Removes cloak`,
	v_paradox: 'Kill target creature which is stronger than it is large',
	v_parallel: 'Duplicate target creature',
	v_phoenix: ['Become an Ash on death', 'Become a Minor Ash on death'],
	v_photosynthesis: 'Produce 2:5. May activate multiple times',
	v_pillar: {
		auto: c => `Produce ${c.element ? 1 : 3}:${c.element}`,
		play: c => `Produce ${c.element ? 1 : 3}:${c.element} on play`,
	},
	v_pend: c =>
		`Oscilliate between producing ${c.element ? 1 : 3}:${
			c.element
		} & quanta of mark`,
	v_plague: "Poison foe's creatures. Removes cloak",
	v_platearmor: c => `Target gains 0|${c.upped ? 6 : 3}`,
	v_poison: {
		hit: 'Apply poison on hit. Throttled',
		cast: 'Apply poison to foe',
	},
	v_poison2: {
		hit: 'Apply 2 poison on hit. Throttled',
		cast: 'Apply 2 poison to foe',
	},
	v_poison3: {
		hit: 'Apply 3 poison on hit. Throttled',
		cast: 'Apply 3 poison to foe',
	},
	v_precognition: "Reveal foe's hand until end of their turn. Draw",
	v_purify: 'Replace poison statuses with 2 purify. Removes sacrifice',
	v_queen: 'Summon a Firefly',
	v_quint: 'Target creature becomes immaterial. Thaws',
	v_rage: c => `Target creature gains ${c.upped ? '+6|-6' : '+5|-5'}`,
	v_readiness:
		"Target creature's active becomes costless. Skill can be reactivated",
	v_rebirth: c => `Become a ${c.upped ? 'Minor ' : ''}Phoenix`,
	v_regenerate: 'Heal owner 5',
	v_relic: 'Worthless',
	v_rewind:
		"Remove target creature to top of owner's deck. If target is a Skeleton, transform it into a random creature. If target is a Mummy, transform it into a Pharaoh.",
	v_salvage: 'Restore permanents destroyed by foe to hand once per turn',
	v_salvageoff: 'Become ready to salvage again at start of next turn',
	v_sanctuary:
		"Heal 4 per turn. Protection during foe's turn from hand & quanta control",
	v_scarab: 'Summon a Scarab',
	v_scramble: "Randomly scramble foe's quanta on hit",
	v_serendipity: c =>
		`Generate 3 random${
			c.upped ? ' upgraded' : ''
		} cards in hand. One will be 1:1`,
	v_silence:
		'foe cannot play cards during their next turn, or target creature gains summoning sickness',
	v_singularity: 'Not well behaved',
	v_siphon: 'Siphon 1:0 from foe as 1:11. Throttled',
	v_skull:
		'Attacking creatures may die & become skeletons. Smaller creatures are more likely to die',
	v_skyblitz: 'Dive all own airborne creatures. Consumes remaining 1:9',
	v_slow: 'Delay attackers',
	v_snipe: 'Deal 3 damage to target creature',
	v_solar: 'Produce 1:8 per attacker',
	v_sosa: c =>
		`Sacrifice ${
			c.upped ? 40 : 48
		}HP & consume all non 1:2 to invert damage for 2 turns`,
	v_soulcatch: c => `When a creature dies, produce ${c.upped ? 3 : 2}:2`,
	v_sskin: 'Increment maximum HP per 1:4 owned. Heal same',
	v_steal: 'Steal target permanent',
	v_steam: 'Gain 5|0',
	v_stoneform: 'Gain 0|20 & become a golem',
	v_storm2: "Deals 2 damage to foe's creatures. Removes cloak",
	v_storm3: "Deals 3 damage to foe's creatures. Removes cloak",
	v_swarm: 'Increment largeness per scarab',
	v_swave:
		'Deals 4 damage to target. Instantly kill creature or destroy weapon if frozen',
	v_thorn: '75% chance to poison attackers',
	v_upkeep: c => 'Consumes 1:' + c.element,
	v_vampire: 'Heal owner per damage dealt',
	v_virusinfect: 'Sacrifice self & poison target creature',
	v_virusplague: "Sacrifice self & poison foe's creatures",
	v_void: "Reduce foe's maximum HP by 2, 3 if mark is 1:11",
	v_web: 'Target creature loses airborne',
	v_weight: 'Evade creatures larger than 5',
	v_wings: 'Evade non-airborne & non-ranged attackers',
	v_wisdom: 'Target gains 4|0. May target immaterial, granting psionic',
};
[
	['v_dagger', '1:2 1:11'],
	['v_hammer', '1:3 1:4'],
	['v_bow', '1:9'],
].forEach(x => {
	skillText[x[0]] = 'Increment damage if mark is ' + x[1];
});
export const statusText = {
	flooding:
		'Non aquatic creatures past first five (seven on first effective turn) creature slots die on turn end. Consumes 1:7',
	freedom:
		'Own airborne creatures have a 25% chance to deal 50% more damage, bypass shields and evade targeting if 1:9',
	patience:
		'Each turn delay own creatures. They gain 2|2. 5|5 if flooded. Unique',
	stasis: 'Prevent creatures attacking at end of turn',
};

'use strict';
var etg = require('./etg');
var Card = require('./Card');
var {Thing} = require('./Thing');
// TODO skeleton, mummy
var data = {
	ablaze: 'Gain 2|0',
	accelerationspell:
		'Replaces target creature\'s skills with "Acceleration: gain +2|-1 per turn"',
	accretion:
		"Destroy target permanent & gain 0|15. Return to owner's hand as a Blackhole if health exceeds 45",
	adrenaline:
		'Target creature attacks multiple times per turn. Weaker creatures gain more attacks',
	affinity: function(c) {
		return (
			'Cost is lowered by 1 for each 1:' + c.element + ' pillar you control'
		);
	},
	aflatoxin:
		'Apply 2 poison to target. When target dies, it turns into a malignant cell',
	air: 'Produce 1:9',
	antimatter: 'Invert strength of target',
	arclightning:
		'Target enemy creature loses 1 hp. Another random enemy loses 1 hp until something dies.',
	bblood: 'Target creature gains 0|20 & is delayed 6 turns',
	becomeshield: 'Becomes a Gadget Shield',
	becomeweapon: 'Becomes a Gadget Sword',
	blackhole:
		'Absorb 3 quanta per element from target player. Heal 1 per absorbed quantum',
	bless: 'Target gains 3|3',
	blockwithcharge: 'Block attack per stack',
	bloodletting:
		'Deals 1 damage to every creature on the field. Deal damage to target for every creature affected',
	bounce: "Return to owner's hand instead of dying",
	boneyard: [
		'When a creature dies, summon a 1|1 Skeleton',
		'When a creature dies, summon a 2|2 Skeleton',
	],
	bravery:
		'Foe draws 2, 3 if own mark is 1:6, cards, you draw an equal amount of cards',
	burrow: 'Burrow. Burrowed creatures attack with half strength',
	butterfly:
		'Target something smaller than, or weaker than, 3. Replace target\'s skills with "3:1 Destroy target permanent"',
	catapult:
		'Sacrifice target creature to deal 100HP/(100+HP) damage foe. Frozen creatures increase damage by 50%. Poisoned creatures transfer poison',
	charge: 'Gain 2|0 and momentum until end of turn',
	chimera:
		'Combine all your creatures to form a Chimera with momentum & gravity pull',
	cold: '30% chance to freeze attackers for 3',
	collide:
		"Target creature attacks a random ally creature and is then shuffled back into their owner's deck",
	cpower: 'Target gains 1 to 5 strength. Target gains 1 to 5 largeness',
	cseed: 'A random effect is inflicted to target creature',
	deadalive: 'Trigger a death effect',
	decrsteam: 'Decrement strength from steam after attack',
	deja: 'Remove active & summon copy',
	dessication:
		"Deal 2 damage to opponent's creatures. Gain 1:7 per damage dealt. Removes cloak",
	destroy: 'Destroy target permanent',
	devour: 'Kill smaller target creature & gain 1|1',
	die: 'Sacrifice',
	disfield: 'Absorb damage. Consume 1:0 per damage absorbed',
	disshield: 'Absorb damage. Consume 1:1 per 3 damage absorbed',
	divinity: 'Add 24 to maximum health if mark 1:8, otherwise 16 & heal same',
	dive: 'Double strength until next attack. Does not stack',
	downgrade: 'Downgrade target card',
	drainlife: 'Drains 2HP from target. Increment drain per 5:11 owned',
	drawpower:
		'Sacrifice a pillar or pendulum. Gain 1 HP for each Pillar or Pendulum you have',
	drawpower2:
		'Sacrifice a pillar or pendulum. Gain 2 HP for each Pillar or Pendulum you have',
	dreambreaker: function(c) {
		return (
			'Weapon: Deals 1 damage.\nWhen Dream' +
			(c.upped ? 'slayer' : 'breaker') +
			' damages the opponent, destroy 2 cards in their deck'
		);
	},
	dryspell:
		'Deal 1 damage to all creatures. Gain 1:7 per damage dealt. Removes cloak',
	dshield: 'Become immaterial until next turn',
	duality: "Generate a copy of foe's next draw",
	durability:
		'Your current shield will gain the abilities of the next shield played instead of being replaced. Works only once per shield',
	earth: 'Produce 1:4',
	earthquake: 'Destroy up to 3 stacks from target permanent',
	empathy: 'Heal owner per creature owned per turn. Upkeep per 8 creatures',
	enchant: 'Target permanent becomes immaterial',
	endow: 'Replicate attributes of target weapon',
	evade40: '40% chance to evade',
	evade50: '50% chance to evade',
	evade100: '100% chance to evade',
	evolve: 'Become an unburrowed Shrieker',
	extract: 'Sacrifice card to gain 1:7 equal to HP',
	fiery: 'Increment damage per 5:6 owned',
	fire: 'Produce 1:6',
	firebolt:
		'Deals 3 damage to target. Increment damage per 4:6 owned. Thaws target',
	firewall: 'Damage attackers',
	flyingweapon: 'Own weapon becomes a flying creature',
	fractal:
		"Fill hand with copies of target creature's card. Consumes remaining 1:12",
	freeze: [
		'Freeze target for 3 turns. Being frozen disables attacking & per turn skills',
		'Freeze target for 4 turns. Being frozen disables attacking & per turn skills',
	],
	frightened: 'If a creature enters play, do not attack this turn',
	frightener:
		"	Target creature's passive is now Frightened: If a creature enters play, do not attack this turn",
	fungusrebirth: function(c) {
		return 'Turn into a ' + (c.upped ? 'Toxic ' : '') + 'Fungus';
	},
	gaincharge2: 'Gain 2 stacks per death',
	gas: 'Summon an Unstable Gas',
	gpull: 'Intercept attacks directed to owner',
	gpullspell: 'Target creature intercepts attacks directed to its owner',
	gratitude: 'Heal owner 3, 5 if 1:5',
	growth1: {
		death: 'When a creature dies, gain 1|1',
		cast: 'Gain 1|1',
	},
	growth: 'Gain 2|2',
	guard: 'Delay target creature & attack target if grounded. Delay self',
	hasten: 'Draw',
	hatch: 'Become a random creature',
	heal: 'Heal self 20',
	holylight: 'Heal target 10. Nocturnal targets are damaged instead',
	hope: 'Increment damage reduction per own 1:8 producing creature',
	hunt: 'Attacks target smaller creature and delay self',
	hydra: 'Summon a Hydra Head',
	hydrahead: 'Kill Hydra Head if you do not control a Hydra',
	icebolt:
		'Deal 2 damage to target. Increment damage per 5:7 owned. May freeze target',
	ignite: 'Deal 20 spell damage to foe & 1 damage to all creatures',
	immolate: function(c) {
		return (
			'Sacrifice a creature to produce ' +
			(c.upped ? 7 : 5) +
			':6 & 1 quanta of each other element'
		);
	},
	improve: 'Mutate target creature',
	infect: 'Poison target creature',
	infest: "Drain thix creature's cost and summon a daughter creature each turn",
	infestspell:
		'Target non-weapon creature gains infest: drains its cost and generates a daughter creature each turn',
	inflation: 'Increase cost of all actives by 1',
	ink: 'Summon a Cloak which lasts 1 turn',
	insight: function(c) {
		return (
			"Target creature's skill is replaced with one costing 1:" +
			c.element +
			' or 2:' +
			c.element +
			' quanta'
		);
	},
	integrity: 'Combine all shards in hand to form a Shard Golem',
	intensity: 'Gain 1|0 for each 1:8 you generate each turn',
	law:
		"Target a creature with less than 5 HP. Turns into a permanent on play. As long as Law remains in play, that creature can't attack",
	lawfree: 'Cannot attack as long as Law is in play',
	legislate: 'Put a Law into play. Shuffle Legislate back into your deck',
	light: {
		auto: 'Produce 1:8',
		ownplay: 'Produce 1:8 on play',
	},
	lightning: 'Deal 5 damage to target',
	liquid:
		'Target creature is poisoned & skills replaced with "Heal owner per damage dealt"',
	lobotomize: 'Remove skills from target creature',
	locket: 'Produce quanta of mark',
	locketshift: "Now produces quanta of target's element",
	losecharge: function(c, inst) {
		var charges = c.status.charges;
		return 'Lasts ' + charges + ' turn' + (charges == 1 ? '' : 's');
	},
	luciferin: 'All your creatures without skills produce 1:8. Heal owner 10',
	lycanthropy: 'Gain 5|5',
	mend: {
		cast: 'Heal target creature 5',
		auto: 'Heal self 5 each turn',
	},
	meteorite:
		'Deal 3 damage to target creature and two adjacent ones. If any die, make its slot an unoccupiable Crater',
	miracle: 'Heal self to one below maximum HP. Consumes remaining 1:8',
	mitosis: 'Summon a daughter creature',
	mitosisspell:
		'Non-weapon creature gains active "Mitosis: Summon a daughter creature" costing target\'s card\'s cost',
	momentum: 'Target ignores shield effects & gains 1|1',
	mutate: 'Enters play with a random ability',
	mutation:
		'Mutate target creature into an abomination, or maybe something more. Slight chance of death',
	neuro:
		'Apply poison on hit, also inflicting neurotoxin. Neurotoxin applies poison per card played by victim. Throttled',
	nightmare:
		"Fill foe's hand with copies of target creature's card. Drain 2HP per added card",
	nova:
		'Produce 1 quanta of each element. Increment singularity danger by 2. Summon singularity if danger exceeds 5',
	nova2:
		'Produce 2 quanta of each element. Increment singularity danger by 3. Summon singularity if danger exceeds 5',
	nymph: 'Turn target pillar into a Nymph of same element',
	obsession: ['Damage owner 10 on discard', 'Damage owner 13 on discard'],
	overdrivespell:
		'Replaces target creature\'s skills with "Overdrive: gain +3|-1 per turn"',
	pandemonium2: function(c) {
		'Random effects are inflicted to ' +
			(c.upped ? "oppenent's" : 'all') +
			'creatures. Removes cloak';
	},
	pandemonium: 'Random effects are inflicted to all creatures. Removes cloak',
	paradox: 'Kill target creature which is stronger than it is large',
	parallel: 'Duplicate target creature',
	phoenix: ['Become an Ash on death', 'Become a Minor Ash on death'],
	photosynthesis: 'Produce 2:5. May activate multiple times',
	pillar: {
		auto: function(c) {
			return 'Produce ' + (c.element ? 1 : 3) + ':' + c.element;
		},
		play: function(c) {
			return 'Produce ' + (c.element ? 1 : 3) + ':' + c.element + ' on play';
		},
	},
	pillhar: {
		auto: function(c) {
			return (
				'Basic pillar & tower clusters produce 1 more each turn' +
				(c.upped ? '. Also produces 1 quanta matching your mark' : '')
			);
		},
		play: '',
	},
	pend: function(c) {
		return (
			'Oscilliate between producing ' +
			(c.element ? 1 : 3) +
			':' +
			c.element +
			' & quanta of mark'
		);
	},
	pendvoid: function(c) {
		return (
			"Alternatively generates 1 quanta of your Mark and destroys 1 of your opponent's quanta" +
			(c.upped ? '. Destroys 1 when played' : '')
		);
	},
	pendvoiddestroy: '',
	plague: "Poison foe's creatures. Removes cloak",
	platearmor: ['Target gains 0|3', 'Target gains 0|6'],
	poison: {
		hit: 'Apply poison on hit. Throttled',
		cast: 'Apply poison to foe',
	},
	poison2: {
		hit: 'Apply 2 poison on hit. Throttled',
		cast: 'Apply 2 poison to foe',
	},
	poison3: {
		hit: 'Apply 3 poison on hit. Throttled',
		cast: 'Apply 3 poison to foe',
	},
	precognition: "Reveal foe's hand until end of their turn. Draw",
	purify: 'Replace poison statuses with 2 purify. Removes sacrifice',
	queen: 'Summon a Firefly',
	quint: 'Target creature becomes immaterial. Thaws',
	rage: [
		'Target creature gains +5|-5. Thaws',
		'Target creature gains +6|-6. Thaws',
	],
	readiness:
		"Target creature's active becomes costless. Skill can be reactivated",
	rebirth: ['Become a Phoenix', 'Become a Minor Phoenix'],
	regenerate: 'Heal owner 5',
	regeneratespell:
		'Target non-stackable card gains the ability "Regeneration". Previous skills are removed',
	relic: 'Worthless',
	ren: "Target creature will return to owner's hand instead of dying",
	rewind: "Remove target creature to top of owner's deck",
	salvage: 'Restore permanents destroyed by foe to hand once per turn',
	salvageoff: 'Become ready to salvage again at start of next turn',
	sanctuary:
		"Heal 4 per turn. Protection during foe's turn from hand & quanta control",
	sandstorm: 'Deal 1 damage to target. Repeatable',
	scarab: 'Summon a Scarab',
	scramble: "Randomly scramble foe's quanta on hit",
	serendipity: [
		'Generate 3 random non-pillar cards in hand. One will be 1:1',
		'Generate 3 random non-pillar upgraded cards in hand. One will be 1:1',
	],
	silence:
		'foe cannot play cards during their next turn, or target creature gains summoning sickness',
	singularity: 'Not well behaved',
	siphon: 'Siphon 1:0 from foe as 1:11. Throttled',
	skull:
		'Attacking creatures may die & become skeletons. Smaller creatures are more likely to die',
	skyblitz: 'Dive all own airborne creatures. Consumes remaining 1:9',
	slow: 'Delay attackers',
	snipe: 'Deal 3 damage to target creature',
	solar: 'Produce 1:8 per attacker',
	sosa: [
		'Sacrifice 48HP & consume all non 1:2 to invert damage for 2 turns',
		'Sacrifice 40HP & consume all non 1:2 to invert damage for 2 turns',
	],
	soulcatch: function(c) {
		return 'When a creature dies, produce ' + (c.upped ? 3 : 2) + ':2';
	},
	spongegrow: function(c) {
		return 'Gains +0|+2 per turn, +0|+' + (c.upped ? 5 : 4) + ' when submerged';
	},
	spores: function(c) {
		return 'Releases three ' + (c.upped ? 'toxic ' : '') + 'spores when killed';
	},
	sskin: 'Increment maximum HP per 1:4 owned. Heal same',
	steal: 'Steal target permanent',
	steam: 'Gain 5|0',
	stoneform: 'Gain 0|20 & become a golem',
	storm2: "Deals 2 damage to foe's creatures. Removes cloak",
	storm3: "Deals 3 damage to foe's creatures. Removes cloak",
	survivaltrait: function(c) {
		return (
			'Your creature with lowest strength+health dies. The rest of your creatures in play gain +' +
			(c.upped ? 2 : 1) +
			'|+1'
		);
	},
	swarm: 'Increment largeness per scarab',
	swave:
		'Deals 4 damage to target. Instantly kill creature or destroy weapon if frozen',
	tremors: function(c) {
		return (
			'Deals 2 damage to ' +
			(c.upped ? "oppenent's" : 'all') +
			' creatures on the board, 4 if the creature is burrowed'
		);
	},
	thorn: '75% chance to poison attackers',
	upkeep: function(c) {
		return 'Consumes 1:' + c.element;
	},
	upgrade: 'Upgrade target card',
	vampire: 'Heal owner per damage dealt',
	virusinfect: 'Sacrifice self & poison target creature',
	virusplague: "Sacrifice self & poison foe's creatures",
	void: "Reduce foe's maximum HP by 3",
	web: 'Target creature loses airborne',
	weight: 'Evade creatures larger than 5',
	windsweep:
		"Your opponent's hand is sent to the bottom of the opponent's deck",
	wings: 'Evade non-airborne & non-ranged attackers',
	wisdom: 'Target gains 4|0. May target immaterial, granting psionic',
};
[['dagger', '1:2 1:11'], ['hammer', '1:3 1:4'], ['bow', '1:9']].forEach(
	x => {
		data[x[0]] = 'Increment damage if mark is ' + x[1];
	},
);
[
	['pillmat', '1:4 1:6 1:7 1:9'],
	['pillspi', '1:2 1:5 1:8 1:11'],
	['pillcar', '1:1 1:3 1:10 1:12'],
].forEach(function(x) {
	data[x[0]] = {
		auto: 'Produce 2 ' + x[1] + ' per turn',
		ownplay: 'Produce 2 ' + x[1] + ' on play',
	};
});
function auraText(tgts, bufftext, upbufftext) {
	return function(c) {
		return (
			tgts +
			' gain ' +
			(c.upped ? upbufftext : bufftext) +
			' while ' +
			c.name +
			' in play. Unique'
		);
	};
}
var statusData = {
	cloak: 'Cloaks own field',
	charges: function(c) {
		return Thing.prototype.hasactive.call(c, 'auto', 'losecharge') ||
			c.status.charges == 1
			? ''
			: 'Enter with ' +
					c.status.charges +
					(c.status.stackable ? ' stacks' : ' charges');
	},
	flooding:
		'Non aquatic creatures past first five creature slots die on turn end. Consumes 1:7. Unique',
	freedom:
		'Own airborne creatures have a 25% chance to  deal 50% more damage, bypass shields and evade targeting if 1:9',
	nightfall: auraText('Nocturnal creatures', '1|1', '2|1'),
	patience:
		'Each turn delay own creatures. They gain 2|2. 5|5 if flooded. Unique',
	stackable: '',
	stasis: 'Prevent creatures attacking at end of turn',
	voodoo: 'Repeat to foe negative status effects & non lethal damage',
};
function processEntry(c, event, entry) {
	return typeof entry === 'string'
		? entry
		: entry instanceof Array
			? entry[asCard(c).upped ? 1 : 0]
			: entry instanceof Function
				? entry(asCard(c), c)
				: event in entry ? processEntry(c, event, entry[event]) : '';
}
function asCard(c) {
	return c instanceof Card ? c : c.card;
}
function pushEntry(list, c, event, entry) {
	var x = processEntry(c, event, entry);
	if (x) list.push(x);
}
module.exports = function(c, event) {
	if (c instanceof Card && c.type == etg.SpellEnum) {
		const entry = data[c.active.get('cast').name[0]];
		return processEntry(c, 'cast', entry);
	} else {
		const ret = [],
			stext = [];
		for (const [key, val] of c.status) {
			if (!val) continue;
			const entry = statusData[key];
			if (entry === undefined) {
				let text = val === true || val === 1 ? key : key + ': ' + val;
				text = text.charAt(0).toUpperCase() + text.slice(1);
				stext.push(text);
			} else pushEntry(ret, c, '', entry);
		}
		if (stext.length) ret.unshift(stext.join(', '));
		for (const [key, val] of c.active) {
			val.name.forEach(name => {
				const entry = data[name];
				if (entry === undefined) return;
				pushEntry(ret, c, key, entry);
				if (key == 'cast')
					ret[ret.length - 1] =
						etg.casttext(c.cast, c.castele) + ' ' + ret[ret.length - 1];
			});
		}
		return ret.join('\n');
	}
};

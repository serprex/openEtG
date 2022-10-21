import Card from './Card.js';
import * as etg from './etg.js';

const skipstat = new Set(['hp', 'maxhp', 'atk', 'card', 'cast', 'castele']);

export default function skillText(c) {
	if (c instanceof Card && c.type === etg.Spell) {
		const entry = getDataFromName(c.getSkill('cast')[0]);
		return processEntry(c, 'cast', entry);
	} else {
		const ret = [],
			stext = [];
		for (const [key, val] of c.status) {
			if (
				val === 0 ||
				skipstat.has(key) ||
				(key === 'cost' && val === c.card.cost) ||
				(key === 'costele' && val === c.card.costele)
			)
				continue;
			const entry = statusText[key];
			if (entry === undefined) {
				const text = val === 1 ? key : val + key;
				stext.push(text.charAt(0).toUpperCase() + text.slice(1));
			} else pushEntry(ret, c, '', entry);
		}
		if (stext.length) ret.unshift(stext.join(', ') + '.');
		for (const [k, v] of c.active) {
			for (const name of v) {
				const entry = getDataFromName(name);
				if (entry === undefined) continue;
				pushEntry(ret, c, k, entry);
				if (k === 'cast')
					ret[ret.length - 1] = `${c.cast}:${c.castele} ${ret[ret.length - 1]}`;
			}
		}
		return ret.join('\n');
	}
}

const data = {
	abomination:
		'If targeted with mutation, this will always become an improved mutant.',
	absorber: 'Generates 3:6 for each attacker.',
	acceleration: c =>
		`Replaces target creature\'s skills with "Gains +${
			c.upped ? 3 : 2
		}|-1 when it attacks."`,
	accretion:
		'Destroy target permanent & gain 0|10. If using this ability leaves this creature at more than 30 HP, destroy this creature & add a black hole to your hand.',
	accumulation: 'Playing additional repulsors adds to damage reduction.',
	adrenaline:
		'Target creature attacks multiple times per turn. Creatures with lower strength attack more times per turn.',
	aflatoxin:
		'Give target 2 poison counters. When the target dies, it becomes a Malignant Cell.',
	aggroskele:
		'Summon a Skeleton. All of your skeletons deal damage equal to their strength to target creature.',
	alphawolf: 'Summon two 2|1 Pack Wolves when this enters play.',
	antimatter:
		"If target creature or weapon's attack is positive, it becomes negative. Otherwise, it becomes positive.",
	appease:
		"Sacrifice target creature you own & gain 1|1. If this ability isn't used, this creature will attack its owner. This creature attacks normally the turn it is played or if it loses this ability.",
	autoburrow:
		'Until end of turn, your creatures with burrow enter play burrowed.',
	axedraw:
		'Gains 1 strength for every card drawn by any player. Strength gained is removed after attack.',
	bblood: 'Give target creature 0|20 & delay it for 5 turns.',
	becomearctic: 'If frozen, this creature instead turns into an Arctic Squid.',
	beguile:
		"Target creature's opponent gains control of target creature until next turn.",
	beguilestop:
		'Return this creature to its original owner at start of next turn.',
	bellweb: 'Target creature becomes aquatic & loses airborne status.',
	blackhole:
		'Remove 3 quanta per element from target player. Heal 1 per quanta removed.',
	bless: 'Target gains 3|3.',
	blockwithcharge: 'Each stack fully blocks one attacker & is then destroyed.',
	bloodmoon:
		'Aquatic creatures gain "Gain 1:8 when it attacks."\nGolems gain "Damage dealt by this card also reduces the defender\'s maximum HP."\nNocturnal creatures gain "Heal yourself equal to the damage dealt by this card."',
	bolsterintodeck: 'Add 3 copies of target creature on top of your deck.',
	boneyard: c =>
		`Whenever a creature which isn\'t a Skeleton dies, summon a ${
			c.upped ? '2|2' : '1|1'
		} Skeleton.`,
	bounce:
		"When dying instead return to owner's hand. Modified state besides this effect remains when played again.",
	bravery:
		'Opponent draws up to two cards. Draw cards equal to what opponent drew.',
	brawl:
		'Your creatures attack. If a creature exists in opposing creature slot, the two creatures deal their damage to one another instead of opponent. Consumes all remaining 1:3.',
	brew: "Add a random Alchemy card to your hand. Possible cards include: Antimatter, Black Hole, Adrenaline, Nymph's Tears, Unstable Gas, Liquid Shadow, Aflatoxin, Basilisk Blood, Rage Potion, Luciferin, Precognition, Quintessence.",
	brokenmirror: c =>
		`When opponent plays a creature from their hand, summon a ${
			c.upped ? '2|1' : '1|1'
		} Phantom.`,
	bubbleclear:
		'Remove statuses (positive & negative) from target creature or permanent, & heal target creature 1.\nTarget gains a bubble. Bubbles nullify the next spell, ability, or spell damage used by opponent that targets or damages the affected card.',
	butterfly:
		'Target creature or weapon with either strength or HP less than 3 has its skills replaced with "3:1 Destroy target permanent."',
	burrow: c =>
		c.getStatus('burrowed')
			? "Burrow this creature. Burrowed creatures' strength is halved while burrowed."
			: 'Unburrow.',
	catapult:
		"Sacrifice target creature you control to damage opponent for 100 * Creature's HP / (100 + Creature's HP). Frozen creautres deal 1.5x more. Poisoned creatures transfer their poison to opponent.",
	catlife: c =>
		`Has ${c.getStatus(
			'lives',
		)} lives. When it dies, this creature loses a life & revives with ${
			asCard(c).attack
		}|${asCard(c).health} stats.`,
	cell: 'Becomes a Malignant Cell if poisoned.',
	chaos: c =>
		`${
			c.upped ? '20% chance to evade attacks. ' : ''
		}Non-ranged attacking creatures have a 30% chance to have a random effect cast on them.`,
	chimera:
		"Combine all your creatures to form a Chimera with momentum, gravity pull, & the total of your creatures' combined strength & HP.",
	chromastat:
		"Generate 1:0 for this creature's total strength & HP when this creature deals damage.",
	clear:
		'Remove statuses (positive & negative) from target creature or permanent, & heal target creature 1.',
	cold: '30% chance to freeze non-ranged attackers for 3 turns.',
	corpseexplosion: [
		'Sacrifice one of your creatures to deal 1 spell damage to all creatures. Increase damage by 1 for every 8 HP of the sacrifice. Poisonous sacrifices poison opponent.',
		'Sacrifice one of your creatures to deal 1 spell damage to all enemy creatures. Increase damage by 1 for every 8 HP of the sacrifice. Poisonous sacrifices poison opponent.',
	],
	counter:
		'When this creature is attacked by another creature, if this creature is able to attack, it deals its damage to the attacking creature.',
	countimmbur: 'Gains 1|0 for every immaterial or burrowed card in play.',
	cpower: 'Target randomly gains between 1 to 5 strength & HP.',
	creatureupkeep:
		"Whenever a creature attacks, its owner must pay one quanta of the creature's element or the creature is destroyed.",
	cseed:
		'Inflict a random effect on target creature. Possible effects include damage, lobotomize, parallel universe, gravity pull, reverse time, & freeze.',
	cseed2:
		'Inflict a random effect on target card. All existing effects are possible.',
	deadalive: {
		hit: 'When this card deals damage, trigger all effects that occur when a creature dies.',
		cast: 'Trigger all effects that occur when a creature dies.',
	},
	deathwish:
		'Whenever opponent casts a spell or ability on an allied creature, if this creature is a valid target, that spell or ability targets this creature instead.',
	deckblast: c =>
		`Deals spell damage to opponent for each card remaining in deck.\nIf this spell costs 1:10, destroy all cards in your deck.`,
	deepdive:
		'Burrow. While burrowed, replace this ability with "2:3 Freeze target permanent." Next turn, unburrow, become airborne, & triple this creature\'s strength until its next attack.',
	deja: 'Remove this ability & summon a copy of this creature.',
	deployblobs: 'Summon 3 Blobs. Gain -2|-2.',
	despair:
		'Non-ranged attackers have a 40% chance plus 5% per 1:11 producing creature you control to gain -1|-1.',
	destroy: 'Destroy target permanent.',
	destroycard:
		"Discard target card, or destroy top card of target player's deck.",
	detain:
		'Target creature with less HP than this creature gets -1|-1 & is burrowed. Gain 1|1.',
	devour:
		'Target creature with less HP than this creature dies. Gain 1|1. If target creature was poisonous, become poisoned.',
	die: 'Sacrifice this card.',
	disarm:
		'When this creature damages opponent, return their weapon to their hand. Modified stats & statuses remain on the card when it is played again.',
	discping:
		'Deal 1 damage to target creature & return this card to your hand. Modified stats & statuses remain on the card when it is played again.',
	disfield: 'Block all damage from attackers. Consumes 1:0 per damage blocked.',
	disshield:
		'Block all damage from attackers.. Consume 1:1 per 3 damage blocked. Not prevented by Sanctuary.',
	divinity: 'Add 24 to maximum health & heal yourself 16.',
	dive: "Double this creature's strength through next attack. Does not stack.",
	dmgproduce: 'Generate 1:0 for each damage dealt by this card.',
	draft:
		"If target creature is airborne, it loses airborne & takes 3 spell damage. If target creature isn't airborne, it becomes airborne & gains 3|0",
	drainlife:
		'Deal 2 spell damage plus one per 5:11 you have after playing this card. Heal for the amount of damage done.',
	drawcopy:
		'When opponent discards a card, add a copy of that card to your hand.',
	drawequip: 'Both players draw the next weapon or shield in their deck.',
	drawpillar:
		'When this card is played, if top card of your deck is a pillar, tower, or pendulum, draw it.',
	dryspell:
		'Deal 1 spell damage to all creatures. Gain 1:7 for each damage dealt. Removes cloak.',
	dshield: 'Target creature gains immaterial until next turn.',
	duality: "Add a copy of top card of opponent's deck to your hand.",
	earthquake:
		'Destroy up to 3 copies of target pillar, pendum, tower, or other stacking permanent.',
	eatspell:
		'Until your next turn, the next spell any player casts is nullified. If this ability nullifies a spell, this creature gains 1|1.',
	elf: 'If this card is targeted by Chaos Seed, it becomes a Fallen Elf.',
	embezzle:
		'Replaces target creature\'s skills with "When this creature damages a player, that player draws a card. When this creature dies, destroy top two cards of opponent\'s deck."',
	embezzledeath:
		"When this creature dies, destroy top two cards of opponent's deck.",
	empathy:
		'At the end of your turn, heal 1 for each creature you own. For every 8 creatures you own (rounded down), pay 1:5 at the end of your turn.',
	enchant: 'Target permanent becomes immaterial.',
	endow:
		'Gain the strength, skills, & statuses of target weapon. Gain 0|2.\nCannot gain Endow skill.',
	envenom:
		'Target equipment gains "Give 1 poison on hit. Throttled (only triggers at most twice from Adrenaline)" & "25% chance to give non-ranged attackers 1 poison counter."',
	epidemic:
		"When any creature dies, give opponent poison counters equal to the dead creature's poison counters.",
	epoch:
		"On each player's turn, silence that player after they play two cards.",
	epochreset: {
		cast: 'Reset your count of cards played this turn.',
	},
	equalize:
		"Set target creature's maximum HP equal to its strength. Set its HP to its maximum HP.\nOr change target card's elemental cost to 1:0",
	evade: x => `${x}% chance to evade attacks.`,
	evade100: 'Completely block enemy attacks.',
	evadecrea:
		"Cannot be directly targeted by opponent's creature's active skills.",
	evadespell: "Cannot be directly targeted by opponent's spells.",
	evolve: 'Transform this card into an unburrowed Shrieker.',
	feed: 'Give target creature 1 poison counter, gain 3|3, & lose immaterial status until the beginning of your next turn.',
	fickle:
		"Swap target card in either player's hand with a random card from their deck that they have enough quanta to play.",
	fiery: 'Gains +1 strength for every 5:6 owned.',
	firebolt:
		'Deal 3 spell damage plus one per 4:6 you have after playing this card. If target is frozen, it loses frozen status.',
	firebrand: x => 'Last an additional turn when targeted with Tempering.',
	firestorm: x =>
		`Deal ${x} spell damage to all of target player\'s creatures, thawing them. Removes cloak.`,
	firewall: 'Deals 1 damage to each non-ranged attacking creature.',
	flooddeath:
		"Each player's non-aquatic creatures past their first five creature slots die at the end of that player's turn. Pay 1:7 at the end of your turn. If you cannot, destroy this card. Does not stack.",
	flyself:
		'If this card is equipped as a weapon, it casts Flying Weapon on itself. If this card is a creature, it casts Living Weapon on itself.',
	flyingweapon:
		"Target weapon becomes a flying creature. It still counts as a weapon even though it isn't in a weapon slot.",
	foedraw: "Draw from opponent's deck",
	forcedraw: 'When this creature damages a player, that player draws a card.',
	forceplay:
		"The owner of target card in hand plays that card on a random target if they are able, or the owner of target card in play without this ability activates that card's ability on a random target if they are able",
	fractal:
		'Fill your hand with copies of target creature. Remove all remaining 1:12.',
	freeevade:
		"If your opponent has a shield, your airborne creatures have a 30% chance to bypass the shield. Otherwise, your creatures have a 30% chance to deal 50% more damage. Your creatures have 20% chance to evade opponent's targeted spells & skills.",
	freeze: c =>
		`Freeze target creature or weapon for ${
			c.upped ? 4 : 3
		} turns. Frozen cards cannot attack or use active skills, & do not activate per-turn skills.`,
	freezeperm: c =>
		`Freeze target non-stacking permanent for ${
			c.upped ? 4 : 3
		} turns. Frozen cards cannot attack or use active skills, & do not activate per-turn skills.`,
	fungusrebirth: c =>
		`Transform this card into a ${c.upped ? 'Toxic Fungus' : 'Fungus'}.`,
	gaincharge2: {
		death: 'Whenever any creature dies, gain two stacks.',
		destroy: 'Whenever any other permanent is destroyed, gain two stacks.',
	},
	gaintimecharge:
		'Gain one stack for every card you draw. Does not gain a stack from your draw at the start of your turn.',
	gas: 'Summon an Unstable Gas.',
	grave:
		'When another creature dies, unburrow & transform this creature into a fresh copy of the dying creature. This creature retains nocturnal.',
	give: c =>
		`Give target card you own, either in hand or in play, to your opponent. Heal yourself ${
			c.upped ? 10 : 5
		}. This card bypasses sanctuary, & can target immaterial or burrowed cards.`,
	golemhit:
		'Target golem attacks. This ability can target immaterial or burrowed cards.',
	gpull:
		"Creatures attacking this creature's owner instead attack this creature.",
	gpullspell:
		"Creatures attacking target creature's owner instead attack target creature.\nIf target is a player, creatures attack that player when attacking that player.",
	gratitude: 'Heal yourself 4 at the end of your turn.',
	growth: (atk, hp) => {
		const x = `${atk}|${hp}`;
		return {
			death: `When any creature dies, gain ${x}.`,
			cast: `Gain ${x}.`,
			ownattack: `This creature gains ${x} when it attacks.`,
		};
	},
	icegrowth: (atk, hp) =>
		`When this card would be frozen, instead gain ${atk}|${hp}.`,
	guard:
		"Delay target creature & this creature. If target creature isn't airborne or this creature is airborne, this creature deals damage equal to its strength to target creature.",
	halveatk: "This creature's strength is halved after it attacks.",
	hasten: {
		cast: 'Draw a card.',
		owndiscard: 'When you discard this card, draw a card.',
	},
	hatch: 'Transform this creature into a random creature.',
	heal: 'Heal target creature or player 20.',
	heatmirror: c =>
		`When your opponent plays a creature from their hand, summon a ${
			c.upped ? 'Ball Lightning' : 'Spark'
		}.`,
	hitownertwice: 'When this creature attacks, it also attacks its owner twice.',
	holylight: [
		'Heal target creature or player 10. If target creature is nocturnal, instead deal 10 spell damage to target creature.',
		'Heal target creature or player 10. If target creature is nocturnal, instead deal 10 spell damage to target creature.\nGain 1:8 when played.',
	],
	hope: 'Blocks one additional damage for each creature you control that gain 1:8 when attacking.',
	icebolt:
		'Deal 2 spell damage plus one per 5:7 you have after playing this card. 25% plus 5% per point of damage chance to freeze target.',
	ignite:
		'Deal 20 spell damage to opponent. Deal 1 spell damage to each creature.',
	immolate: x =>
		`Sacrifice a creature you control. Gain ${
			+x + 1
		}:6 plus 1 quanta of each other element.`,
	improve:
		'Transform a target creature into a random mutant creature. Mutant creatures gain a random ability; & randomly gains between 1 to 5 strength & hp.',
	inertia: 'When any card you own is targeted by either player, gain 2:3.',
	inflation: 'Increase the cost of all active skills by 1.',
	ink: 'Summon a Cloak that lasts 1 turn.',
	innovation:
		"Discard target card in either player's hand. The owner of target card draws three cards. Destroy top card of your deck.",
	integrity:
		'Destroy all shards in your hand to play a Shard Golem with stats and skills based on the shards destroyed.',
	jelly:
		"Target creature becomes a 7|4 Pink Jelly with an active ability that turns additional creatures into Pink Jellies. That ability costs 4 quanta matching target creature's element. 1:0 creatures have an ability cost of 12:0",
	jetstream: 'Target airborne creature gains 3|-1.',
	lightning: 'Deal 5 spell damage to target creature or player.',
	liquid:
		'Give target creature 1 poison counter. Target creature\'s skills are replaced with "Heal yourself equal to the damage dealt by this card."',
	livingweapon:
		"Equip target creature as a weapon. If target creature's owner already had a weapon equipped, return it to their hand. Heal target creature's owner equal to target creature's HP.",
	lobotomize: "Remove target creature's skills. Also remove psionism.",
	locket:
		"Gains quanta matching your mark each turn, until set to gain quanta of a specific element. Doesn't operate while frozen.",
	locketshift:
		"Switch this card's production to match the element of any target, including immaterial and burrowed cards.",
	loot: 'When one of your permanents is destroyed, gain control of a random permanent from opponent.',
	losecharge: (c, inst) => {
		const charges = c.getStatus('charges');
		return charges
			? `Lasts for ${charges} more turn${charges === 1 ? '' : 's'}.`
			: 'Expires at end of turn';
	},
	luciferin:
		'Your creatures without skills gain "Gain 1:8 when it attacks."\nHeal yourself 10.\nRemoves cloak.',
	lycanthropy: 'Remove this ability and gain 5|5 and become nocturnal.',
	martyr: 'Gains 1|0 for every point of damage this card receives.',
	mend: 'Heal target creature 10.',
	metamorph:
		"Change your mark to target's element.\nIncrease your mark power by 1.",
	midas:
		'Target permanent becomes a Golden Relic with "2:0: Sacrifice this card and draw a card." If target is a weapon, its strength is 1. If target is a shield, its damage reduction is 1.',
	mill: "Destroy top card of target player's deck",
	millpillar:
		"If top card of target player's deck is a pillar, pendulum, or tower, destroy that card.",
	mimic:
		'Whenever another creature enters play, transform this card into a fresh copy of that creature. This creature retains this ability.',
	miracle:
		'Heal yourself to one below your maximum HP. Consumes all remaining 1:8.',
	mitosis: 'Summon a fresh copy of this creature.',
	mitosisspell:
		'Target creature gains 0|1. Target\'s active ability becomes "Summon a fresh copy of this creature." That ability costs target\'s cost.',
	momentum: 'Target creature or weapon gains 1|1 and ignores shields.',
	mummy: 'Becomes a Pharaoh if targeted by Rewind.',
	mutation:
		'50% chance target creature becomes an Abomination. 40% chance target creature becomes a random mutated creature with a random ability, +0-4 strength, and +0-4 HP. 10% chance target creature dies.',
	mutant:
		'When this card enters play, it gains a random active ability with a random activation cost.',
	neuro:
		'Give 1 poison counter on hit. Apply neurotoxin on hit. Neurotoxin gives 1 poison counter for every card played by the affected player or active ability used by the affected creature. Throttled (only triggers at most twice from Adrenaline.)',
	neuroify:
		"If target creature or player is poisoned, target gains neurotoxin. Neurotoxin gives 1 poison counter for every card played by the affected player or active ability used by the affected creature. Remove target's purify counters.",
	nightmare: c =>
		`Fill opponent\'s hand with fresh copies of target creature. Deal ${
			c.upped ? '2' : '1'
		} damage per card added in this way. Heal yourself an equal amount.`,
	nightshade:
		'Target creature becomes nocturnal, gains 5|5, and loses active skills.',
	nova: 'Gain 1 quanta of each element. If you play three or more of this card in one turn, summon a Singularity on your side.',
	nova2:
		'Gain 2 quanta of each element. If you play two or more of this card in one turn, summon a Singularity on your side.',
	nullspell:
		'Until your next turn, the next spell any player casts is nullified. If this ability nullifies a spell, this creature gains 1|1.',
	nymph:
		"Transform target pillar, pendulum, or tower into a Nymph matching target's element.",
	obsession: c =>
		`When this card is discarded, its owner receives ${
			c.upped ? 13 : 10
		} spell damage.`,
	ouija: "Whenever a creature dies, add an Ouija Essence to opponent's hand.",
	pacify: "Set target creature or weapon's strength to 0.",
	pairproduce: 'Your pillars, pendulums, and towers trigger as if end of turn.',
	paleomagnetism: {
		ownattack: [
			"Summon a pillar or pendulum every turn. \u2154 chance it matches your mark, otherwise it matches your opponent's mark.",
			"Summon a tower or pendulum every turn and when this card is played. \u2154 chance it matches your mark, otherwise it matches your opponent's mark.",
		],
	},
	pandemonium:
		'Inflict a random effect on every creature. Possible effects include damage, lobotomize, parallel universe, gravity pull, reverse time, and freeze. Removes cloak.',
	pandemonium2:
		"Inflict a random effect on each of target player's creatures. Possible effects include damage, lobotomize, parallel universe, gravity pull, reverse time, and freeze. Removes cloak.",
	pandemonium3:
		'Inflict a random effect on every card in play or any hand. All existing effects are possible. Removes cloak.',
	paradox: 'Target creature with more strength than HP dies.',
	parallel: 'Summon an exact copy of target creature on your side.',
	patience:
		"If it isn't frozen, prevents your creatures from attacking at the end of your turn, instead they gain 2|1. If they are burrowed, they instead gain 4|1. If they are affected by Flooding, they instead gain 5|2. Does not stack.",
	phoenix: [
		'When this creature dies, transform it into an Ash.',
		'When this creature dies, transform it into a Minor Ash.',
	],
	photosynthesis:
		'Gain 2:5. This ability may be used multiple times per turn unless activation cost is free.',
	pillar: c => `Gain ${c.element ? 1 : 3}:${c.element} every turn.`,
	pillar1: c => `Gain ${c.element ? 1 : 3}:${c.element} when played`,
	pend: c =>
		`Each turn, switch between gaining ${c.element ? 1 : 3}:${
			c.element
		} and one quanta matching your mark.`,
	plague:
		"Give target player's creatures 1 poison counter each. Removes cloak.",
	platearmor: x =>
		`Target gains 0|${x}, or target player gains ${x} maximum HP and heals ${x}.`,
	poison: x => {
		const s = x === '1' ? '' : 's';
		x = `Give ${x === '1' ? '' : x + ' '}poison counter${s} `;
		return {
			cast: `${x} to target creature.`,
			hit: `${x} on hit. Throttled (only triggers at most twice from Adrenaline.)`,
		};
	},
	poisonfoe: x => ({
		cast: `Give ${x === '1' ? '' : x + ' '}poison counter${
			x === '1' ? '' : 's'
		} to opponent.`,
		play: 'When this card enters play, give 1 poison counter to opponent.',
	}),
	powerdrain:
		"Remove half of target creature's strength and HP, rounded up. Add an equal amount of strength and HP to a random creature you control.",
	precognition:
		"Reveal opponent's hand until the end of their turn. Draw a card.",
	predator:
		'If opponent has more than four cards in their hand, this card attacks a second time and opponent discards the last card in their hand.',
	protectall:
		'All your creatures and permanents and weapon and shield gain a bubble. Bubbles nullify the next spell, ability, or spell damage used by opponent that targets or damages the affected card.',
	protectonce:
		'Nullify the next spell, ability, or spell damage used by opponent that targets or damages this card.',
	purify:
		'Remove all poison counters and sacrifice status from target creature or player. Target creature or player gains two purify counters.',
	quantagift:
		'Gain 2:7 and 2 quanta matching your mark. If your mark is 1:7, instead gain only 3:7 total. If your mark is 1:0, gain an additional 4:0.',
	quanta: x => ({
		ownattack: `Gain 1:${x} when it attacks.`,
		owndeath: `When this creature dies, gain 1:${x}.`,
		ownplay: `Gain 1:${x} when played.`,
	}),
	quint:
		'Target creature becomes immaterial. If target creature is frozen, it loses frozen status.',
	quinttog:
		"If target creature isn't immaterial, it gains immaterial status, and if it is also frozen, it loses frozen status. If target creature is immaterial, it loses immaterial status. ",
	rage: [
		'Target creature gains +5|-5. If target creature is frozen, it loses frozen status.',
		'Target creature gains +6|-6. If target creature is frozen, it loses frozen status.',
	],
	randomdr: c =>
		`When this card is played, its damage reduction is set randomly between 0 and ${
			c.upped ? 3 : 2
		}.`,
	readiness:
		"Target creature's active ability becomes free. If target creature's active ability has already been used this turn, it can be used again this turn.",
	reap: "Target non-Skeleton creature dies and is replaced with a Skeleton with target creature's current strength and HP, but no other active skills or statuses.",
	rebirth: c =>
		`Transform this card into a ${c.upped ? 'Minor Phoenix' : 'Phoenix'}.`,
	reducemaxhp:
		"Damage dealt by this card also reduces the defender's maximum HP.",
	regen:
		"Give 1 purify counter to this card's owner on hit. Throttled (only triggers at most twice from Adrenaline.)",
	regenerate: 'Heal yourself 5 every turn or when this card attacks.',
	regeneratespell:
		'Replace target creature or non-stacking permanent\'s skills with "Heal this card\'s owner 5 every turn or when this card attacks."',
	regrade:
		"If target card is upgraded, it becomes unupgraded. If target card is unupgraded, it becomes upgraded. Gain 1 quanta of target card's element. Cannot target stacks.",
	reinforce:
		"Target creature gains strength and HP equal to this creature's strength and HP. Destroy this creature.",
	ren: 'Target creature gains: "When dying instead return to owner\'s hand. Modified state besides this effect remains when played again."',
	rewind:
		"Put target creature on top of its owner's deck. Removes all bonuses and modifiers on target creature.",
	reveal: {
		ownplay: "Reveal opponent's hand when played and on attack.",
	},
	ricochet:
		'Any targeted spells cast by either player are copied when played. The copy has a random caster and a random non-player target.',
	sabbath:
		'Target cannot gain quanta through the end of their next turn. Their deck is protected until start of their next turn.',
	sadism: 'Whenever any creatures are damaged, heal yourself an equal amount.',
	salvage:
		'Whenever a permanent is destroyed, gain 1|1. Once per turn, when opponent destroys a permanent, add a copy of that permanent to your hand.',
	salvageoff: 'Cannot salvage another destroyed permanent until next turn.',
	sanctify: {
		ownattack:
			"During your opponent's turn, your hand and quanta pool are protected and you cannot be silenced.",
		owndraw:
			'When drawn, your hand and quanta pool are protected and you cannot be silenced.',
	},
	unsanctify: {
		ownplay:
			"Nullify opponent's sanctuary effect from Sanctuary or Dream Catcher.",
	},
	scatter:
		'Target player mulligans their hand for an equal number of cards.\nTargeting a card will only shuffle that card.\nIncrease your mark power by 1.',
	scramble: {
		hit: "Randomize up to 9 quanta randomly chosen from opponent's quanta pool on hit.",
		cast: "Randomize up to 9 quanta randomly chosen from target player's quanta pool.",
	},
	scramblespam:
		"Randomize up to 9 quanta randomly chosen from target player's quanta pool. This ability may be used multiple times per turn.",
	serendipity: [
		'Add 3 random non-pillar cards to your hand. At least one will be 1:1.',
		'Add 3 random upgraded non-pillar cards to your hand. At least one will be 1:1.',
	],
	shtriga: 'Gain immaterial when your next turn starts.',
	shuffle3:
		'Shuffle 3 copies of target creature into your deck & expend a charge. Destroyed when all charges expended.',
	silence:
		'Silence target player or creature. Silenced players cannot play cards until the end of their next turn, while silenced creatures cannot use active skills until the end of their next turn.',
	sing: 'Target creature without this ability attacks its owner.',
	singularity: 'That was a bad idea.',
	sinkhole: [
		"Burrow target creature. Replace target creature's skills with 1:4: unburrow.",
		"Burrow target creature. Replace target creature's skills with 2:4: unburrow",
	],
	siphon:
		"Remove 1:0 randomly from opponent's quanta pool when this creature attacks. Gain 1:11 for each quanta removed. Throttled (only triggers at most twice from Adrenaline.)",
	siphonactive:
		"Copy target creature or weapon's skills. Remove skills from target. Caster can be reactivated.",
	siphonstrength: 'Target creature loses 1|0. Gain 1|0.',
	skeleton:
		'If this creature is targeted by Rewind, it becomes a random creature.',
	skull:
		'Attacking creatures may randomly die and are replaced by Skeletons. Creatures with lower HP are more likely to die.',
	skyblitz:
		'Your airborne creatures all dive (double their strength until end of turn.) Consumes all remaining 1:9.',
	slow: 'Non-ranged attackers are delayed for one turn after their attack. Delayed creatures may not attack or use active skills.',
	snipe: 'Deal 3 damage to target creature.',
	solar: 'Gain 1:8 for each attacker.',
	sosa: c =>
		`Sacrifice ${
			c.upped ? 40 : 48
		} HP. Consume all non-1:2 quanta. For two turns, damage heals you and healing damages you.`,
	soulcatch: 'Whenever a creature dies, gain 3:2.',
	spores: c =>
		`When this creature dies, summon 2 ${c.upped ? 'Toxic ' : ''}Spores.`,
	sskin:
		'Gain maximum HP and heal an amount equal to the 1:4 in your quanta pool after casting this spell.',
	stasis: "Creatures do not attack at the end of each player's turn.",
	stasisdraw:
		'Target player cannot draw cards from their deck until their end of turn, instead drawing unupgraded singularities. Their deck is protected until their next turn starts.',
	static: 'Deals 2 spell damage to opponent for each attacker.',
	steal: 'You gain control of target permanent.',
	steam:
		'Gain 5|0. This creature loses 1|0 of strength gained in this way after each attack.',
	stoneform: 'Gain 0|20. Become a golem.',
	storm: x =>
		`Deal ${x} spell damage to all of target player\'s creatures. Removes cloak.`,
	summon: x => c =>
		`Summon a ${(c instanceof Card ? c : c.game).Cards.Codes[x].name}.`,
	swarm:
		'Base HP is equal to the number of Scarabs you control, including this one.',
	swave:
		"Deal 4 spell damage to target creature or player. If target creature is frozen, it dies. If target player's weapon is frozen, destroy it.",
	tempering: x =>
		`Target weapon gains ${x} strength. If target weapon is frozen, it loses frozen status.`,
	tesseractsummon:
		'Summon 2 random creatures from your deck. Opponent summons 1 random creature from their deck. Freeze these creatures for a number of turns equal to \u00bc of their quanta cost, rounded up.',
	thorn: x => `${x}% chance to give non-ranged attackers 1 poison counter.`,
	throwrock: c =>
		`Deal ${
			c.upped ? 4 : 3
		} damage to target creature, then shuffle Throw Rock into its owner's deck.`,
	tick: [
		'This creature takes 1 damage. If this damage kills the creature, deal 18 spell damage to opponent.',
		"This creature takes 3 damage. If this damage kills the creature, deal 4 spell damage to all of opponent's creatures",
	],
	tidalhealing:
		'Remove frozen status and poison counters from all your creatures. Your aquatic creatures gain "Give 1 purify counter to this card\'s owner on hit. Throttled (only triggers at most twice from Adrenaline.)". This ability does not stack.',
	tornado: [
		"Randomly choose two of opponent's permanents and one of your permanents. Each selected permanent is shuffled into a random player's deck.",
		"Randomly choose two of opponent's permanents. Each selected permanent is shuffled into a random player's deck.",
	],
	trick:
		"If target creature's owner has creatures in their deck, put target creature into their deck and summon a random different creature from their deck.",
	turngolem:
		"This card becomes a creature with Gravity Pull. Set the creature's HP to the total damage this card blocked while it was a shield. Set the creature's strength to half its HP.",
	unsummon:
		"Return target creature to its owner's hand. Remove any modifiers and statuses on target creature. If owner's hand is full, instead return target creature to top of its owner's deck.",
	unsummonquanta:
		"Return target creature to its owner's hand. Remove any modifiers and statuses on target creature. If owner's hand is full, instead return target creature to top of its owner's deck. Gain quanta equivalent to target card's cost.",
	unvindicate:
		'Cannot activate vindicate again until the start of its next turn.',
	upkeep: c =>
		`Pay 1:${c.element} at the end of your turn. If you cannot, destroy this card.`,
	upload: 'Target creature or weapon gains 2|0. This creature loses 0|2.',
	vampire: 'Heal yourself equal to the damage dealt by this card.',
	vend: 'Sacrifice this card. Draw a card.',
	vengeance:
		"Whenever one of your creatures dies during opponent's turn, your creatures attack and this card loses a charge.",
	vindicate:
		'Once per turn, when one of your creatures dies, it attacks an additional time before dying.',
	virtue:
		"When this creature attacks, if any damage is blocked by opponent's shield, your maximum HP is increased by the amount of this creature's damage that was blocked.",
	virusdeath: 'When this creature dies, give opponent 1 poison counter.',
	virusinfect:
		'Sacrifice this creature. Give target creature or player 1 poison counter.',
	virusplague:
		"Sacrifice this creature. Give target player's creatures 1 poison counter.",
	void: "Reduce opponent's maximum HP by 3.",
	voidshell:
		'Block all damage from attackers. Reduce your maximum HP equal to the damage blocked by this card.',
	web: 'Target creature loses airborne status.',
	weight: 'Evade all attackers that have more than 5 HP.',
	wind: 'Restore any strentgh lost by halving after attacking.',
	wings: 'Evade all non-airborne, non-ranged attackers.',
	wisdom:
		'Target creature or weapon gains 3|0. May target immaterial cards. If it targets an immaterial card, that card gains psionic. Psionic cards deal spell damage and typically bypass shields.',
	yoink:
		"Remove target card from opponent's hand and add it to your hand, or draw from target opponent's deck.",
	v_acceleration: x => `Gains +${x}|-1 when it attacks`,
	v_accelerationspell: x =>
		`Replaces target creature\'s skills with "Gains +${x}|-1 when it attacks."`,
	v_accretion:
		"Destroy target permanent & gain 0|15. Return to owner's hand as a Blackhole if health exceeds 45",
	v_aflatoxin:
		'Apply 2 poison to target. When target dies, it turns into a malignant cell.',
	v_antimatter: 'Invert strength of target.',
	v_bblood: 'Target creature gains 0|20 & is delayed 6 turns.',
	v_blackhole:
		'Absorb 3 quanta per element from target player. Heal 1 per absorbed quantum.',
	v_bless: 'Target gains 3|3.',
	v_blockwithcharge: 'Block attack per stack.',
	v_boneyard: c =>
		`When a non-Skeleton creature dies, summon a ${
			c.upped ? '2|2' : '1|1'
		} Skeleton`,
	v_bravery:
		'Foe draws 2, 3 if own mark is 1:6, cards, you draw an equal amount of cards.',
	v_burrow: 'Burrow. Burrowed creatures attack with half strength.',
	v_butterfly:
		'Target something smaller than, or weaker than, 3. Replace target\'s skills with "3:1 Destroy target permanent"',
	v_chimera:
		'Combine all your creatures to form a Chimera with momentum & gravity pull.',
	v_cold: '30% chance to freeze attackers for 3.',
	v_cpower: 'Target gains 1 to 5 strength. Target gains 1 to 5 hp.',
	v_cseed: 'A random effect is inflicted to target creature.',
	v_decrsteam: 'Decrement strength from steam after attack.',
	v_deja: 'Remove active & summon copy.',
	v_dessication:
		"Deal 2 damage to opponent's creatures. Gain 1:7 per damage dealt. Removes cloak",
	v_destroy: 'Destroy target permanent.',
	v_devour: 'Kill smaller target creature & gain 1|1.',
	v_disfield: 'Absorb damage. Consume 1:0 per damage absorbed.',
	v_disshield: 'Absorb damage. Consume 1:1 per 3 damage absorbed.',
	v_divinity: 'Add 24 to maximum health if mark 1:8, otherwise 16 & heal same.',
	v_dive: 'Double strength until next attack.',
	v_drainlife: _ =>
		'Drain 2HP from target, plus an extra 2HP per 10:11 remaining.',
	v_dryspell: [
		'Deal 1 damage to all creatures. Gain 1:7 per damage dealt. Removes cloak.',
		"Deal 2 damage to all opponent's creatures. Gain 1:7 per damage dealt. Removes cloak",
	],
	v_dshield: 'Become immaterial until next turn.',
	v_duality: "Generate a copy of foe's next draw",
	v_earthquake: 'Destroy up to 3 stacks from target permanent.',
	v_empathy: 'Heal owner per creature owned per turn. Upkeep per 8 creatures.',
	v_endow: 'Replicate attributes of target weapon.',
	v_evolve: 'Become an unburrowed Shrieker.',
	v_fiery: 'Increment damage per 5:6 owned.',
	v_firebolt: _ => 'Deals 3 damage to target. Deal 3 more per 10:6 remaining.',
	v_firewall: 'Damage attackers.',
	v_flyingweapon: 'Own weapon becomes a flying creature.',
	v_freedom:
		'Your airborne creatures have a 25% chance to deal 50% more damage, bypass shields and evade targeting if 1:9.',
	v_freeze: c =>
		`Freeze target for ${
			c.upped ? 4 : 3
		} turns. Being frozen disables attacking & per turn skills`,
	v_gaincharge2: 'Gain 2 stacks per death.',
	v_gas: 'Summon an Unstable Gas.',
	v_gpullspell: 'Target creature intercepts attacks directed to its owner.',
	v_gratitude: 'Heal owner 3, 5 if 1:5.',
	v_guard: 'Delay target creature & attack target if grounded. Delay self.',
	v_hatch: 'Become a random creature.',
	v_heal: 'Heal self 20.',
	v_holylight: 'Heal target 10. Nocturnal targets are damaged instead.',
	v_hope:
		'Blocks one additional damage for each creature you control that gain 1:8 when attacking.',
	v_icebolt: _ =>
		'Deal 2 damage to target, plus an additional 2 per 10:7 remaining. 25% plus 5% per point of damage chance to freeze target.',
	v_improve: 'Mutate target creature.',
	v_infect: 'Poison target creature.',
	v_ink: 'Summon a Cloak which lasts 1 turn.',
	v_integrity: 'Combine all shards in hand to form a Shard Golem.',
	v_liquid:
		'Target creature is poisoned & skills replaced with "Heal owner per damage dealt"',
	v_lobotomize: 'Remove skills from target creature.',
	v_luciferin:
		'All your creatures without skills gain 1:8 when attacking. Heal self 10.',
	v_lycanthropy: 'Gain 5|5.',
	v_mend: 'Heal target creature 5.',
	v_mitosis: 'Summon a daughter creature.',
	v_mitosisspell:
		'Non-weapon creature gains active "Mitosis: Summon a daughter creature" costing target\'s card\'s cost.',
	v_momentum: 'Target ignores shield effects & gains 1|1.',
	v_mutation:
		'Mutate target creature into an abomination, or maybe something more. Slight chance of death.',
	v_neuro:
		'Apply poison on hit, also inflicting neurotoxin. Neurotoxin applies poison per card played by victim. Throttled.',
	v_nightmare:
		"Fill foe's hand with copies of target creature's card. Drain 2HP per added card",
	v_nova:
		'Gain 1 quanta of each element. If you play three or more of this card in one turn, summon a Singularity on your side.',
	v_nova2:
		'Gain 2 quanta of each element. If you play two or more of this card in one turn, summon a Singularity on your side.',
	v_nymph: 'Turn target pillar into a Nymph of same element.',
	v_obsession: c => `Damage owner ${c.upped ? 13 : 10} on discard`,
	v_pandemonium: c =>
		`Random effects are inflicted to ${
			c.upped ? "oppenent's" : 'all'
		} creatures. Removes cloak`,
	v_parallel: 'Duplicate target creature.',
	v_phoenix: ['Become an Ash on death.', 'Become a Minor Ash on death.'],
	v_plague: "Poison foe's creatures. Removes cloak",
	v_platearmor: x => `Target creature gains 0|${x}.`,
	v_precognition: "Reveal foe's hand until end of their turn. Draw",
	v_purify: 'Replace poison statuses with 2 purify. Removes sacrifice.',
	v_queen: 'Summon a Firefly.',
	v_rage: c => `Target creature gains ${c.upped ? '+6|-6' : '+5|-5'}`,
	v_readiness:
		"Target creature's active becomes costless. Skill can be reactivated",
	v_rebirth: c => `Become a ${c.upped ? 'Minor ' : ''}Phoenix`,
	v_regenerate: 'Heal owner 5.',
	v_relic: 'Worthless.',
	v_rewind:
		"Remove target creature to top of owner's deck. If target is a Skeleton, transform it into a random creature. If target is a Mummy, transform it into a Pharaoh.",
	v_salvage: 'Restore permanents destroyed by foe to hand once per turn.',
	v_salvageoff: 'Become ready to salvage when your next turn starts.',
	v_scarab: 'Summon a Scarab.',
	v_scramble: "Randomly scramble foe's quanta on hit",
	v_serendipity: c =>
		`Generate 3 random${
			c.upped ? ' upgraded' : ''
		} cards in hand. One will be 1:1`,
	v_silence:
		'Foe cannot play cards during their next turn, or target creature gains summoning sickness.',
	v_singularity: 'Not well behaved.',
	v_siphon: 'Siphon 1:0 from foe as 1:11. Throttled.',
	v_skull:
		'Attacking creatures may die & become skeletons. Smaller creatures are more likely to die.',
	v_skyblitz: 'Dive all own airborne creatures. Consumes remaining 1:9.',
	v_slow: 'Delay attackers.',
	v_solar: 'Gain 1:8 per attacker.',
	v_sosa: c =>
		`Sacrifice ${
			c.upped ? 40 : 48
		}HP. Consume all non 1:2. Invert damage for 2 turns`,
	v_soulcatch: c => `When a creature dies, gain ${c.upped ? 3 : 2}:2`,
	v_sskin: 'Increment maximum HP per 1:4 owned. Heal same.',
	v_steal: 'Steal target permanent.',
	v_steam: 'Gain 5|0.',
	v_stoneform: 'Remove this ability & gain 0|20.',
	v_storm2: "Deals 2 damage to foe's creatures. Removes cloak",
	v_storm3: "Deals 3 damage to foe's creatures. Removes cloak",
	v_swarm: 'Increment hp per scarab.',
	v_thorn: '75% chance to poison attackers.',
	v_upkeep: c => 'Consumes 1:' + c.element,
	v_virusinfect: 'Sacrifice self & poison target creature.',
	v_virusplague: "Sacrifice self & poison foe's creatures",
	v_void: "Reduce foe's maximum HP by 2, 3 if mark is 1:11",
	v_web: 'Target creature loses airborne.',
	v_wisdom: 'Target gains 4|0. May target immaterial, granting psionic.',
};
for (const [k, v] of [
	[
		'dagger',
		'1:2 1:11. Gains 1 strength per Cloak, Nightfall, Eclipse, Ouija Essence, or Ouija Source you control.',
	],
	['hammer', '1:3 1:4.'],
	['bow', '1:8 1:9.'],
	['staff', '1:5 1:7.'],
	['disc', '1:1 1:12.'],
	['axe', '1:6 1:10.'],
	['v_dagger', '1:2 1:11.'],
	['v_hammer', '1:3 1:4.'],
	['v_bow', '1:9.'],
]) {
	data[k] = 'Gains 1 strength if your mark is ' + v;
}
for (const [k, v] of [
	['pillmat', '1:4 1:6 1:7 1:9'],
	['pillspi', '1:2 1:5 1:8 1:11'],
	['pillcar', '1:1 1:3 1:10 1:12'],
]) {
	data[k] = {
		ownattack: `Randomly gain 1-2 ${v} each turn. \u2154 chance to gain 2.`,
		ownplay: `Randomly gain 1-2 ${v} when played. \u2154 chance to gain 2.`,
	};
}
function auraText(tgts, bufftext, upbufftext) {
	return c =>
		`${tgts} gain ${c.upped ? upbufftext : bufftext} while ${
			c.name
		} is in play. Does not stack.`;
}
const statusText = {
	cloak:
		'Cloaks your field. Opponent cannot see your actions or directly target your other cards.',
	charges: (c, inst) =>
		c !== inst ||
		c.hasactive('ownattack', 'losecharge') ||
		c.getStatus('charges') === 1
			? ''
			: `Enters play with ${c.getStatus('charges')} ${
					c.getStatus('stackable') ? 'stacks' : 'charges.'
			  }`,
	mode: '',
	nightfall: auraText('Nocturnal creatures', '1|1', '2|1'),
	nothrottle:
		'While this is equipped, any of your creatures whose active skills have Throttled lose Throttled.',
	poison: (c, inst) =>
		c === inst
			? `Enters play with ${c.getStatus('poison')} poison counters.`
			: inst.getStatus('poison') + ' poison',
	stackable: '',
	tunnel: 'Any of your creatures that are burrowed bypass shields.',
	voodoo:
		'Whenever this creature takes non-lethal damage or is affected by any status, that status or damage is also applied to opponent.',
	whetstone: auraText('Weapons & golems', '1|1', '1|2'),
	flooding:
		'Non aquatic creatures past first five (seven on first effective turn) creature slots die on turn end. Consumes 1:7.',
	patience:
		'Each turn delay own creatures. They gain 2|2. 5|5 if flooded. Unique.',
};
function processEntry(c, event, entry) {
	return typeof entry === 'string'
		? entry
		: entry instanceof Array
		? entry[asCard(c).upped ? 1 : 0]
		: entry instanceof Function
		? entry(asCard(c), c)
		: event in entry
		? processEntry(c, event, entry[event])
		: '';
}
function asCard(c) {
	return c instanceof Card ? c : c.card;
}
function pushEntry(list, c, event, entry) {
	const x = processEntry(c, event, entry);
	if (x) list.push(x);
}
const cache = new Map();
function getDataFromName(name) {
	const dataName = data[name];
	if (dataName) return dataName;
	if (cache.has(name)) return cache.get(name);
	const [base, ...args] = name.split(' '),
		baseData = data[base],
		value = baseData && baseData(...args);
	cache.set(name, value);
	return value;
}
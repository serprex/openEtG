import * as etg from './etg.js';
import Card from './Card.js';
import Thing from './Thing.js';
import originalSkillText from './vanilla/skillText.js';

export default function skillText(c) {
	if (asCard(c).Cards.Names.Relic) return originalSkillText(c);
	if (c instanceof Card && c.type === etg.Spell) {
		const entry = getDataFromName(c.active.get('cast').castName);
		return processEntry(c, 'cast', entry);
	} else {
		const ret = [],
			stext = [];
		for (const [key, val] of c.status) {
			if (!val) continue;
			const entry = statusData[key];
			if (entry === undefined) {
				let text = val === 1 ? key : val + key;
				text = text.charAt(0).toUpperCase() + text.slice(1);
				stext.push(text);
			} else pushEntry(ret, c, '', entry);
		}
		if (stext.length) ret.unshift(stext.join(', ') + '.');
		for (const [k, v] of c.active) {
			v.name.forEach(name => {
				const entry = getDataFromName(name);
				if (entry === undefined) return;
				pushEntry(ret, c, k, entry);
				if (k === 'cast')
					ret[ret.length - 1] = `${c.cast}:${c.castele} ${ret[ret.length - 1]}`;
			});
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
		'Destroy target permanent and gain 0|10. If using this ability leaves this creature at more than 30 HP, destroy this creature and add a black hole to your hand.',
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
		'Sacrifice target creature you own and gain 1|1. If this ability is not used, this creature will attack its owner. This creature attacks normally the turn it is played or if it loses this ability.',
	atk2hp: "Set target's HP equal to its strength.",
	autoburrow:
		'Until end of turn, your creatures with burrow enter play burrowed.',
	axedraw:
		'Gains 1 strength for every card drawn by any player. Strength gained is removed after attack.',
	bblood: 'Give target creature 0|20 and delay it for 5 turns.',
	becomearctic: 'If frozen, this creature instead turns into an Arctic Squid.',
	beguile:
		"Target creature's opponent gains control of target creature until next turn.",
	beguilestop:
		'Return this creature to its original owner at beginning of next turn.',
	bellweb: 'Target creature becomes aquatic and loses airborne status.',
	blackhole:
		'Remove 3 quanta per element from target player. Heal 1 per quanta removed.',
	bless: 'Target gains 3|3.',
	blockwithcharge:
		'Each stack fully blocks one attacker and is then destroyed.',
	bolsterintodeck:
		'Add 3 copies of target creature on top of your deck. Cannot ricochet.',
	boneyard: c =>
		`Whenever a creature which is not a Skeleton dies, summon a ${
			c.upped ? '2|2' : '1|1'
		} Skeleton.`,
	bounce:
		"When this creature dies, it returns to its owner's hand. Modified stats and statuses remain on the card when it is played again.",
	bravery:
		'Opponent draws up to two cards. Draw cards equal to what opponent drew.',
	brawl:
		'Your creatures attack. If a creature exists in opposing creature slot, the two creatures deal their damage to one another instead of opponent. Consumes all remaining 1:3.',
	brew:
		"Add a random Alchemy card to your hand. Possible cards include: Antimatter, Black Hole, Adrenaline, Nymph's Tears, Unstable Gas, Liquid Shadow, Aflatoxin, Basilisk Blood, Rage Potion, Luciferin, Precognition, Quintessence.",
	brokenmirror: [
		'When opponent plays a creature from their hand, summon a 1|1 Phantom.',
		'When opponent plays a creature from their hand, summon a 2|1 Phantom.',
	],
	bubbleclear:
		"Remove statuses (positive and negative) from target creature, reduce target creature's delay by 1, and heal target creature 1.\nTarget gains a bubble. Bubbles nullify the next spell, ability, or spell damage used by opponent that targets or damages the affected card.",
	butterfly:
		'Target creature or weapon with either strength or HP less than 3 has its skills replaced with "3:1 Destroy target permanent."',
	burrow: c =>
		c.getStatus('burrowed')
			? "Burrow this creature. Burrowed creatures' strength is halved while burrowed."
			: 'Unburrow.',
	catapult:
		"Sacrifice target creature you control to damage opponent for 100 * Creature's HP / (100 + Creature's HP). Frozen creautres deal 1.5x more. Poisoned creatures transfer their poison to opponent.",
	catlife:
		'Enters play with 9 lives. When it dies, this creature loses a life and revives with full HP.',
	cell: 'Becomes a Malignant Cell if poisoned.',
	chaos: c =>
		(c.upped ? '20% chance to evade attacks. ' : '') +
		'Non-ranged attacking creatures have a 30% chance to have a random effect cast on them.',
	chimera:
		"Combine all your creatures to form a Chimera with momentum, gravity pull, and the total of your creatures' combined strength and HP.",
	chromastat:
		"Generate 1:0 for this creature's total strength & HP when this creature deals damage.",
	clear:
		"Remove statuses (positive and negative) from target creature, reduce target creature's delay by 1, and heal target creature 1.",
	cold: '30% chance to freeze non-ranged attackers for 3 turns.',
	corpseexplosion: [
		'Sacrifice one of your creatures to deal 1 spell damage to all creatures. Increase damage by 1 for every 8 HP of the sacrifice. Poisonous sacrifices poison opponent.',
		'Sacrifice one of your creatures to deal 1 spell damage to all enemy creatures. Increase damage by 1 for every 8 HP of the sacrifice. Poisonous sacrifices poison opponent.',
	],
	counter:
		'When this creature is attacked by another creature, if this creature is able to attack, it deals its damage to the attacking creature.',
	countimmbur: 'Gains 1|0 for every immaterial or burrowed card in play.',
	cpower: 'Target randomly gains between 1 and 5 strength and HP.',
	creatureupkeep:
		"Whenever a creature attacks, its owner must pay one quanta of the creature's element or the creature is destroyed.",
	cseed:
		'Inflict a random effect on target creature. Possible effects include damage, lobotomize, parallel universe, gravity pull, reverse time, and freeze.',
	cseed2:
		'Inflict a random effect on target card. All existing effects are possible.',
	darkness: 'Produces 1:11 when it attacks.',
	deadalive: {
		hit:
			'When this card deals damage, trigger all effects that occur when a creature dies.',
		cast: 'Trigger all effects that occur when a creature dies.',
	},
	deathwish:
		'Whenever opponent casts a spell or ability on an allied creature, if this creature is a valid target, that spell or ability targets this creature instead.',
	deckblast:
		'Deals spell damage to opponent for each card remaining in deck. Discard your deck.',
	deepdive:
		'Burrow. While burrowed, replace this ability with "2:3 Freeze target permanent." Next turn, unburrow, become airborne, and triple this creature\'s strength until its next attack.',
	deja: 'Remove this ability and summon a copy of this creature.',
	deployblobs: 'Summon 3 Blobs. Gain -2|-2.',
	despair:
		'Non-ranged attackers have a 40% chance plus 5% per 1:11 producing creature you control to gain -1|-1.',
	destroy: 'Destroy target permanent.',
	destroycard:
		"Discard target card, or discard the top card of target player's deck.",
	detain:
		'Target creature with less HP than this creature gets -1|-1 and is burrowed. Gain 1|1.',
	devour:
		'Target creature with less HP than this creature dies. Gain 1|1. If target creature was poisonous, become poisoned.',
	die: 'Sacrifice this card.',
	disarm:
		'When this creature damages opponent, return their weapon to their hand. Modified stats and statuses remain on the card when it is played again.',
	discping:
		'Deal 1 damage to target creature and return this card to your hand. Modified stats and statuses remain on the card when it is played again.',
	disfield: 'Block all damage from attackers. Consumes 1:0 per damage blocked.',
	disshield:
		'Block all damage from attackers.. Consume 1:1 per 3 damage blocked. Not prevented by Sanctuary.',
	divinity: 'Add 24 to maximum health and heal yourself 16.',
	dive: "Double this creature's strength through next attack. Does not stack.",
	dmgproduce: 'Generate 1:0 for each damage dealt by this card.',
	draft:
		'If target creature is airborne, it loses airborne and takes 3 spell damage. If target creature is not airborne, it becomes airborne and gains 3|0',
	drainlife:
		'Deal 2 spell damage plus one per 5:11 you have after playing this card. Heal for the amount of damage done.',
	drawcopy:
		'When opponent discards a card, add a copy of that card to your hand.',
	drawequip: 'Both players draw the next weapon or shield in their deck.',
	drawpillar:
		'When this card is played, if the top card of your deck is a pillar, tower, or pendulum, draw it.',
	dryspell:
		'Deal 1 spell damage to all creatures. Gain 1:7 for each damage dealt. Removes cloak.',
	dshield: 'Target creature gains immaterial until next turn.',
	duality: "Add a copy of the top card of opponent's deck to your hand.",
	earthquake:
		'Destroy up to 3 copies of target pillar, pendum, tower, or other stacking permanent.',
	eatspell:
		'Until your next turn, the next spell any player casts is nullified. If this ability nullifies a spell, this creature gains 1|1.',
	elf: 'If this card is targeted by Chaos Seed, it becomes a Fallen Elf.',
	embezzle:
		'Replaces target creature\'s skills with "When this creature damages a player, that player draws a card. When this creature dies, destroy the top three cards of opponent\'s deck."',
	embezzledeath:
		"When this creature dies, destroy the top three cards of opponent's deck.",
	empathy:
		'At the end of your turn, heal 1 for each creature you own. For every 8 creatures you own (rounded down), pay 1:5 at the end of your turn.',
	enchant: 'Target permanent becomes immaterial.',
	endow: 'Gain the strength, skills, and statuses of target weapon. Gain 0|2.',
	envenom:
		'Target weapon gains "Give 1 poison on hit. Throttled (only triggers at most twice from Adrenaline),” or target shield gains "25% chance to give non-ranged attackers 1 poison counter."',
	epidemic:
		"When any creature dies, give opponent poison counters equal to the dead creature's poison counters.",
	epoch:
		"On each player's turn, silence that player after they play two cards.",
	epochreset: {
		cast: 'Reset your count of cards played this turn.',
	},
	evade: x => x + '% chance to evade attacks.',
	evade100: 'Completely block enemy attacks.',
	evadecrea:
		"Cannot be directly targeted by opponent's creature's abilities. Still affected by abilities that affect all creatures.",
	evadespell:
		"Cannot be directly targeted by opponent's spells. Still affected by spells that affect all creatures.",
	evolve: 'Transform this card into an unburrowed Shrieker.',
	feed:
		'Give target creature 1 poison counter, gain 3|3, and lose immaterial status until the beginning of your next turn.',
	fickle:
		"Swap target card in either player's hand with a random card from their deck that they have enough quanta to play.",
	fiery: 'Gains +1 strength for every 5:6 owned.',
	firebolt:
		'Deal 3 spell damage plus one per 4:6 you have after playing this card. If target is frozen, it loses frozen status.',
	firewall: 'Deals 1 damage to each non-ranged attacking creature.',
	flatline: 'Opponent cannot gain quanta through the end of their next turn.',
	flyself:
		'If this card is equipped as a weapon, it casts Flying Weapon on itself. If this card is a creature, it casts Living Weapon on itself.',
	flyingweapon:
		"Target weapon becomes a flying creature. It still counts as a weapon even though it isn't in a weapon slot.",
	foedraw: "Draw from opponent's deck",
	forcedraw: 'When this creature damages a player, that player draws a card.',
	forceplay:
		"The owner of target card in hand plays that card on a random target if they are able, or the owner of target card in play activates that card's ability on a random target if they are able.",
	fractal:
		'Add 6 copies of target creature to your hand. Remove all remaining 1:12. Add an additional copy for every 2:12 removed.',
	freeevade:
		"If your opponent has a shield, your creatures have a 30% chance to bypass the shield. Otherwise, your creatures have a 30% chance to deal 50% more damage. Your creatures have 20% chance to evade opponent's targeted spells and abilities.",
	freeze: [
		'Freeze target creature or weapon for 3 turns. Frozen cards cannot attack or use abilities, and do not activate per-turn abilities.',
		'Freeze target creature or weapon for 4 turns. Frozen cards cannot attack or use abilities, and do not activate per-turn abilities.',
	],
	freezeperm: [
		'Freeze target non-stacking permanent for 3 turns. Frozen cards cannot attack or use abilities, and do not activate per-turn abilities.',
		'Freeze target non-stacking permanent for 4 turns. Frozen cards cannot attack or use abilities, and do not activate per-turn abilities.',
	],
	fungusrebirth: [
		'Transform this card into a Fungus.',
		'Transform this card into a Toxic Fungus.',
	],
	gaincharge2: {
		death: 'Whenever any creature dies, gain two stacks.',
		destroy: 'Whenever any other permanent is destroyed, gain two stacks.',
	},
	gaintimecharge:
		'Up to 4 times per turn, gain one stack for every card you draw. Does not gain a stack from your draw at the start of your turn.',
	gas: 'Summon an Unstable Gas.',
	grave:
		'When another creature dies, unburrow and transform this creature into a fresh copy of the dying creature. This creature retains nocturnal.',
	give: c =>
		`Give target card you own, either in hand or in play, to your opponent. Heal yourself ${
			c.upped ? 10 : 5
		}. This card bypasses sanctuary, and can target immaterial or burrowed cards.`,
	golemhit:
		'Target golem attacks. This ability can target immaterial or burrowed cards.',
	gpull:
		"Creatures attacking this creature's owner instead attack this creature.",
	gpullspell:
		"Creatures attacking target creature's owner instead attack target creature.\nIf target is a player, creatures attack that player when attacking that player.",
	gratitude: 'Heal yourself 4 at the end of your turn.',
	growth: (atk, hp = atk) => {
		const x = `${atk}|${hp}`;
		return {
			death: `When any creature dies, gain ${x}.`,
			ownfreeze: `When this card would be frozen, instead gain ${x}.`,
			cast: `Gain ${x}.`,
			ownattack: `This creature gains ${x} when it attacks.`,
		};
	},
	guard:
		'Delay target creature and this creature. If target creature is not airborne or this creature is airborne, this creature deals damage equal to its strength to target creature.',
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
		'Heal target creature or player 10. If target creature is nocturnal, instead deal 10 spell damage to target creature.\nGain 1:8 when played',
	],
	hope:
		'Blocks one additional damage for each creature you control that produces 1:8 every turn.',
	icebolt:
		'Deal 2 spell damage plus one per 5:7 you have after playing this card. 25% plus 5% per point of damage chance to freeze target.',
	ignite:
		'Deal 20 spell damage to opponent. Deal 1 spell damage to each creature.',
	immolate: c =>
		`Sacrifice a creature you control. Gain ${
			c.upped ? 8 : 6
		}:6 plus 1 quanta of each other element.`,
	improve:
		'Transform a target creature into a random mutant creature. Mutant creatures gain a random ability, 0-4 strength, and 0-4 hp.',
	inertia: 'When any card you own is targeted by either player, gain 2:3.',
	infect: 'Give target creature 1 poison counter.',
	inflation: 'Increase the cost of all active abilities by 1.',
	ink: 'Summon a Cloak that lasts 1 turn.',
	innovation:
		"Discard target card in either player's hand. The owner of target card draws three cards. Destroy the top card of your deck.",
	integrity:
		'Destroy all shards in your hand to play a Shard Golem with stats and abilities based on the shards destroyed.',
	jelly:
		"Target creature becomes a 7|4 Pink Jelly with an active ability that turns additional creatures into Pink Jellies. That ability costs 4 quanta matching target creature's element. 1:0 creatures have an ability cost of 12:0",
	jetstream: 'Target airborne creature gains 3|-1.',
	lightning: 'Deal 5 spell damage to target creature or player.',
	liquid:
		'Give target creature 1 poison counter. Target creature\'s skills are replaced with "Heal yourself equal to the damage dealt by this card."',
	livingweapon:
		"Equip target creature as a weapon. If target creature's owner already had a weapon equipped, return it to their hand. Heal target creature's owner equal to target creature's HP.",
	lobotomize: "Remove target creature's abilities.",
	locket: 'Produces quanta matching your mark each turn.',
	locketshift:
		"Switch this card's production to match the element of any target, including immaterial and burrowed cards.",
	loot:
		'When one of your permanents is destroyed, gain control of a random permanent from opponent.',
	losecharge: (c, inst) => {
		const charges = c.getStatus('charges');
		return charges
			? `Lasts for ${charges} more turn${charges == 1 ? '' : 's'}.`
			: 'Expires at end of turn';
	},
	luciferin:
		'Your creatures without skills gain “Produces 1:8 when it attacks.” Heal yourself 10.',
	lycanthropy: 'Remove this ability and gain 5|5 and become nocturnal.',
	martyr: 'Gains 1|0 for every point of damage this card receives.',
	mend: 'Heal target creature 10.',
	metamorph:
		"Change your mark to target's element. Increase your mark power by 1.",
	midas:
		'Target permanent becomes a Golden Relic with "2:0: Sacrifice this card and draw a card." If target is a weapon, its strength is 1. If target is a shield, its damage reduction is 1.',
	millpillar:
		"If the top card of target player's deck is a pillar, pendulum, or tower, destroy that card.",
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
		'Target creature becomes nocturnal, gains 5|5, and loses abilities.',
	nova:
		'Gain 1 quanta of each element. If you play three or more of this card in one turn, summon a Singularity on your side.',
	nova2:
		'Gain 2 quanta of each element. If you play two or more of this card in one turn, summon a Singularity on your side.',
	nullspell:
		'Until your next turn, the next spell any player casts is nullified. If this ability nullifies a spell, this creature gains 1|1.',
	nymph:
		"Transform target pillar, pendulum, or tower into a Nymph matching target's element.",
	obsession: [
		'When this card is discarded, the discarding player receives 10 spell damage.',
		'When this card is discarded, the discarding player receives 13 spell damage.',
	],
	ouija: "Whenever a creature dies, add an Ouija Essence to opponent's hand.",
	pacify: "Set target creature or weapon's strength to 0.",
	pairproduce: 'Your pillars, pendulums, and towers produce quanta.',
	paleomagnetism: {
		ownattack: [
			"Summon a pillar or pendulum every turn. ⅔ chance it matches your mark, ⅓ chance it matches your opponent's mark.",
			"Summon a tower or pendulum every turn and when this card is played. ⅔ chance it matches your mark, ⅓ chance it matches your opponent's mark.",
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
	phoenix: [
		'When this creature dies, transform it into an Ash.',
		'When this creature dies, transform it into a Minor Ash.',
	],
	photosynthesis: 'Gain 2:5. This ability may be used multiple times per turn.',
	pillar: c => `Gain ${c.element ? 1 : 3}:${c.element} every turn.`,
	pillar1: c => `Gain ${c.element ? 1 : 3}:${c.element} when played`,
	pend: c =>
		`Each turn, switches between producing ${c.element ? 1 : 3}:${
			c.element
		} and one quanta matching your mark.`,
	plague:
		"Give target player's creatures 1 poison counter each. Removes cloak.",
	platearmor: [
		'Target creature gains 0|4, or target player gains 4 maximum HP and heals 4.',
		'Target creature gains 0|6, or target player gains 6 maximum HP and heals 6.',
	],
	poison: x => {
		x = `Give ${x === '1' ? '' : x + ' '}poison `;
		return {
			hit: `${x} counters on hit. Throttled (only triggers at most twice from Adrenaline.)`,
			cast: `${x} counters to opponent.`,
		};
	},
	poisonfoe:
		'When this card enters play, 70% chance to give 1 poison counter to opponent.',
	powerdrain:
		"Remove half of target creature's strength and HP. Add an equal amount of strength and HP to a random creature you control.",
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
		'Gain 2:7 and 2 quanta matching your mark. If your mark is 1:7, instead gain only 3:7 total. If your mark is 1:0, produce an additional 4:0',
	quanta: (x, amt = 1) => ({
		ownattack: `Gain ${amt}:${x} every turn`,
		owndeath: `When this creature dies, gain ${amt}:${x}`,
		ownplay: `Gain ${amt}:${x} when played`,
	}),
	quint:
		'Target creature becomes immaterial. If target creature is frozen, it loses frozen status.',
	quinttog:
		'If target creature is not immaterial, it gains immaterial status, and if it is also frozen, it loses frozen status. If target creature is immaterial, it loses immaterial status. ',
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
	readyequip:
		'All weapons and shields can use their active abilities the same turn they come into play.',
	reap:
		"Target creature dies and is replaced with a Skeleton with target creature's current strength and HP, but no other active abilities or statuses.",
	rebirth: [
		'Transform this card into a Phoenix.',
		'Transform this card into a Minor Phoenix.',
	],
	reducemaxhp:
		"Damage dealt by this card also reduces the defender's maximum HP.",
	regen:
		"Give 1 purify counter to this card's owner on hit. Throttled (only triggers at most twice from Adrenaline.)",
	regenerate: 'Heal yourself 5 every turn or when this card attacks.',
	regeneratespell:
		'Replace target creature or non-stacking permanent\'s abilities with "Heal this card\'s owner 5 every turn or when this card attacks."',
	regrade:
		"If target card is upgraded, it becomes unupgraded. If target card is unupgraded, it becomes upgraded. Gain 1 quanta of target card's element.",
	reinforce:
		"Target creature gains strength and HP equal to this creature's strength and HP. Destroy this creature.",
	ren:
		'Target creature gains: "When this creature would die, it is instead returned to its owner\'s hand. Modified stats and statuses remain on the card when it is played again."',
	rewind:
		"Put target creature on top of its owner's deck. Removes all bonuses and modifiers on target creature.",
	reveal: {
		ownplay: "Reveal opponent's hand when played and on attack.",
	},
	ricochet:
		'Any targeted spells cast by either player are copied when played. The copy has a random caster and a random non-player target.',
	sadism: 'Whenever any creatures are damaged, heal yourself an equal amount.',
	salvage:
		'Whenever a permanent is destroyed, gain 1|1. Once per turn, when opponent destroys a permanent, add a copy of that permanent to your hand.',
	salvageoff: 'Cannot salvage another destroyed permanent until next turn.',
	sanctify:
		"During your opponent's turn, your hand and quanta pool cannot be modified.",
	unsanctify: {
		ownplay:
			"Nullify opponent's sanctuary effect from Sancuary or Dream Catcher.",
	},
	scatterhand:
		'Target player shuffles their hand into their deck and draws an equal number of cards. Cards drawn this way do not trigger effects that occur when a card is drawn. Draw a card.',
	scramble: {
		hit:
			"Randomize up to 9 quanta randomly chosen from opponent's quanta pool on hit.",
		cast:
			"Randomize up to 9 quanta randomly chosen from target player's quanta pool.",
	},
	scramblespam:
		"Randomize up to 9 quanta randomly chosen from target player's quanta pool. This ability may be used multiple times per turn.",
	serendipity: [
		'Add 3 random non-pillar cards to your hand. At least one will be 1:1.',
		'Add 3 random upgraded non-pillar cards to your hand. At least one will be 1:1.',
	],
	shtriga: 'Gain immaterial at the start of your next turn.',
	shuffle3:
		"Shuffle 3 copies of target creature you control, any target opponent controls, or any target in opponent's hand into your deck.",
	silence:
		'Target player cannot play cards until the end of their next turn, or target creature cannot use active abilities until the end of their next turn.',
	sing: 'Target creature without this ability attacks its owner.',
	singularity: 'That was a bad idea.',
	sinkhole: [
		"Burrow target creature. Replace target creature's abilities with 1:4: unburrow.",
		"Burrow target creature. Replace target creature's abilities with 2:4: unburrow",
	],
	siphon:
		"Remove 1:0 randomly from opponent's quanta pool when this creature attacks. Gain 1:11 for each quanta removed. Throttled (only triggers at most twice from Adrenaline.)",
	siphonactive:
		"Remove target creature's skills and gain a copy of those skills. Any active copied with this skill can be used the turn it is gained.",
	siphonstrength: 'Target creature loses 1|0. Gain 1|0.',
	skeleton:
		'If this creature is targeted by Rewind, it becomes a random creature.',
	skull:
		'Attacking creatures may randomly die and are replaced by Skeletons. Creatures with lower HP are more likely to die.',
	skyblitz:
		'Your airborne creatures all dive (double their strength until end of turn.) Consumes all remaining 1:9.',
	slow:
		'Non-ranged attackers are delayed for one turn after their attack. Delayed creatures may not attack or use abilities.',
	snipe: 'Deal 3 damage to target creature.',
	solar: 'Gain 1:8 for each attacker.',
	sosa: [
		'Lose HP equal to 48% of your maximum HP. Consume all non-1:2 quanta. For two turns, damage heals you and healing damages you.',
		'Lose HP equal to 40% of your maximum HP. Consume all non-1:2 quanta. For two turns, damage heals you and healing damages you.',
	],
	soulcatch: 'Whenever a creature dies, gain 3:2.',
	spores: [
		'When this creature dies, summon 2 Spores.',
		'When this creature dies, summon 2 Toxic Spores.',
	],
	sskin:
		'Gain maximum HP and heal an amount equal to the 1:4 in your quanta pool after casting this spell.',
	stasis: "Creatures do not attack at the end of each player's turn.",
	static: 'Deals 2 spell damage to opponent for each attacker.',
	steal: 'You gain control of target permanent.',
	steam:
		'Gain 5|0. This creature loses 1|0 of strength gained in this way after each attack.',
	stoneform: 'Gain 0|20. Become a golem.',
	storm: x =>
		`Deal ${x} spell damage to all of target player\'s creatures. Removes cloak.`,
	summon: x => c =>
		`Summon a ${
			asCard(c).as((c instanceof Card ? c.Cards : c.game.Cards).Names[x]).name
		}.`,
	swarm:
		'Base HP is equal to the number of Scarabs you control, including this one.',
	swave:
		"Deal 4 spell damage to target creature or player. If target creature is frozen, it dies. If target player's weapon is frozen, destroy it.",
	tempering: [
		'Target weapon gains 3 strength. If target weapon is frozen, it loses frozen status.',
		'Target weapon gains 5 strength. If target weapon is frozen, it loses frozen status.',
	],
	tesseractsummon:
		'Summon 2 random creatures from your deck. Opponent summons 1 random creature from their deck. Freeze these creatures for a number of turns equal to ¼ of their quanta cost, rounded up.',
	thorn: '75% chance to give non-ranged attackers 1 poison counter.',
	throwrock: [
		"Deal 3 damage to target creature, then shuffle Throw Rock into its owner's deck.",
		"Deal 4 damage to target creature, then shuffle Throw Rock into its owner's deck.",
	],
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
		"Return target creature to its owner's hand. Remove any modifiers and statuses on target creature. If owner's hand is full, instead return target creature to the top of its owner's deck.",
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
		"Remove target card from target player's hand and add it to your hand, or draw from target player's deck.",
};
[
	['dagger', '1:2 1:11. Gains 1 strength per Cloak you control.'],
	['hammer', '1:3 1:4'],
	['bow', '1:8 1:9'],
	['staff', '1:5 1:7'],
	['disc', '1:1 1:12'],
	['axe', '1:6 1:10'],
].forEach(x => {
	data[x[0]] = 'Gains 1 strength if your mark is ' + x[1];
});
[
	['pillmat', '1:4 1:6 1:7 1:9'],
	['pillspi', '1:2 1:5 1:8 1:11'],
	['pillcar', '1:1 1:3 1:10 1:12'],
].forEach(x => {
	data[x[0]] = {
		ownattack: `Randomly gain 1-2 ${x[1]} each turn. ⅔ chance to gain 2.`,
		ownplay: `Randomly gain 1-2 ${x[1]} when played. ⅔ chance to gain 2.`,
	};
});
function auraText(tgts, bufftext, upbufftext) {
	return c =>
		tgts +
		' gain ' +
		(c.upped ? upbufftext : bufftext) +
		' while ' +
		c.name +
		' is in play. Does not stack.';
}
const statusData = {
	cloak:
		'Cloaks your field. Opponent cannot see your actions or directly target your other cards.',
	charges: (c, inst) =>
		c !== inst ||
		Thing.prototype.hasactive.call(c, 'ownattack', 'losecharge') ||
		c.getStatus('charges') == 1
			? ''
			: `Enters play with ${c.getStatus('charges')} ${
					c.getStatus('stackable') ? 'stacks' : 'charges'
			  }`,
	flooding:
		"Each player's non-aquatic creatures past their first five creature slots die at the end of that player's turn. Consumes 1:7 each turn. Does not stack.",
	nightfall: auraText('Nocturnal creatures', '1|1', '2|1'),
	nothrottle:
		'If any of your creatures have abilities with Throttled, those abilities lose Throttled.',
	patience:
		'Prevent your creatures from attacking at the end of your turn. At the end of your turn, your creatures gain 2|1. If they are burrowed, they instead gain 4|1. If they are affected by Flooding, they instead gain 5|2. Does not stack.',
	poison: (c, inst) =>
		c == inst
			? `Enters play with ${c.getStatus('poison')} poison counters.`
			: inst.getStatus('poison') + ' poison',
	stackable: '',
	tunnel: 'Any of your creatures that are burrowed bypass shields.',
	voodoo:
		'Whenever this creature takes non-lethal damage or is affected by any status, that status or damage is also applied to opponent.',
	whetstone: auraText('Weapons and golems', '1|1', '1|2'),
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
	if (name in data) return data[name];
	if (cache.has(name)) return cache.get(name);
	const [base, ...args] = name.split(' ');
	if (base in data) {
		const r = data[base](...args);
		cache.set(name, r);
		return r;
	}
	cache.set(name, undefined);
	return undefined;
}

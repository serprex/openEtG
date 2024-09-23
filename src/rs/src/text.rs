#![allow(non_snake_case)]

use alloc::{borrow::Cow, string::String, vec::Vec};
use core::fmt::{self, Write};
use core::mem::drop;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::card::{self, Card, Cards};
use crate::game::{CardSet, Flag, Game, Kind, Stat};
use crate::skill::{Event, Skill};

#[derive(Copy, Clone)]
pub enum SkillThing<'a> {
	Thing(&'a Game, i16),
	Card(Cards, &'static Card),
}

struct DecodeQuad(pub u16);
impl fmt::Display for DecodeQuad {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		for i in (0..16).step_by(4) {
			let ele = (self.0 >> i) & 15;
			write!(f, "1:{} ", ele)?;
		}
		Ok(())
	}
}

impl<'a> SkillThing<'a> {
	fn code(&self) -> i16 {
		match *self {
			Self::Thing(game, id) => game.get(id, Stat::card),
			Self::Card(cards, card) => card.code,
		}
	}

	fn card(&self) -> &'static Card {
		match *self {
			Self::Thing(game, id) => game.get_card(game.get(id, Stat::card)),
			Self::Card(cards, card) => card,
		}
	}

	fn upped(&self) -> bool {
		card::Upped(self.code())
	}

	fn cast(&self) -> i16 {
		match *self {
			Self::Thing(game, id) => game.get(id, Stat::cast),
			Self::Card(cards, c) => c.cast as i16,
		}
	}

	fn castele(&self) -> i16 {
		match *self {
			Self::Thing(game, id) => game.get(id, Stat::castele),
			Self::Card(cards, c) => c.castele as i16,
		}
	}

	fn cost(&self) -> i16 {
		match *self {
			Self::Thing(game, id) => game.get(id, Stat::cost),
			Self::Card(cards, c) => c.cost as i16,
		}
	}

	fn costele(&self) -> i16 {
		match *self {
			Self::Thing(game, id) => game.get(id, Stat::costele),
			Self::Card(cards, c) => c.costele as i16,
		}
	}

	fn kind(&self) -> Kind {
		match *self {
			Self::Thing(game, id) => game.get_kind(id),
			Self::Card(cards, c) => c.kind,
		}
	}

	fn get_stat(&self, stat: Stat) -> i16 {
		match *self {
			Self::Thing(game, id) => game.get(id, stat),
			Self::Card(cards, card) => {
				card.status().iter().find(|&(st, _)| *st == stat).map(|&(_, val)| val).unwrap_or(0)
			}
		}
	}

	fn get_flag(&self, flag: u64) -> bool {
		match *self {
			Self::Thing(game, id) => game.get(id, flag),
			Self::Card(cards, c) => (c.flag() & flag) != 0,
		}
	}

	fn cards(&self) -> Cards {
		match *self {
			Self::Thing(game, _) => game.get_cards(),
			Self::Card(cards, _) => cards,
		}
	}

	fn set(&self) -> CardSet {
		self.cards().set
	}

	fn status(&self) -> &[(Stat, i16)] {
		match *self {
			Self::Thing(game, id) => &game.get_thing(id).status.0[..],
			Self::Card(cards, c) => c.status(),
		}
	}

	fn flags(&self) -> Flag {
		match *self {
			Self::Thing(game, id) => game.get_thing(id).flag,
			Self::Card(cards, c) => Flag(c.flag()),
		}
	}

	fn skills<'b, F>(&self, mut f: F)
	where
		'a: 'b,
		F: FnMut(Event, &'b [Skill]),
	{
		match *self {
			Self::Thing(game, id) => {
				for (ev, sk) in game.iter_skills(id) {
					f(ev, sk)
				}
			}
			Self::Card(_, c) => {
				for &(ev, sk) in c.skill().iter() {
					f(ev, sk)
				}
			}
		}
	}

	fn sktext(&self, ev: Event, sk: Skill) -> Option<Cow<'static, str>> {
		Some(match sk {
			Skill::abomination => Cow::from("If targeted with mutation, this will always become an improved mutant"),
			Skill::absorber => Cow::from("Generates 3:6 for each attacker"),
			Skill::acceleration => Cow::from(if self.upped() {
				"Replaces target creature's skills with \"Gains +3|-1 when it attacks"
			} else {
				"Replaces target creature's skills with \"Gains +2|-1 when it attacks"
			}),
			Skill::accretion => Cow::from(if self.set() == CardSet::Open {
				"Destroy target permanent & gain 0|15. If using this ability leaves this creature at more than 45HP, transform into a black hole in your hand"
			} else {
				"Destroy target permanent & gain 0|15. If using this ability leaves this creature at more than 45HP, destroy this creature & add a black hole to your hand"
			}),
			Skill::accumulation => Cow::from("Playing additional repulsors adds to damage reduction"),
			Skill::adrenaline => Cow::from("Target creature attacks multiple times per turn. Creatures with lower strength attack more times per turn"),
			Skill::aflatoxin => Cow::from("Give target 2 poison. When the target dies, it becomes a Malignant Cell"),
			Skill::aggroskele => {
				let mut s = String::from("Summon a ");
				s.push_str(if self.upped() { "2|2" } else { "1|1" });
				s.push_str(" Skeleton. All of your skeletons deal damage equal to their strength to target creature");
				Cow::from(s)
			}
			Skill::alphawolf => Cow::from("Summon two 2|1 Pack Wolves when this enters play"),
			Skill::antimatter =>
				Cow::from("If target creature or weapon's attack is positive, it becomes negative. Otherwise, it becomes positive"),
			Skill::appease =>
				Cow::from("Sacrifice target creature you own & gain 1|1. If this ability isn't used, this creature will attack its owner. This creature attacks normally the turn it's played or if it loses this ability"),
			Skill::attack => Cow::from("Whenever a permanent is destroyed, decrease strength by 1 for rest of turn & attack"),
			Skill::autoburrow =>
				Cow::from("Until end of turn, your creatures with burrow enter play burrowed"),
			Skill::axedraw =>
				Cow::from("Gains 1 strength for every card drawn by any player. Strength gained is removed after attack"),
			Skill::bblood => Cow::from("Give target creature 0|20 & delay it for 5 turns"),
			Skill::becomearctic => Cow::from("If frozen, this creature instead turns into an Arctic Squid"),
			Skill::beguile =>
				Cow::from("Target creature's opponent gains control of target creature until next turn"),
			Skill::beguilestop =>
				Cow::from("Return this creature to its original owner at start of next turn"),
			Skill::bellweb => Cow::from("Target creature becomes aquatic & loses airborne status"),
			Skill::blackhole =>
				Cow::from("Remove 3 quanta per element from target player. Heal 1 per quanta removed"),
			Skill::bless => Cow::from("Target gains 3|3"),
			Skill::blockhp => Cow::from("Gain maxhp equal to amount of damage blocked"),
			Skill::blockwithcharge => {
				let mut s = String::from("Each stack fully blocks one attacker");
				if self.set() == CardSet::Open {
					s.push_str(" & is then destroyed");
				}
				Cow::from(s)
			}
			Skill::bloodmoon => Cow::from("Aquatic creatures gain \"Gain 1:8 when it attacks.\"\nGolems gain \"Damage dealt by this card also reduces the defender's maxHP.\"\nNocturnal creatures gain \"Heal yourself equal to the damage dealt by this card.\""),
			Skill::bolsterintodeck => Cow::from("Add 3 copies of target creature on top of your deck"),
			Skill::bonesharpen => Cow::from("Replace your own target creature's skills with \"0: Combine with target creature, giving strength, HP, & poison counters\"\nIf target is skeleton, reactivated"),
			Skill::boneyard => {
				Cow::from(format!("Whenever a creature which isn't a Skeleton dies, summon a {} Skeleton", if self.upped() { "2|2" } else { "1|1" }))
			}
			Skill::bounce => Cow::from("When dying instead return to owner's hand. Modified state besides this effect remains when played again"),
			Skill::bravery => {
				let mut s = String::from("Opponent draws up to two");
				if self.set() == CardSet::Original {
					s.push_str(", three if your mark is 1:6,");
				}
				s.push_str(" cards. Draw cards equal to what opponent drew");
				Cow::from(s)
			}
			Skill::brawl => Cow::from("Your creatures attack. If a creature exists in opposing creature slot, the two creatures deal their damage to one another instead of opponent. Consumes all 1:3"),
			Skill::brew => Cow::from("Add a random Alchemy card to your hand. Possible cards are Antimatter, Black Hole, Adrenaline, Nymph's Tears, Unstable Gas, Liquid Shadow, Aflatoxin, Basilisk Blood, Rage Potion, Luciferin, Precognition, Quintessence"),
			Skill::brokenmirror => {
				let mut s = String::from("When opponent plays a creature from their hand, summon a ");
				s.push(if self.upped() { '2' } else { '1' });
				s.push_str("|1 Phantom");
				Cow::from(s)
			}
			Skill::bubbleclear => Cow::from("Remove all statuses from target creature or permanent. If target is a creature, heal it by 1HP.\nTarget gains Bubble, protecting it the next time it's targeted by opponent, or receives spell damage"),
			Skill::buffdr => Cow::from("Increase attack by shield's damage reduction"),
			Skill::bugpoison => Cow::from("Poison opponent when another bug enters play"),
			Skill::burrow => Cow::from(if self.get_flag(Flag::burrowed) {
				"Unburrow"
			} else {
				"Burrow. Strength is halved while burrowed"
			}),
			Skill::butterfly => Cow::from(if self.set() == CardSet::Open {
				"Target creature or weapon with strength or HP less than 3 has its skills replaced with \"3:1 Destroy target permanent.\""
			} else {
				"Target creature with less attack than 3 has its skills replaced with \"3:1 Destroy target permanent\""
			}),
			Skill::catapult => Cow::from("Sacrifice your own creature. Damage opponent based on target creature's HP†. Frozen creatures deal 50% more damage. Poisoned creatures transfer poisons to opponent.\n\n† (100 * HP) / (100 + HP), rounding up"),
			Skill::catlife => {
				let card = self.card();
				Cow::from(format!("Has {} lives. When it dies, this creature loses a life & revives with {}|{} stats",
					   self.get_stat(Stat::lives), card.attack, card.health))
			}
			Skill::cell => Cow::from("Becomes a Malignant Cell if poisoned"),
			Skill::chaos => Cow::from("Non-ranged attacking creatures have a 30% chance to have a random effect cast on them"),
			Skill::chimera =>
				Cow::from("Combine all your creatures to form a Chimera with momentum, gravity pull, & the total of your creatures' combined strength & HP"),
			Skill::chromastat =>
				Cow::from("Generate 1:0 for this creature's total strength & HP when this creature deals damage"),
			Skill::clear =>
				Cow::from("Remove statuses (positive & negative) from target creature or permanent, & heal target creature 1"),
			Skill::cold => Cow::from("\u{2153} chance to freeze non-ranged attackers for 3 turns"),
			Skill::coldsnap => Cow::from("Shuffle target card into owner's deck. Expend charges to shuffle that many more copies"),
			Skill::corpseexplosion => Cow::from(if self.upped() {
				"Sacrifice one of your creatures to deal 1 spell damage to all enemy creatures. Increase damage by 1 for every 5HP of the sacrifice. Poisonous sacrifices poison. Poisoned sacrifices poison. Also affect opponent"
			} else {
				"Sacrifice one of your creatures to deal 1 spell damage to all other creatures. Increase damage by 1 for every 5HP of the sacrifice. Poisonous sacrifices poison. Poisoned sacrifices poison. Also affect opponent"
			}),
			Skill::counter =>
				Cow::from("When this creature is attacked by another creature, if this creature is able to attack, it deals its damage to the attacking creature"),
			Skill::countimmbur => Cow::from("Gains 1|0 for every immaterial or burrowed card in play"),
			Skill::cpower => Cow::from("Target gains 1-5 strength & 1-5HP"),
			Skill::creatureupkeep =>
				Cow::from("Whenever a creature attacks, its owner must pay one quanta of the creature's element or the creature is destroyed"),
			Skill::cseed =>
				Cow::from("Inflict a random effect on target creature. Possible effects include damage, lobotomize, parallel universe, gravity pull, rewind, & freeze 6"),
			Skill::cseed2 =>
				Cow::from("Inflict a random effect on target card. All existing effects are possible"),
			Skill::databloat => Cow::from("On hit, increase target player's hand's non-pillar card's costs by one"),
			Skill::datashrink => Cow::from("Decrease target non-pillar card's cost by two. Cannot reduce below 0"),
			Skill::deadalive if ev == Event::Hit => Cow::from("When this card deals damage, trigger all effects that occur when a creature dies"),
			Skill::deadalive if ev == Event::Cast => Cow::from("Trigger all effects that occur when a creature dies"),
			Skill::deathwish => Cow::from("Whenever opponent casts a spell or ability on an allied creature, if this creature is a valid target, that spell or ability targets this creature instead"),
			Skill::deckblast =>
				Cow::from("Deals spell damage to opponent for each card remaining in deck.\nIf this spell costs 1:10, destroy all cards in your deck"),
			Skill::deckblock => Cow::from("Search from top of deck for a pillar when being attacked. If pillar found, block attack & destroy pillar"),
			Skill::deepdive =>
				Cow::from("Burrow. While burrowed, replace this ability with \"2:3 Freeze target permanent.\" Next turn, unburrow, become airborne, & triple this creature's strength until its next attack"),
			Skill::deja => Cow::from("Remove this ability & summon a copy of this creature"),
			Skill::deployblobs => Cow::from("Summon 3 Blobs. Gain -2|-2"),
			Skill::despair =>
				Cow::from("Non-ranged attackers have a 50% chance plus 1% per nocturnal creature you control to gain -1|-1"),
			Skill::destroy => Cow::from("Destroy target permanent"),
			Skill::destroycard =>
				Cow::from("Discard target card, or destroy top card of target player's deck"),
			Skill::detain =>
				Cow::from("Target creature with less HP than this creature gets -1|-1 & is burrowed. Gain 2|2"),
			Skill::devour =>
				Cow::from("Target creature with less HP than this creature dies. Gain 1|1. If target creature was poisonous, become poisoned"),
			Skill::die => Cow::from("Sacrifice this card"),
			Skill::disarm =>
				Cow::from("When this creature damages opponent, return their weapon to their hand. Modified stats & statuses remain on the card when it's played again"),
			Skill::discping =>
				Cow::from("Attack target creature & return this card to your hand. Modified stats & statuses remain on the card when it's played again"),
			Skill::disfield => Cow::from("Block all damage from attackers. Consumes 1:0 per damage blocked"),
			Skill::dispersion => Cow::from("Target a spell with targeting in your hand, cast spell on all available targets in random order. Each cast costs cost of target card"),
			Skill::disshield =>
				Cow::from("Block all damage from attackers. Consume 1:1 per 3 damage blocked"),
			Skill::divinity => Cow::from("Add 24 to maxHP & heal yourself 16"),
			Skill::dive =>
				Cow::from(if self.set() == CardSet::Open {
					"Double this creature's strength for next attack. Does not stack"
				} else {
					"Double this creature's strength for next attack"
				}),
			Skill::dmgproduce => Cow::from("Generate 1:0 for each damage dealt by this card"),
			Skill::doctor => Cow::from("Remove target's poison. When destroyed, give opponent that poison"),
			Skill::draft => Cow::from("If target creature is airborne, it loses airborne & takes 3 spell damage. If target creature isn't airborne, it becomes airborne & gains 3|0"),
			Skill::drainlife =>
				Cow::from("Deal 2 spell damage plus one per 5:11 you have after playing this card. Heal for the amount of damage done"),
			Skill::drawcopy =>
				Cow::from("When opponent discards a card, add a copy of that card to your hand"),
			Skill::drawequip => Cow::from("Both players draw the next weapon or shield in their deck"),
			Skill::drawpillar =>
				Cow::from("When this card is played, if top card of your deck is a pillar, tower, or pendulum, draw it"),
			Skill::dryspell =>
				Cow::from("Deal 1 spell damage to all creatures. Gain 1:7 for each damage dealt. Removes cloak"),
			Skill::dshield => Cow::from("Target creature gains immaterial until next turn"),
			Skill::duality => Cow::from("Add a copy of top card of opponent's deck to your hand"),
			Skill::earthquake(x) =>
				Cow::from(if self.set() == CardSet::Open {
					format!("Destroy up to {x} copies of target stacking permanent")
				} else {
					format!("Destroy up to {x} copies of target pillars")
				}),
			Skill::eatspell =>
				Cow::from("Until your next turn, the next spell any player casts is nullified. If this ability nullifies a spell, this creature gains 1|1"),
			Skill::elf => Cow::from("If this card is targeted by Chaos Seed, it becomes a Fallen Elf"),
			Skill::embezzle =>
				Cow::from("Replaces target creature's skills with \"When this creature damages a player, that player draws a card. When this creature dies, destroy top card of opponent's deck"),
			Skill::embezzledeath =>
				Cow::from("When this creature dies, destroy top card of opponent's deck"),
			Skill::empathy =>
				Cow::from(if self.set() == CardSet::Open {
					"At the end of your turn, heal 1 for each creature you own. For every 8 creatures you own (rounded down), pay 1:0 at the end of your turn"
				} else {
					"At the end of your turn, heal 1 for each creature you own"
				}),
			Skill::enchant => Cow::from("Target permanent becomes immaterial"),
			Skill::endow =>
				Cow::from("Gain the strength, skills, & statuses of target weapon. Gain 0|2.\nCannot gain Endow skill"),
			Skill::envenom =>
				Cow::from("Target equipment gains \"Give 1 poison on hit. Throttled (only triggers twice from Adrenaline)\" & \"25% chance to poison non-ranged attackers.\""),
			Skill::epidemic =>
				Cow::from("When any creature dies, poison opponent equal to dying creature's poison"),
			Skill::epoch =>
				Cow::from("On each player's turn, silence that player after they play two cards"),
			Skill::equalize =>
				Cow::from("Set target creature's maxHP equal to its strength. Set its HP to its maxHP.\nOr change target card's elemental cost to 1:0"),
			Skill::evade(x) => Cow::from(format!("{x}% chance to evade attacks")),
			Skill::evade100 => Cow::from("Completely block enemy attacks"),
			Skill::evadecrea =>
				Cow::from("Cannot be directly targeted by opponent's creature's active skills"),
			Skill::evadespell => Cow::from("Cannot be directly targeted by opponent's spells"),
			Skill::evolve => Cow::from(
				if self.upped() {
					"Transform this card into an unburrowed 10|4 Shrieker"
				} else {
					"Transform this card into an unburrowed 8|3 Shrieker"
				}),
			Skill::feed => Cow::from("Poison other target creature, gain 3|3, & lose immaterial"),
			Skill::fickle =>
				Cow::from("Swap target card in either player's hand with a random card from their deck that they have enough quanta to play"),
			Skill::fiery => Cow::from("Gains 1 strength for every 5:6 in your quanta pool"),
			Skill::firebolt =>
				Cow::from("Deal 3 spell damage plus one per 4:6 you have after playing this card. If target is frozen, it loses frozen status"),
			Skill::firebrand => Cow::from("Last an additional turn when targeted with Tempering"),
			Skill::firestorm(x) => Cow::from(format!("Deal {} spell damage to all of target player's creatures. Remove frozen status from damaged creatures. Removes cloak", x)),
			Skill::firewall => Cow::from("Deals 1 damage to each non-ranged attacking creature"),
			Skill::fish => Cow::from("Draw aquatic card from target player's deck. Draw random token if not able to draw an aquatic card"),
			Skill::flooddeath =>
				Cow::from("Each player's non-aquatic creatures past their first five creature slots die at the end of that player's turn"),
			Skill::flyself =>
				Cow::from("If this card is equipped as a weapon, it casts Flying Weapon on itself. If this card is a creature, it casts Living Weapon on itself"),
			Skill::flyingweapon =>
				Cow::from("Target weapon becomes a flying creature. It still counts as a weapon even though it'sn't in a weapon slot"),
			Skill::foedraw => Cow::from("Draw from opponent's deck"),
			Skill::forcedraw => Cow::from("When this creature damages a player, that player draws a card"),
			Skill::forceplay =>
				Cow::from("The owner of target card in hand plays that card on a random target if they are able, or the owner of target card in play without this ability activates that card's ability on a random target if they are able"),
			Skill::frail => Cow::from("Target creature's hp/maxhp becomes 1 without receiving damage, or target permanent with more than 1 charge/stack has one charge/stack removed"),
			Skill::frail2 => Cow::from("Target creature's hp/maxhp becomes 1 without receiving damage, or target permanent with more than 1 charge/stack is reduced to 1 charge/stack"),
			Skill::fractal =>
				Cow::from("Fill your hand with copies of target creature. Consumes all 1:12. If this spell costs 1:0, consumes all quanta"),
			Skill::freeevade =>
				Cow::from("If your opponent has a shield, your airborne creatures have a 25% chance to bypass the shield. Otherwise, your creatures have a 25% chance to deal 50% more damage. Your creatures have 20% chance to evade opponent's targeted spells & skills"),
			Skill::freeze(x) =>
				Cow::from(format!("Freeze target creature or weapon for {} turns. Frozen cards cannot attack, use active skills, or activate per-turn skills", x)),
			Skill::freezeperm => Cow::from(
				format!("Freeze target non-stacking permanent for {} turns. Frozen cards cannot attack or use active skills & do not activate per-turn skills", if self.upped() { '4' } else { '3' }),
			),
			Skill::fungusrebirth => Cow::from(if self.upped() {
				"Transform this card into a Toxic Fungus"
			} else {
				"Transform this card into a Fungus"
			}),
			Skill::gaincharge2 if ev == Event::Death => Cow::from("Whenever any creature dies, gain two stacks"),
			Skill::gaincharge2 if ev == Event::Destroy => Cow::from("Whenever any other permanent is destroyed, gain two stacks"),
			Skill::gaintimecharge =>
				Cow::from("Gain one stack for every card you draw. Does not gain a stack from your draw at the start of your turn"),
			Skill::gas => Cow::from("Summon an Unstable Gas"),
			Skill::grab2h => Cow::from("Destroy your shield"),
			Skill::grave =>
				Cow::from("When another creature dies, unburrow & transform this creature into a fresh copy of the dying creature. This creature retains nocturnal"),
			Skill::give =>
				Cow::from(format!("Give target card you own, either in hand or in play, to your opponent. Heal yourself {}. This card bypasses sanctuary, & can target immaterial or burrowed cards", if self.upped() { "10" } else { "5" })),
			Skill::golemhit =>
				Cow::from("Target golem attacks. This ability can target immaterial or burrowed cards"),
			Skill::gpull => Cow::from("Redirect attacks to this creature's owner to self"),
			Skill::gpullspell => Cow::from("Redirect attacks to target's owner to target"),
			Skill::growth(atk, hp) if ev == Event::Death => Cow::from(format!("When any creature dies, gain {atk}|{hp}")),
			Skill::growth(atk, hp) if ev == Event::Cast => Cow::from(format!("Gain {atk}|{hp}")),
			Skill::growth(atk, hp) if ev == Event::OwnAttack => Cow::from(format!("This creature gains {}|{} when it attacks", atk, hp)),
			Skill::icegrowth => Cow::from(format!("When this card would be frozen, instead gain attack for how much it would be frozen")),
			Skill::guard =>
				Cow::from("Delay target creature & this creature. If target creature isn't airborne or this creature is airborne, this creature deals damage equal to its strength to target creature"),
			Skill::halveatk => Cow::from("This creature's strength is halved after it attacks"),
			Skill::halvedr => Cow::from("Halve damage reduction at start of your turn, rounding up"),
			Skill::hasten if ev == Event::Cast => Cow::from("Draw a card"),
			Skill::hasten if ev == Event::OwnDiscard => Cow::from("When discarded, you draw a card"),
			Skill::hatch =>
				Cow::from("Transform this creature into a random creature. Caster reactivated"),
			Skill::haunt => Cow::from("When target creature dies, summon a full health Skeleton with the same stats"),
			Skill::haunted(own) => Cow::from(format!("When this dies, summon a full health Skeleton with the same stats for player {}", own)),
			Skill::heal => Cow::from("Target creature or player heals 20HP"),
			Skill::healblocked => Cow::from("When this creature attacks, if any damage is blocked by opponent's shield, heal yourself for the amount this creature's damage was blocked"),
			Skill::heatmirror => Cow::from(if self.upped() {
				"When your opponent plays a creature from their hand, summon a Ball Lightning"
			} else {
				"When your opponent plays a creature from their hand, summon a Spark"
			}),
			Skill::heatstroke if ev == Event::Hit => Cow::from("Opponent summons mirage on hit"),
			Skill::heatstroke => Cow::from("Opponent summons mirage"),
			Skill::hero => Cow::from("Increase your shield's damage reduction by 1, delaying this card. Increases are correlated; Bo Staff or the shield changing will nullify increased damage reduction. Remove bonus damage reduction by stored when this attacks or is destroyed, resetting stored value"),
			Skill::hitownertwice => Cow::from("When this creature attacks, it also attacks its owner twice"),
			Skill::holylight => Cow::from(if self.upped() {
				"Remove all statuses from target creature or permanent. Heal target creature or player 10. If target creature is nocturnal, instead deal 10 spell damage to target creature.\nGain 1:8 when played"
			} else {
				"Remove all statuses from target creature or permanent. Heal target creature or player 10. If target creature is nocturnal, instead deal 10 spell damage to target creature"
			}),
			Skill::hope => Cow::from("Blocks one additional damage for each creature you control that gain 1:8 when attacking"),
			Skill::hush => Cow::from("Silence non-ranged attackers"),
			Skill::icebolt =>
				Cow::from("Deal 2 spell damage plus one per 5:7 you have after playing this card. 25% plus 5% per point of damage chance to freeze target"),
			Skill::ignite =>
				Cow::from("Deal 20 spell damage to opponent. Deal 1 spell damage to each creature"),
			Skill::ignitediscard => Cow::from("When discarded, deal 5 spell damage to opponent"),
			Skill::imbue => Cow::from("Discard target equipment card, combining its skills & statuses on corresponding equipped equipment. Return that equipment to hand. Imbued equipment cannot be `additive`"),
			Skill::immolate(x) =>
				Cow::from(format!("Sacrifice creature you control. Gain {}:6 plus 1 quanta of each other element", x+1)),
			Skill::improve =>
				Cow::from("Transform a target creature into a random mutant creature. Mutant creatures gain a random ability; & randomly gains between 1 to 5 strength & hp"),
			Skill::inertia => Cow::from("When any card you own is targeted by either player, gain 2:3"),
			Skill::inflation => Cow::from("Increase the cost of all active skills by 1, caster reactivated"),
			Skill::ink => Cow::from("Summon a Cloak that lasts 1 turn"),
			Skill::innovate(x) =>
				Cow::from(format!("Discard target card in either player's hand. The owner of target card draws {} cards. Destroy top card of your deck", x)),
			Skill::integrity =>
				Cow::from("Destroy all shards in your hand to play a Shard Golem with stats & skills based on the shards destroyed"),
			Skill::jelly =>
				Cow::from("Target creature becomes a 7|2 Pink Jelly with an active ability that turns additional creatures into Pink Jellies. That ability costs 4 quanta matching target creature's element. 1:0 creatures have an ability cost of 12:0"),
			Skill::jetstream =>
				Cow::from("Target airborne creature gains 3|-1. Target non-airborne creature gains airborne"),
			Skill::lightning => Cow::from("Deal 5 spell damage to target creature or player"),
			Skill::liquid =>
				Cow::from("Poison target creature. Target creature's skills are replaced with \"Heal yourself equal to the damage dealt by this card.\""),
			Skill::livingweapon => Cow::from(if self.upped() {
				"Target creature is equipped as target owner's weapon. If card already exists in weapon slot, return it to owners hand as base card. Heal yourself equal to target creature's HP. Gain quanta equivalent to target creature's cost"
			} else {
				"Target creature is equipped as target owner's weapon. If card already exists in weapon slot, return it to owners hand as base card. Heal yourself equal to target creature's HP"
			}),
			Skill::lobotomize => Cow::from("Remove target creature's skills. Also remove psionism"),
			Skill::locket =>
				Cow::from("Gains 1:0 each turn, until set to gain quanta of a specific element"),
			Skill::locketshift =>
				Cow::from("Switch production to match element of any non-player non-1:0 target you own, including immaterial & burrowed cards"),
				Skill::lodestone(..) if ev == Event::Buff => Cow::from(if self.upped() {
					"Weapons & golems gain 1|2 while Whetstone is in play, while shields gain 1 damage reduction. Does not stack"
				} else {
					"Weapons & golems gain 1|1 while Whetstone is in play, while shields gain 1 damage reduction. Does not stack"
				}),
			Skill::losecharge => {
				let charges = self.get_stat(Stat::charges);
				if charges == 0 {
					Cow::from("Expires at end of turn")
				} else {
					Cow::from(format!("Lasts for {charges} more turn{}", if charges == 1 { "s" } else { "" }))
				}
			},
			Skill::luciferin =>
				Cow::from("Your creatures without skills gain \"Gain 1:8 when it attacks.\"\nHeal yourself 10.\nRemoves cloak"),
			Skill::lycanthropy => Cow::from(if self.set() == CardSet::Open {
				"Remove this ability, gain 5|5, & become nocturnal"
			} else {
				"Remove this ability & gain 5|5"
			}),
			Skill::martyr =>
				Cow::from("Gains 1|0 for every point of damage this card receives. Heals its owner when healed"),
			Skill::maul => Cow::from("While shield equipped prevent attacking during attack phase, & block card in opposing slot"),
			Skill::mend => Cow::from(if self.set() == CardSet::Open {
				"Heal target creature 10HP"
			} else {
				"Heal target creature 5HP"
			}),
			Skill::metamorph =>
				Cow::from("Change your mark to target's element.\nIncrease your mark power by 1"),
			Skill::midas =>
				Cow::from("Target permanent becomes a Golden Relic with \"2:0: Sacrifice this card & draw a card.\" If target is a weapon, its strength is 1. If target is a shield, its damage reduction is 1"),
			Skill::mill => Cow::from(match ev {
				Event::Hit => "Destroy top card of player's deck on hit. Throttled (only triggers twice from Adrenaline)",
				_ => "Destroy top card of target player's deck",
			}),
			Skill::millpillar =>
				Cow::from("If top card of target player's deck is a pillar, pendulum, or tower, destroy that card"),
			Skill::mimic =>
				Cow::from("When another creature enters play, transform this card into a fresh copy of that creature. This creature retains this ability"),
			Skill::miragemill => Cow::from("When a mirage dies, their owner destroys top card of their deck"),
			Skill::mist => Cow::from("Each stack has a 5% chance to evade attacks"),
			Skill::miracle =>
				Cow::from("Heal yourself to one below your maxHP. Consumes all 1:8"),
			Skill::mitosis => Cow::from("Summon a fresh copy of this creature"),
			Skill::mitosisspell =>
				Cow::from("Target creature gains 0|1. Target's active ability becomes \"Summon a fresh copy of this creature.\" That ability costs target's cost"),
			Skill::momentum => Cow::from("Target creature or weapon gains 1|1 & ignores shields"),
			Skill::mummy => Cow::from("Becomes a Pharaoh if targeted by Rewind"),
			Skill::mutation =>
				Cow::from("50% chance target creature becomes an Abomination. 40% chance target creature becomes a random mutated creature with a random ability, +0-4 strength, & +0-4HP. 10% chance target creature dies"),
			Skill::mutant =>
				Cow::from("When this card enters play, it gains a random active ability with a random activation cost"),
			Skill::neuro =>
				Cow::from("Poison on hit. Apply neurotoxin on hit. Neurotoxin poisons for every card played by affected player or active ability used by affected creature. Throttled (only triggers twice from Adrenaline)"),
			Skill::neuroify =>
				Cow::from("If target creature or player is poisoned, target gains neurotoxin. Neurotoxin poisons for every card played by affected player or active ability used by affected creature. Remove target's purify counters"),
			Skill::nightfall(..) if ev == Event::Buff => Cow::from(if self.upped() {
				"Nocturnal creatures gain 2|1 while Eclipse is in play. Does not stack"
			} else {
				"Nocturnal creatures gain 1|1 while Nightfall is in play. Does not stack"
			}),
			Skill::loot => Cow::from("When one of your permanents is destroyed, gain control of a random permanent from opponent"),
			Skill::nightmare =>
				Cow::from(if self.set() == CardSet::Open && !self.upped() {
					"Fill opponent's hand with fresh copies of target creature. Deal 1 damage per card added in this way. Heal yourself an equal amount"
				} else {
					"Fill opponent's hand with fresh copies of target creature. Deal 2 damage per card added in this way. Heal yourself an equal amount"
				}),
			Skill::nightshade =>
				Cow::from("Target creature becomes nocturnal, gains 5|5, & loses active skills"),
			Skill::nothrottle => Cow::from("Your skills having Throttled lose Throttled"),
			Skill::nova => Cow::from("Gain 1 quanta of each element. If you play three or more of this card in one turn, summon a Singularity on your side"),
			Skill::nova2 =>
				Cow::from("Gain 2 quanta of each element. If you play two or more of this card in one turn, summon a Singularity on your side"),
			Skill::nullspell =>
				Cow::from("Until your next turn, the next spell any player casts is nullified. If this ability nullifies a spell, this creature gains 1|1"),
			Skill::nymph =>
				Cow::from("Transform target pillar, pendulum, or tower into a Nymph matching target's element"),
			Skill::obsession => Cow::from(if self.upped() {
				"When discarded, its owner receives 13 spell damage"
			} else {
				"When discarded, its owner receives 10 spell damage"
			}),
			Skill::ouija => Cow::from("Whenever a creature dies, add an Ouija Essence to opponent's hand, add 1 to your maxHP if their hand was already full"),
			Skill::ouijadestroy => Cow::from("When destroyed, add 1 to opponent's maxHP"),
			Skill::ouijagrowth => Cow::from("Summon an Ouija Essence on opponent's field"),
			Skill::pacify => Cow::from("Set target creature or weapon's strength to 0"),
			Skill::pairproduce => Cow::from("Your pillars, pendulums, & towers trigger as if end of turn"),
			Skill::paleomagnetism =>
				Cow::from(format!("Summon a {} or pendulum every turn. \u{2154} chance it matches your mark, otherwise it matches your opponent's mark", if self.upped() { "tower" } else { "pillar" } )),
			Skill::pandemonium =>
				Cow::from("Apply a random effect on every creature. Possible effects include damage, lobotomize, parallel universe, gravity pull, rewind, & freeze. Removes cloak"),
			Skill::pandemonium2 =>
				Cow::from("Apply a random effect on each of target player's creatures. Possible effects include damage, lobotomize, parallel universe, gravity pull, rewind, & freeze. Removes cloak"),
			Skill::pandemonium3 =>
				Cow::from("Apply a random effect on every card in play or any hand. All existing effects are possible. Removes cloak"),
			Skill::paradox => Cow::from("Target creature with more strength than HP dies"),
			Skill::parallel => Cow::from("Summon an exact copy of target creature on your side"),
			Skill::patience =>
				Cow::from("If it'sn't frozen, prevents your creatures from attacking at the end of your turn, instead they gain 2|1. If they are burrowed, they instead gain 4|1. If they are affected by Flooding, they instead gain 5|2. Does not stack"),
			Skill::phoenix => Cow::from(if self.upped() {
				"When this creature dies, transform it into a Minor Ash"
			} else {
				"When this creature dies, transform it into an Ash"
			}),
			Skill::photosynthesis =>
				Cow::from("Gain 2:5. Unless cost was 0 or 1:0, caster reactivated"),
			Skill::pillar => Cow::from(format!("Gain {}:{} every turn", if self.card().element == 0 { '3' } else { '1' }, self.card().element)),
			Skill::pillar1 => Cow::from(format!("Gain {}:{} when played", if self.card().element == 0 { '3' } else { '1' }, self.card().element)),
			Skill::pend =>
				Cow::from(format!("Each turn, switch between gaining {}:{} & one quanta matching your mark", if self.card().element == 0 { '3' } else { '1' }, self.card().element)),
			Skill::plague =>
				Cow::from("Poison all of target player's creatures. Removes cloak"),
			Skill::platearmor(x) =>
				Cow::from(format!("Target gains 0|{0}, or target player gains {0} maxHP & heals {0}", x)),
			Skill::poison(x) => {
				let mut s = if x == 1 { String::from("Poison ") } else { format!("Give {} poison ", x) };
				match ev {
					Event::Cast => s.push_str(if x == 1 { "target creature" } else { "to target creature" }),
					Event::Hit => s.push_str(" on hit. Throttled (only triggers twice from Adrenaline)"),
					_ => return None,
				}
				Cow::from(s)
			},
			Skill::poisondr => Cow::from("Reduce damage by amount attacker is poisoned. Weapon damage reduced by poison of wielder"),
			Skill::poisonfoe(x) => {
				let mut s = String::new();
				s.push_str(match ev {
					Event::Cast => return Some(if x == 1 { Cow::from("Poison opponent") } else { Cow::from(format!("Give {x} poison to opponent")) }),
					Event::OwnDeath => "When this creature dies, ",
					Event::OwnDestroy => "When destroyed, ",
					_ => return None,
				});
				if x == 1 {
					s.push_str("poison opponent");
				} else {
					write!(s, "give {x} poison to opponent");
				}
				Cow::from(s)
			}
			Skill::powerdrain =>
				Cow::from("Remove half of target creature's strength & HP, rounded up. Add an equal amount of strength & HP to a random creature you control. Prefer not to buff target"),
			Skill::precognition =>
				Cow::from("Reveal opponent's hand until the end of their turn. Draw a card"),
			Skill::predator =>
				Cow::from("If opponent has more than four cards in their hand, this card attacks a second time & opponent discards the last card in their hand"),
			Skill::protectall =>
				Cow::from("All your creatures, permanents, weapon, & shield gain a bubble. Bubbles nullify the next spell, ability, or spell damage used by opponent that targets or damages affected card"),
			Skill::protectonce =>
				Cow::from("Nullify the next spell, ability, or spell damage used by opponent that targets or damages this card"),
			Skill::purify =>
				Cow::from("Remove all poison & sacrifice status from target creature or player. Target creature or player gains two purify counters"),
			Skill::quadpillar(x) =>
				Cow::from(format!("Randomly gain 1-2 {}each turn. \u{2154} chance to gain 2", DecodeQuad(x))),
			Skill::quadpillar1(x) =>
				Cow::from(format!("Randomly gain 1-2 {}when played. \u{2154} chance to gain 2", DecodeQuad(x))),
			Skill::quantagift =>
				Cow::from("Gain 2:7 & 2 quanta matching your mark. If your mark is 1:7, instead gain only 3:7 total. If your mark is 1:0, gain an additional 4:0"),
			Skill::quanta(x) if ev == Event::OwnAttack =>
				Cow::from(format!("Gain 1:{x} when it attacks")),
			Skill::quanta(x) if ev == Event::OwnDeath =>
				Cow::from(format!("When this creature dies, gain 1:{x}")),
			Skill::quanta(x) if ev == Event::OwnPlay =>
				Cow::from(format!("Gain 1:{x} when played")),
			Skill::quint =>
				Cow::from("Target creature gains immaterial & loses frozen status"),
			Skill::quinttog =>
				Cow::from("If target creature isn't immaterial, it gains immaterial, & loses frozen status. If target creature is immaterial, it loses immaterial status"),
			Skill::rage => {
				let mut s = String::from("Target creature gains +");
				s.push_str(if self.upped() { "6|-6" } else { "5|-5" });
				if self.set() == CardSet::Open {
					s.push_str(". If target creature is frozen, it loses frozen status");
				}
				Cow::from(s)
			},
			Skill::randomdr =>
				Cow::from(format!("When this card is played, its damage reduction is set randomly between 0 & {}", if self.upped() { '3' } else { '2' })),
			Skill::readiness =>
				Cow::from("Target creature's active ability becomes free. If target creature's active ability has already been used this turn, it can be used again this turn"),
			Skill::reap => Cow::from("Target non-Skeleton creature dies & is replaced with a Skeleton with target creature's current strength & HP, but no other active skills or statuses"),
			Skill::rebirth => Cow::from(if self.upped() {
				"Transform this card into a Minor Phoenix"
			} else {
				"Transform this card into a Phoenix"
			}),
			Skill::reducemaxhp =>
				Cow::from("Damage dealt by this card also reduces the defender's maxHP"),
			Skill::regen =>
				Cow::from("Give 1 purify counter to this card's owner on hit. Throttled (only triggers twice from Adrenaline)"),
			Skill::regenerate(x) => Cow::from(format!("Heal yourself {x} every turn or when this card attacks")),
			Skill::regeneratespell =>
				Cow::from("Replace target creature or non-stacking permanent's skills with \"Heal this card's owner 5 every turn or when this card attacks.\""),
			Skill::regrade =>
				Cow::from("If target card is upgraded, it becomes unupgraded. If target card is unupgraded, it becomes upgraded. Gain 1 quanta of target card's element. Cannot target stacks"),
			Skill::reinforce =>
				Cow::from("Combine with target creature, giving strength, HP, & poison counters"),
			Skill::ren => Cow::from("Target creature gains: \"When dying instead return to owner's hand. Modified state besides this effect remains when played again.\""),
			Skill::resetdr => Cow::from("Zero damage reduction at start of your turn"),
			Skill::resummon => Cow::from("Target creature is summoned again, as is"),
			Skill::rewind =>
				Cow::from("Put target creature on top of its owner's deck. Removes all bonuses & modifiers on target creature"),
			Skill::reveal if ev == Event::OwnPlay => Cow::from("Reveal opponent's hand when played & on attack"),
			Skill::reveal if ev == Event::Cast => Cow::from("Reveal opponent's hand for this turn"),
			Skill::ricochet =>
				Cow::from("Any targeted spells cast by either player are copied when played. The copy has a random caster & a random non-player target"),
			Skill::rngfreeze => Cow::from("Randomly freeze one of opponent's non-stacking permanents for two turns on hit"),
			Skill::sabbath =>
				Cow::from("Target cannot gain quanta until their turn ends. Their deck is protected until start of their next turn.\nSilence all your opponent's creatures & heal all your creatures by 8"),
			Skill::sadism => Cow::from("Whenever any creatures are damaged, heal yourself an equal amount"),
			Skill::salvage => Cow::from(if self.set() == CardSet::Open {
				"Whenever a permanent is destroyed, gain 1|1. Once per turn, when opponent destroys a permanent, add a copy of that permanent to your hand"
			} else {
				"Once per turn, when opponent destroys one of your permanents, add a copy of that permanent to your hand"
			}),
			Skill::salvageoff => Cow::from("Cannot salvage another destroyed permanent until next turn"),
			Skill::sanctify if ev == Event::OwnAttack => Cow::from("During your opponent's turn, your hand & quanta pool are protected & you cannot be silenced"),
			Skill::sanctify if ev == Event::OwnDraw => Cow::from("When drawn, your hand & quanta pool are protected & you cannot be silenced"),
			Skill::unsanctify if ev == Event::OwnPlay => Cow::from("Nullify opponent's sanctuary effect"),
			Skill::scatter =>
				Cow::from("Target player mulligans their hand for an equal number of cards.\nTargeting a card will only shuffle that card.\nIncrease your mark power by 1"),
			Skill::scramble if ev == Event::Hit => Cow::from("Randomize up to 9 quanta randomly chosen from opponent's quanta pool on hit"),
			Skill::scramble if ev == Event::Cast => Cow::from("Randomize up to 9 quanta randomly chosen from target player's quanta pool"),
			Skill::scramblespam =>
				Cow::from("Randomize up to 9 quanta randomly chosen from target player's quanta pool. This ability may be used multiple times per turn"),
			Skill::serendipity => Cow::from(if self.upped() {
				"Add 3 random upgraded non-pillar cards to your hand. At least one will be 1:1"
			} else {
				"Add 3 random non-pillar cards to your hand. At least one will be 1:1"
			}),
			Skill::shazam => Cow::from("Transform creature you control into a random common creature of the same element, or transform target card into a random card of the same element"),
			Skill::shtriga => Cow::from("Gain immaterial when your next turn starts"),
			Skill::shuffle3 =>
				Cow::from("Shuffle 3 copies of target creature into your deck & expend charge. Destroyed when all charges expended"),
			Skill::silence =>
				Cow::from("Silence target player or creature. Silenced players cannot play cards until the end of their next turn, while silenced creatures cannot use active skills until the end of their next turn"),
			Skill::sing => Cow::from("Target creature without this ability attacks its owner"),
			Skill::singularity => Cow::from("That was a bad idea"),
			Skill::sinkhole => Cow::from(if self.upped() {
				"Burrow target creature. Replace target creature's skills with 2:4: unburrow"
			} else {
				"Burrow target creature. Replace target creature's skills with 1:4: unburrow"
			}),
			Skill::siphon =>
				Cow::from("Remove 1:0 randomly from opponent's quanta pool when this creature attacks. Gain 1:11 for each quanta removed. Throttled (only triggers twice from Adrenaline)"),
			Skill::siphonactive =>
				Cow::from("Copy target creature or weapon's skills. Remove skills from target. Caster reactivated"),
			Skill::siphonstrength => Cow::from("Target creature loses 1|0. Gain 1|0"),
			Skill::skeleton =>
				Cow::from("If this creature is targeted by Rewind, it becomes a random creature"),
			Skill::skeletoncount => Cow::from(if self.upped() { "Increase attack by sum of base attack of your skeletons" } else { "Increase attack by number of skeletons you own" }),
			Skill::skull => Cow::from(if self.set() == CardSet::Open {
				"Attacking non-ranged creatures may randomly die (1 in HP chance) & are replaced by Skeletons"
			} else {
				"Attacking creatures may randomly die (1 in HP chance) & are replaced by Skeletons"
			}),
			Skill::skyblitz =>
				Cow::from("Your airborne creatures all dive (double their strength until end of turn.) Consumes all 1:9"),
			Skill::slime => Cow::from("Increase damage reduction by 1 when damage reduction does not prevent all damage from non-ranged attacker"),
			Skill::slow => Cow::from("Non-ranged attackers are delayed for one turn after their attack. Delayed creatures may not attack or use active skills"),
			Skill::snipe => Cow::from("Deal 3 damage to target creature"),
			Skill::snowflake if ev == Event::Death => Cow::from("Whenever card dies or is destroyed, gain charge per frozen counter"),
			Skill::solar => Cow::from("Gain 1:8 equal to amount of damage blocked"),
			Skill::sosa =>
				Cow::from(if self.upped() {
					"Sacrifice 40HP. Consume all non-1:2 quanta. For two turns, damage heals you & healing damages you"
				} else {
					"Sacrifice 48HP. Consume all non-1:2 quanta. For two turns, damage heals you & healing damages you"
				}),
			Skill::soulcatch => Cow::from(
				if self.set() == CardSet::Original && !self.upped() {
					"Whenever a creature dies, gain 2:2"
				} else {
					"Whenever a creature dies, gain 3:2"
				}),
			Skill::spores => Cow::from(
				if self.upped() {
					"When this creature dies, summon 2 Toxic Spores"
				} else {
					"When this creature dies, summon 2 Spores"
				}),
			Skill::sskin =>
				Cow::from("Gain maxHP & heal an amount equal to the 1:4 in your quanta pool after casting this spell"),
			Skill::stasis => Cow::from("Creatures do not attack at the end of each player's turn"),
			Skill::stasisdraw =>
				Cow::from(if self.upped() {
					"Target player cannot draw cards from their deck until their turn ends, instead drawing unupgraded singularities. Their deck is protected until their next turn starts.\nHeal 2HP per card in target's hand"
				} else {
					"Target player cannot draw cards from their deck until their turn ends, instead drawing unupgraded singularities. Their deck is protected until their next turn starts.\nHeal 1HP per card in target's hand"
				}),
			Skill::r#static(x) => Cow::from(format!("Deals {x} spell damage to opponent for each attacker")),
			Skill::steal => Cow::from("You gain control of target permanent"),
			Skill::steam =>
				Cow::from("Gain 5|0. This creature loses 1|0 of strength gained in this way after each attack"),
			Skill::stoneform => Cow::from("Gain 0|20. Become a golem"),
			Skill::stonewall => Cow::from("Gain 1 damage reduction for every 9:4 in your quanta pool"),
			Skill::storm(x) =>
				Cow::from(format!("Deal {x} spell damage to all of target player's creatures. Removes cloak")),
			Skill::summon(code) =>
				Cow::from(format!("Summon a {}", self.cards().get(code as i16).name())),
			Skill::swarm =>
				Cow::from("Base HP is equal to the number of Scarabs you control, including this one"),
			Skill::swave =>
				Cow::from("Deal 4 spell damage to target creature or player. If target creature is frozen, it dies. If target player's weapon is frozen, destroy it"),
			Skill::tempering(x) =>
				Cow::from(format!("Target weapon gains {x} strength. If target weapon is frozen, it loses frozen status")),
			Skill::tesseractsummon =>
				Cow::from("Summon a random creatures from opponent's deck. Summon two random creatures from your deck. Freeze these creatures for a number of turns equal to \u{00bc} of their quanta cost, rounded up. Freeze Tesseract for two turns"),
			Skill::thorn(x) => Cow::from(format!("{x}% chance to poison non-ranged attackers")),
			Skill::throwrock => Cow::from(if self.upped() {
				"Deal 4 damage to target creature, then shuffle Throw Rock into its owner's deck"
			} else {
				"Deal 3 damage to target creature, then shuffle Throw Rock into its owner's deck"
			}),
			Skill::tick => Cow::from(if self.upped() {
				"This creature takes 2 damage. If this damage kills the creature, deal 4 spell damage to all of opponent's creatures"
			} else {
				"This creature takes 1 damage. If this damage kills the creature, deal 18 spell damage to opponent"
			}),
			Skill::tidalhealing =>
				Cow::from("Remove frozen status & poison from all your creatures. Your aquatic creatures gain \"Give 1 purify counter to this card's owner on hit. Throttled (only triggers twice from Adrenaline)\". This ability does not stack"),
			Skill::tornado => Cow::from(if self.upped() {
				"Shatter all frozen permanents. Randomly choose two of opponent's permanents. Each selected permanent is shuffled into a random player's deck"
			} else {
				"Shatter all frozen permanents. Randomly choose two of opponent's permanents & one of your permanents. Each selected permanent is shuffled into a random player's deck"
			}),
			Skill::trick =>
				Cow::from("If target creature's owner has creatures in their deck, put target creature into their deck & summon a random different creature from their deck"),
			Skill::tutordraw => Cow::from("Search deck for copy of target card. Draw that copy"),
			Skill::turngolem =>
				Cow::from("This card becomes a creature with Gravity Pull. Set the creature's HP to the total damage this card blocked while it was a shield. Set the creature's strength to half its HP"),
			Skill::unsilence => Cow::from("Remove silence from yourself"),
			Skill::unsummon => Cow::from(if self.upped() {
				"Return target creature to its owner's hand. Remove any modifiers & statuses on target creature. If owner's hand is full, instead return target creature to top of its owner's deck. Gain quanta equivalent to target card's cost"
			} else {
				"Return target creature to its owner's hand. Remove any modifiers & statuses on target creature. If owner's hand is full, instead return target creature to top of its owner's deck"
			}),
			Skill::unvindicate =>
				Cow::from("Cannot activate vindicate again until the start of its next turn"),
			Skill::upkeep =>
				Cow::from(format!("Pay 1:{} at the end of your turn. If you cannot, destroy this card", self.card().element)),
			Skill::upload => Cow::from("Other target creature or weapon gains 2|0. This creature loses 0|2"),
			Skill::vampire => Cow::from("Heal yourself equal to the damage dealt by this card"),
			Skill::vend => Cow::from("Sacrifice this card. Draw a card"),
			Skill::vengeance =>
				Cow::from("Whenever one of your creatures dies during opponent's turn, your creatures attack & this card loses a charge"),
			Skill::vindicate =>
				Cow::from("Once per turn, when one of your creatures dies, it attacks an additional time before dying"),
			Skill::virtue =>
				Cow::from("When this creature attacks, if any damage is blocked by opponent's shield, your maxHP is increased by the amount this creature's damage was blocked"),
			Skill::virusinfect =>
				Cow::from("Sacrifice this creature. Poison target creature"),
			Skill::virusplague =>
				Cow::from("Sacrifice this creature. Poison target player's creatures"),
			Skill::void => Cow::from(if self.set() == CardSet::Open {
				"Reduce opponent's maxHP by 3"
			} else {
				"Reduce foe's maxHP by 2, 3 if mark is 1:11"
			}),
			Skill::voidshell =>
				Cow::from("Block all damage from attackers. Reduce your maxHP equal to the damage blocked by this card"),
			Skill::web => Cow::from("Target creature loses airborne status"),
			Skill::weight => Cow::from("Evade all attackers that have more than 5HP"),
			Skill::wicked => Cow::from("Sacrifice creature you control. Increase damage reduction by that creature's cost"),
			Skill::wind => Cow::from("Restore any strength lost by halving after attacking. Increase HP by amount restored"),
			Skill::wings => Cow::from("Evade all non-airborne, non-ranged attackers"),
			Skill::wisdom => Cow::from(if self.set() == CardSet::Open {
				"Target gains 3|0. May target immaterial cards. If it targets an immaterial card, that card gains psionic. Psionic cards deal spell damage & typically bypass shields"
			} else {
				"Target creature gains 4|0. May target immaterial cards. If it targets an immaterial card, that card gains psionic. Psionic cards deal spell damage & typically bypass shields"
			}),
			Skill::yoink =>
				Cow::from("Remove target card from opponent's hand & add it to your hand, or draw from target opponent's deck"),
			Skill::v_bblood => Cow::from("Target creature gains 0|20 & is delayed 6 turns"),
			Skill::v_blackhole =>
				Cow::from("Absorb 3 quanta per element from target player. Heal 1 per absorbed quantum"),
			Skill::v_cold => Cow::from("30% chance to freeze attackers for 3"),
			Skill::v_cseed => Cow::from("A random effect is inflicted to target creature"),
			Skill::v_dessication =>
				Cow::from("Deal 2 damage to opponent's creatures. Gain 1:7 per damage dealt. Removes cloak"),
			Skill::v_divinity => Cow::from("Add 24 to maxHP if mark 1:8, otherwise 16 & heal same"),
			Skill::v_drainlife(..) => Cow::from("Drain 2HP from target, plus an extra 2HP per 10:11 remaining"),
			Skill::v_dshield => Cow::from("Become immaterial until next turn"),
			Skill::v_endow => Cow::from("Replicate attributes of target weapon"),
			Skill::v_firebolt(..) => Cow::from("Deals 3 damage to target. Deal 3 more per 10:6 remaining"),
			Skill::v_firewall => Cow::from("Damage attackers"),
			Skill::v_flyingweapon => Cow::from("Own weapon becomes a flying creature"),
			Skill::v_freedom =>
				Cow::from("Your airborne creatures have a 25% chance to deal 50% more damage, bypass shields & evade targeting if 1:9"),
			Skill::v_gratitude => Cow::from("Heal owner 3, 5 if your mark is 1:5"),
			Skill::v_hatch => Cow::from("Become a random creature"),
			Skill::v_heal => Cow::from("Heal self 20"),
			Skill::v_holylight => Cow::from("Heal target 10. Nocturnal targets are damaged instead"),
			Skill::v_hope =>
				Cow::from("Blocks one additional damage for each creature you control that gain 1:8 when attacking"),
			Skill::v_icebolt(..) =>
				Cow::from("Deal 2 damage to target, plus an additional 2 per 10:7 remaining. 25% plus 5% per point of damage chance to freeze target"),
			Skill::v_improve => Cow::from("Mutate target creature"),
			Skill::v_integrity => Cow::from("Combine all shards in hand to form a Shard Golem"),
			Skill::v_mutation =>
				Cow::from("Mutate target creature into an abomination, or maybe something more. Slight chance of death"),
			Skill::v_nymph => Cow::from("Turn target pillar into a Nymph of same element"),
			Skill::v_obsession => Cow::from(if self.upped() {
				"Damage owner 13 on discard"
			} else {
				"Damage owner 10 on discard"
			}),
			Skill::v_pandemonium => Cow::from(if self.upped() {
				"Random effects are inflicted to opponent's creatures. Removes cloak"
			} else {
				"Random effects are inflicted to all creatures. Removes cloak"
			}),
			Skill::v_plague => Cow::from("Poison foe's creatures. Removes cloak"),
			Skill::v_readiness =>
				Cow::from("Target creature's active becomes costless & reactivated"),
			Skill::v_relic => Cow::from("Worthless"),
			Skill::v_rewind =>
				Cow::from("Remove target creature to top of owner's deck. If target is a Skeleton, transform it into a random creature. If target is a Mummy, transform it into a Pharaoh"),
			Skill::v_scramble => Cow::from("Randomly scramble foe's quanta on hit"),
			Skill::v_serendipity => Cow::from(if self.upped() {
				"Generate 3 random upgraded cards in hand. One will be 1:1"
			} else {
				"Generate 3 random cards in hand. One will be 1:1"
			}),
			Skill::v_silence =>
				Cow::from("Foe cannot play cards during their next turn, or target creature gains summoning sickness"),
			Skill::v_singularity => Cow::from("Not well behaved"),
			Skill::v_slow => Cow::from("Delay attackers"),
			Skill::v_steal => Cow::from("Steal target permanent"),
			Skill::v_stoneform => Cow::from("Remove this ability & gain 0|20"),
			Skill::v_storm(x) => Cow::from(format!("Deals {x} damage to foe's creatures. Removes cloak")),
			Skill::v_swarm => Cow::from("Increment hp per scarab"),
			Skill::v_thorn => Cow::from("\u{00be} chance to poison attackers"),
			Skill::v_virusplague => Cow::from("Sacrifice self & poison foe's creatures"),
			Skill::dagger => Cow::from("Gain 1 strength if your mark is 1:2 1:11. Gain 1 strength per Darkness or Death non-pillar permanent you control"),
			Skill::hammer => Cow::from("Gain 1 strength if your mark is 1:3 1:4"),
			Skill::bow => Cow::from(if self.set() == CardSet::Open {
				"Gain 1 strength if your mark is 1:8 1:9"
			} else {
				"Gain 1 strength if your mark is 1:9"
			}),
			Skill::staff => Cow::from("Gain 1 strength if your mark is 1:5 1:7"),
			Skill::disc => Cow::from("Gain 1 strength if your mark is 1:1 1:12"),
			Skill::axe => Cow::from("Gain 1 strength if your mark is 1:6 1:10"),
			Skill::v_dagger => Cow::from("Gain 1 strength if your mark is 1:2 1:11"),
			_ => return None
		})
	}

	pub fn info(&self) -> String {
		let card = self.card();
		let mut ret = String::new();
		let mut stext = String::new();
		for (k, v) in self.status().iter().cloned() {
			if v == 0 {
				continue;
			}
			match k {
				Stat::cost => {
					let card = self.card();
					let costele = self.costele();
					if v != card.cost as i16 || costele != card.costele as i16 {
						write!(ret, "{v}:{}, ", costele).ok();
					}
				}
				Stat::adrenaline => {
					if v != 1 {
						write!(ret, "{v} ").ok();
					}
					ret.push_str("adrenaline, ");
				}
				Stat::casts => {
					write!(ret, "{v} casts, ").ok();
				}
				Stat::charges if v != 1 => {
					match *self {
						Self::Card(cards, c) => {
							if !c.skill().iter().any(|&(ev, sk)| ev == Event::OwnAttack && sk.iter().cloned().any(|s| s == Skill::losecharge)) {
								write!(stext, "Enters play with {v} {}.\n", if self.get_flag(Flag::stackable) { "stacks" } else { "charges" }).ok();
							}
						}
						_ => (),
					}
				}
				Stat::delayed => {
					write!(ret, "{v} delay, ").ok();
				}
				Stat::dive => {
					write!(ret, "{v} dive, ").ok();
				}
				Stat::flooding =>
					stext.push_str("Non aquatic creatures past first five (seven on first effective turn) creature slots die on turn end. Consumes 1:7"),
				Stat::frozen => {
					match *self {
						Self::Thing(..) => write!(ret, "{v} frozen, "),
						Self::Card(..) => write!(stext, "Enters play frozen for {} turn{}.\n", v, if v == 1 { "" } else { "s" }),
					}.ok();
				}
				Stat::poison => {
					match *self {
						Self::Thing(..) => write!(ret, "{v} poison, "),
							Self::Card(..) => write!(stext, "Enters play with {v} poison.\n"),
						}.ok();
					}
				Stat::lives => {
					if v == 1 {
						write!(ret, "last life, ").ok();
					} else {
						write!(ret, "{v} lives, ").ok();
					}
				}
				Stat::steam => {
					write!(ret, "{v} steam, ").ok();
				}
				Stat::storedpower => {
					write!(ret, "{v} stored, ").ok();
				}
				_ => ()
			}
		}
		for k in self.flags() {
			match k {
				Flag::cloak => ret.push_str("Cloaks your field. Opponent cannot see your actions or directly target your other cards.\n"),
				Flag::tunnel => ret.push_str("Any of your creatures that are burrowed bypass shields.\n"),
				Flag::patience =>
					ret.push_str("Each turn delay own creatures. They gain 2|2. 5|5 if flooded. Unique.\n"),
				Flag::voodoo =>
					ret.push_str("Whenever this creature takes non-lethal damage or is affected by any status, that status or damage is also applied to opponent.\n"),
				Flag::additive => ret.push_str("additive, "),
				Flag::aflatoxin => ret.push_str("aflatoxin, "),
				Flag::airborne => ret.push_str("airborne, "),
				Flag::appeased => ret.push_str("appeased, "),
				Flag::aquatic => ret.push_str("aquatic, "),
				Flag::bug => ret.push_str("bug, "),
				Flag::burrowed => ret.push_str("burrowed, "),
				Flag::golem => ret.push_str("golem, "),
				Flag::immaterial => ret.push_str("immaterial, "),
				Flag::momentum => ret.push_str("momentum, "),
				Flag::mutant => ret.push_str("mutant, "),
				Flag::neuro => ret.push_str("neuro, "),
				Flag::nocturnal => ret.push_str("nocturnal, "),
				Flag::poisonous => ret.push_str("poisonous, "),
				Flag::psionic => ret.push_str("psionic, "),
				Flag::ranged => ret.push_str("ranged, "),
				Flag::ready => ret.push_str("ready, "),
				Flag::reflective => ret.push_str("reflective, "),
				Flag::vindicated => ret.push_str("vindicated, "),
				_ => ()
			}
		}
		let retlen = ret.len();
		if retlen > 2 {
			ret.truncate(retlen - 2);
			ret.push_str(".\n");
		}
		ret.push_str(&stext);
		drop(stext);

		self.skills(|ev, sk| {
			enum RenderCast {
				Yes,
				NoCost,
				No,
			}
			let renderCast = if ev == Event::Cast {
				match *self {
					Self::Card(_, c) if c.kind == Kind::Spell => RenderCast::NoCost,
					Self::Thing(game, id)
						if game.get_kind(id) == Kind::Spell
							&& game.get_card(game.get(id, Stat::card)).kind == Kind::Spell =>
					{
						RenderCast::No
					}
					_ => RenderCast::Yes,
				}
			} else {
				RenderCast::NoCost
			};
			if !matches!(renderCast, RenderCast::No) {
				for &s in sk {
					if let Some(text) = self.sktext(ev, s) {
						if matches!(renderCast, RenderCast::Yes) {
							write!(ret, "{}:{} ", self.cast(), self.castele()).ok();
						}
						ret.push_str(&text);
						ret.push_str(".\n");
					}
				}
			}
		});

		let retlen = ret.len();
		if retlen > 1 {
			ret.truncate(retlen - 1);
		}
		ret
	}
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_text(set: CardSet, idx: u16) -> String {
	let cards = card::cardSetCards(set);
	if let Some(card) = cards.try_get_index(idx as usize) {
		rawCardText(*cards, card)
	} else {
		String::new()
	}
}

pub fn rawCardText(cards: Cards, card: &'static Card) -> String {
	if card.kind == Kind::Spell {
		SkillThing::Card(cards, card).info()
	} else {
		let mut s = String::new();
		if card.kind == Kind::Shield {
			if card.health > 0 {
				write!(s, "Reduce damage by {}", card.health).ok();
			} else if card.health < 0 {
				write!(s, "Increase damage by {}", -card.health).ok();
			}
		} else if card.kind == Kind::Creature || card.kind == Kind::Weapon {
			write!(s, "{}|{}", card.attack, card.health);
		}
		let skills = SkillThing::Card(cards, card).info();
		if s.is_empty() {
			return skills;
		}
		if (!skills.is_empty()) {
			s.push('\n');
			s.push_str(&skills);
		}
		s
	}
}

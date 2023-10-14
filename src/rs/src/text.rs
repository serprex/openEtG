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
			Self::Card(cards, card) => card
				.status
				.iter()
				.find(|&(st, _)| *st == stat)
				.map(|&(_, val)| val)
				.unwrap_or(0),
		}
	}

	fn get_flag(&self, flag: u64) -> bool {
		match *self {
			Self::Thing(game, id) => game.get(id, flag),
			Self::Card(cards, c) => (c.flag & flag) != 0,
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
			Self::Card(cards, c) => c.status,
		}
	}

	fn flags(&self) -> Flag {
		match *self {
			Self::Thing(game, id) => game.get_thing(id).flag,
			Self::Card(cards, c) => Flag(*c.flag),
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
				for &(ev, sk) in c.skill.iter() {
					f(ev, sk)
				}
			}
		}
	}

	fn sktext(&self, ev: Event, sk: Skill) -> Option<Cow<'static, str>> {
		Some(match sk {
			Skill::abomination => Cow::from("If targeted with mutation, this will always become an improved mutant"),
			Skill::absorber => Cow::from("Generates 3:6 for each attacker"),
			Skill::acceleration => {
				let mut s = String::from("Replaces target creature's skills with \"Gains +");
				s.push(if self.upped() { '3' } else { '2' });
				s.push_str("|-1 when it attacks");
				Cow::from(s)
			}
			Skill::accretion => Cow::from(if self.set() == CardSet::Open {
				"Destroy target permanent & gain 0|10. If using this ability leaves this creature at more than 30HP, transform into a black hole in your hand"
			} else {
				"Destroy target permanent & gain 0|15. If using this ability leaves this creature at more than 45HP, destroy this creature & add a black hole to your hand"
			}),
			Skill::accumulation => Cow::from("Playing additional repulsors adds to damage reduction"),
			Skill::adrenaline => Cow::from("Target creature attacks multiple times per turn. Creatures with lower strength attack more times per turn"),
			Skill::aflatoxin => Cow::from("Give target 2 poison counters. When the target dies, it becomes a Malignant Cell"),
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
				Cow::from("Sacrifice target creature you own & gain 1|1. If this ability isn't used, this creature will attack its owner. This creature attacks normally the turn it is played or if it loses this ability"),
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
			Skill::blockwithcharge => {
				let mut s = String::from("Each stack fully blocks one attacker");
				if self.set() == CardSet::Open {
					s.push_str(" & is then destroyed");
				}
				Cow::from(s)
			}
			Skill::bloodmoon => Cow::from("Aquatic creatures gain \"Gain 1:8 when it attacks.\"\nGolems gain \"Damage dealt by this card also reduces the defender's maximum HP.\"\nNocturnal creatures gain \"Heal yourself equal to the damage dealt by this card.\""),
			Skill::bolsterintodeck => Cow::from("Add 3 copies of target creature on top of your deck"),
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
			Skill::bubbleclear => Cow::from("Remove statuses (positive & negative) from target creature or permanent, & heal target creature 1.\nTarget gains a bubble. Bubbles nullify the next spell, ability, or spell damage used by opponent that targets or damages affected card"),
			Skill::butterfly => Cow::from(if self.set() == CardSet::Open {
				"Target creature or weapon with either strength or HP less than 3 has its skills replaced with \"3:1 Destroy target permanent.\""
			} else {
				"Target creature with less attack than 3. Replace target's skills with \"3:1 Destroy target permanent\""
			}),
			Skill::burrow => Cow::from(if self.get_flag(Flag::burrowed) {
				"Unburrow"
			} else {
				"Burrow this creature. Strength is halved while burrowed"
			}),
			Skill::catapult => Cow::from("Sacrifice target creature you control to damage opponent for 100 * Creature's HP / (100 + Creature's HP). Frozen creautres deal 1.5x more. Poisoned creatures transfer their poison to opponent"),
			Skill::catlife => {
				let card = self.card();
				Cow::from(format!("Has {} lives. When it dies, this creature loses a life & revives with {}|{} stats",
					   self.get_stat(Stat::lives), card.attack, card.health))
			}
			Skill::cell => Cow::from("Becomes a Malignant Cell if poisoned"),
			Skill::chaos => Cow::from(if self.upped() {
				"20% chance to evade attacks. Non-ranged attacking creatures have a 30% chance to have a random effect cast on them"
			} else {
				"Non-ranged attacking creatures have a 30% chance to have a random effect cast on them"
			}),
			Skill::chimera =>
				Cow::from("Combine all your creatures to form a Chimera with momentum, gravity pull, & the total of your creatures' combined strength & HP"),
			Skill::chromastat =>
				Cow::from("Generate 1:0 for this creature's total strength & HP when this creature deals damage"),
			Skill::clear =>
				Cow::from("Remove statuses (positive & negative) from target creature or permanent, & heal target creature 1"),
			Skill::cold => Cow::from("30% chance to freeze non-ranged attackers for 3 turns"),
			Skill::corpseexplosion => Cow::from(if self.upped() {
				"Sacrifice one of your creatures to deal 1 spell damage to all other creatures. Increase damage by 1 for every 8HP of the sacrifice. Poisonous sacrifices poison. Also affect opponent"
			} else {
				"Sacrifice one of your creatures to deal 1 spell damage to all enemy creatures. Increase damage by 1 for every 8HP of the sacrifice. Poisonous sacrifices poison. Also affect opponent"
			}),
			Skill::counter =>
				Cow::from("When this creature is attacked by another creature, if this creature is able to attack, it deals its damage to the attacking creature"),
			Skill::countimmbur => Cow::from("Gains 1|0 for every immaterial or burrowed card in play"),
			Skill::cpower => Cow::from("Target randomly gains between 1 to 5 strength & HP"),
			Skill::creatureupkeep =>
				Cow::from("Whenever a creature attacks, its owner must pay one quanta of the creature's element or the creature is destroyed"),
			Skill::cseed =>
				Cow::from("Inflict a random effect on target creature. Possible effects include damage, lobotomize, parallel universe, gravity pull, rewind, & freeze 6"),
			Skill::cseed2 =>
				Cow::from("Inflict a random effect on target card. All existing effects are possible"),
			Skill::deadalive if ev == Event::Hit => Cow::from("When this card deals damage, trigger all effects that occur when a creature dies"),
			Skill::deadalive if ev == Event::Cast => Cow::from("Trigger all effects that occur when a creature dies"),
			Skill::deathwish => Cow::from("Whenever opponent casts a spell or ability on an allied creature, if this creature is a valid target, that spell or ability targets this creature instead"),
			Skill::deckblast =>
				Cow::from("Deals spell damage to opponent for each card remaining in deck.\nIf this spell costs 1:10, destroy all cards in your deck"),
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
				Cow::from("Target creature with less HP than this creature gets -1|-1 & is burrowed. Gain 1|1"),
			Skill::devour =>
				Cow::from("Target creature with less HP than this creature dies. Gain 1|1. If target creature was poisonous, become poisoned"),
			Skill::die => Cow::from("Sacrifice this card"),
			Skill::disarm =>
				Cow::from("When this creature damages opponent, return their weapon to their hand. Modified stats & statuses remain on the card when it is played again"),
			Skill::discping =>
				Cow::from("Deal 1 damage to target & return this card to your hand. Modified stats & statuses remain on the card when it is played again"),
			Skill::disfield => Cow::from("Block all damage from attackers. Consumes 1:0 per damage blocked"),
			Skill::disshield =>
				Cow::from("Block all damage from attackers. Consume 1:1 per 3 damage blocked"),
			Skill::divinity => Cow::from("Add 24 to maximum health & heal yourself 16"),
			Skill::dive =>
				Cow::from(if self.set() == CardSet::Open {
					"Double this creature's strength through next attack. Does not stack"
				} else {
					"Double this creature's strength through next attack"
				}),
			Skill::dmgproduce => Cow::from("Generate 1:0 for each damage dealt by this card"),
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
			Skill::earthquake =>
				Cow::from("Destroy up to 3 copies of target pillar, pendum, tower, or other stacking permanent"),
			Skill::eatspell =>
				Cow::from("Until your next turn, the next spell any player casts is nullified. If this ability nullifies a spell, this creature gains 1|1"),
			Skill::elf => Cow::from("If this card is targeted by Chaos Seed, it becomes a Fallen Elf"),
			Skill::embezzle =>
				Cow::from("Replaces target creature's skills with \"When this creature damages a player, that player draws a card. When this creature dies, destroy top two cards of opponent's deck"),
			Skill::embezzledeath =>
				Cow::from("When this creature dies, destroy top two cards of opponent's deck"),
			Skill::empathy =>
				Cow::from(if self.set() == CardSet::Open {
					"At the end of your turn, heal 1 for each creature you own. For every 8 creatures you own (rounded down), pay 1:5 at the end of your turn"
				} else {
					"At the end of your turn, heal 1 for each creature you own"
				}),
			Skill::enchant => Cow::from("Target permanent becomes immaterial"),
			Skill::endow =>
				Cow::from("Gain the strength, skills, & statuses of target weapon. Gain 0|2.\nCannot gain Endow skill"),
			Skill::envenom =>
				Cow::from("Target equipment gains \"Give 1 poison on hit. Throttled (only triggers twice from Adrenaline)\" & \"25% chance to give non-ranged attackers 1 poison counter.\""),
			Skill::epidemic =>
				Cow::from("When any creature dies, give opponent poison counters equal to the dead creature's poison counters"),
			Skill::epoch =>
				Cow::from("On each player's turn, silence that player after they play two cards"),
			Skill::epochreset if ev == Event::Cast => Cow::from("Reset your count of cards played this turn"),
			Skill::equalize =>
				Cow::from("Set target creature's maximum HP equal to its strength. Set its HP to its maximum HP.\nOr change target card's elemental cost to 1:0"),
			Skill::evade(x) => Cow::from(format!("{}% chance to evade attacks", x)),
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
			Skill::feed => Cow::from("Give target creature 1 poison counter, gain 3|3, & lose immaterial"),
			Skill::fickle =>
				Cow::from("Swap target card in either player's hand with a random card from their deck that they have enough quanta to play"),
			Skill::fiery => Cow::from("Gains 1 strength for every 5:6 owned"),
			Skill::firebolt =>
				Cow::from("Deal 3 spell damage plus one per 4:6 you have after playing this card. If target is frozen, it loses frozen status"),
			Skill::firebrand => Cow::from("Last an additional turn when targeted with Tempering"),
			Skill::firestorm(x) => Cow::from(format!("Deal {} spell damage to all of target player's creatures, thawing them. Removes cloak", x)),
			Skill::firewall => Cow::from("Deals 1 damage to each non-ranged attacking creature"),
			Skill::flooddeath =>
				Cow::from("Each player's non-aquatic creatures past their first five creature slots die at the end of that player's turn"),
			Skill::flyself =>
				Cow::from("If this card is equipped as a weapon, it casts Flying Weapon on itself. If this card is a creature, it casts Living Weapon on itself"),
			Skill::flyingweapon =>
				Cow::from("Target weapon becomes a flying creature. It still counts as a weapon even though it isn't in a weapon slot"),
			Skill::foedraw => Cow::from("Draw from opponent's deck"),
			Skill::forcedraw => Cow::from("When this creature damages a player, that player draws a card"),
			Skill::forceplay =>
				Cow::from("The owner of target card in hand plays that card on a random target if they are able, or the owner of target card in play without this ability activates that card's ability on a random target if they are able"),
			Skill::fractal =>
				Cow::from("Fill your hand with copies of target creature. Consumes all 1:12. If this spell costs 1:0, consumes all quanta"),
			Skill::freeevade =>
				Cow::from("If your opponent has a shield, your airborne creatures have a 25% chance to bypass the shield. Otherwise, your creatures have a 25% chance to deal 50% more damage. Your creatures have 20% chance to evade opponent's targeted spells & skills"),
			Skill::freeze(x) =>
				Cow::from(format!("Freeze target creature or weapon for {} turns. Frozen cards cannot attack or use active skills, & do not activate per-turn skills", x)),
			Skill::freezeperm => Cow::from(
				format!("Freeze target non-stacking permanent for {} turns. Frozen cards cannot attack or use active skills, & do not activate per-turn skills", if self.upped() { '4' } else { '3' }),
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
			Skill::grave =>
				Cow::from("When another creature dies, unburrow & transform this creature into a fresh copy of the dying creature. This creature retains nocturnal"),
			Skill::give =>
				Cow::from(format!("Give target card you own, either in hand or in play, to your opponent. Heal yourself {}. This card bypasses sanctuary, & can target immaterial or burrowed cards", if self.upped() { "10" } else { "5" })),
			Skill::golemhit =>
				Cow::from("Target golem attacks. This ability can target immaterial or burrowed cards"),
			Skill::gpull =>
				Cow::from("Creatures attacking this creature's owner instead attack this creature"),
			Skill::gpullspell =>
				Cow::from("Creatures attacking target creature's owner instead attack target creature.\nIf target is a player, creatures attack that player when attacking that player"),
			Skill::growth(atk, hp) if ev == Event::Death => Cow::from(format!("When any creature dies, gain {}|{}", atk, hp)),
			Skill::growth(atk, hp) if ev == Event::Cast => Cow::from(format!("Gain {}|{}", atk, hp)),
			Skill::growth(atk, hp) if ev == Event::OwnAttack => Cow::from(format!("This creature gains {}|{} when it attacks", atk, hp)),
			Skill::icegrowth(atk, hp) => Cow::from(format!("When this card would be frozen, instead gain {}|{}", atk, hp)),
			Skill::guard =>
				Cow::from("Delay target creature & this creature. If target creature isn't airborne or this creature is airborne, this creature deals damage equal to its strength to target creature"),
			Skill::halveatk => Cow::from("This creature's strength is halved after it attacks"),
			Skill::hasten if ev == Event::Cast => Cow::from("Draw a card"),
			Skill::hasten if ev == Event::OwnDiscard => Cow::from("When discarded, you draw a card"),
			Skill::hatch =>
				Cow::from("Transform this creature into a random creature. Caster can be reactivated"),
			Skill::heal => Cow::from("Heal target creature or player 20"),
			Skill::heatmirror => Cow::from(if self.upped() {
				"When your opponent plays a creature from their hand, summon a Ball Lightning"
			} else {
				"When your opponent plays a creature from their hand, summon a Spark"
			}),
			Skill::hitownertwice => Cow::from("When this creature attacks, it also attacks its owner twice"),
			Skill::holylight => Cow::from(if self.upped() {
				"Heal target creature or player 10. If target creature is nocturnal, instead deal 10 spell damage to target creature"
			} else {
				"Heal target creature or player 10. If target creature is nocturnal, instead deal 10 spell damage to target creature.\nGain 1:8 when played"
			}),
			Skill::hope => Cow::from("Blocks one additional damage for each creature you control that gain 1:8 when attacking"),
			Skill::icebolt =>
				Cow::from("Deal 2 spell damage plus one per 5:7 you have after playing this card. 25% plus 5% per point of damage chance to freeze target"),
			Skill::ignite =>
				Cow::from("Deal 20 spell damage to opponent. Deal 1 spell damage to each creature"),
			Skill::ignitediscard => Cow::from("When discarded, deal 5 spell damage to opponent"),
			Skill::immolate(x) =>
				Cow::from(format!("Sacrifice a creature you control. Gain {}:6 plus 1 quanta of each other element", x+1)),
			Skill::improve =>
				Cow::from("Transform a target creature into a random mutant creature. Mutant creatures gain a random ability; & randomly gains between 1 to 5 strength & hp"),
			Skill::inertia => Cow::from("When any card you own is targeted by either player, gain 2:3"),
			Skill::inflation => Cow::from("Increase the cost of all active skills by 1"),
			Skill::ink => Cow::from("Summon a Cloak that lasts 1 turn"),
			Skill::innovation =>
				Cow::from("Discard target card in either player's hand. The owner of target card draws three cards. Destroy top card of your deck"),
			Skill::integrity =>
				Cow::from("Destroy all shards in your hand to play a Shard Golem with stats & skills based on the shards destroyed"),
			Skill::jelly =>
				Cow::from("Target creature becomes a 7|4 Pink Jelly with an active ability that turns additional creatures into Pink Jellies. That ability costs 4 quanta matching target creature's element. 1:0 creatures have an ability cost of 12:0"),
			Skill::jetstream =>
				Cow::from("Target airborne creature gains 3|-1. Target non-airborne creature gains airborne"),
			Skill::lightning => Cow::from("Deal 5 spell damage to target creature or player"),
			Skill::liquid =>
				Cow::from("Give target creature 1 poison counter. Target creature's skills are replaced with \"Heal yourself equal to the damage dealt by this card.\""),
			Skill::livingweapon =>
				Cow::from("Equip target creature as a weapon. If target creature's owner already had a weapon equipped, return it to their hand. Heal target creature's owner equal to target creature's HP"),
			Skill::lobotomize => Cow::from("Remove target creature's skills. Also remove psionism"),
			Skill::locket =>
				Cow::from("Gains quanta matching your mark each turn, until set to gain quanta of a specific element. Doesn't operate while frozen"),
			Skill::locketshift =>
				Cow::from("Switch this card's production to match the element of any target, including immaterial & burrowed cards"),
			Skill::loot => Cow::from("When one of your permanents is destroyed, gain control of a random permanent from opponent"),
			Skill::losecharge => {
				let charges = self.get_stat(Stat::charges);
				if charges == 0 {
					Cow::from("Expires at end of turn")
				} else {
					Cow::from(format!("Lasts for {} more turn{}", charges, if charges == 1 { "s" } else { "" }))
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
			Skill::mend => Cow::from(if self.set() == CardSet::Open {
				"Heal target creature 10"
			} else {
				"Heal target creature 5"
			}),
			Skill::metamorph =>
				Cow::from("Change your mark to target's element.\nIncrease your mark power by 1"),
			Skill::midas =>
				Cow::from("Target permanent becomes a Golden Relic with \"2:0: Sacrifice this card & draw a card.\" If target is a weapon, its strength is 1. If target is a shield, its damage reduction is 1"),
			Skill::mill => Cow::from("Destroy top card of target player's deck"),
			Skill::millpillar =>
				Cow::from("If top card of target player's deck is a pillar, pendulum, or tower, destroy that card"),
			Skill::mimic =>
				Cow::from("Whenever another creature enters play, transform this card into a fresh copy of that creature. This creature retains this ability"),
			Skill::miracle =>
				Cow::from("Heal yourself to one below your maximum HP. Consumes all 1:8"),
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
				Cow::from("Give 1 poison counter on hit. Apply neurotoxin on hit. Neurotoxin gives 1 poison counter for every card played by affected player or active ability used by affected creature. Throttled (only triggers twice from Adrenaline)"),
			Skill::neuroify =>
				Cow::from("If target creature or player is poisoned, target gains neurotoxin. Neurotoxin gives 1 poison counter for every card played by affected player or active ability used by affected creature. Remove target's purify counters"),
			Skill::nightmare =>
				Cow::from(if self.set() == CardSet::Open && !self.upped() {
					"Fill opponent's hand with fresh copies of target creature. Deal 1 damage per card added in this way. Heal yourself an equal amount"
				} else {
					"Fill opponent's hand with fresh copies of target creature. Deal 2 damage per card added in this way. Heal yourself an equal amount"
				}),
			Skill::nightshade =>
				Cow::from("Target creature becomes nocturnal, gains 5|5, & loses active skills"),
			Skill::nothrottle => Cow::from("Your creatures whose skills have Throttled lose Throttled"),
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
			Skill::ouija => Cow::from("Whenever a creature dies, add an Ouija Essence to opponent's hand"),
			Skill::ouijadestroy => Cow::from("When destroyed, add 1 to opponent's maximum health"),
			Skill::ouijagrowth => Cow::from("Summon an Ouija Essence on opponent's side of the field"),
			Skill::pacify => Cow::from("Set target creature or weapon's strength to 0"),
			Skill::pairproduce => Cow::from("Your pillars, pendulums, & towers trigger as if end of turn"),
			Skill::paleomagnetism =>
				Cow::from(format!("Summon a {} or pendulum every turn. \u{2154} chance it matches your mark, otherwise it matches your opponent's mark", if self.upped() { "tower" } else { "pillar" } )),
			Skill::pandemonium =>
				Cow::from("Inflict a random effect on every creature. Possible effects include damage, lobotomize, parallel universe, gravity pull, rewind, & freeze. Removes cloak"),
			Skill::pandemonium2 =>
				Cow::from("Inflict a random effect on each of target player's creatures. Possible effects include damage, lobotomize, parallel universe, gravity pull, rewind, & freeze. Removes cloak"),
			Skill::pandemonium3 =>
				Cow::from("Inflict a random effect on every card in play or any hand. All existing effects are possible. Removes cloak"),
			Skill::paradox => Cow::from("Target creature with more strength than HP dies"),
			Skill::parallel => Cow::from("Summon an exact copy of target creature on your side"),
			Skill::patience =>
				Cow::from("If it isn't frozen, prevents your creatures from attacking at the end of your turn, instead they gain 2|1. If they are burrowed, they instead gain 4|1. If they are affected by Flooding, they instead gain 5|2. Does not stack"),
			Skill::phoenix => Cow::from(if self.upped() {
				"When this creature dies, transform it into an Ash"
			} else {
				"When this creature dies, transform it into a Minor Ash"
			}),
			Skill::photosynthesis =>
				Cow::from("Gain 2:5. Unless cost was 0 or 1:0, caster can be reactivated"),
			Skill::pillar => Cow::from(format!("Gain {}:{} every turn", if self.card().element == 0 { '3' } else { '1' }, self.card().element)),
			Skill::pillar1 => Cow::from(format!("Gain {}:{} when played", if self.card().element == 0 { '3' } else { '1' }, self.card().element)),
			Skill::pend =>
				Cow::from(format!("Each turn, switch between gaining {}:{} & one quanta matching your mark", if self.card().element == 0 { '3' } else { '1' }, self.card().element)),
			Skill::plague =>
				Cow::from("Give target player's creatures 1 poison counter each. Removes cloak"),
			Skill::platearmor(x) =>
				Cow::from(format!("Target gains 0|{0}, or target player gains {0} maximum HP & heals {0}", x)),
			Skill::poison(x) => {
				let mut s = if x == 1 { String::from("Give poison counter ") } else { format!("Give {} poison counters ", x) };
				match ev {
					Event::Cast => s.push_str("to target creature"),
					Event::Hit => s.push_str(" on hit. Throttled (only triggers twice from Adrenaline)"),
					_ => return None,
				}
				Cow::from(s)
			},
			Skill::poisonfoe(x) if ev == Event::Cast => Cow::from(
				if x == 1 {
					String::from("Give poison counter to opponent")
				} else {
					format!("Give {} poison counters to opponent", x)
				}
			),
			Skill::poisonfoe(_) if ev == Event::OwnDeath => Cow::from("When this creature dies, give poison counter to opponent"),
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
				Cow::from("Remove all poison counters & sacrifice status from target creature or player. Target creature or player gains two purify counters"),
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
				Cow::from("Target creature becomes immaterial. If target creature is frozen, it loses frozen status"),
			Skill::quinttog =>
				Cow::from("If target creature isn't immaterial, it gains immaterial status, & if it is also frozen, it loses frozen status. If target creature is immaterial, it loses immaterial status"),
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
				Cow::from("Damage dealt by this card also reduces the defender's maximum HP"),
			Skill::regen =>
				Cow::from("Give 1 purify counter to this card's owner on hit. Throttled (only triggers twice from Adrenaline)"),
			Skill::regenerate(x) => Cow::from(format!("Heal yourself {x} every turn or when this card attacks")),
			Skill::regeneratespell =>
				Cow::from("Replace target creature or non-stacking permanent's skills with \"Heal this card's owner 5 every turn or when this card attacks.\""),
			Skill::regrade =>
				Cow::from("If target card is upgraded, it becomes unupgraded. If target card is unupgraded, it becomes upgraded. Gain 1 quanta of target card's element. Cannot target stacks"),
			Skill::reinforce =>
				Cow::from("Target creature gains strength & HP equal to this creature's strength & HP. Destroy this creature"),
			Skill::ren => Cow::from("Target creature gains: \"When dying instead return to owner's hand. Modified state besides this effect remains when played again.\""),
			Skill::resummon => Cow::from("Target creature is summoned again as is"),
			Skill::rewind =>
				Cow::from("Put target creature on top of its owner's deck. Removes all bonuses & modifiers on target creature"),
			Skill::reveal if ev == Event::OwnPlay => Cow::from("Reveal opponent's hand when played & on attack"),
			Skill::ricochet =>
				Cow::from("Any targeted spells cast by either player are copied when played. The copy has a random caster & a random non-player target"),
			Skill::sabbath =>
				Cow::from("Target cannot gain quanta through the end of their next turn. Their deck is protected until start of their next turn.\nSilence all your opponent's creatures & heal all your creatures by 8"),
			Skill::sadism => Cow::from("Whenever any creatures are damaged, heal yourself an equal amount"),
			Skill::salvage =>
				Cow::from("Whenever a permanent is destroyed, gain 1|1. Once per turn, when opponent destroys a permanent, add a copy of that permanent to your hand"),
			Skill::salvageoff => Cow::from("Cannot salvage another destroyed permanent until next turn"),
			Skill::sanctify if ev == Event::OwnAttack => Cow::from("During your opponent's turn, your hand & quanta pool are protected & you cannot be silenced"),
			Skill::sanctify if ev == Event::OwnDraw => Cow::from("When drawn, your hand & quanta pool are protected & you cannot be silenced"),
			Skill::unsanctify if ev == Event::OwnPlay => Cow::from("Nullify opponent's sanctuary effect from Sanctuary or Dream Catcher"),
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
			Skill::shtriga => Cow::from("Gain immaterial when your next turn starts"),
			Skill::shuffle3 =>
				Cow::from("Shuffle 3 copies of target creature into your deck & expend a charge. Destroyed when all charges expended"),
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
				Cow::from("Copy target creature or weapon's skills. Remove skills from target. Caster can be reactivated"),
			Skill::siphonstrength => Cow::from("Target creature loses 1|0. Gain 1|0"),
			Skill::skeleton =>
				Cow::from("If this creature is targeted by Rewind, it becomes a random creature"),
			Skill::skull =>
				Cow::from("Attacking creatures may randomly die & are replaced by Skeletons. Creatures with lower HP are more likely to die"),
			Skill::skyblitz =>
				Cow::from("Your airborne creatures all dive (double their strength until end of turn.) Consumes all 1:9"),
			Skill::slow => Cow::from("Non-ranged attackers are delayed for one turn after their attack. Delayed creatures may not attack or use active skills"),
			Skill::snipe => Cow::from("Deal 3 damage to target creature"),
			Skill::solar => Cow::from("Gain 1:8 for each attacker"),
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
				Cow::from("Gain maximum HP & heal an amount equal to the 1:4 in your quanta pool after casting this spell"),
			Skill::stasis => Cow::from("Creatures do not attack at the end of each player's turn"),
			Skill::stasisdraw =>
				Cow::from("Target player cannot draw cards from their deck until their end of turn, instead drawing unupgraded singularities. Their deck is protected until their next turn starts"),
			Skill::r#static => Cow::from("Deals 2 spell damage to opponent for each attacker"),
			Skill::steal => Cow::from("You gain control of target permanent"),
			Skill::steam =>
				Cow::from("Gain 5|0. This creature loses 1|0 of strength gained in this way after each attack"),
			Skill::stoneform => Cow::from("Gain 0|20. Become a golem"),
			Skill::storm(x) =>
				Cow::from(format!("Deal {x} spell damage to all of target player's creatures. Removes cloak")),
			Skill::summon(code) =>
				Cow::from(format!("Summon a {}", self.cards().get(code as i16).name)),
			Skill::swarm =>
				Cow::from("Base HP is equal to the number of Scarabs you control, including this one"),
			Skill::swave =>
				Cow::from("Deal 4 spell damage to target creature or player. If target creature is frozen, it dies. If target player's weapon is frozen, destroy it"),
			Skill::tempering(x) =>
				Cow::from(format!("Target weapon gains {x} strength. If target weapon is frozen, it loses frozen status")),
			Skill::tesseractsummon =>
				Cow::from("Summon 2 random creatures from your deck. Opponent summons 1 random creature from their deck. Freeze these creatures for a number of turns equal to \u{00bc} of their quanta cost, rounded up"),
			Skill::thorn(x) => Cow::from(format!("{x}% chance to give non-ranged attackers 1 poison counter")),
			Skill::throwrock => Cow::from(if self.upped() {
				"Deal 4 damage to target creature, then shuffle Throw Rock into its owner's deck"
			} else {
				"Deal 3 damage to target creature, then shuffle Throw Rock into its owner's deck"
			}),
			Skill::tick => Cow::from(if self.upped() {
				"This creature takes 3 damage. If this damage kills the creature, deal 4 spell damage to all of opponent's creatures"
			} else {
				"This creature takes 1 damage. If this damage kills the creature, deal 18 spell damage to opponent"
			}),
			Skill::tidalhealing =>
				Cow::from("Remove frozen status & poison counters from all your creatures. Your aquatic creatures gain \"Give 1 purify counter to this card's owner on hit. Throttled (only triggers twice from Adrenaline)\". This ability does not stack"),
			Skill::tornado => Cow::from(if self.upped() {
				"Randomly choose two of opponent's permanents. Each selected permanent is shuffled into a random player's deck"
			} else {
				"Randomly choose two of opponent's permanents & one of your permanents. Each selected permanent is shuffled into a random player's deck"
			}),
			Skill::trick =>
				Cow::from("If target creature's owner has creatures in their deck, put target creature into their deck & summon a random different creature from their deck"),
			Skill::turngolem =>
				Cow::from("This card becomes a creature with Gravity Pull. Set the creature's HP to the total damage this card blocked while it was a shield. Set the creature's strength to half its HP"),
			Skill::unsummon =>
				Cow::from("Return target creature to its owner's hand. Remove any modifiers & statuses on target creature. If owner's hand is full, instead return target creature to top of its owner's deck"),
			Skill::unsummonquanta =>
				Cow::from("Return target creature to its owner's hand. Remove any modifiers & statuses on target creature. If owner's hand is full, instead return target creature to top of its owner's deck. Gain quanta equivalent to target card's cost"),
			Skill::unvindicate =>
				Cow::from("Cannot activate vindicate again until the start of its next turn"),
			Skill::upkeep =>
				Cow::from(format!("Pay 1:{} at the end of your turn. If you cannot, destroy this card", self.card().element)),
			Skill::upload => Cow::from("Target creature or weapon gains 2|0. This creature loses 0|2"),
			Skill::vampire => Cow::from("Heal yourself equal to the damage dealt by this card"),
			Skill::vend => Cow::from("Sacrifice this card. Draw a card"),
			Skill::vengeance =>
				Cow::from("Whenever one of your creatures dies during opponent's turn, your creatures attack & this card loses a charge"),
			Skill::vindicate =>
				Cow::from("Once per turn, when one of your creatures dies, it attacks an additional time before dying"),
			Skill::virtue =>
				Cow::from("When this creature attacks, if any damage is blocked by opponent's shield, your maximum HP is increased by the amount of this creature's damage that was blocked"),
			Skill::virusinfect =>
				Cow::from("Sacrifice this creature. Give target creature 1 poison counter"),
			Skill::virusplague =>
				Cow::from("Sacrifice this creature. Give target player's creatures 1 poison counter"),
			Skill::void => Cow::from(if self.set() == CardSet::Open {
				"Reduce opponent's maximum HP by 3"
			} else {
				"Reduce foe's maximum HP by 2, 3 if mark is 1:11"
			}),
			Skill::voidshell =>
				Cow::from("Block all damage from attackers. Reduce your maximum HP equal to the damage blocked by this card"),
			Skill::web => Cow::from("Target creature loses airborne status"),
			Skill::weight => Cow::from("Evade all attackers that have more than 5HP"),
			Skill::wind => Cow::from("Restore any strength lost by halving after attacking. Increase HP by amount restored"),
			Skill::wings => Cow::from("Evade all non-airborne, non-ranged attackers"),
			Skill::wisdom => Cow::from(if self.set() == CardSet::Open {
				"Target gains 4|0. May target immaterial cards. If it targets an immaterial card, that card gains psionic. Psionic cards deal spell damage & typically bypass shields"
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
			Skill::v_divinity => Cow::from("Add 24 to maximum health if mark 1:8, otherwise 16 & heal same"),
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
				Cow::from("Target creature's active becomes costless. Skill can be reactivated"),
			Skill::v_relic => Cow::from("Worthless"),
			Skill::v_rewind =>
				Cow::from("Remove target creature to top of owner's deck. If target is a Skeleton, transform it into a random creature. If target is a Mummy, transform it into a Pharaoh"),
			Skill::v_salvage => Cow::from("Restore permanents destroyed by foe to hand once per turn"),
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
			Skill::v_thorn => Cow::from("75% chance to poison attackers"),
			Skill::v_virusplague => Cow::from("Sacrifice self & poison foe's creatures"),
			Skill::dagger => Cow::from("Gain 1 strength if your mark is 1:2 1:11. Gain 1 strength per Darkness or Death non-pillar permanent you control"),
			Skill::hammer => Cow::from("Gain 1 strength if your mark is 1:3 1:4"),
			Skill::bow => Cow::from("Gain 1 strength if your mark is 1:8 1:9"),
			Skill::staff => Cow::from("Gain 1 strength if your mark is 1:5 1:7"),
			Skill::disc => Cow::from("Gain 1 strength if your mark is 1:1 1:12"),
			Skill::axe => Cow::from("Gain 1 strength if your mark is 1:6 1:10"),
			Skill::v_dagger => Cow::from("Gain 1 strength if your mark is 1:2 1:11"),
			Skill::v_bow => Cow::from("Gain 1 strength if your mark is 1:9"),
			_ => return None
		})
	}

	pub fn info(&self) -> String {
		let card = self.card();
		if card.kind == Kind::Spell && matches!(self, &Self::Card(..)) {
			card.skill
				.iter()
				.find(|&(k, _)| *k == Event::Cast)
				.and_then(|&(_, sk)| sk.first())
				.cloned()
				.and_then(|sk| self.sktext(Event::Cast, sk))
				.map(|s| {
					let mut owned = s.into_owned();
					owned.push('.');
					owned
				})
				.unwrap_or(String::new())
		} else {
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
								if c.skill.iter().any(|&(ev, sk)| ev == Event::OwnAttack && sk.iter().cloned().any(|s| s == Skill::losecharge)) {
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
							Self::Card(..) => write!(stext, "Enters play with {} poison counter{}.\n", v, if v == 1 { "" } else { "s" }),
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
					Flag::nightfall => ret.push_str(if self.upped() {
						"Nocturnal creatures gain 2|1 while Eclipse is in play. Does not stack.\n"
					} else {
						"Nocturnal creatures gain 1|1 while Nightfall is in play. Does not stack.\n"
					}),
					Flag::whetstone => ret.push_str(if self.upped() {
						"Weapons & golems gain 1|2 while Whetstone is in play. Does not stack.\n"
					} else {
						"Weapons & golems gain 1|1 while Whetstone is in play. Does not stack.\n"
					}),
					Flag::additive => ret.push_str("additive, "),
					Flag::aflatoxin => ret.push_str("aflatoxin, "),
					Flag::airborne => ret.push_str("airborne, "),
					Flag::appeased => ret.push_str("appeased, "),
					Flag::aquatic => ret.push_str("aquatic, "),
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
					Flag::salvaged => ret.push_str("salvaged, "),
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
				if ev != Event::Cast
					|| self.kind() != Kind::Spell
					|| self.card().kind != Kind::Spell
				{
					for &s in sk {
						if let Some(text) = self.sktext(ev, s) {
							if ev == Event::Cast {
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

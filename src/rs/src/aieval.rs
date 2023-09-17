#![no_std]
#![allow(non_upper_case_globals)]

use alloc::vec::Vec;
use core::cmp;
use core::default::Default;
use core::iter::once;
use core::ops::{Index, IndexMut};

use crate::card::{self, CardSet};
use crate::etg;
use crate::game::{Flag, Game, Kind, Stat};
use crate::skill::{Event, Skill};

struct DamageMap(Vec<f32>);

impl DamageMap {
	fn new(size: usize) -> Self {
		let mut v = Vec::with_capacity(size);
		v.resize(size, 0.0);
		DamageMap(v)
	}
}

impl Index<i32> for DamageMap {
	type Output = f32;

	fn index(&self, id: i32) -> &f32 {
		self.0.index(id as usize)
	}
}

impl IndexMut<i32> for DamageMap {
	fn index_mut(&mut self, id: i32) -> &mut f32 {
		self.0.index_mut(id as usize)
	}
}

struct QuantaMap(Vec<(i32, [u16; 12])>);

impl QuantaMap {
	fn add(quanta: &mut [u16; 12], element: i32, amount: i32) {
		if element == 0 {
			let q0 = amount << 8;
			for q in quanta.iter_mut() {
				*q = q.saturating_add(((amount << 8) / 12).max(25344) as u16);
			}
		} else {
			let q = &mut quanta[(element - 1) as usize];
			*q = q.saturating_add((amount.max(99) << 8) as u16);
		}
	}

	fn new(ctx: &Game) -> Self {
		let pls = ctx.players_ref();
		let mut v = Vec::with_capacity(pls.len());
		for &pl in pls.iter() {
			let player = ctx.get_player(pl);
			let mut quanta = [0u16; 12];
			QuantaMap::add(
				&mut quanta,
				player.mark,
				(player.markpower as i32) * if player.markpower == 0 { 3 } else { 1 },
			);
			for &id in player.creatures.iter().chain(player.permanents.iter()) {
				for skill in ctx.getSkill(id, Event::OwnAttack).iter().cloned() {
					match skill {
						Skill::quanta(q) => {
							QuantaMap::add(&mut quanta, q as i32, 1);
						}
						Skill::pend => {
							let element = ctx.get_card(ctx.get(id, Stat::card)).element as i32;
							let charges = ctx.get(id, Stat::charges);
							QuantaMap::add(
								&mut quanta,
								element,
								charges * if element == 0 { 3 } else { 1 } / 2,
							);
							QuantaMap::add(
								&mut quanta,
								player.mark,
								charges * if player.mark == 0 { 3 } else { 1 } / 2,
							);
						}
						Skill::pillar => {
							let element = ctx.get_card(ctx.get(id, Stat::card)).element as i32;
							let charges = ctx.get(id, Stat::charges);
							QuantaMap::add(
								&mut quanta,
								element,
								charges * if element == 0 { 3 } else { 1 },
							);
						}
						Skill::quadpillar(eles) => {
							let amount = (ctx.get(id, Stat::charges) * 107) as u16;
							for i in (0..16).step_by(4) {
								let q = &mut quanta[(((eles >> i) & 15) - 1) as usize];
								*q = q.saturating_add(amount);
							}
						}
						Skill::locket => {
							let element = ctx.get(id, Stat::mode);
							QuantaMap::add(
								&mut quanta,
								if element == -1 { player.mark } else { element },
								1,
							);
						}
						_ => {}
					}
				}
			}
			v.push((pl, quanta));
		}

		QuantaMap(v)
	}

	fn get(&self, id: i32, element: i32) -> u16 {
		self.0
			.iter()
			.find(|&&(pl, _)| pl == id)
			.map(|&(_, q)| {
				(if element == 0 {
					let mut s = 0u16;
					for &amt in q.iter() {
						s = s.saturating_add(amt);
					}
					s
				} else {
					q[(element - 1) as usize]
				}) >> 8
			})
			.unwrap_or_default()
	}
}

fn eval_skill(
	ctx: &Game,
	c: i32,
	skills: &[Skill],
	ttatk: f32,
	damage: &DamageMap,
	quantamap: &QuantaMap,
) -> f32 {
	const FateEgg: u16 = card::FateEgg as u16;
	const FateEggUp: u16 = card::Upped(card::FateEgg) as u16;
	const Firefly: u16 = card::Firefly as u16;
	const FireflyUp: u16 = card::Upped(card::Firefly) as u16;
	const Scarab: u16 = card::Scarab as u16;
	const ScarabUp: u16 = card::Upped(card::Scarab) as u16;
	const Shadow: u16 = card::Shadow as u16;
	const ShadowUp: u16 = card::Upped(card::Shadow) as u16;
	const Spark: u16 = card::Spark as u16;
	const SparkUp: u16 = card::Upped(card::Spark) as u16;
	const Phantom: u16 = card::Phantom as u16;
	const PhantomUp: u16 = card::Upped(card::Phantom) as u16;
	const FireflyV: u16 = card::v_Firefly as u16;
	const FireflyUpV: u16 = card::Upped(card::v_Firefly) as u16;
	const ScarabV: u16 = card::v_Scarab as u16;
	const ScarabUpV: u16 = card::Upped(card::v_Scarab) as u16;
	skills
		.iter()
		.map(|&sk| match sk {
			Skill::acceleration => 5.0,
			Skill::accretion => 8.0,
			Skill::adrenaline => 8.0,
			Skill::aflatoxin => 5.0,
			Skill::aggroskele => 2.0,
			Skill::alphawolf => {
				if ctx.get_kind(c) == Kind::Spell {
					3.0
				} else {
					0.0
				}
			}
			Skill::antimatter => 12.0,
			Skill::appease => {
				if ctx.get_kind(c) == Kind::Spell {
					-6.0
				} else if ctx.get(c, Flag::appeased) {
					0.0
				} else {
					ctx.trueatk(c) as f32 * -1.5
				}
			}
			Skill::bblood | Skill::v_bblood => 7.0,
			Skill::beguilestop => {
				(if ctx.hasskill(c, Event::OwnAttack, Skill::singularity) {
					60.0
				} else {
					0.0
				}) - damage[c]
			}
			Skill::bellweb => 1.0,
			Skill::blackhole | Skill::v_blackhole => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				(ctx.get_player(foe)
					.quanta
					.iter()
					.map(|&q| cmp::min(q, 3))
					.sum::<u8>()) as f32 / 24.0
			}
			Skill::bless => 4.0,
			Skill::bloodmoon => 4.5,
			Skill::boneyard => 3.0,
			Skill::bounce => 1.0,
			Skill::bravery => {
				let owner = ctx.get_owner(c);
				cmp::min(
					2,
					8 - cmp::max(
						ctx.get_player(owner).hand_len() - 1,
						ctx.get_player(ctx.get_foe(owner)).hand_len(),
					),
				) as f32
			}
			Skill::brawl => 8.0,
			Skill::brew => 4.0,
			Skill::brokenmirror => {
				let shield = ctx.get_shield(ctx.get_foe(ctx.get_owner(c)));
				if shield == 0 || !ctx.get(shield, Flag::reflective) {
					2.0
				} else {
					-3.0
				}
			}
			Skill::bubbleclear => 3.0,
			Skill::burrow | Skill::v_burrow | Skill::v_unburrow => 1.0,
			Skill::butterfly => 12.0,
			Skill::catapult => 6.0,
			Skill::chimera => 4.0,
			Skill::chromastat => (3 + ctx.trueatk(c) + ctx.truehp(c)) as f32 / 3.0,
			Skill::clear => 2.0,
			Skill::corpseexplosion => 1.0,
			Skill::counter => 3.0,
			Skill::countimmbur => 1.0,
			Skill::cpower => 4.0,
			Skill::cseed => 4.0,
			Skill::cseed2 => 4.0,
			Skill::creatureupkeep => {
				let owner = ctx.get_owner(c);
				[(owner, 1), (ctx.get_foe(owner), -1)]
					.into_iter()
					.map(|(pl, multiply)| {
						let mut score = 0;
						let mut ecount = [0u8; 12];
						let mut hassingu = [false; 12];
						let player = ctx.get_player(pl);
						for &cr in player.creatures.iter() {
							if cr != 0 {
								score -= 1;
								let e = ctx.get_card(ctx.get(cr, Stat::card)).element as i32;
								let eidx = (e - 1) as usize;
								if ctx.hasskill(cr, Event::OwnAttack, Skill::singularity) {
									score += 256;
									if e != etg::Chroma {
										hassingu[eidx] = true;
									}
								}
								if e != etg::Chroma {
									ecount[eidx] += etg::countAdrenaline(ctx.trueatk(cr)) as u8;
								}
							}
						}
						for (idx, &count) in ecount.iter().enumerate() {
							if hassingu[idx] {
								continue;
							}
							let count = count as u16;
							let e = idx as i32 + 1;
							let q = quantamap.get(pl, e);
							if q < count {
								score -= (count - q) as i32 * 16;
							}
						}
						score * multiply
					})
					.sum::<i32>() as f32 / 8.0
			}
			Skill::deadalive => 2.0,
			Skill::deathwish => 1.0,
			Skill::deckblast => ctx.get_player(ctx.get_owner(c)).deck.len() as f32 / 2.0,
			Skill::deepdive | Skill::deepdiveproc => {
				if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as f32
				} else {
					ttatk / 1.5
				}
			}
			Skill::deja => 4.0,
			Skill::deployblobs => {
				(8 + if ctx.get_kind(c) == Kind::Spell {
					let card = ctx.get_card(ctx.get(c, Stat::card));
					cmp::min(card.attack, card.health) as i32
				} else {
					cmp::min(ctx.truehp(c), ctx.truehp(c))
				}) as f32 / 4.0
			}
			Skill::destroy => 8.0,
			Skill::destroycard => 1.0,
			Skill::devour => {
				(2 + if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).health as i32
				} else {
					ctx.truehp(c)
				}) as f32
			}
			Skill::die => 0.5,
			Skill::disarm => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				let weapon = ctx.get_weapon(foe);
				if weapon == 0 {
					0.1
				} else if ctx.get_player(foe).hand_full() {
					0.5
				} else {
					ctx.get(weapon, Stat::cost) as f32
				}
			}
			Skill::disfield => (3 + quantamap.get(ctx.get_owner(c), etg::Chroma)) as f32,
			Skill::disshield => (2 + quantamap.get(ctx.get_owner(c), etg::Entropy)) as f32,
			Skill::dive => {
				if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as f32
				} else {
					ttatk - ctx.get(c, Stat::dive) as f32 / 1.5
				}
			}
			Skill::divinity | Skill::v_divinity => 3.0,
			Skill::drainlife | Skill::v_drainlife(_) => 10.0,
			Skill::draft => 1.0,
			Skill::drawcopy => 1.0,
			Skill::drawequip => 2.0,
			Skill::drawpillar => 1.0,
			Skill::dryspell => 5.0,
			Skill::dshield | Skill::v_dshield => 4.0,
			Skill::duality => 4.0,
			Skill::earthquake => 4.0,
			Skill::eatspell => 3.0,
			Skill::embezzle => 7.0,
			Skill::empathy => ctx.count_creatures(ctx.get_owner(c)) as f32,
			Skill::enchant => 6.0,
			Skill::endow | Skill::v_endow => 4.0,
			Skill::envenom => 3.0,
			Skill::epidemic => 4.0,
			Skill::epoch => 2.0,
			Skill::evolve => 3.0,
			Skill::feed => 6.0,
			Skill::fickle => 3.0,
			Skill::firebolt | Skill::v_firebolt(_) => 10.0,
			Skill::flyingweapon | Skill::v_flyingweapon => 7.0,
			Skill::foedraw => 8.0,
			Skill::forcedraw => -10.0,
			Skill::forceplay => 2.0,
			Skill::fractal => (20 - ctx.get_player(ctx.get_owner(c)).hand_len()) as f32 / 4.0,
			Skill::freedom => 4.0,
			Skill::freeze(x) => x as f32,
			Skill::freezeperm => 4.0,
			Skill::fungusrebirth => 1.0,
			Skill::gas => 5.0,
			Skill::give => 1.0,
			Skill::golemhit => {
				let mut dmg = 0.0;
				for &cr in ctx.get_player(ctx.get_owner(c)).creatures.iter() {
					if cr != 0
						&& ctx.get(cr, Flag::golem)
						&& ctx.get(cr, Stat::delayed) == 0
						&& ctx.get(cr, Stat::frozen) == 0
					{
						let atk = damage[cr];
						if atk > dmg {
							dmg = atk;
						}
					}
				}
				dmg
			}
			Skill::gpull => {
				if ctx.get_kind(c) == Kind::Spell || c != ctx.get(ctx.get_owner(c), Stat::gpull) {
					2.0
				} else {
					0.0
				}
			}
			Skill::gpullspell => 3.0,
			Skill::grave => 1.0,
			Skill::growth(atk, hp) => (atk + hp) as f32,
			Skill::guard => ttatk + (4 + ctx.get(c, Flag::airborne) as i32) as f32,
			Skill::halveatk => {
				if ctx.get_kind(c) == Kind::Spell {
					-ctx.get_card(ctx.get(c, Stat::card)).attack as f32 / 4.0
				} else if ttatk == 0.0 {
					0.0
				} else {
					ttatk.signum()
				}
			}
			Skill::hasten => (ctx.get_player(ctx.get_owner(c)).deck.len() as f32 / 4.0).min(6.0),
			Skill::hatch | Skill::v_hatch => 4.0,
			Skill::heal => {
				if ctx.get(ctx.get_foe(ctx.get_owner(c)), Stat::sosa) != 0 {
					16.0
				} else {
					8.0
				}
			}
			Skill::heatmirror => 2.0,
			Skill::hitownertwice => {
				(if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as i32
				} else {
					ctx.trueatk(c)
				} * -32) as f32
			}
			Skill::holylight | Skill::v_holylight => 3.0,
			Skill::hope | Skill::v_hope => 2.0,
			Skill::icebolt | Skill::v_icebolt(_) => 10.0,
			Skill::ignite => 10.0,
			Skill::immolate(_) => 5.0,
			Skill::improve | Skill::v_improve => 6.0,
			Skill::inertia => 2.0,
			Skill::ink => 3.0,
			Skill::innovation => 3.0,
			Skill::integrity | Skill::v_integrity => 4.0,
			Skill::jelly => 5.0,
			Skill::jetstream => 2.5,
			Skill::lightning => 6.0,
			Skill::liquid => 5.0,
			Skill::livingweapon => 2.0,
			Skill::lobotomize => 6.0,
			Skill::locket => 1.0,
			Skill::loot => 2.0,
			Skill::luciferin => 3.0,
			Skill::lycanthropy => 4.0,
			Skill::mend => 3.0,
			Skill::metamorph => 2.0,
			Skill::midas => 6.0,
			Skill::mill => 1.0,
			Skill::millpillar => 1.0,
			Skill::mimic => 3.0,
			Skill::miracle => ctx.get(ctx.get_owner(c), Stat::maxhp) as f32 / 8.0,
			Skill::mitosis => (4 + ctx.get_card(ctx.get(c, Stat::card)).cost) as f32,
			Skill::mitosisspell => 6.0,
			Skill::momentum => 2.0,
			Skill::mutation | Skill::v_mutation => 4.0,
			Skill::neuro => {
				if ctx.get(ctx.get_foe(ctx.get_owner(c)), Flag::neuro) {
					4.0
				} else {
					6.0
				}
			}
			Skill::neuroify => {
				if ctx.get(ctx.get_foe(ctx.get_owner(c)), Flag::neuro) {
					1.0
				} else {
					2.0
				}
			}
			Skill::nightmare => {
				let owner = ctx.get_owner(c);
				let n = ctx
					.get_player(owner)
					.hand
					.iter()
					.map(|&inst| card::IsOf(ctx.get(inst, Stat::card), card::Nightmare) as usize)
					.sum::<usize>();
				((24 - ctx.get_player(ctx.get_foe(owner)).hand_len()) >> n) as f32
			}
			Skill::nightshade => 6.0,
			Skill::nova => 4.0,
			Skill::nova2 => 6.0,
			Skill::nullspell => 4.0,
			Skill::nymph | Skill::v_nymph => 7.0,
			Skill::ouija => 3.0,
			Skill::pacify => 5.0,
			Skill::pairproduce => 2.0,
			Skill::paleomagnetism => {
				let owner = ctx.get_owner(c);
				(if card::Upped(ctx.get(c, Stat::card)) {
					2.0
				} else {
					1.0
				} + 64.0
					/ (quantamap.get(owner, ctx.get_player(owner).mark) * 3
						+ quantamap.get(owner, ctx.get_player(ctx.get_foe(owner)).mark)) as f32)
					.ln()
			}
			Skill::pandemonium | Skill::v_pandemonium => 3.0,
			Skill::pandemonium2 => 4.0,
			Skill::pandemonium3 => 5.0,
			Skill::paradox => 5.0,
			Skill::parallel => 8.0,
			Skill::patience => 2.0,
			Skill::phoenix => 3.0,
			Skill::photosynthesis => 2.0,
			Skill::plague | Skill::v_plague => 5.0,
			Skill::platearmor(x) => x as f32,
			Skill::poison(x) => x as f32,
			Skill::poisonfoe(x) => x as f32,
			Skill::powerdrain => 6.0,
			Skill::precognition => 1.0,
			Skill::predator => {
				let foehandlen = ctx.get_player(ctx.get_foe(ctx.get_owner(c))).hand_len() as i32;
				if foehandlen > 4 && ctx.get_kind(c) != Kind::Spell {
					ttatk + cmp::max(foehandlen - 6, 1) as f32
				} else {
					1.0
				}
			}
			Skill::protectonce => 2.0,
			Skill::protectall => 4.0,
			Skill::purify => 2.0,
			Skill::quanta(_) => 0.1,
			Skill::quint => 6.0,
			Skill::quinttog => 7.0,
			Skill::rage => {
				if card::Upped(ctx.get(c, Stat::card)) {
					5.0
				} else {
					6.0
				}
			}
			Skill::readiness | Skill::v_readiness => 3.0,
			Skill::reap => 7.0,
			Skill::rebirth => {
				if card::Upped(ctx.get(c, Stat::card)) {
					5.0
				} else {
					2.0
				}
			}
			Skill::reducemaxhp => {
				(if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as f32
				} else {
					ttatk
				}) / 2.0
			}
			Skill::regenerate(amt) => amt as f32,
			Skill::regeneratespell => 5.0,
			Skill::regrade => 3.0,
			Skill::reinforce => 0.5,
			Skill::ren => 5.0,
			Skill::rewind | Skill::v_rewind => 6.0,
			Skill::ricochet => 2.0,
			Skill::sabbath => 1.0,
			Skill::sadism => 5.0,
			Skill::salvage | Skill::v_salvage => 2.0,
			Skill::sanctify => 2.0,
			Skill::scramble | Skill::v_scramble => {
				(13 - ctx
					.get_player(ctx.get_foe(ctx.get_owner(c)))
					.quanta
					.iter()
					.map(|&q| (q != 0) as i32)
					.sum::<i32>()) as f32
					/ 2.0
			}
			Skill::serendipity | Skill::v_serendipity => 4.0,
			Skill::shtriga => 6.0,
			Skill::shuffle3 => 7.0,
			Skill::silence | Skill::v_silence => 1.0,
			Skill::singularity | Skill::v_singularity => -64.0,
			Skill::sinkhole => 3.0,
			Skill::siphon => 4.0,
			Skill::siphonactive => 3.0,
			Skill::siphonstrength => 4.0,
			Skill::skyblitz => 10.0,
			Skill::snipe => 3.0,
			Skill::sosa => 6.0,
			Skill::soulcatch => 2.0,
			Skill::spores => 4.0,
			Skill::sskin => 15.0,
			Skill::stasisdraw => 1.0,
			Skill::steal | Skill::v_steal => 6.0,
			Skill::steam => 6.0,
			Skill::stoneform | Skill::v_stoneform => 1.0,
			Skill::storm(x) | Skill::v_storm(x) | Skill::firestorm(x) => (x * 4) as f32,
			Skill::summon(FateEgg) => 3.0,
			Skill::summon(FateEggUp) => 4.0,
			Skill::summon(Firefly) | Skill::summon(FireflyV) => 4.0,
			Skill::summon(FireflyUp) | Skill::summon(FireflyUpV) => 4.5,
			Skill::summon(Scarab) | Skill::summon(ScarabV) => 4.0,
			Skill::summon(ScarabUp) | Skill::summon(ScarabUpV) => 4.5,
			Skill::summon(Shadow) => 3.0,
			Skill::summon(ShadowUp) => 4.0,
			Skill::summon(Spark) => 2.0,
			Skill::summon(SparkUp) => 3.0,
			Skill::summon(Phantom) => 3.0,
			Skill::summon(PhantomUp) => 3.5,
			Skill::swave => 6.0,
			Skill::tempering(x) => x as f32,
			Skill::tesseractsummon => 8.0,
			Skill::throwrock => 4.0,
			Skill::tick => {
				if ctx.get_kind(c) == Kind::Spell {
					1.0
				} else {
					1.0 + (ctx.get(c, Stat::maxhp) - ctx.truehp(c)) as f32
						/ ctx.get(c, Stat::maxhp) as f32
				}
			}
			Skill::tornado => 9.0,
			Skill::trick => 4.0,
			Skill::turngolem => (ctx.get(c, Stat::storedpower) / 2) as f32,
			Skill::unsummon => 1.0,
			Skill::unsummonquanta => 3.0,
			Skill::upkeep => -0.5,
			Skill::upload => 3.0,
			Skill::vampire => {
				(if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as f32
				} else {
					ttatk
				}) * 0.2
			}
			Skill::virtue => {
				if ctx.get_kind(c) == Kind::Spell {
					let foeshield = ctx.get_shield(ctx.get_foe(ctx.get_owner(c)));
					if foeshield != 0 {
						cmp::min(
							ctx.truedr(foeshield),
							ctx.get_card(ctx.get(c, Stat::card)).attack as i32,
						) as f32
					} else {
						0.5
					}
				} else {
					(ctx.trueatk(c) as f32 - damage[c]) / 1.5
				}
			}
			Skill::virusplague | Skill::v_virusplague => 1.0,
			Skill::void => 5.0,
			Skill::web => 1.0,
			Skill::wind => ctx.get(c, Stat::storedpower) as f32 / 2.0,
			Skill::wisdom => 4.0,
			Skill::yoink => 4.0,
			Skill::vengeance => 2.0,
			Skill::vindicate => 3.0,
			Skill::pillar | Skill::pend | Skill::quadpillar(_) => {
				if ctx.get_kind(c) == Kind::Spell {
					0.1
				} else {
					(ctx.get(c, Stat::charges) as f32).sqrt()
				}
			}
			Skill::absorber => 5.0,
			Skill::blockwithcharge => {
				ctx.get(c, Stat::charges) as f32
					/ (1 + ctx.count_creatures(ctx.get_foe(ctx.get_owner(c))) * 2) as f32
			}
			Skill::cold | Skill::v_cold => 7.0,
			Skill::despair => 5.0,
			Skill::evade100 => {
				if ctx.get(c, Stat::charges) == 0 && ctx.get_owner(c) == ctx.turn {
					0.0
				} else {
					1.0
				}
			}
			Skill::evade(_) => 1.0,
			Skill::firewall | Skill::v_firewall => {
				4.0 + ctx
					.get_player(ctx.get_foe(ctx.get_owner(c)))
					.creatures
					.iter()
					.filter(|&&cr| cr != 0)
					.map(|&cr| (cmp::max(6 - ctx.get(c, Stat::hp), 2) as f32).ln())
					.sum::<f32>() / 2.0
			}
			Skill::chaos => {
				if card::Upped(ctx.get(c, Stat::card)) {
					8.0
				} else {
					9.0
				}
			}
			Skill::skull => 5.0,
			Skill::slow | Skill::v_slow => 6.0,
			Skill::solar => {
				let coq = ctx.get_player(ctx.get_owner(c)).quanta(etg::Light) as f32;
				5.0 - (4.0 * coq) / (4.0 + coq)
			}
			Skill::thorn(chance) => chance as f32 / 15.0,
			Skill::vend => 1.0,
			Skill::v_dessication => 8.0,
			Skill::v_freedom => (ctx.get(c, Stat::charges) * 5) as f32,
			Skill::v_gratitude => (ctx.get(c, Stat::charges) * 4) as f32,
			Skill::v_heal => 8.0,
			Skill::v_thorn => 5.0,
			Skill::v_void => (ctx.get(c, Stat::charges) * 5) as f32,
			_ => 0.0,
		})
		.sum()
}

fn throttled(s: Skill) -> bool {
	matches!(
		s,
		Skill::poison(_) | Skill::neuro | Skill::regen | Skill::siphon
	)
}

fn caneventuallyactive(
	ctx: &Game,
	id: i32,
	cost: i32,
	costele: i32,
	quantamap: &QuantaMap,
) -> bool {
	let pl = ctx.get_player(id);
	cost <= 0
		|| costele == etg::Chroma
		|| pl.quanta(costele) as i32 >= cost
		|| quantamap.get(id, costele) > 0
}

#[derive(Clone, Copy)]
enum WallShield {
	Chargeblock(i32),
	Disentro(i32),
	Dischroma(i32),
	Voidshell(i32),
	Evade(f32),
	Evade100,
	Weight,
	Wings,
}

impl WallShield {
	pub fn dmg(&mut self, ctx: &Game, id: i32, dmg: i32) -> f32 {
		match *self {
			WallShield::Chargeblock(ref mut charges) => {
				if *charges > 0 {
					*charges -= 1;
					return 0.0;
				}
			}
			WallShield::Disentro(ref mut q) => {
				if *q > 0 {
					*q -= (dmg + 2) / 3;
					return 0.0;
				}
			}
			WallShield::Evade(x) => return (dmg as f32) * x,
			WallShield::Dischroma(ref mut q) => {
				if *q > 0 {
					*q -= dmg;
					return 0.0;
				}
			}
			WallShield::Voidshell(ref mut maxhp) => {
				if *maxhp > 1 {
					*maxhp = cmp::max(*maxhp - dmg, 1);
					return 0.0;
				}
			}
			WallShield::Evade100 => {
				return 0.0;
			}
			WallShield::Weight => {
				if ctx.get_kind(id) == Kind::Creature && ctx.truehp(id) > 5 {
					return 0.0;
				}
			}
			WallShield::Wings => {
				if !ctx.get(id, Flag::airborne | Flag::ranged) {
					return 0.0;
				}
			}
		}
		dmg as f32
	}
}

#[derive(Default, Clone, Copy)]
struct Wall {
	pub shield: Option<WallShield>,
	pub dmg: i16,
	pub patience: bool,
}

fn estimate_damage(ctx: &Game, id: i32, freedom: f32, wall: &mut Wall) -> f32 {
	let mut delay = cmp::min(ctx.get(id, Stat::frozen), ctx.get(id, Stat::delayed));
	if delay != 0 && ctx.get(id, Stat::adrenaline) == 0 {
		return 0.0;
	}
	let tatk = ctx.trueatk(id);
	let owner = ctx.get_owner(id);
	let foe = ctx.get_foe(owner);
	let fsh = ctx.get_shield(foe);
	let psionic = ctx.get(id, Flag::psionic);
	if psionic && fsh != 0 && ctx.get(fsh, Flag::reflective) {
		let reflect_dmg = once(tatk)
			.chain(
				(1..if ctx.get(id, Stat::adrenaline) == 0 {
					1
				} else {
					etg::countAdrenaline(tatk)
				})
					.map(|a| ctx.trueatk_adrenaline(id, a)),
			)
			.sum::<i32>() as i16;
		if ctx.get(owner, Stat::sosa) == 0 {
			wall.dmg += reflect_dmg
		} else {
			wall.dmg -= reflect_dmg
		}
		return 0.0;
	}
	let bypass = fsh == 0 || psionic || ctx.get(id, Flag::momentum);
	let momentum = bypass
		|| tatk <= 0
		|| (ctx.get(id, Flag::burrowed)
			&& ctx
				.get_player(owner)
				.permanents
				.iter()
				.any(|&pr| pr != 0 && ctx.get(pr, Flag::tunnel)));
	let dr = if !momentum && fsh != 0 {
		ctx.truedr(fsh)
	} else {
		0
	};
	let mut atk = 0.0;
	let mut momatk = 0;
	for dmg in once(tatk).chain(
		(1..if ctx.get(id, Stat::adrenaline) == 0 {
			1
		} else {
			etg::countAdrenaline(tatk)
		})
			.map(|a| ctx.trueatk_adrenaline(id, a)),
	) {
		if delay != 0 {
			delay -= 1;
			continue;
		}
		momatk += dmg;
		if !momentum {
			atk += if let Some(ref mut wshield) = wall.shield {
				wshield.dmg(ctx, id, cmp::max(dmg - dr, 0))
			} else {
				cmp::max(dmg - dr, 0) as f32
			}
		}
	}
	if momentum {
		atk = momatk as f32;
	}
	if freedom > 0.0 && ctx.get(id, Flag::airborne) {
		atk = atk * (1.0 - freedom)
			+ if (bypass && ctx.get(foe, Stat::gpull) == 0) || ctx.cardset() == CardSet::Original {
				(momatk as f32 * 1.5).ceil()
			} else {
				momatk as f32
			} * freedom;
	}
	for &skill in ctx.getSkill(id, Event::Hit) {
		if skill == Skill::vampire {
			if ctx.get(owner, Stat::sosa) == 0 {
				wall.dmg -= atk as i16;
			} else {
				wall.dmg += atk as i16;
			}
		}
	}
	if ctx.get(foe, Stat::sosa) == 0 {
		atk
	} else {
		-atk
	}
}

fn evalthing(
	ctx: &Game,
	damage: &DamageMap,
	quantamap: &QuantaMap,
	id: i32,
	inhand: bool,
	flooded: bool,
	nothrottle: bool,
	patience: bool,
) -> f32 {
	if id == 0 {
		return 0.0;
	}
	let card = ctx.get(id, Stat::card);
	let cdata = ctx.get_card(card);
	let owner = ctx.get_owner(id);
	if inhand {
		if !caneventuallyactive(
			ctx,
			owner,
			ctx.get(id, Stat::cost),
			ctx.get(id, Stat::costele),
			quantamap,
		) {
			return if ctx.hasskill(id, Event::OwnDiscard, Skill::obsession)
				|| ctx.hasskill(id, Event::OwnDiscard, Skill::v_obsession)
			{
				-6.0
			} else {
				0.0
			};
		}
		if cdata.kind == Kind::Spell {
			return eval_skill(ctx, id, cdata.skill[0].1, 0.0, damage, quantamap);
		}
	}
	let kind = if inhand { cdata.kind } else { ctx.get_kind(id) };
	let iscrea = kind == Kind::Creature;
	let mut score = 0.0;
	let mut delaymix = cmp::max(ctx.get(id, Stat::frozen), ctx.get(id, Stat::delayed)) as f32;
	let (ttatk, ctrueatk, adrenaline, delayfactor) = if iscrea || kind == Kind::Weapon {
		let ttatk = damage[id];
		let ctrueatk = ctx.trueatk(id);
		let adrenaline = if ctx.get(id, Stat::adrenaline) == 0 {
			1.0
		} else {
			let adrenaline = etg::countAdrenaline(ctrueatk) as f32;
			delaymix /= adrenaline;
			adrenaline
		};
		let delayfactor = if delaymix != 0.0 {
			1.0 - (delaymix / 5.0).min(0.6)
		} else {
			1.0
		};
		score += ctrueatk as f32 * delayfactor / 16.0;
		(ttatk, ctrueatk, adrenaline, delayfactor)
	} else {
		let delayfactor = if delaymix != 0.0 {
			1.0 - (delaymix / 5.0).min(0.6)
		} else {
			1.0
		};
		(0.0, 0, 1.0, delayfactor)
	};
	let mut hp = 0;
	if iscrea {
		if inhand
			|| !flooded || ctx.get(id, Flag::aquatic)
			|| !ctx.material(id, None)
			|| ctx.getIndex(id) <= 4
		{
			hp = ctx.truehp(id);
			if patience {
				hp += 2;
			}
			let mut poison = ctx.get(id, Stat::poison);
			for &sk in ctx.getSkill(id, Event::OwnAttack).iter() {
				match sk {
					Skill::growth(_, ghp) => poison = poison.saturating_sub(ghp as i32),
					_ => (),
				}
			}
			if poison > 0 {
				hp = hp.saturating_sub(poison.saturating_mul(2));
				if ctx.get(id, Flag::aflatoxin) {
					score -= 2.0;
				}
			} else if poison < 0 {
				hp = cmp::min(hp.saturating_sub(poison), ctx.get(id, Stat::maxhp));
			}
			if hp < 0 {
				hp = 0;
			}
		}
		if hp == 0 {
			score += eval_skill(
				ctx,
				id,
				ctx.getSkill(id, Event::OwnDeath),
				ttatk,
				damage,
				quantamap,
			);
			for j in 0..2 {
				let pl = ctx.get_player(if j == 0 { owner } else { ctx.get_foe(owner) });
				score += once(pl.shield)
					.chain(once(pl.weapon))
					.chain(pl.creatures.iter().cloned())
					.chain(pl.permanents.iter().cloned())
					.filter(|&r| r != 0)
					.map(|r| {
						eval_skill(
							ctx,
							r,
							ctx.getSkill(r, Event::Death),
							ttatk,
							damage,
							quantamap,
						)
					})
					.sum::<f32>();
			}
		}
	}
	let throttle = if adrenaline < 3.0 || nothrottle {
		adrenaline
	} else {
		2.0
	};
	for (ev, sk) in ctx.iter_skills(id) {
		match ev {
			Event::Hit => {
				score += eval_skill(ctx, id, sk, ttatk, damage, quantamap)
					* (if ttatk != 0.0 {
						1.0
					} else if ctx.get(id, Flag::immaterial) {
						0.0
					} else {
						0.1
					}) * if sk.iter().cloned().any(throttled) {
					throttle
				} else {
					adrenaline
				} * delayfactor;
			}
			Event::OwnAttack => {
				let mut autoscore = eval_skill(ctx, id, sk, ttatk, damage, quantamap)
					* if sk.iter().cloned().any(throttled) {
						throttle
					} else {
						adrenaline
					};
				if ctx.cardset() == CardSet::Original
					&& ctx.get(id, Stat::frozen) != 0
					&& sk
						.iter()
						.cloned()
						.any(|sk| matches!(sk, Skill::growth(_, _) | Skill::siphon))
				{
					autoscore *= delayfactor
				}
				score += autoscore;
			}
			Event::Cast => {
				if caneventuallyactive(
					ctx,
					owner,
					ctx.get(id, Stat::cast),
					ctx.get(id, Stat::castele),
					quantamap,
				) {
					score += eval_skill(ctx, id, sk, ttatk, damage, quantamap) * delayfactor;
				}
			}
			ev => {
				if ev
					!= (if iscrea {
						Event::Shield
					} else {
						Event::OwnDeath
					}) {
					score += eval_skill(ctx, id, sk, ttatk, damage, quantamap)
				}
			}
		}
	}
	let flag = ctx.get_thing(id).flag;
	if flag.get(Flag::airborne | Flag::ranged | Flag::whetstone) {
		score += 0.2;
	} else if flag.get(Flag::nightfall) {
		score += 0.5;
	} else if flag.get(Flag::patience) {
		score += 2.0;
	} else if flag.get(Flag::reflective | Flag::tunnel | Flag::voodoo) {
		score += 1.0;
	}
	if iscrea {
		let hpf32 = hp as f32;
		let voodoo = ctx.get(id, Flag::voodoo);
		if voodoo && ctx.material(id, None) {
			score += hpf32 / 10.0;
		}
		if hp != 0 && ctx.get(owner, Stat::gpull) == id {
			if voodoo {
				score += hpf32;
			}
			score = ((score + hpf32) * hpf32.ln()) / 4.0;
			if delaymix != 0.0 {
				score += eval_skill(
					ctx,
					id,
					ctx.getSkill(id, Event::Shield),
					ttatk,
					damage,
					quantamap,
				);
			}
		} else {
			score *= if hp != 0 {
				if ctx.material(id, None) {
					1.0 + hpf32.sqrt() / (hpf32.sqrt() * 2.0 + 4.0)
				} else {
					1.5
				}
			} else if inhand {
				0.9
			} else {
				0.2
			}
		}
	} else {
		score *= if ctx.material(id, None) { 1.25 } else { 1.4 };
	}
	if inhand {
		score * 0.9
	} else {
		score
	}
}

pub fn eval(ctx: &Game) -> f32 {
	let turn = ctx.turn;
	if ctx.winner != 0 {
		return if ctx.winner == ctx.get_leader(turn) {
			9999999.0
		} else {
			-9999999.0
		};
	}
	let turnfoe = ctx.get_foe(turn);
	let turnfoepl = ctx.get_player(turnfoe);
	if turnfoepl.deck.is_empty() && !turnfoepl.hand_full() {
		return 99999990.0;
	}
	let quantamap = QuantaMap::new(ctx);
	let players = ctx.players_ref();
	let pcount = players.len();
	let p0 = players.iter().position(|&pl| pl == turn).unwrap();
	let mut walls: Vec<Wall> = Vec::with_capacity(pcount);
	walls.resize(pcount, Default::default());
	for j in 0..pcount {
		let plidx = (p0 + j) % pcount;
		let pl = players[plidx];
		let player = ctx.get_player(pl);
		let shield = player.shield;
		let mut wall = &mut walls[plidx];
		wall.patience = player.permanents.iter().any(|&pr| {
			pr != 0
				&& ctx.get(pr, Stat::frozen) < 2
				&& (ctx.hasskill(pr, Event::Attack, Skill::patience) || ctx.get(pr, Flag::patience))
		});
		if shield != 0 {
			for &fsh in ctx.getSkill(shield, Event::Shield) {
				match fsh {
					Skill::blockwithcharge => {
						wall.shield = Some(WallShield::Chargeblock(ctx.get(shield, Stat::charges)));
					}
					Skill::disshield => {
						if ctx.cardset() == CardSet::Open || !ctx.get(pl, Flag::sanctuary) {
							wall.shield =
								Some(WallShield::Disentro(player.quanta(etg::Entropy) as i32));
						}
					}
					Skill::disfield => {
						if ctx.cardset() == CardSet::Open || !ctx.get(pl, Flag::sanctuary) {
							wall.shield = Some(WallShield::Dischroma(
								player.quanta.iter().map(|&q| q as i32).sum::<i32>(),
							));
						}
					}
					Skill::voidshell => {
						wall.shield = Some(WallShield::Voidshell(ctx.get(pl, Stat::maxhp)));
					}
					Skill::evade100 => {
						if ctx.get_owner(shield) != ctx.turn || ctx.get(shield, Stat::charges) > 0 {
							wall.shield = Some(WallShield::Evade100);
						}
					}
					Skill::evade(x) => {
						wall.shield = Some(WallShield::Evade((100 - x) as f32 / 100.0));
					}
					Skill::chaos if card::Upped(ctx.get(shield, Stat::card)) => {
						wall.shield = Some(WallShield::Evade(0.8));
					}
					Skill::weight => wall.shield = Some(WallShield::Weight),
					Skill::wings => wall.shield = Some(WallShield::Wings),
					_ => (),
				}
			}
		}
	}
	let mut damage = DamageMap::new(ctx.props_len());
	let stasis = players.iter().any(|&pl| {
		ctx.get_player(pl)
			.permanents
			.iter()
			.any(|&pr| pr != 0 && ctx.hasskill(pr, Event::Attack, Skill::stasis))
	});
	for j in 0..pcount {
		let plidx = (p0 + j) % pcount;
		let pl = players[plidx];
		let player = ctx.get_player(pl);
		let patience = walls[plidx].patience;
		let mut foewall = &mut walls[ctx.getIndex(player.foe) as usize];
		let mut total: f32 = ctx.get(player.foe, Stat::poison) as f32;
		let freedom = if ctx.cardset() == CardSet::Open {
			1.0 - 0.7f32.powf(
				player
					.permanents
					.iter()
					.map(|&pr| (pr != 0 && ctx.hasskill(pr, Event::Attack, Skill::freedom)) as i32)
					.sum::<i32>() as f32,
			)
		} else {
			cmp::min(
				player
					.permanents
					.iter()
					.filter(|&&pr| pr != 0 && ctx.hasskill(pr, Event::Attack, Skill::v_freedom))
					.map(|&pr| ctx.get(pr, Stat::charges))
					.sum::<i32>(),
				4,
			) as f32 / 4.0
		};
		if !stasis && !patience {
			for &cr in player.creatures.iter() {
				if cr != 0 {
					let dmg = estimate_damage(ctx, cr, freedom, foewall);
					damage[cr] = dmg;
					total += dmg;
				}
			}
		}
		let weapon = ctx.get_weapon(pl);
		if weapon != 0 {
			let dmg = estimate_damage(ctx, weapon, freedom, foewall);
			damage[weapon] = dmg;
			total += dmg;
		}
		walls[plidx].dmg = total.min(32000.0).max(-32000.0) as i16;
	}
	let wallturn = walls[ctx.getIndex(turn) as usize];
	if wallturn.dmg as i32 > ctx.get(turnfoe, Stat::hp) {
		return ((wallturn.dmg as i32 - ctx.get(turnfoe, Stat::hp)) * 999) as f32;
	}
	let flooded = players.iter().any(|&pl| {
		ctx.get_player(pl)
			.permanents
			.iter()
			.any(|&pr| pr != 0 && ctx.is_flooding(pr))
	});
	let mut score = 0.0;
	if ctx.get_player(turn).deck.is_empty() {
		score -= 99.0;
	}
	for j in 0..pcount {
		let plidx = (p0 + j) % pcount;
		let pl = players[plidx];
		if ctx.get(pl, Flag::out) {
			continue;
		}
		let expected_damage = players
			.iter()
			.enumerate()
			.filter(|&(idx, &p)| ctx.get_foe(p) == pl)
			.map(|(idx, _)| walls[idx].dmg as i32)
			.sum::<i32>() as f32;
		let player = ctx.get_player(pl);
		let wall = &walls[plidx];
		let mut pscore = (player.markpower as f32).sqrt() - expected_damage + wall.dmg as f32;
		let mut plhp = ctx.get(pl, Stat::hp);
		if let Some(wshield) = wall.shield {
			match wshield {
				WallShield::Chargeblock(charges) => pscore += (charges * 2) as f32,
				WallShield::Voidshell(maxhp) => {
					if plhp > maxhp {
						pscore -= (plhp - maxhp) as f32;
						plhp = maxhp;
					}
					pscore += (maxhp - plhp * 5) as f32 / 8.0;
				}
				_ => (),
			}
		}
		if player
			.permanents
			.iter()
			.any(|&pr| pr != 0 && ctx.get(pr, Flag::cloak) && ctx.get(pr, Stat::charges) != 0)
		{
			pscore += 3.0;
		}
		if expected_damage > plhp as f32 {
			pscore -= (expected_damage - plhp as f32) * 99.0 + 33.0;
		}
		let patience = wall.patience;
		if patience {
			pscore += (ctx.count_creatures(pl) * 3) as f32;
		}
		pscore += (quantamap.get(pl, etg::Chroma) as u32
			+ player.quanta.iter().map(|q| *q as u32).sum::<u32>()) as f32
			/ 14256.0;
		let nothrottle = once(player.weapon)
			.chain(player.creatures.iter().cloned())
			.any(|id| ctx.hasskill(id, Event::Beginattack, Skill::nothrottle));
		pscore += evalthing(
			ctx,
			&damage,
			&quantamap,
			ctx.get_weapon(pl),
			false,
			false,
			nothrottle,
			false,
		);
		pscore += evalthing(
			ctx,
			&damage,
			&quantamap,
			ctx.get_shield(pl),
			false,
			false,
			nothrottle,
			false,
		);
		pscore += player
			.creatures
			.iter()
			.map(|&cr| {
				evalthing(
					ctx, &damage, &quantamap, cr, false, flooded, nothrottle, patience,
				)
			})
			.sum::<f32>();
		pscore += player
			.permanents
			.iter()
			.map(|&pr| {
				evalthing(
					ctx, &damage, &quantamap, pr, false, false, nothrottle, false,
				)
			})
			.sum::<f32>();
		pscore += player
			.hand
			.iter()
			.map(|&hr| evalthing(ctx, &damage, &quantamap, hr, true, false, nothrottle, false))
			.sum::<f32>();
		if !ctx.get(pl, Flag::drawlock) {
			if pl != turn {
				let handlen = player.hand_len();
				for draw in 1..=player.drawpower as usize {
					if player.hand_len() + draw <= 8 && player.deck.len() >= draw {
						pscore += evalthing(
							ctx,
							&damage,
							&quantamap,
							player.deck[player.deck.len() - draw],
							true,
							false,
							nothrottle,
							false,
						);
					}
				}
			}
		} else {
			pscore -= 0.5;
		}
		pscore += (plhp as f32).sqrt() * 4.0 - (ctx.get(pl, Stat::poison) as f32) / 2.0
			+ (player.deck.len() as f32) / 256.0;
		if ctx.get(pl, Flag::precognition) {
			pscore += 0.1;
		}
		if ctx.get(pl, Stat::casts) == 0 {
			pscore -= {
				let handlen = player.hand_len();
				handlen + if handlen > 6 { 7 } else { 4 }
			} as f32 / 4.0
		}
		if ctx.get(pl, Flag::sabbath) {
			pscore -= 2.0;
		}
		if ctx.get(pl, Flag::neuro) {
			pscore -= (24 + player.hand_len()) as f32 / 8.0;
		}
		score += if ctx.get_leader(pl) == ctx.get_leader(turn) {
			pscore
		} else {
			-pscore
		};
	}
	score
}

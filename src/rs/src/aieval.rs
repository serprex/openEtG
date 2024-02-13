#![no_std]
#![allow(non_upper_case_globals)]

use alloc::vec::Vec;
use core::default::Default;
use core::iter::once;
use core::ops::{Index, IndexMut};

use crate::card::{self, CardSet};
use crate::etg;
use crate::game::{Flag, Game, Kind, Stat};
use crate::skill::{Event, Skill};

const PRECBITS: i32 = 6;
const PREC: i32 = 1 << PRECBITS;

fn sqrt(x: i32) -> i32 {
	let mut lo: i32 = 0;
	let mut hi: i32 = x;
	loop {
		let n = lo.wrapping_add(hi) >> 1;
		let g = n * n >> PRECBITS;
		if g > x {
			hi = n;
		} else if g < x {
			lo = n;
		}
		if g == x || lo + 1 >= hi {
			return n;
		}
	}
}

fn log2(x: i32) -> i32 {
	let lg2 = x.ilog2() as i32;
	let lo = 1 << lg2 + PRECBITS;
	(lg2 - PRECBITS) * PREC + (x - lo) * PREC / lo
}

struct DamageMap(Vec<i32>);

impl DamageMap {
	fn new(size: usize) -> Self {
		DamageMap(vec![0; size])
	}
}

impl Index<i16> for DamageMap {
	type Output = i32;

	fn index(&self, id: i16) -> &i32 {
		self.0.index(id as usize - 1)
	}
}

impl IndexMut<i16> for DamageMap {
	fn index_mut(&mut self, id: i16) -> &mut i32 {
		self.0.index_mut(id as usize - 1)
	}
}

struct QuantaMap(Vec<(i16, [u16; 12])>);

impl QuantaMap {
	fn add(quanta: &mut [u16; 12], element: i16, amount: u16) {
		if element == 0 {
			for q in quanta.iter_mut() {
				*q = q.saturating_add(amount / 12).max(1188);
			}
		} else {
			let q = &mut quanta[(element - 1) as usize];
			*q = q.saturating_add(amount).max(1188);
		}
	}

	fn new(ctx: &Game) -> Self {
		let mut v = Vec::with_capacity(ctx.players().len());
		for pl in 1..=ctx.players_len() {
			let player = ctx.get_player(pl);
			let mut quanta = [0u16; 12];
			QuantaMap::add(
				&mut quanta,
				player.mark as i16,
				(player.markpower as u16) * if player.markpower == 0 { 36 } else { 12 },
			);
			for id in player
				.creatures
				.into_iter()
				.chain(player.permanents.into_iter())
				.chain(player.hand_iter().filter(|&id| ctx.get(id, Stat::cost) == 0))
			{
				if id == 0 {
					continue;
				}
				for skill in ctx.getSkill(id, Event::OwnAttack).iter().cloned() {
					match skill {
						Skill::quanta(q) => {
							QuantaMap::add(&mut quanta, q as i16, 1);
						}
						Skill::pend => {
							let element = ctx.get_card(ctx.get(id, Stat::card)).element as i16;
							let charges = ctx.get(id, Stat::charges) as u16;
							QuantaMap::add(
								&mut quanta,
								element,
								charges * if element == 0 { 18 } else { 6 },
							);
							QuantaMap::add(
								&mut quanta,
								player.mark as i16,
								charges * if player.mark == 0 { 18 } else { 6 },
							);
						}
						Skill::pillar => {
							let element = ctx.get_card(ctx.get(id, Stat::card)).element as i16;
							let charges = ctx.get(id, Stat::charges) as u16;
							QuantaMap::add(
								&mut quanta,
								element,
								charges * if element == 0 { 36 } else { 12 },
							);
						}
						Skill::quadpillar(eles) => {
							let amount = (ctx.get(id, Stat::charges) * 5) as u16;
							for i in (0..16).step_by(4) {
								let q = &mut quanta[(((eles >> i) & 15) - 1) as usize];
								*q = q.saturating_add(amount);
							}
						}
						Skill::locket => {
							QuantaMap::add(&mut quanta, ctx.get(id, Stat::mode), 1);
						}
						_ => {}
					}
				}
			}
			v.push((pl, quanta));
		}

		QuantaMap(v)
	}

	fn get(&self, id: i16, element: i16) -> u16 {
		self.0
			.iter()
			.find(|&&(pl, _)| pl == id)
			.map(|&(_, q)| {
				(if element == 0 { q.into_iter().sum::<u16>() } else { q[(element - 1) as usize] }) / 12
			})
			.unwrap_or_default()
	}
}

fn eval_skill(
	ctx: &Game,
	c: i16,
	skills: &[Skill],
	ttatk: i32,
	damage: &DamageMap,
	quantamap: &QuantaMap,
) -> i32 {
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
			Skill::acceleration => 5 * PREC,
			Skill::accretion => 8 * PREC,
			Skill::adrenaline => 8 * PREC,
			Skill::aflatoxin => 5 * PREC,
			Skill::aggroskele => 2 * PREC,
			Skill::alphawolf => {
				if ctx.get_kind(c) == Kind::Spell {
					3 * PREC
				} else {
					0
				}
			}
			Skill::antimatter => 12 * PREC,
			Skill::appease => {
				if ctx.get_kind(c) == Kind::Spell {
					-6 * PREC
				} else if ctx.get(c, Flag::appeased) {
					0
				} else {
					ctx.trueatk(c) as i32 * (PREC * -3 / 2)
				}
			}
			Skill::bblood | Skill::v_bblood => 7 * PREC,
			Skill::beguilestop => {
				(if ctx.hasskill(c, Event::OwnAttack, Skill::singularity) { 60 * PREC } else { 0 }) - ttatk
			}
			Skill::bellweb => PREC,
			Skill::blackhole | Skill::v_blackhole => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				ctx.get_player(foe).quanta.into_iter().map(|q| (q as i32).min(3)).sum::<i32>() * PREC / 24
			}
			Skill::bless => 4 * PREC,
			Skill::blockhp => 2 * PREC,
			Skill::bloodmoon => 9 * (PREC / 2),
			Skill::boneyard => 3 * PREC,
			Skill::bounce => PREC,
			Skill::bravery => {
				let owner = ctx.get_owner(c);
				(8 - ctx
					.get_player(ctx.get_foe(owner))
					.hand_len()
					.max(ctx.get_player(owner).hand_len() - 1))
				.min(2) as i32 * PREC
			}
			Skill::brawl => 8 * PREC,
			Skill::brew => 4 * PREC,
			Skill::brokenmirror => {
				let shield = ctx.get_shield(ctx.get_foe(ctx.get_owner(c)));
				if shield == 0 || !ctx.get(shield, Flag::reflective) {
					2 * PREC
				} else {
					-3 * PREC
				}
			}
			Skill::bubbleclear => 3 * PREC,
			Skill::burrow => PREC,
			Skill::butterfly => 12 * PREC,
			Skill::catapult => 6 * PREC,
			Skill::chimera => 4 * PREC,
			Skill::chromastat => (3 + ctx.trueatk(c) as i32 + ctx.truehp(c) as i32) * (PREC / 3),
			Skill::clear => 2 * PREC,
			Skill::corpseexplosion => PREC,
			Skill::counter => 3 * PREC,
			Skill::countimmbur => PREC,
			Skill::cpower => 4 * PREC,
			Skill::cseed => 4 * PREC,
			Skill::cseed2 => 4 * PREC,
			Skill::creatureupkeep => {
				let owner = ctx.get_owner(c);
				[(owner, 1), (ctx.get_foe(owner), -1)]
					.into_iter()
					.map(|(pl, multiply)| {
						let mut score = 0;
						let mut ecount = [0u8; 12];
						let mut hassingu = [false; 12];
						let player = ctx.get_player(pl);
						for cr in player.creatures {
							if cr != 0 {
								score -= 1;
								let e = ctx.get_card(ctx.get(cr, Stat::card)).element as i16;
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
							let e = idx as i16 + 1;
							let q = quantamap.get(pl, e);
							if q < count {
								score -= (count - q) as i32 * 16;
							}
						}
						score * multiply
					})
					.sum::<i32>() * (PREC / 8)
			}
			Skill::deadalive => 2 * PREC,
			Skill::deathwish => PREC,
			Skill::deckblast => ctx.get_player(ctx.get_owner(c)).deck.len() as i32 * (PREC / 2),
			Skill::deckblock => PREC,
			Skill::deepdive | Skill::deepdiveproc => {
				if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as i32 * PREC
				} else {
					ttatk * (PREC * 2 / 3)
				}
			}
			Skill::deja => 4 * PREC,
			Skill::deployblobs => {
				(8 + if ctx.get_kind(c) == Kind::Spell {
					let card = ctx.get_card(ctx.get(c, Stat::card));
					card.attack.min(card.health) as i32
				} else {
					ctx.trueatk(c).min(ctx.truehp(c)) as i32
				}) * (PREC / 4)
			}
			Skill::destroy => 8 * PREC,
			Skill::destroycard => PREC,
			Skill::devour => {
				(2 + if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).health as i32
				} else {
					ctx.truehp(c) as i32
				}) * PREC
			}
			Skill::die => PREC / 2,
			Skill::disarm => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				let weapon = ctx.get_weapon(foe);
				if weapon == 0 {
					PREC / 8
				} else if ctx.get_player(foe).hand_full() {
					PREC / 2
				} else {
					ctx.get(weapon, Stat::cost) as i32 * PREC
				}
			}
			Skill::disfield => (3 + quantamap.get(ctx.get_owner(c), etg::Chroma) as i32) * PREC,
			Skill::dispersion => 9 * PREC,
			Skill::disshield => (2 + quantamap.get(ctx.get_owner(c), etg::Entropy) as i32) * PREC,
			Skill::dive => {
				if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as i32 * PREC
				} else {
					(ttatk - ctx.get(c, Stat::dive) as i32) * (PREC * 2 / 3)
				}
			}
			Skill::divinity | Skill::v_divinity => 3 * PREC,
			Skill::drainlife | Skill::v_drainlife(_) => 10 * PREC,
			Skill::doctor => PREC / 2,
			Skill::draft => PREC,
			Skill::drawcopy => PREC,
			Skill::drawequip => 2 * PREC,
			Skill::drawpillar => PREC,
			Skill::dryspell => 5 * PREC,
			Skill::dshield | Skill::v_dshield => 4 * PREC,
			Skill::duality => 4 * PREC,
			Skill::earthquake(x) => x as i32 * PREC,
			Skill::eatspell => 3 * PREC,
			Skill::embezzle => 7 * PREC,
			Skill::empathy => ctx.count_creatures(ctx.get_owner(c)) as i32 * PREC,
			Skill::enchant => 6 * PREC,
			Skill::endow | Skill::v_endow => 4 * PREC,
			Skill::envenom => 3 * PREC,
			Skill::epidemic => {
				let pl = ctx.get_player(ctx.get_owner(c));
				if pl.shield != 0 {
					for &sk in ctx.getSkill(pl.shield, Event::Shield) {
						if let Skill::thorn(x) = sk {
							return 4 * PREC + ctx.count_creatures(pl.foe) as i32 * PREC * 100 / x as i32;
						}
					}
				}
				4 * PREC
			}
			Skill::epoch => 2 * PREC,
			Skill::evolve => 3 * PREC,
			Skill::feed => 6 * PREC,
			Skill::fickle => 3 * PREC,
			Skill::firebolt | Skill::v_firebolt(_) => 10 * PREC,
			Skill::flyingweapon | Skill::v_flyingweapon => 7 * PREC,
			Skill::foedraw => 8 * PREC,
			Skill::forcedraw => -10 * PREC,
			Skill::forceplay => 2 * PREC,
			Skill::frail => 2 * PREC,
			Skill::frail2 => 3 * PREC,
			Skill::fractal => (20 - ctx.get_player(ctx.get_owner(c)).hand_len() as i32) * (PREC / 4),
			Skill::freedom => 4 * PREC,
			Skill::freeze(x) => x as i32 * PREC,
			Skill::freezeperm => 4 * PREC,
			Skill::fungusrebirth => PREC,
			Skill::gas => 5 * PREC,
			Skill::give => PREC,
			Skill::golemhit => {
				let mut dmg = 0;
				for cr in ctx.get_player(ctx.get_owner(c)).creatures {
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
					2 * PREC
				} else {
					0
				}
			}
			Skill::gpullspell => 3 * PREC,
			Skill::grave => PREC,
			Skill::growth(atk, hp) => (atk + hp) as i32 * PREC,
			Skill::guard => ttatk + (4 + ctx.get(c, Flag::airborne) as i32) * PREC,
			Skill::halveatk => {
				if ctx.get_kind(c) == Kind::Spell {
					-ctx.get_card(ctx.get(c, Stat::card)).attack as i32 * (PREC / 4)
				} else if ttatk == 0 {
					0
				} else if ttatk > 0 {
					PREC
				} else {
					-PREC
				}
			}
			Skill::hasten => {
				(ctx.get_player(ctx.get_owner(c)).deck.len() as i32 * (PREC / 4)).min(6 * PREC)
			}
			Skill::hatch | Skill::v_hatch => 4 * PREC,
			Skill::heal => {
				if ctx.get(ctx.get_foe(ctx.get_owner(c)), Stat::sosa) != 0 {
					16 * PREC
				} else {
					8 * PREC
				}
			}
			Skill::heatmirror => 2 * PREC,
			Skill::hitownertwice => {
				(if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as i32
				} else {
					ctx.trueatk(c) as i32
				}) * (-8 * PREC)
			}
			Skill::holylight | Skill::v_holylight => 3 * PREC,
			Skill::hope | Skill::v_hope => 2 * PREC,
			Skill::hush => 3 * PREC,
			Skill::icebolt | Skill::v_icebolt(_) => 10 * PREC,
			Skill::ignite => 10 * PREC,
			Skill::immolate(_) => 5 * PREC,
			Skill::improve | Skill::v_improve => 6 * PREC,
			Skill::inertia => 2 * PREC,
			Skill::ink => 3 * PREC,
			Skill::innovation => 3 * PREC,
			Skill::integrity | Skill::v_integrity => 4 * PREC,
			Skill::jelly => 5 * PREC,
			Skill::jetstream => 5 * (PREC / 2),
			Skill::lightning => 6 * PREC,
			Skill::liquid => 5 * PREC,
			Skill::livingweapon => 2 * PREC,
			Skill::lobotomize => 6 * PREC,
			Skill::locket => PREC,
			Skill::loot => 2 * PREC,
			Skill::luciferin => 3 * PREC,
			Skill::lycanthropy => 4 * PREC,
			Skill::mend => PREC,
			Skill::metamorph => 2 * PREC,
			Skill::midas => 6 * PREC,
			Skill::mill => PREC,
			Skill::millpillar => PREC,
			Skill::mimic => 3 * PREC,
			Skill::miracle => ctx.get(ctx.get_owner(c), Stat::maxhp) as i32 * (PREC / 8),
			Skill::mist => ctx.get(c, Stat::charges) as i32 * 5,
			Skill::mitosis => (4 + ctx.get_card(ctx.get(c, Stat::card)).cost) as i32 * PREC,
			Skill::mitosisspell => 6 * PREC,
			Skill::momentum => 2 * PREC,
			Skill::mutation | Skill::v_mutation => 4 * PREC,
			Skill::neuro => {
				if ctx.get(ctx.get_foe(ctx.get_owner(c)), Flag::neuro) {
					4 * PREC
				} else {
					6 * PREC
				}
			}
			Skill::neuroify => {
				if ctx.get(ctx.get_foe(ctx.get_owner(c)), Flag::neuro) {
					PREC
				} else {
					2 * PREC
				}
			}
			Skill::nightmare => {
				let owner = ctx.get_owner(c);
				let n = ctx
					.get_player(owner)
					.hand_iter()
					.map(|inst| card::IsOf(ctx.get(inst, Stat::card), card::Nightmare) as usize)
					.sum::<usize>();
				((24 - ctx.get_player(ctx.get_foe(owner)).hand_len()) >> n) as i32 * PREC
			}
			Skill::nightshade => 6 * PREC,
			Skill::nova => PREC,
			Skill::nova2 => 2 * PREC,
			Skill::nullspell => 4 * PREC,
			Skill::nymph | Skill::v_nymph => 7 * PREC,
			Skill::ouija => 3 * PREC,
			Skill::pacify => 5 * PREC,
			Skill::pairproduce => 2 * PREC,
			Skill::paleomagnetism => {
				let owner = ctx.get_owner(c);
				log2(
					if card::Upped(ctx.get(c, Stat::card)) { 2 * PREC } else { PREC }
						+ 64 * PREC
							/ (quantamap.get(owner, ctx.get_player(owner).mark as i16) as i32 * 3
								+ quantamap.get(owner, ctx.get_player(ctx.get_foe(owner)).mark as i16)
									as i32),
				)
			}
			Skill::pandemonium | Skill::v_pandemonium => 3 * PREC,
			Skill::pandemonium2 => 4 * PREC,
			Skill::pandemonium3 => 5 * PREC,
			Skill::paradox => 5 * PREC,
			Skill::parallel => 8 * PREC,
			Skill::patience => 2 * PREC,
			Skill::phoenix => 3 * PREC,
			Skill::photosynthesis => 2 * PREC,
			Skill::plague | Skill::v_plague => 5 * PREC,
			Skill::platearmor(x) => x as i32 * PREC,
			Skill::poison(x) => x as i32 * PREC,
			Skill::poisonfoe(x) => x as i32 * PREC,
			Skill::powerdrain => 6 * PREC,
			Skill::precognition => PREC,
			Skill::predator => {
				let foehandlen = ctx.get_player(ctx.get_foe(ctx.get_owner(c))).hand_len() as i32;
				if foehandlen > 4 && ctx.get_kind(c) != Kind::Spell {
					ttatk + (foehandlen - 6).max(1) * PREC
				} else {
					PREC
				}
			}
			Skill::protectonce => 2 * PREC,
			Skill::protectall => 4 * PREC,
			Skill::purify => 2 * PREC,
			Skill::quanta(_) => PREC / 10,
			Skill::quint => 6 * PREC,
			Skill::quinttog => 7 * PREC,
			Skill::rage => {
				if card::Upped(ctx.get(c, Stat::card)) {
					5 * PREC
				} else {
					6 * PREC
				}
			}
			Skill::readiness | Skill::v_readiness => 3 * PREC,
			Skill::reap => 7 * PREC,
			Skill::rebirth => {
				if card::Upped(ctx.get(c, Stat::card)) {
					2 * PREC
				} else {
					5 * PREC
				}
			}
			Skill::reducemaxhp => {
				if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as i32 * (PREC / 2)
				} else {
					ttatk / 2
				}
			}
			Skill::regenerate(amt) => amt as i32 * PREC,
			Skill::regeneratespell => 5 * PREC,
			Skill::regrade => 3 * PREC,
			Skill::reinforce => PREC / 2,
			Skill::ren => 5 * PREC,
			Skill::rewind | Skill::v_rewind => 6 * PREC,
			Skill::ricochet => 2 * PREC,
			Skill::sabbath => PREC,
			Skill::sadism => 2 * PREC,
			Skill::salvage => 3 * PREC,
			Skill::sanctify => 2 * PREC,
			Skill::scramble | Skill::v_scramble => {
				(13 - ctx
					.get_player(ctx.get_foe(ctx.get_owner(c)))
					.quanta
					.into_iter()
					.map(|q| (q != 0) as i32)
					.sum::<i32>()) as i32
					* (PREC / 2)
			}
			Skill::serendipity | Skill::v_serendipity => 4 * PREC,
			Skill::shtriga => 6 * PREC,
			Skill::shuffle3 => 7 * PREC,
			Skill::silence | Skill::v_silence => PREC,
			Skill::singularity | Skill::v_singularity => -64 * PREC,
			Skill::sinkhole => 3 * PREC,
			Skill::siphon => 4 * PREC,
			Skill::siphonactive => 3 * PREC,
			Skill::siphonstrength => 4 * PREC,
			Skill::skyblitz => 10 * PREC,
			Skill::snipe => 3 * PREC,
			Skill::sosa => 6 * PREC,
			Skill::soulcatch => 2 * PREC,
			Skill::spores => 4 * PREC,
			Skill::sskin => 15 * PREC,
			Skill::stasisdraw => PREC,
			Skill::steal | Skill::v_steal => 6 * PREC,
			Skill::steam => 6 * PREC,
			Skill::stoneform | Skill::v_stoneform => PREC,
			Skill::stonewall => quantamap.get(ctx.get_owner(c), etg::Earth) as i32 * PREC,
			Skill::storm(x) | Skill::v_storm(x) | Skill::firestorm(x) => x as i32 * (PREC * 4),
			Skill::summon(FateEgg) => 3 * PREC,
			Skill::summon(FateEggUp) => 4 * PREC,
			Skill::summon(Firefly) | Skill::summon(FireflyV) => 4 * PREC,
			Skill::summon(FireflyUp) | Skill::summon(FireflyUpV) => 9 * (PREC / 2),
			Skill::summon(Scarab) | Skill::summon(ScarabV) => 4 * PREC,
			Skill::summon(ScarabUp) | Skill::summon(ScarabUpV) => 9 * (PREC / 2),
			Skill::summon(Shadow) => 3 * PREC,
			Skill::summon(ShadowUp) => 4 * PREC,
			Skill::summon(Spark) => 2 * PREC,
			Skill::summon(SparkUp) => 3 * PREC,
			Skill::summon(Phantom) => 3 * PREC,
			Skill::summon(PhantomUp) => 7 * (PREC / 2),
			Skill::swave => 6 * PREC,
			Skill::tempering(x) => x as i32 * PREC,
			Skill::tesseractsummon => 8 * PREC,
			Skill::throwrock => 4 * PREC,
			Skill::tick => {
				if ctx.get_kind(c) == Kind::Spell {
					PREC
				} else {
					PREC + (ctx.get(c, Stat::maxhp) - ctx.truehp(c)) as i32 * PREC
						/ ctx.get(c, Stat::maxhp) as i32
				}
			}
			Skill::tornado => 9 * PREC,
			Skill::trick => 4 * PREC,
			Skill::turngolem => ctx.get(c, Stat::storedpower) as i32 * (PREC / 2),
			Skill::unsilence => PREC,
			Skill::unsummon => PREC,
			Skill::upkeep => -PREC / 2,
			Skill::upload => 3 * PREC,
			Skill::vampire => {
				(if ctx.get_kind(c) == Kind::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as i32 * PREC
				} else {
					ttatk
				}) / 5
			}
			Skill::virtue => {
				if ctx.get_kind(c) == Kind::Spell {
					let foeshield = ctx.get_shield(ctx.get_foe(ctx.get_owner(c)));
					if foeshield != 0 {
						(ctx.truedr(foeshield, c) as i32)
							.min(ctx.get_card(ctx.get(c, Stat::card)).attack as i32)
							* PREC
					} else {
						PREC / 2
					}
				} else {
					(ctx.trueatk(c) as i32 * PREC - ttatk) * 2 / 3
				}
			}
			Skill::virusplague | Skill::v_virusplague => PREC,
			Skill::void => {
				if ctx.cardset() == CardSet::Open {
					5 * PREC
				} else {
					ctx.get(c, Stat::charges) as i32 * (PREC * 5)
				}
			}
			Skill::web => PREC,
			Skill::wicked => PREC,
			Skill::wind => ctx.get(c, Stat::storedpower) as i32 * (PREC / 2),
			Skill::wisdom => 4 * PREC,
			Skill::yoink => 4 * PREC,
			Skill::vengeance => 2 * PREC,
			Skill::vindicate => 3 * PREC,
			Skill::pillar | Skill::pend | Skill::quadpillar(_) => {
				if ctx.get_kind(c) == Kind::Spell {
					PREC / 16
				} else {
					sqrt(ctx.get(c, Stat::charges) as i32 * PREC)
				}
			}
			Skill::absorber => 5 * PREC,
			Skill::blockwithcharge => {
				ctx.get(c, Stat::charges) as i32 * PREC
					/ (1 + ctx.count_creatures(ctx.get_foe(ctx.get_owner(c))) as i32 * 2)
			}
			Skill::cold | Skill::v_cold => 7 * PREC,
			Skill::despair => 5 * PREC,
			Skill::evade100 => {
				if ctx.get(c, Stat::charges) == 0 && ctx.get_owner(c) == ctx.turn {
					0
				} else {
					PREC
				}
			}
			Skill::evade(x) => x as i32,
			Skill::firewall | Skill::v_firewall => {
				4 * PREC
					+ ctx
						.get_player(ctx.get_foe(ctx.get_owner(c)))
						.creatures
						.into_iter()
						.filter(|&cr| cr != 0)
						.map(|cr| log2((6 - ctx.get(c, Stat::hp) as i32).max(2) * PREC))
						.sum::<i32>() / 2
			}
			Skill::chaos => 8 * PREC,
			Skill::skull => 5 * PREC,
			Skill::slime => 5 * PREC,
			Skill::slow | Skill::v_slow => 6 * PREC,
			Skill::solar => {
				let coq = ctx.get_player(ctx.get_owner(c)).quanta(etg::Light) as i32;
				5 * PREC - (coq * 4 * PREC) / (4 + coq)
			}
			Skill::thorn(chance) => chance as i32 * (PREC / 8),
			Skill::vend => PREC,
			Skill::v_dessication => 8 * PREC,
			Skill::v_freedom => ctx.get(c, Stat::charges) as i32 * 5 * PREC,
			Skill::v_gratitude => ctx.get(c, Stat::charges) as i32 * 4 * PREC,
			Skill::v_heal => 8 * PREC,
			Skill::v_thorn => 6 * PREC,
			_ => 0,
		})
		.sum()
}

fn throttled(s: Skill) -> bool {
	matches!(s, Skill::poison(_) | Skill::neuro | Skill::regen | Skill::siphon)
}

fn caneventuallyactive(ctx: &Game, id: i16, cost: i16, costele: i16, quantamap: &QuantaMap) -> bool {
	let pl = ctx.get_player(id);
	cost <= 0
		|| costele == etg::Chroma
		|| pl.quanta(costele) as i16 >= cost
		|| quantamap.get(id, costele) > 0
}

#[derive(Clone, Copy)]
enum WallShield {
	Chargeblock(i16),
	Disentro(i16),
	Dischroma(i16),
	Evade(i16),
	Evade100,
	Slime(i16),
	Voidshell(i16),
	Weight,
	Wings,
}

impl WallShield {
	pub fn dmg(&mut self, ctx: &Game, id: i16, dmg: i16) -> i32 {
		match *self {
			WallShield::Chargeblock(ref mut charges) => {
				if *charges > 0 {
					*charges -= 1;
					return 0;
				}
			}
			WallShield::Disentro(ref mut q) => {
				if *q > 0 {
					*q -= (dmg + 2) / 3;
					return 0;
				}
			}
			WallShield::Dischroma(ref mut q) => {
				if *q > 0 {
					*q -= dmg;
					return 0;
				}
			}
			WallShield::Evade(x) => return dmg as i32 * x as i32 >> PRECBITS,
			WallShield::Evade100 => {
				return 0;
			}
			WallShield::Slime(ref mut dr) => {
				let d = (dmg as i32 - *dr as i32).max(0) * PREC;
				if d > 0 {
					*dr = dr.saturating_add(1);
				}
				return d;
			}
			WallShield::Voidshell(ref mut maxhp) => {
				if *maxhp > 1 {
					*maxhp = (*maxhp - dmg).max(1);
					return 0;
				}
			}
			WallShield::Weight => {
				if ctx.get_kind(id) == Kind::Creature && ctx.truehp(id) > 5 {
					return 0;
				}
			}
			WallShield::Wings => {
				if !ctx.get(id, Flag::airborne | Flag::ranged) {
					return 0;
				}
			}
		}
		dmg as i32 * PREC
	}
}

#[derive(Default, Clone, Copy)]
struct Wall {
	pub shield: Option<WallShield>,
	pub dmg: i16,
	pub patience: bool,
}

fn estimate_damage(ctx: &Game, id: i16, freedom: i32, wall: &mut Wall) -> i32 {
	let mut delay = ctx.get(id, Stat::frozen).max(ctx.get(id, Stat::delayed));
	if delay != 0 && ctx.get(id, Stat::adrenaline) == 0 {
		return 0;
	}
	let tatk = ctx.trueatk(id);
	let owner = ctx.get_owner(id);
	let foe = ctx.get_foe(owner);
	let fsh = ctx.get_shield(foe);
	let psionic = ctx.get(id, Flag::psionic);
	if psionic && fsh != 0 && ctx.get(fsh, Flag::reflective) {
		let reflect_dmg = once(tatk)
			.chain(
				(1..if ctx.get(id, Stat::adrenaline) == 0 { 1 } else { etg::countAdrenaline(tatk) })
					.map(|a| ctx.trueatk_adrenaline(id, a)),
			)
			.sum::<i16>();
		if ctx.get(owner, Stat::sosa) == 0 {
			wall.dmg += reflect_dmg
		} else {
			wall.dmg -= reflect_dmg
		}
		return 0;
	}
	let bypass = fsh == 0 || psionic || ctx.get(id, Flag::momentum);
	let momentum = bypass
		|| tatk <= 0
		|| (ctx.get(id, Flag::burrowed)
			&& ctx.get_player(owner).permanents.into_iter().any(|pr| pr != 0 && ctx.get(pr, Flag::tunnel)));
	let dr = if !momentum && fsh != 0 { ctx.truedr(fsh, id) } else { 0 };
	let mut atk = 0;
	let mut momatk = 0;
	for dmg in once(tatk).chain(
		(1..if ctx.get(id, Stat::adrenaline) == 0 { 1 } else { etg::countAdrenaline(tatk) })
			.map(|a| ctx.trueatk_adrenaline(id, a)),
	) {
		if delay != 0 {
			delay -= 1;
			continue;
		}
		momatk += dmg as i32;
		if !momentum {
			atk += if let Some(ref mut wshield) = wall.shield {
				wshield.dmg(ctx, id, (dmg - dr).max(0))
			} else if dmg > dr {
				(dmg - dr) as i32 * PREC
			} else {
				0
			}
		}
	}
	momatk *= PREC;
	if momentum {
		atk = momatk;
	}
	if freedom != 0 && ctx.get(id, Flag::airborne) {
		atk = atk * (PREC - freedom)
			+ if (bypass && ctx.get(foe, Stat::gpull) == 0) || ctx.cardset() == CardSet::Original {
				(momatk * 3 + 1) / 2
			} else {
				momatk
			} * freedom >> PRECBITS;
	}
	for &skill in ctx.getSkill(id, Event::Hit) {
		if skill == Skill::vampire {
			if ctx.get(owner, Stat::sosa) == 0 {
				wall.dmg = wall.dmg.saturating_sub((atk >> PRECBITS) as i16);
			} else {
				wall.dmg = wall.dmg.saturating_add((atk >> PRECBITS) as i16);
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
	id: i16,
	inhand: bool,
	flooded: bool,
	nothrottle: bool,
	patience: bool,
) -> i32 {
	if id == 0 {
		return 0;
	}
	let thing = ctx.get_thing(id);
	let card = thing.status.get(Stat::card);
	let cdata = ctx.get_card(card);
	let owner = thing.owner;
	if inhand {
		if !caneventuallyactive(
			ctx,
			owner,
			thing.status.get(Stat::cost),
			thing.status.get(Stat::costele),
			quantamap,
		) {
			return if ctx.hasskill(id, Event::OwnDiscard, Skill::obsession)
				|| ctx.hasskill(id, Event::OwnDiscard, Skill::v_obsession)
			{
				-6 * PREC
			} else {
				0
			};
		}
		if cdata.kind == Kind::Spell {
			return eval_skill(ctx, id, cdata.skill[0].1, 0, damage, quantamap);
		}
	}
	let kind = if inhand { cdata.kind } else { thing.kind };
	let iscrea = kind == Kind::Creature;
	let mut score = 0;
	let mut delaymix = thing.status.get(Stat::frozen).max(thing.status.get(Stat::delayed)) as i32 * PREC;
	let (ttatk, adrenaline, delayfactor) = if iscrea || kind == Kind::Weapon {
		let ttatk = damage[id];
		let ctrueatk = ctx.trueatk(id);
		let adrenaline = if thing.status.get(Stat::adrenaline) == 0 {
			1
		} else {
			let adrenaline = etg::countAdrenaline(ctrueatk) as i32;
			delaymix /= adrenaline;
			adrenaline
		};
		let delayfactor = if delaymix != 0 { PREC - (delaymix / 5).min(PREC * 6 / 10) } else { PREC };
		score += ctrueatk as i32 * delayfactor / 16;
		(ttatk, adrenaline, delayfactor)
	} else {
		let delayfactor = if delaymix != 0 { PREC - (delaymix / 5).min(PREC * 6 / 10) } else { PREC };
		(0, 1, delayfactor)
	};
	let mut hp = 0;
	if iscrea {
		if inhand
			|| !flooded || thing.flag.get(Flag::aquatic)
			|| !ctx.material(id, None)
			|| ctx.getIndex(id) <= 4
		{
			hp = ctx.truehp(id);
			if patience {
				hp += 2;
			}
			let mut poison = thing.status.get(Stat::poison);
			for &sk in ctx.getSkill(id, Event::OwnAttack).iter() {
				match sk {
					Skill::growth(_, ghp) => poison = poison.saturating_sub(ghp as i16),
					_ => (),
				}
			}
			if poison > 0 {
				hp = hp.saturating_sub(poison.saturating_mul(2));
				if thing.flag.get(Flag::aflatoxin) {
					score -= 2 * PREC;
				}
			} else if poison < 0 {
				hp = hp.saturating_sub(poison).min(thing.status.get(Stat::maxhp));
			}
			if hp < 0 {
				hp = 0;
			}
		}
		if hp == 0 {
			score += eval_skill(ctx, id, ctx.getSkill(id, Event::OwnDeath), ttatk, damage, quantamap);
			for j in 0..2 {
				let pl = ctx.get_player(if j == 0 { owner } else { ctx.get_foe(owner) });
				score += once(pl.shield)
					.chain(once(pl.weapon))
					.chain(pl.creatures.into_iter())
					.chain(pl.permanents.into_iter())
					.filter(|&r| r != 0)
					.map(|r| eval_skill(ctx, r, ctx.getSkill(r, Event::Death), ttatk, damage, quantamap))
					.sum::<i32>();
			}
		}
	}
	let throttle = if adrenaline < 3 || nothrottle { adrenaline } else { 2 };
	for (ev, sk) in thing.skill.iter() {
		match ev {
			Event::Hit => {
				if ttatk != 0 || !thing.flag.get(Flag::immaterial) {
					let value = (eval_skill(ctx, id, sk, ttatk, damage, quantamap)
						* if sk.iter().cloned().any(throttled) { throttle } else { adrenaline }
						* delayfactor) >> PRECBITS;
					score += if ttatk == 0 { value / 10 } else { value };
				}
			}
			Event::OwnAttack => {
				let mut autoscore = eval_skill(ctx, id, sk, ttatk, damage, quantamap)
					* if sk.iter().cloned().any(throttled) { throttle } else { adrenaline };
				if ctx.cardset() == CardSet::Original
					&& thing.status.get(Stat::frozen) != 0
					&& sk.iter().cloned().any(|sk| matches!(sk, Skill::growth(_, _) | Skill::siphon))
				{
					autoscore = (autoscore * delayfactor) >> PRECBITS;
				}
				score += autoscore;
			}
			Event::Cast => {
				if caneventuallyactive(
					ctx,
					owner,
					thing.status.get(Stat::cast),
					thing.status.get(Stat::castele),
					quantamap,
				) {
					score += eval_skill(ctx, id, sk, ttatk, damage, quantamap) * delayfactor >> PRECBITS;
				}
			}
			ev => {
				if ev != if iscrea { Event::Shield } else { Event::OwnDeath } {
					score += eval_skill(ctx, id, sk, ttatk, damage, quantamap)
				}
			}
		}
	}
	if thing.flag.get(Flag::airborne | Flag::ranged | Flag::whetstone) {
		score += PREC / 5;
	} else if thing.flag.get(Flag::nightfall) {
		score += PREC / 2;
	} else if thing.flag.get(Flag::patience) {
		score += 2 * PREC;
	} else if thing.flag.get(Flag::reflective | Flag::tunnel | Flag::voodoo) {
		score += PREC;
	}
	if iscrea {
		let voodoo = thing.flag.get(Flag::voodoo);
		if voodoo && ctx.material(id, None) {
			score += hp as i32 * (PREC / 8);
		}
		if hp != 0 {
			if ctx.get(owner, Stat::gpull) == id {
				score = (score + hp as i32 * if voodoo { PREC * 5 } else { PREC }) / 4;
				if delaymix != 0 {
					score += eval_skill(ctx, id, ctx.getSkill(id, Event::Shield), ttatk, damage, quantamap);
				}
			} else if ctx.material(id, None) {
				let hpsqrt = sqrt(hp as i32 * PREC);
				score += score * hpsqrt / (hpsqrt * 2 + 4 * PREC)
			} else {
				score += score / 2
			}
		} else {
			return if inhand { score * 4 } else { score / 2 };
		}
	} else {
		score = if ctx.material(id, None) { score * 5 / 4 } else { score * 7 / 2 };
	}
	score * if inhand { 2 } else { 3 }
}

pub fn eval(ctx: &Game) -> i32 {
	let turn = ctx.turn;
	if ctx.winner != 0 {
		return if ctx.winner == ctx.get_leader(turn) { i32::MAX } else { i32::MIN };
	}
	let turnfoe = ctx.get_foe(turn);
	let turnfoepl = ctx.get_player(turnfoe);
	if turnfoepl.deck.is_empty() && !turnfoepl.hand_full() {
		return i32::MAX - 1;
	}
	let quantamap = QuantaMap::new(ctx);
	let pcount = ctx.players().len();
	let p0 = turn as usize - 1;
	let mut walls: Vec<Wall> = Vec::with_capacity(pcount);
	walls.resize(pcount, Default::default());
	for j in 0..pcount {
		let plidx = (p0 + j) % pcount;
		let pl = plidx as i16 + 1;
		let player = ctx.get_player(pl);
		let shield = player.shield;
		let mut wall = &mut walls[plidx];
		wall.patience = player.permanents.into_iter().any(|pr| {
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
					Skill::deckblock => {
						wall.shield = Some(WallShield::Chargeblock(
							player.deck.iter().map(|&id| ctx.get(id, Flag::pillar) as i16).sum::<i16>(),
						));
					}
					Skill::disshield => {
						if ctx.cardset() == CardSet::Open || !ctx.get(pl, Flag::sanctuary) {
							wall.shield = Some(WallShield::Disentro(player.quanta(etg::Entropy) as i16));
						}
					}
					Skill::disfield => {
						if ctx.cardset() == CardSet::Open || !ctx.get(pl, Flag::sanctuary) {
							wall.shield = Some(WallShield::Dischroma(
								player.quanta.into_iter().map(|q| q as i16).sum::<i16>(),
							));
						}
					}
					Skill::evade(x) => {
						wall.shield = Some(WallShield::Evade(PREC as i16 * (100 - x as i16) / 100));
					}
					Skill::evade100 => {
						if ctx.get_owner(shield) != ctx.turn || ctx.get(shield, Stat::charges) > 0 {
							wall.shield = Some(WallShield::Evade100);
						}
					}
					Skill::mist => {
						wall.shield = Some(WallShield::Evade(
							PREC as i16 * (100 - ctx.get(shield, Stat::charges) * 4) / 100,
						));
					}
					Skill::slime => {
						wall.shield = Some(WallShield::Slime(ctx.get(shield, Stat::hp)));
					}
					Skill::voidshell => {
						wall.shield = Some(WallShield::Voidshell(ctx.get(pl, Stat::maxhp)));
					}
					Skill::weight => wall.shield = Some(WallShield::Weight),
					Skill::wings => wall.shield = Some(WallShield::Wings),
					_ => (),
				}
			}
		}
	}
	let mut damage = DamageMap::new(ctx.props_len());
	let stasis = ctx.players().iter().any(|pl| {
		pl.permanents.into_iter().any(|pr| pr != 0 && ctx.hasskill(pr, Event::Attack, Skill::stasis))
	});
	for j in 0..pcount {
		let plidx = (p0 + j) % pcount;
		let pl = plidx as i16 + 1;
		let player = ctx.get_player(pl);
		let patience = walls[plidx].patience;
		let mut foewall = &mut walls[player.foe as usize - 1];
		let mut total = ctx.get(player.foe, Stat::poison) as i32 * PREC;
		let freedom = if ctx.cardset() == CardSet::Open {
			let sofrs = player
				.permanents
				.into_iter()
				.filter(|&pr| (pr != 0 && ctx.hasskill(pr, Event::Attack, Skill::freedom)))
				.count();
			[0, 15, 27, 36, 43, 48, 52, 55, 57, 59, 60, 61, 62].get(sofrs).cloned().unwrap_or(63u8) as i32
		} else {
			player
				.permanents
				.into_iter()
				.filter(|&pr| pr != 0 && ctx.hasskill(pr, Event::Attack, Skill::v_freedom))
				.map(|pr| ctx.get(pr, Stat::charges))
				.sum::<i16>()
				.min(4) as i32 * (PREC / 4)
		};
		if !stasis && !patience {
			for cr in player.creatures {
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
		walls[plidx].dmg = (total >> PRECBITS).min(32000).max(-32000) as i16;
	}
	let wallturn = walls[turn as usize - 1];
	if wallturn.dmg > ctx.get(turnfoe, Stat::hp) {
		return (wallturn.dmg as i32 - ctx.get(turnfoe, Stat::hp) as i32) * (PREC * 1024);
	}
	let flooded =
		ctx.players().iter().any(|pl| pl.permanents.into_iter().any(|pr| pr != 0 && ctx.is_flooding(pr)));
	let mut score = 0;
	if ctx.get_player(turn).deck.is_empty() {
		score -= 99 * PREC;
	}
	for j in 0..pcount {
		let plidx = (p0 + j) % pcount;
		let pl = plidx as i16 + 1;
		if ctx.get(pl, Flag::out) {
			continue;
		}
		let expected_damage = (1..=ctx.players_len())
			.into_iter()
			.filter(|&id| ctx.get_foe(id) == pl)
			.map(|id| walls[id as usize - 1].dmg as i32)
			.sum::<i32>();
		let player = ctx.get_player(pl);
		let wall = &walls[plidx];
		let mut pscore = sqrt(player.markpower as i32 * PREC) + (wall.dmg as i32 - expected_damage) * PREC;
		let mut plhp = ctx.get(pl, Stat::hp);
		if let Some(wshield) = wall.shield {
			match wshield {
				WallShield::Chargeblock(charges) => pscore += charges as i32 * (PREC * 2),
				WallShield::Voidshell(maxhp) => {
					if plhp > maxhp {
						pscore -= (plhp - maxhp) as i32 * PREC;
						plhp = maxhp;
					}
					pscore += (maxhp - plhp * 5) as i32 * (PREC / 8);
				}
				_ => (),
			}
		}
		if player
			.permanents
			.into_iter()
			.any(|pr| pr != 0 && ctx.get(pr, Flag::cloak) && ctx.get(pr, Stat::charges) != 0)
		{
			pscore += 3 * PREC;
		}
		if expected_damage > plhp as i32 {
			pscore -= (expected_damage - plhp as i32) * (PREC * 99) + 33 * PREC;
		}
		let patience = wall.patience;
		if patience {
			pscore += ctx.count_creatures(pl) as i32 * (PREC * 3);
		}
		pscore += quantamap.get(pl, etg::Chroma) as i32
			+ player.quanta.into_iter().map(|q| q as i32).sum::<i32>();
		let nothrottle = once(player.weapon)
			.chain(player.creatures.into_iter())
			.any(|id| id != 0 && ctx.hasskill(id, Event::Beginattack, Skill::nothrottle));
		pscore += evalthing(ctx, &damage, &quantamap, ctx.get_weapon(pl), false, false, nothrottle, false);
		pscore += evalthing(ctx, &damage, &quantamap, ctx.get_shield(pl), false, false, nothrottle, false);
		pscore += player
			.creatures
			.into_iter()
			.map(|cr| evalthing(ctx, &damage, &quantamap, cr, false, flooded, nothrottle, patience))
			.sum::<i32>();
		pscore += player
			.permanents
			.into_iter()
			.map(|pr| evalthing(ctx, &damage, &quantamap, pr, false, false, nothrottle, false))
			.sum::<i32>();
		pscore += player
			.hand
			.into_iter()
			.map(|hr| evalthing(ctx, &damage, &quantamap, hr, true, false, nothrottle, false))
			.sum::<i32>();
		if !ctx.get(pl, Flag::drawlock) {
			if pl != turn {
				let handlen = player.hand_len();
				for draw in 1..=player.drawpower as usize {
					if handlen + draw <= 8 && player.deck.len() >= draw {
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
			pscore -= PREC / 2;
		}
		pscore += sqrt(plhp as i32 * PREC) * 4 - ctx.get(pl, Stat::poison) as i32 * (PREC / 2);
		for &id in player.deck.iter() {
			let cost = ctx.get(id, Stat::cost);
			let costele = ctx.get(id, Stat::costele);
			if caneventuallyactive(ctx, pl, cost, costele, &quantamap) {
				pscore += 1;
			}
		}
		if ctx.get(pl, Flag::precognition) {
			pscore += PREC / 10;
		}
		if ctx.get(pl, Stat::casts) == 0 {
			pscore -= {
				let handlen = player.hand_len();
				handlen + if handlen > 6 { 7 } else { 4 }
			} as i32 * (PREC / 4)
		}
		if ctx.get(pl, Flag::sabbath) {
			pscore -= 2 * PREC;
		}
		if ctx.get(pl, Flag::neuro) {
			pscore -= (24 + player.hand_len() as i32) * (PREC / 8);
		}
		score += if ctx.get_leader(pl) == ctx.get_leader(turn) { pscore } else { -pscore };
	}
	score
}

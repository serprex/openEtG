#![allow(non_upper_case_globals)]

use std::cmp;
use std::default::Default;
use std::iter::once;
use std::ops::{Index, IndexMut};

use crate::card::{self, CardSet};
use crate::etg;
use crate::game::{Flag, Game, Stat};
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

fn eval_skill(ctx: &Game, c: i32, skills: &[Skill], ttatk: f32, damage: &DamageMap) -> f32 {
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
	skills
		.iter()
		.map(|&sk| match sk {
			Skill::acceleration => 5.0,
			Skill::accretion => 8.0,
			Skill::adrenaline => 8.0,
			Skill::aflatoxin => 5.0,
			Skill::aggroskele => 2.0,
			Skill::alphawolf => {
				if ctx.get_kind(c) == etg::Spell {
					3.0
				} else {
					0.0
				}
			}
			Skill::antimatter | Skill::v_antimatter => 12.0,
			Skill::appease => {
				if ctx.get_kind(c) == etg::Spell {
					-6.0
				} else if ctx.get(c, Flag::appeased) {
					0.0
				} else {
					ctx.trueatk(c) as f32 * -1.5
				}
			}
			Skill::bblood => 7.0,
			Skill::beguilestop => -damage[c],
			Skill::bellweb => 1.0,
			Skill::blackhole => ctx
				.get_player(ctx.get_foe(ctx.get_owner(c)))
				.quanta
				.iter()
				.map(|&q| cmp::min(q, 3) as f32 / 12.0)
				.sum(),
			Skill::bless => 4.0,
			Skill::bloodmoon => 10.0,
			Skill::boneyard => 3.0,
			Skill::bounce => 1.0,
			Skill::bravery => {
				let owner = ctx.get_owner(c);
				cmp::min(
					2,
					8 - cmp::max(
						ctx.get_player(owner).hand.len() - 1,
						ctx.get_player(ctx.get_foe(owner)).hand.len(),
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
			Skill::burrow => 1.0,
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
				(ctx.count_creatures(ctx.get_foe(owner)) - ctx.count_creatures(owner)) as f32 / 2.0
			}
			Skill::deadalive => 2.0,
			Skill::deathwish => 1.0,
			Skill::deckblast => ctx.get_player(ctx.get_owner(c)).deck.len() as f32 / 2.0,
			Skill::deepdive | Skill::deepdiveproc => {
				if ctx.get_kind(c) == etg::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as f32
				} else {
					ttatk / 1.5
				}
			}
			Skill::deja => 4.0,
			Skill::deployblobs => {
				(8 + if ctx.get_kind(c) == etg::Spell {
					let card = ctx.get_card(ctx.get(c, Stat::card));
					cmp::min(card.attack, card.health) as i32
				} else {
					cmp::min(ctx.truehp(c), ctx.truehp(c))
				}) as f32 / 4.0
			}
			Skill::destroy => 8.0,
			Skill::destroycard => 1.0,
			Skill::devour | Skill::v_devour => {
				(2 + if ctx.get_kind(c) == etg::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).health as i32
				} else {
					ctx.truehp(c)
				}) as f32
			}
			Skill::disarm => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				let weapon = ctx.get_weapon(foe);
				if weapon == 0 {
					0.1
				} else if ctx.get_player(foe).hand.is_full() {
					0.5
				} else {
					ctx.get(weapon, Stat::cost) as f32
				}
			}
			Skill::disfield | Skill::v_disfield => {
				(3 + ctx
					.get_player(ctx.get_owner(c))
					.permanents
					.iter()
					.filter(|&&perm| perm != 0)
					.map(|&perm| {
						if ctx.get(perm, Flag::pillar) {
							(if ctx.get_card(ctx.get(perm, Stat::card)).element as i32
								== etg::Chroma
							{
								3
							} else {
								1
							}) * ctx.get(perm, Stat::charges)
						} else {
							0
						}
					})
					.sum::<i32>()) as f32
			}
			Skill::disshield | Skill::v_disshield => {
				let owner = ctx.get_owner(c);
				let pl = ctx.get_player(owner);
				let hasentropymark = pl.mark == etg::Entropy;
				2.0 + pl
					.permanents
					.iter()
					.filter(|&&perm| perm != 0)
					.map(|&perm| {
						let element = ctx.get_card(ctx.get(perm, Stat::card)).element as i32;
						if element == etg::Entropy
							&& ctx.hasskill(perm, Event::OwnAttack, Skill::pillar)
						{
							(3 * ctx.get(perm, Stat::charges)) as f32
						} else if (hasentropymark || element == etg::Entropy)
							&& ctx.hasskill(perm, Event::OwnAttack, Skill::pend)
						{
							(((hasentropymark as i32) + (element == etg::Entropy) as i32)
								* ctx.get(perm, Stat::charges)) as f32
								* 1.5
						} else {
							0.0
						}
					})
					.sum::<f32>() * 0.8
			}
			Skill::dive | Skill::v_dive => {
				if ctx.get_kind(c) == etg::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as f32
				} else {
					ttatk - ctx.get(c, Stat::dive) as f32 / 1.5
				}
			}
			Skill::divinity => 3.0,
			Skill::drainlife => 10.0,
			Skill::draft => 1.0,
			Skill::drawcopy => 1.0,
			Skill::drawequip => 2.0,
			Skill::drawpillar => 1.0,
			Skill::dryspell => 5.0,
			Skill::dshield => 4.0,
			Skill::duality => 4.0,
			Skill::earthquake => 4.0,
			Skill::eatspell => 3.0,
			Skill::embezzle => 7.0,
			Skill::empathy | Skill::v_empathy => ctx.count_creatures(ctx.get_owner(c)) as f32,
			Skill::enchant => 6.0,
			Skill::endow => 4.0,
			Skill::envenom => 3.0,
			Skill::epidemic => 4.0,
			Skill::epoch => 2.0,
			Skill::evolve | Skill::v_evolve => 3.0,
			Skill::feed => 6.0,
			Skill::fickle => 3.0,
			Skill::firebolt => 10.0,
			Skill::flyingweapon => 7.0,
			Skill::foedraw => 8.0,
			Skill::forcedraw => -10.0,
			Skill::forceplay => 2.0,
			Skill::fractal => (20 - ctx.get_player(ctx.get_owner(c)).hand.len()) as f32 / 4.0,
			Skill::freedom => 4.0,
			Skill::freeze | Skill::v_freeze | Skill::freezeperm => {
				if card::Upped(ctx.get(c, Stat::card)) {
					3.0
				} else {
					3.5
				}
			}
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
				if ctx.get_kind(c) == etg::Spell || c != ctx.get(ctx.get_owner(c), Stat::gpull) {
					2.0
				} else {
					0.0
				}
			}
			Skill::gpullspell | Skill::v_gpullspell => 3.0,
			Skill::gratitude => 4.0,
			Skill::grave => 1.0,
			Skill::growth(atk, hp) => {
				(atk + hp) as f32
					- if hp < 0 {
						(ctx.truehp(c) as f32).ln()
					} else {
						0.0
					}
			}
			Skill::guard => ttatk + (4 + ctx.get(c, Flag::airborne) as i32) as f32,
			Skill::halveatk => {
				if ctx.get_kind(c) == etg::Spell {
					-ctx.get_card(ctx.get(c, Stat::card)).attack as f32 / 4.0
				} else if ttatk == 0.0 {
					0.0
				} else {
					ttatk.signum()
				}
			}
			Skill::hasten => (ctx.get_player(ctx.get_owner(c)).deck.len() as f32 / 4.0).min(6.0),
			Skill::hatch => 4.0,
			Skill::heal => {
				if ctx.get(ctx.get_foe(ctx.get_owner(c)), Stat::sosa) != 0 {
					16.0
				} else {
					8.0
				}
			}
			Skill::heatmirror => 2.0,
			Skill::hitownertwice => {
				(if ctx.get_kind(c) == etg::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as i32
				} else {
					ctx.trueatk(c)
				} * -2) as f32
			}
			Skill::holylight => 3.0,
			Skill::hope => 2.0,
			Skill::icebolt => 10.0,
			Skill::ignite => 10.0,
			Skill::immolate(_) => 5.0,
			Skill::improve => 6.0,
			Skill::inertia => 2.0,
			Skill::ink => 3.0,
			Skill::innovation => 3.0,
			Skill::integrity => 4.0,
			Skill::jelly => 5.0,
			Skill::jetstream => 2.5,
			Skill::lightning => 6.0,
			Skill::liquid => 5.0,
			Skill::livingweapon => 2.0,
			Skill::lobotomize => 6.0,
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
			Skill::mitosis | Skill::v_mitosis => {
				(4 + ctx.get_card(ctx.get(c, Stat::card)).cost) as f32
			}
			Skill::mitosisspell | Skill::v_mitosisspell => 6.0,
			Skill::momentum => 2.0,
			Skill::mutation => 4.0,
			Skill::neuro | Skill::v_neuro => {
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
				((24 - ctx.get_player(ctx.get_foe(owner)).hand.len()) >> n) as f32
			}
			Skill::nightshade => 6.0,
			Skill::nova => 4.0,
			Skill::nova2 => 6.0,
			Skill::nullspell => 4.0,
			Skill::nymph => 7.0,
			Skill::ouija => 3.0,
			Skill::pacify => 5.0,
			Skill::pairproduce => 2.0,
			Skill::paleomagnetism => {
				if card::Upped(ctx.get(c, Stat::card)) {
					4.0
				} else {
					5.0
				}
			}
			Skill::pandemonium => 3.0,
			Skill::pandemonium2 => 4.0,
			Skill::pandemonium3 => 5.0,
			Skill::paradox => 5.0,
			Skill::parallel => 8.0,
			Skill::patience => 2.0,
			Skill::phoenix => 3.0,
			Skill::photosynthesis => 2.0,
			Skill::plague => 5.0,
			Skill::platearmor(x) | Skill::v_platearmor(x) => x as f32 / 5.0,
			Skill::poison(x) => x as f32,
			Skill::poisonfoe(x) => x as f32,
			Skill::powerdrain => 6.0,
			Skill::precognition => 1.0,
			Skill::predator => {
				let foehandlen = ctx.get_player(ctx.get_foe(ctx.get_owner(c))).hand.len() as i32;
				if foehandlen > 4 && ctx.get_kind(c) != etg::Spell {
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
			Skill::rage | Skill::v_rage => {
				if card::Upped(ctx.get(c, Stat::card)) {
					5.0
				} else {
					6.0
				}
			}
			Skill::readiness => 3.0,
			Skill::reap => 7.0,
			Skill::rebirth | Skill::v_rebirth => {
				if card::Upped(ctx.get(c, Stat::card)) {
					5.0
				} else {
					2.0
				}
			}
			Skill::reducemaxhp => {
				(if ctx.get_kind(c) == etg::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as f32
				} else {
					ttatk
				}) / 2.0
			}
			Skill::regenerate => 5.0,
			Skill::regeneratespell => 5.0,
			Skill::regrade => 3.0,
			Skill::reinforce => 0.5,
			Skill::ren => 5.0,
			Skill::rewind => 6.0,
			Skill::ricochet => 2.0,
			Skill::sabbath => 1.0,
			Skill::sadism => 5.0,
			Skill::salvage => 2.0,
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
			Skill::silence => 1.0,
			Skill::singularity | Skill::v_singularity => -20.0,
			Skill::sinkhole => 3.0,
			Skill::siphon => 4.0,
			Skill::siphonactive => 3.0,
			Skill::siphonstrength => 4.0,
			Skill::skyblitz => 10.0,
			Skill::snipe => 7.0,
			Skill::sosa => 6.0,
			Skill::soulcatch => 2.0,
			Skill::spores => 4.0,
			Skill::sskin => 15.0,
			Skill::stasisdraw => 1.0,
			Skill::steal => 6.0,
			Skill::steam => 6.0,
			Skill::stoneform => 1.0,
			Skill::storm(x) | Skill::firestorm(x) => (x * 4) as f32,
			Skill::summon(FateEgg) => 3.0,
			Skill::summon(FateEggUp) => 4.0,
			Skill::summon(Firefly) => 4.0,
			Skill::summon(FireflyUp) => 5.0,
			Skill::summon(Scarab) => 4.0,
			Skill::summon(ScarabUp) => 4.5,
			Skill::summon(Shadow) => 3.0,
			Skill::summon(ShadowUp) => 4.0,
			Skill::summon(Spark) => 2.0,
			Skill::summon(SparkUp) => 3.0,
			Skill::summon(Phantom) => 3.0,
			Skill::summon(PhantomUp) => 3.5,
			Skill::swave => 6.0,
			Skill::tempering => {
				if card::Upped(ctx.get(c, Stat::card)) {
					2.0
				} else {
					4.0
				}
			}
			Skill::tesseractsummon => 8.0,
			Skill::throwrock => 4.0,
			Skill::tick => {
				if ctx.get_kind(c) == etg::Spell {
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
				(if ctx.get_kind(c) == etg::Spell {
					ctx.get_card(ctx.get(c, Stat::card)).attack as f32
				} else {
					ttatk
				}) * 0.7
			}
			Skill::virtue => {
				if ctx.get_kind(c) == etg::Spell {
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
			Skill::virusplague => 1.0,
			Skill::void => 5.0,
			Skill::web | Skill::v_web => 1.0,
			Skill::wind => ctx.get(c, Stat::storedatk) as f32 / 2.0,
			Skill::wisdom => 4.0,
			Skill::yoink => 4.0,
			Skill::vengeance => 2.0,
			Skill::vindicate => 3.0,
			Skill::pillar | Skill::pend | Skill::pillmat | Skill::pillspi | Skill::pillcar => {
				if ctx.get_kind(c) == etg::Spell {
					0.1
				} else {
					(ctx.get(c, Stat::charges) as f32).sqrt()
				}
			}
			Skill::absorber => 5.0,
			Skill::blockwithcharge | Skill::v_blockwithcharge => {
				ctx.get(c, Stat::charges) as f32
					/ (1 + ctx.count_creatures(ctx.get_foe(ctx.get_owner(c))) * 2) as f32
			}
			Skill::cold => 7.0,
			Skill::despair => 5.0,
			Skill::evade100 => {
				if ctx.get(c, Stat::charges) == 0 && ctx.get_owner(c) == ctx.turn {
					0.0
				} else {
					1.0
				}
			}
			Skill::evade(_) => 1.0,
			Skill::firewall => {
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
			Skill::slow => 6.0,
			Skill::solar | Skill::v_solar => {
				let coq = ctx.get_player(ctx.get_owner(c)).quanta(etg::Light) as f32;
				5.0 - (4.0 * coq) / (4.0 + coq)
			}
			Skill::thorn(chance) => chance as f32 / 15.0,
			Skill::vend => 2.0,
			Skill::v_acceleration(x) => (ctx.truehp(c) - 2 + x as i32) as f32,
			Skill::v_accelerationspell(x) => (x as i32 * 2) as f32,
			Skill::v_accretion => 8.0,
			Skill::v_aflatoxin => 5.0,
			Skill::v_bblood => 7.0,
			Skill::v_bless => 4.0,
			Skill::v_boneyard => 3.0,
			Skill::v_bravery => 3.0,
			Skill::v_burrow => 1.0,
			Skill::v_butterfly => 12.0,
			Skill::v_chimera => 4.0,
			Skill::v_cpower => 4.0,
			Skill::v_deja => 4.0,
			Skill::v_destroy => 8.0,
			Skill::v_divinity => 3.0,
			Skill::v_drainlife(_) => 10.0,
			Skill::v_dryspell => 5.0,
			Skill::v_dshield => 4.0,
			Skill::v_duality => 4.0,
			Skill::v_earthquake => 4.0,
			Skill::v_endow => 4.0,
			Skill::v_firebolt(_) => 10.0,
			Skill::v_flyingweapon => 7.0,
			Skill::v_freedom => (ctx.get(c, Stat::charges) * 5) as f32,
			Skill::v_gas => 5.0,
			Skill::v_gratitude => (ctx.get(c, Stat::charges) * 4) as f32,
			Skill::v_guard => 4.0,
			Skill::v_hatch => 4.5,
			Skill::v_heal => 8.0,
			Skill::v_holylight => 3.0,
			Skill::v_hope => 2.0,
			Skill::v_icebolt(_) => 10.0,
			Skill::v_improve => 6.0,
			Skill::v_infect => 4.0,
			Skill::v_integrity => 4.0,
			Skill::v_liquid => 5.0,
			Skill::v_lobotomize => 6.0,
			Skill::v_luciferin => 3.0,
			Skill::v_lycanthropy => 4.0,
			Skill::v_mend => 3.0,
			Skill::v_momentum => 2.0,
			Skill::v_mutation => 4.0,
			Skill::v_nightmare => {
				let owner = ctx.get_owner(c);
				let n = ctx
					.get_player(owner)
					.hand
					.iter()
					.map(|&inst| card::IsOf(ctx.get(inst, Stat::card), card::v_Nightmare) as usize)
					.sum::<usize>();
				((24 - ctx.get_player(ctx.get_foe(owner)).hand.len()) >> n) as f32
			}
			Skill::v_cold => 7.0,
			Skill::v_firewall => 7.0,
			Skill::v_nova => 4.0,
			Skill::v_nova2 => 6.0,
			Skill::v_nymph => 7.0,
			Skill::v_pandemonium => 3.0,
			Skill::v_parallel => 8.0,
			Skill::v_phoenix => 3.0,
			Skill::v_plague => 5.0,
			Skill::v_precognition => 1.0,
			Skill::v_queen => 7.0,
			Skill::v_readiness => 3.0,
			Skill::v_regenerate => 5.0,
			Skill::v_rewind => 6.0,
			Skill::v_salvage => 2.0,
			Skill::v_scarab => 4.0,
			Skill::v_silence => 1.0,
			Skill::v_siphon => 4.0,
			Skill::v_skull => 5.0,
			Skill::v_skyblitz => 10.0,
			Skill::v_slow => 6.0,
			Skill::v_sosa => 6.0,
			Skill::v_soulcatch => 2.0,
			Skill::v_sskin => 15.0,
			Skill::v_steal => 6.0,
			Skill::v_steam => 6.0,
			Skill::v_stoneform => 1.0,
			Skill::v_storm2 => 6.0,
			Skill::v_storm3 => 12.0,
			Skill::v_thorn => 5.0,
			Skill::v_upkeep => -0.5,
			Skill::v_virusplague => 1.0,
			Skill::v_void => (ctx.get(c, Stat::charges) * 5) as f32,
			Skill::v_wisdom => 4.0,
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

fn caneventuallyactive(ctx: &Game, id: i32, cost: i32, costele: i32) -> bool {
	let pl = ctx.get_player(id);
	cost <= 0
		|| costele == etg::Chroma
		|| pl.quanta(costele) > 0
		|| pl.mark == etg::Chroma
		|| pl.mark == costele
		|| pl.permanents.iter().any(|&pr| {
			pr != 0
				&& (ctx.get(pr, Flag::pillar) && {
					let element = ctx.get_card(ctx.get(pr, Stat::card)).element as i32;
					element == etg::Chroma || element == costele
				}) || (ctx.hasskill(pr, Event::Cast, Skill::locket)
				&& ctx.get(pr, Stat::mode) == costele)
				|| pl.creatures.iter().any(|&cr| {
					cr != 0 && ctx.hasskill(cr, Event::OwnAttack, Skill::quanta(costele as i8))
				})
		})
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
				if ctx.get_kind(id) == etg::Creature && ctx.truehp(id) > 5 {
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
		wall.dmg += once(tatk)
			.chain(
				(1..if ctx.get(id, Stat::adrenaline) == 0 {
					1
				} else {
					etg::countAdrenaline(tatk)
				})
					.map(|a| ctx.trueatk_adrenaline(id, a)),
			)
			.sum::<i32>() as i16;
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
	if ctx.get(foe, Stat::sosa) == 0 {
		atk
	} else {
		-atk
	}
}

fn evalthing(
	ctx: &Game,
	damage: &DamageMap,
	id: i32,
	inhand: bool,
	flooded: bool,
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
		) {
			return if ctx.hasskill(id, Event::OwnDiscard, Skill::obsession)
				|| ctx.hasskill(id, Event::OwnDiscard, Skill::v_obsession)
			{
				-6.0
			} else {
				0.0
			};
		}
		if cdata.kind == etg::Spell as i8 {
			return eval_skill(ctx, id, cdata.skill[0].1, 0.0, &damage);
		}
	}
	let kind = if inhand {
		cdata.kind as i32
	} else {
		ctx.get_kind(id)
	};
	let iscrea = kind == etg::Creature;
	let mut score = 0.0;
	let mut delaymix = cmp::max(ctx.get(id, Stat::frozen), ctx.get(id, Stat::delayed)) as f32;
	let (ttatk, ctrueatk, adrenaline, delayfactor) = if iscrea || kind == etg::Weapon {
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
			|| !ctx.material(id, 0)
			|| ctx.getIndex(id) <= 4
		{
			hp = ctx.truehp(id);
			if patience {
				hp += 2;
			}
			let poison = ctx.get(id, Stat::poison);
			if poison > 0 {
				hp -= poison * 2;
				if ctx.get(id, Flag::aflatoxin) {
					score -= 2.0;
				}
			} else if poison < 0 {
				hp = cmp::min(hp - poison, ctx.get(id, Stat::maxhp));
			}
			if hp < 0 {
				hp = 0;
			}
		}
		if hp == 0 {
			score += eval_skill(ctx, id, ctx.getSkill(id, Event::OwnDeath), ttatk, &damage);
			for j in 0..2 {
				let pl = ctx.get_player(if j == 0 { owner } else { ctx.get_foe(owner) });
				score += once(pl.shield)
					.chain(once(pl.weapon))
					.chain(pl.creatures.iter().cloned())
					.chain(pl.permanents.iter().cloned())
					.filter(|&r| r != 0)
					.map(|r| eval_skill(ctx, r, ctx.getSkill(r, Event::Death), ttatk, &damage))
					.sum::<f32>();
			}
		}
	}
	let throttle = if adrenaline < 3.0
		|| (iscrea && {
			let weapon = ctx.get_weapon(owner);
			weapon != 0 && ctx.get(weapon, Flag::nothrottle)
		}) {
		adrenaline
	} else {
		2.0
	};
	for (ev, sk) in ctx.iter_skills(id) {
		match ev {
			Event::Hit => {
				score += eval_skill(ctx, id, sk, ttatk, &damage)
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
				let mut autoscore = eval_skill(ctx, id, sk, ttatk, &damage)
					* if sk.iter().cloned().any(throttled) {
						throttle
					} else {
						adrenaline
					};
				if ctx.get(id, Stat::frozen) != 0
					&& sk
						.iter()
						.cloned()
						.any(|sk| matches!(sk, Skill::v_acceleration(_) | Skill::v_siphon))
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
				) {
					score += eval_skill(ctx, id, sk, ttatk, &damage) * delayfactor;
				}
			}
			ev => {
				if ev
					!= (if iscrea {
						Event::Shield
					} else {
						Event::OwnDeath
					}) {
					score += eval_skill(ctx, id, sk, ttatk, &damage)
				}
			}
		}
	}
	let flag = ctx.get_thing(id).flag;
	if flag.get(Flag::airborne | Flag::ranged) {
		score += 0.2;
	} else if flag.get(Flag::nightfall) {
		score += 0.5;
	} else if flag.get(Flag::patience) {
		score += 2.0;
	} else if flag.get(Flag::reflective | Flag::tunnel | Flag::voodoo) {
		score += 1.0;
	}
	if iscrea {
		let voodoo = ctx.get(id, Flag::voodoo);
		if voodoo && ctx.material(id, 0) {
			score += hp as f32 / 10.0;
		}
		if hp != 0 && ctx.get(owner, Stat::gpull) == id {
			let hpf32 = hp as f32;
			if voodoo {
				score += hpf32;
			}
			score = ((score + hpf32) * hpf32.ln()) / 4.0;
			if delaymix != 0.0 {
				score += eval_skill(ctx, id, ctx.getSkill(id, Event::Shield), ttatk, &damage);
			}
		} else {
			score *= if hp != 0 {
				if ctx.material(id, 0) {
					1.0 + (cmp::min(hp, 33) as f32).ln() / 7.0
				} else {
					1.3
				}
			} else if inhand {
				0.9
			} else {
				0.2
			}
		}
	} else {
		score *= if ctx.get(id, Flag::immaterial) {
			1.4
		} else {
			1.25
		};
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
	if turnfoepl.deck.is_empty() && !turnfoepl.hand.is_full() {
		return 99999990.0;
	}
	let players = ctx.players_ref();
	let pcount = players.len();
	let p0 = players.iter().position(|&pl| pl == turn).unwrap();
	let mut walls: Vec<Wall> = Vec::new();
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
					Skill::blockwithcharge | Skill::v_blockwithcharge => {
						wall.shield = Some(WallShield::Chargeblock(ctx.get(shield, Stat::charges)));
					}
					Skill::disshield | Skill::v_disshield => {
						if fsh == Skill::disshield || !ctx.get(pl, Flag::sanctuary) {
							wall.shield =
								Some(WallShield::Disentro(player.quanta(etg::Entropy) as i32));
						}
					}
					Skill::disfield | Skill::v_disfield => {
						if fsh == Skill::disfield || !ctx.get(pl, Flag::sanctuary) {
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
				WallShield::Chargeblock(charges) => pscore += (charges * 4) as f32,
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
		pscore += evalthing(ctx, &damage, ctx.get_weapon(pl), false, false, false);
		pscore += evalthing(ctx, &damage, ctx.get_shield(pl), false, false, false);
		pscore += player
			.creatures
			.iter()
			.map(|&cr| evalthing(ctx, &damage, cr, false, flooded, patience))
			.sum::<f32>();
		pscore += player
			.permanents
			.iter()
			.map(|&pr| evalthing(ctx, &damage, pr, false, false, false))
			.sum::<f32>();
		pscore += player
			.hand
			.iter()
			.map(|&hr| evalthing(ctx, &damage, hr, true, false, false))
			.sum::<f32>();
		if !ctx.get(pl, Flag::drawlock) {
			if pl != turn {
				let handlen = player.hand.len();
				for draw in 1..=player.drawpower as usize {
					if player.hand.len() + draw <= 8 && player.deck.len() >= draw {
						pscore += evalthing(
							ctx,
							&damage,
							player.deck[player.deck.len() - draw],
							true,
							false,
							false,
						);
					}
				}
			}
		} else {
			pscore -= 0.5;
		}
		pscore += (plhp as f32).sqrt() * 4.0 - (ctx.get(pl, Stat::poison) as f32) / 2.0;
		if ctx.get(pl, Flag::precognition) {
			pscore += 0.5;
		}
		if ctx.get(pl, Stat::casts) == 0 {
			pscore -= {
				let handlen = player.hand.len();
				handlen + if handlen > 6 { 7 } else { 4 }
			} as f32 / 4.0
		}
		if ctx.get(pl, Flag::sabbath) {
			pscore -= 2.0;
		}
		if ctx.get(pl, Flag::neuro) {
			pscore -= (24 + player.hand.len()) as f32 / 8.0;
		}
		score += if ctx.get_leader(pl) == ctx.get_leader(turn) {
			pscore
		} else {
			-pscore
		};
	}
	score
}

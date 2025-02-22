#![no_std]

use alloc::vec::Vec;
use core::cell::RefCell;

const PREC: i16 = 12;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::card::{self, AsUpped, Card, Cards};
use crate::etg;
use crate::game::{Flag, Kind};
use crate::rng::Pcg32;
use crate::skill::{Event, Skill};

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn deckgen_duo(e1: i8, e2: i8, uprate: u8, markpower: i16, maxrarity: i32, seed: u32) -> Vec<i16> {
	let mut rng = Pcg32::from(seed);
	let mut build = Builder::new(e2 as i16, uprate, markpower, &rng);
	for j in [false, true] {
		let ele = if j { e2 } else { e1 };
		for i in 0..(if j { 9 } else { 15 }) {
			let upped = rng.upto(100) < uprate as u32;
			if let Some(card) = card::OpenSet.random_card(&rng, upped, |card| {
				card.element == ele
					&& (card.flag() & Flag::pillar) == 0
					&& card.rarity as i32 <= maxrarity
					&& build.card_count(card.code) != 6
					&& !(card.kind == Kind::Shield && build.anyshield >= 3)
					&& !(card.kind == Kind::Weapon && build.anyweapon >= 3)
					&& !card.isOf(card::Give)
					&& !card.isOf(card::Precognition)
			}) {
				build.add_card(card.code);
			}
		}
	}
	build.filter_cards();
	build.add_equipment();
	build.add_pillars();
	return build.finish();
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn deckgen_bow(uprate: u8, markpower: i16, maxrarity: i32, seed: u32) -> Vec<i16> {
	let mut rng = Pcg32::from(seed);
	let mut build: Builder;
	if rng.upto(200) < uprate as u32 {
		build = Builder::new(etg::Entropy, uprate, markpower, &rng);
		for _ in 0..4 + rng.upto(3) {
			build.add_card(AsUpped(card::Nova, true));
		}
	} else {
		build = Builder::new(etg::Chroma, uprate, markpower, &rng);
		for _ in 0..2 + rng.upto(5) {
			build.add_card(card::Nova);
		}
		for _ in 0..rng.upto(3) {
			build.add_card(card::ChromaticButterfly);
		}
	}
	while build.deck.len() < 30 {
		for ele in 1..=12 {
			for i in 0..=1 + (rng.next32() & 3) {
				let upped = (rng.upto(100) as u8) < uprate;
				if let Some(card) = card::OpenSet.random_card(&rng, upped, |card| {
					card.element == ele
						&& (card.flag() & Flag::pillar) == 0
						&& card.cost < 7 && card.rarity as i32 <= maxrarity
						&& build.card_count(card.code) != 6
						&& !(card.kind == Kind::Shield && build.anyshield >= 3)
						&& !(card.kind == Kind::Weapon && build.anyweapon >= 3)
						&& !card.isOf(card::Give)
						&& !card.isOf(card::GiftofOceanus)
						&& !card.isOf(card::Precognition)
				}) {
					if (build.ecost[ele as usize] + (card.cost as i16 * PREC) < 10 * PREC) {
						build.add_card(card.code);
					}
				}
			}
		}
		build.filter_cards();
		let mut cost = build.ecost[0] / 4;
		for i in 1..=12 {
			cost += build.ecost[i];
		}
		for i in (0..cost).step_by(12 * PREC as usize) {
			build.deck.push(build.up_code(card::QuantumPillar));
		}
	}
	build.finish()
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn deckgen_ai4(e1: i8, e2: i8, seed: u32) -> Vec<i16> {
	let mut rng = Pcg32::from(seed);
	let mut deck = Vec::with_capacity(65);
	for i in 0..24 {
		let upped = rng.upto(100) < 30;
		deck.push(etg::PillarList[if i < 4 { 0 } else { e1 as usize }] - if upped { 2000 } else { 4000 });
	}
	for i in 0..40 {
		let upped = rng.upto(100) < 30;
		let e = if i < 30 { e1 } else { e2 };
		if let Some(card) = card::OrigSet.random_card(&mut rng, upped, |card| {
			card.element == e
				&& !card.isOf(card::v_Miracle)
				&& card.rarity != 15
				&& card.rarity != 20
				&& !etg::ShardList.contains(&if card.code > 2999 {
					card.code + 2000
				} else {
					card.code + 4000
				})
		}) {
			deck.push(card.code);
		}
	}
	deck.sort_unstable_by(|&x, &y| card::code_cmp_core(&card::OrigSet, x, y));
	deck.push((e2 as i16) + 9010);
	deck
}

const HAS_BUFF: [i16; 19] = [
	card::Osmosis,
	card::GravitonDeployer,
	card::Momentum,
	card::ShardofPatience,
	card::Waterfall,
	card::Blessing,
	card::Shadling,
	card::Byt,
	card::ShardofWisdom,
	AsUpped(card::ChaosSeed, true),
	AsUpped(card::Osmosis, true),
	AsUpped(card::Momentum, true),
	AsUpped(card::GravitonDeployer, true),
	AsUpped(card::ShardofPatience, true),
	AsUpped(card::Waterfall, true),
	AsUpped(card::Blessing, true),
	AsUpped(card::Shadling, true),
	AsUpped(card::Byt, true),
	AsUpped(card::ShardofWisdom, true),
];
const HAS_POISON: [i16; 21] = [
	card::Poison,
	card::CorpseExplosion,
	card::Envenom,
	card::Arsenic,
	card::Aflatoxin,
	card::Virus,
	card::Deathstalker,
	card::Scorpion,
	card::Chrysaora,
	card::ThornCarapace,
	AsUpped(card::Poison, true),
	AsUpped(card::CorpseExplosion, true),
	AsUpped(card::Envenom, true),
	AsUpped(card::Arsenic, true),
	AsUpped(card::Aflatoxin, true),
	AsUpped(card::Deathstalker, true),
	AsUpped(card::Scorpion, true),
	AsUpped(card::Chrysaora, true),
	AsUpped(card::ThornCarapace, true),
	AsUpped(card::Fungus, true),
	AsUpped(card::Toadfish, true),
];
const CAN_INFECT: [i16; 17] = [
	card::GreyNymph,
	card::Shtriga,
	card::Virus,
	card::Plague,
	card::Aflatoxin,
	card::Toadfish,
	card::Parasite,
	card::LiquidShadow,
	card::BlackNymph,
	AsUpped(card::GreyNymph, true),
	AsUpped(card::Shtriga, true),
	AsUpped(card::Virus, true),
	AsUpped(card::Plague, true),
	AsUpped(card::Aflatoxin, true),
	AsUpped(card::Parasite, true),
	AsUpped(card::LiquidShadow, true),
	AsUpped(card::BlackNymph, true),
];
const HAS_BURROW: [i16; 10] = [
	card::Antlion,
	card::Graboid,
	card::Shrieker,
	card::Sinkhole,
	card::BobbitWorm,
	AsUpped(card::Antlion, true),
	AsUpped(card::Graboid, true),
	AsUpped(card::Shrieker, true),
	AsUpped(card::Sinkhole, true),
	AsUpped(card::BobbitWorm, true),
];
const HAS_LIGHT: [i16; 8] = [
	card::Luciferin,
	card::WhiteNymph,
	card::FireflyQueen,
	card::BloodMoon,
	AsUpped(card::Luciferin, true),
	AsUpped(card::Photon, true),
	AsUpped(card::WhiteNymph, true),
	AsUpped(card::BloodMoon, true),
];

fn scorpion(card: &'static Card, deck: &[i16]) -> bool {
	let isdeath = card.isOf(card::Deathstalker);
	deck.iter().any(|&code| {
		HAS_BUFF.iter().any(|&buffcode| buffcode == code)
			|| (isdeath && (code == card::Nightfall || code == card::AsUpped(card::Nightfall, true)))
	})
}
fn filters(code: i16, deck: &[i16], ecost: &[i16; 13]) -> bool {
	let card = card::OpenSet.get(code);
	match card::AsUpped(code, false) {
		card::SchrdingersCat => {
			let mut n = 0;
			deck.iter()
				.filter(|&&dcode| {
					let c = card::OpenSet.get(dcode);
					c.skill().iter().any(|&(k, sks)| {
						k == Event::Death
							|| (k == Event::Cast
								&& sks.iter().any(|&sk| {
									matches!(
										sk,
										Skill::mutation
											| Skill::improve | Skill::jelly | Skill::trick
											| Skill::immolate(_) | Skill::appease
									)
								}))
					})
				})
				.count() > 3
		}
		card::Deathstalker | card::DuneScorpion => scorpion(card, deck),
		card::TidalHealing => {
			let mut aquatics: i32 = 0;
			for &dcode in deck.iter() {
				if card::OpenSet.get(dcode).flag() & Flag::aquatic != 0 {
					if aquatics > 3 {
						return true;
					}
					aquatics += 1;
				}
			}
			false
		}
		card::Tunneling => deck.iter().any(|&dcode| HAS_BURROW.contains(&dcode)),
		card::ShardofIntegrity => {
			let mut shardcount: i32 = 0;
			for &dcode in deck.iter() {
				if etg::ShardList.contains(&dcode) {
					if shardcount > 4 {
						return true;
					}
					shardcount += 1;
				}
			}
			false
		}
		card::Rustler => {
			if ecost[etg::Light as usize].abs() > 5 * PREC {
				return true;
			};
			let mut qpe = 0;
			for i in 1..12 {
				if ecost[i] > 2 * PREC {
					qpe += 1;
				}
			}
			return qpe > 3;
		}
		card::Hope => {
			let mut lightprod = 0;
			for &dcode in deck.iter() {
				if HAS_LIGHT.contains(&dcode) {
					if lightprod > 3 {
						return true;
					}
					lightprod += 1;
				}
			}
			false
		}
		card::Neurotoxin => {
			for &dcode in deck.iter() {
				if HAS_POISON.contains(&dcode) {
					return true;
				}
				if dcode == card::VoodooDoll || dcode == AsUpped(card::VoodooDoll, true) {
					if deck.iter().any(|dcode2| CAN_INFECT.contains(dcode2)) {
						return true;
					}
				}
			}
			false
		}
		_ => true,
	}
}

const MATERIAL: [u8; 4] = [4, 6, 7, 9];
const SPIRITUAL: [u8; 4] = [2, 5, 8, 11];
const CARDINAL: [u8; 4] = [1, 3, 10, 12];
struct Builder {
	pub mark: i16,
	pub deck: Vec<i16>,
	pub anyshield: u8,
	pub anyweapon: u8,
	pub ecost: [i16; 13],
	pub uprate: u8,
	pub rng: Pcg32,
}

impl Builder {
	fn new(mark: i16, uprate: u8, markpower: i16, rng: &Pcg32) -> Builder {
		let mut ecost = [0; 13];
		ecost[mark as usize] = markpower * (PREC * -8);
		Builder {
			mark,
			deck: Vec::with_capacity(60),
			anyshield: 0,
			anyweapon: 0,
			ecost: [0; 13],
			uprate,
			rng: Pcg32::from(rng.next32()),
		}
	}

	fn filter_cards(&mut self) {
		let mut idx = self.deck.len() - 1;
		loop {
			let code = self.deck[idx];
			let card = card::OpenSet.get(code);
			if !filters(code, &self.deck, &self.ecost) {
				self.ecost[card.element as usize] -= card.cost as i16 * PREC;
				self.deck.swap_remove(idx);
				idx = self.deck.len() - 1;
			} else {
				if idx == 0 {
					return;
				}
				idx -= 1;
			}
		}
	}

	fn card_count(&self, code: i16) -> usize {
		self.deck.iter().filter(|&&dcode| dcode == code).count()
	}

	fn add_card(&mut self, code: i16) {
		let card = card::OpenSet.get(code);
		self.deck.push(code);
		if (!(((card.kind == Kind::Weapon && self.anyweapon == 0)
			|| (card.kind == Kind::Shield && self.anyshield == 0))
			&& self.card_count(code) > 0))
		{
			self.ecost[card.costele as usize] += card.cost as i16 * PREC;
		}
		if card.kind != Kind::Spell && card.cast > 0 {
			self.ecost[card.castele as usize] += card.cast as i16 * (PREC * 3 / 2);
		}
		if card.isOf(card::Nova) {
			self.ecost[0] -= if card.upped() { 24 * PREC } else { 12 * PREC };
		} else if card.isOf(card::Immolation) {
			self.ecost[0] -= 12 * PREC;
			self.ecost[etg::Fire as usize] -= if card.upped() { 7 * PREC } else { 5 * PREC };
		} else if card.isOf(card::GiftofOceanus) {
			if self.mark == etg::Water {
				self.ecost[etg::Water as usize] -= 3 * PREC;
			} else {
				self.ecost[etg::Water as usize] -= 2 * PREC;
				self.ecost[self.mark as usize] -= 2 * PREC;
			}
		} else if card.isOf(card::Georesonator) {
			self.ecost[self.mark as usize] -= 6 * PREC;
			self.ecost[0] -= 4 * PREC;
		}
		if card.kind == Kind::Creature {
			if let Some(&(_, sks)) = card.skill().iter().find(|&&(k, sks)| k == Event::OwnAttack) {
				for &sk in sks.iter() {
					if let Skill::quanta(q) = sk {
						self.ecost[q as usize] -= 3 * PREC;
					} else if sk == Skill::siphon {
						self.ecost[etg::Darkness as usize] -= 2 * PREC;
					}
				}
			}
		} else if card.kind == Kind::Shield {
			self.anyshield += 1;
		} else if card.kind == Kind::Weapon {
			self.anyweapon += 1;
		}
	}

	fn add_pillars(&mut self) {
		for i in 1..=12 {
			self.ecost[i] += self.ecost[0] / 12;
		}
		const MATBITS: u16 = 1 << MATERIAL[0] | 1 << MATERIAL[1] | 1 << MATERIAL[2] | 1 << MATERIAL[3];
		const SPIBITS: u16 = 1 << SPIRITUAL[0] | 1 << SPIRITUAL[1] | 1 << SPIRITUAL[2] | 1 << SPIRITUAL[3];
		const CARBITS: u16 = 1 << CARDINAL[0] | 1 << CARDINAL[1] | 1 << CARDINAL[2] | 1 << CARDINAL[3];
		let mut qc: u16 = 0x1ffe;
		loop {
			for i in 1..=12 {
				if self.ecost[i] < 2 * PREC {
					qc &= !(1 << i);
				}
			}
			if qc.count_ones() < 3 {
				break;
			}
			let hasmat = (qc & MATBITS).count_ones() > 2;
			let hasspi = (qc & SPIBITS).count_ones() > 2;
			let hascar = (qc & CARBITS).count_ones() > 2;
			let quadcount = (hasmat as i32) + (hasspi as i32) + (hascar as i32);
			if quadcount == 1 && hasmat {
				self.deck.push(self.up_code(card::MaterialPillar));
				for &e in MATERIAL.iter() {
					self.ecost[e as usize] -= 2 * PREC;
				}
			} else if quadcount == 1 && hasspi {
				self.deck.push(self.up_code(card::SpiritualPillar));
				for &e in SPIRITUAL.iter() {
					self.ecost[e as usize] -= 2 * PREC;
				}
			} else if quadcount == 1 && hascar {
				self.deck.push(self.up_code(card::CardinalPillar));
				for &e in CARDINAL.iter() {
					self.ecost[e as usize] -= 2 * PREC;
				}
			} else {
				self.deck.push(self.up_code(card::QuantumPillar));
				for i in 1..=12 {
					self.ecost[i] -= PREC * 5 / 4;
				}
			}
		}
		for i in 1..=12 {
			let mark = self.mark as usize;
			if i != mark {
				for j in (0..self.ecost[i].min(self.ecost[mark]) as i32).step_by(120) {
					self.deck.push(self.up_code(5050 + i as i16 * 100));
					self.ecost[mark] -= 5 * PREC / 2;
					self.ecost[i] -= 5 * PREC / 2;
				}
			}
		}
		for i in 1..=12 {
			if qc & (1 << i) != 0 {
				for j in (0..self.ecost[i] as i32).step_by(60) {
					self.deck.push(self.up_code(if j % 120 == 0 { 5000 } else { 5050 } + i as i16 * 100));
				}
			}
		}
	}

	fn up_code(&self, code: i16) -> i16 {
		if self.uprate > 0 { card::AsUpped(code, (self.rng.upto(100) as u8) < self.uprate) } else { code }
	}

	fn add_equipment(&mut self) {
		if self.anyshield == 0 {
			self.add_card(self.up_code(card::Shield));
		}
		if self.anyweapon == 0 {
			self.add_card(self.default_weapon());
		}
	}

	fn default_weapon(&self) -> i16 {
		self.up_code(match self.mark {
			etg::Air | etg::Light => card::ShortBow,
			etg::Gravity | etg::Earth => card::Hammer,
			etg::Water | etg::Life => card::Wand,
			etg::Darkness | etg::Death => card::Dagger,
			etg::Entropy | etg::Aether => card::Disc,
			etg::Fire | etg::Time => card::BattleAxe,
			_ => card::ShortSword,
		})
	}

	fn finish(mut self) -> Vec<i16> {
		self.deck.sort_unstable_by(|&x, &y| card::code_cmp_core(&card::OpenSet, x, y));
		self.deck.push(self.mark + 9010);
		self.deck
	}
}

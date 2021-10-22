use std::cell::RefCell;

use rand::{Rng, SeedableRng};
use rand_pcg::Pcg32;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::card::{self, Card, Cards};
use crate::etg;
use crate::game::{Flag, Kind};
use crate::skill::{Event, Skill};

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn deckgen_duo(uprate: f64, markpower: i32, maxrarity: i32, seed: i32) -> Vec<u16> {
	let mut rng = Pcg32::seed_from_u64(seed as u64);
	let eles = [rng.gen_range(1..=12i8), rng.gen_range(1..=12i8)];
	let mut build = Builder::new(eles[1] as i32, uprate, markpower, &mut rng);
	for j in 0..=1 {
		let ele = eles[j];
		for i in 0..(20 - j * 10) {
			let upped = rng.gen_bool(uprate);
			if let Some(card) = card::OpenSet.random_card(&mut rng, upped, |card| {
				card.element == ele
					&& (card.flag & Flag::pillar) == 0
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
pub fn deckgen_bow(uprate: f64, markpower: i32, maxrarity: i32, seed: i32) -> Vec<u16> {
	let mut rng = Pcg32::seed_from_u64(seed as u64);
	let mut build: Builder;
	if (rng.gen_bool(uprate / 2.0)) {
		build = Builder::new(etg::Entropy, uprate, markpower, &mut rng);
		for _ in 0..rng.gen_range(4..=6) {
			build.add_card(card::AsUpped(card::Nova, true) as u16);
		}
	} else {
		build = Builder::new(etg::Chroma, uprate, markpower, &mut rng);
		for _ in 0..rng.gen_range(0..=6) {
			build.add_card(card::Nova as u16);
		}
	}
	for ele in 1..=12 {
		for i in 0..=rng.gen_range(1..=4) {
			let upped = rng.gen_bool(uprate);
			if let Some(card) = card::OpenSet.random_card(&mut rng, upped, |card| {
				card.element == ele
					&& (card.flag & Flag::pillar) == 0
					&& card.cost < 7 && card.rarity as i32 <= maxrarity
					&& build.card_count(card.code) != 6
					&& !(card.kind == Kind::Shield && build.anyshield >= 3)
					&& !(card.kind == Kind::Weapon && build.anyweapon >= 3)
					&& !card.isOf(card::Give)
					&& !card.isOf(card::GiftofOceanus)
					&& !card.isOf(card::Precognition)
			}) {
				if (build.ecost[ele as usize] + (card.cost as f32) < 10.0) {
					build.add_card(card.code);
				}
			}
		}
	}
	build.filter_cards();
	let mut cost = build.ecost[0] / 4.0;
	for i in 1..=12 {
		cost += build.ecost[i];
	}
	for i in (0..cost as i32).step_by(12) {
		build.deck.push(build.up_code(card::QuantumPillar as u16));
	}
	if build.deck.len() < 30 {
		deckgen_duo(uprate, markpower, maxrarity, seed)
	} else {
		build.finish()
	}
}

const HAS_BUFF: [u16; 20] = [
	5125, 5318, 8230, 5306, 5730, 5721, 5807, 6115, 6218, 6230, 7106, 7125, 7306, 7318, 7730, 7721,
	7807, 8115, 8218, 9015,
];
const HAS_POISON: [u16; 23] = [
	5218, 5219, 5225, 7208, 5208, 5210, 5214, 5212, 5512, 5518, 5507, 5701, 7218, 7210, 7225, 7214,
	7219, 7212, 7512, 7518, 7507, 7701, 7710,
];
const CAN_INFECT: [u16; 16] = [
	5220, 5224, 7202, 7209, 5202, 5212, 5710, 6103, 6110, 6120, 7212, 7224, 7220, 8103, 8110, 8120,
];
const HAS_BURROW: [u16; 4] = [5408, 5409, 5416, 5401];
const HAS_LIGHT: [u16; 6] = [5811, 5820, 5908, 7811, 7801, 7820];

fn scorpion(card: &'static Card, deck: &[u16]) -> bool {
	let isdeath = card.isOf(card::Deathstalker); // Scan for Nightfall
	deck.iter().any(|&code| {
		HAS_BUFF.iter().any(|&buffcode| buffcode == code)
			|| (isdeath && (code == 6106 || code == 8106))
	})
}
fn filters(code: u16, deck: &[u16], ecost: &[f32; 13]) -> bool {
	let card = card::OpenSet.get(code as i32);
	match card::AsUpped(code as i32, false) {
		5114 => {
			// dinger
			let mut n = 0;
			deck.iter()
				.filter(|&&dcode| {
					let c = card::OpenSet.get(dcode as i32);
					c.skill.iter().any(|kv| kv.0 == Event::Death)
						|| c.skill.iter().any(|&(k, sks)| {
							k == Event::Cast
								&& sks.iter().any(|&sk| {
									matches!(
										sk,
										Skill::mutation
											| Skill::improve | Skill::jelly | Skill::trick
											| Skill::immolate(_) | Skill::appease
									)
								})
						})
				})
				.count() > 3
		}
		5214 => scorpion(card, deck),
		5325 => {
			// tidal
			let mut aquatics: i32 = 0;
			for &dcode in deck.iter() {
				if card::OpenSet.get(dcode as i32).flag & Flag::aquatic != 0 {
					if aquatics > 3 {
						return true;
					}
					aquatics += 1;
				}
			}
			false
		}
		5418 => {
			// tunneling
			deck.iter().any(|&dcode| HAS_BURROW.contains(&dcode))
		}
		5430 => {
			// soi
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
		5503 => {
			// rustler
			if ecost[etg::Light as usize].abs() > 5.0 {
				return true;
			};
			let mut qpe = 0;
			for i in 1..12 {
				if ecost[i] > 2.0 {
					qpe += 1;
				}
			}
			return qpe > 3;
		}
		5812 => {
			// hope
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
		6013 => scorpion(card, deck),
		6015 => {
			// neuro
			for &dcode in deck.iter() {
				if (HAS_POISON.contains(&dcode)) {
					return true;
				}
				if (dcode == 6112 || dcode == 8112) {
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
	pub mark: i32,
	pub deck: Vec<u16>,
	pub anyshield: u8,
	pub anyweapon: u8,
	pub ecost: [f32; 13],
	pub uprate: f64,
	pub rng: RefCell<Pcg32>,
}

impl Builder {
	fn new(mark: i32, uprate: f64, markpower: i32, rng: &mut Pcg32) -> Builder {
		let mut ecost = [0.0; 13];
		ecost[mark as usize] = (-8 * markpower) as f32;
		Builder {
			mark: mark,
			deck: Vec::with_capacity(60),
			anyshield: 0,
			anyweapon: 0,
			ecost: [0.0; 13],
			uprate: uprate,
			rng: RefCell::new(Pcg32::from_rng(rng).unwrap()),
		}
	}

	fn filter_cards(&mut self) {
		let mut idx = self.deck.len() - 1;
		loop {
			let code = self.deck[idx];
			let card = card::OpenSet.get(code as i32);
			if !filters(code, &self.deck, &self.ecost) {
				self.ecost[card.element as usize] -= card.cost as f32;
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

	fn card_count(&self, code: u16) -> usize {
		self.deck.iter().filter(|&&dcode| dcode == code).count()
	}

	fn add_card(&mut self, code: u16) {
		let card = card::OpenSet.get(code as i32);
		self.deck.push(code);
		if (!(((card.kind == Kind::Weapon && self.anyweapon == 0)
			|| (card.kind == Kind::Shield && self.anyshield == 0))
			&& self.card_count(code) > 0))
		{
			self.ecost[card.costele as usize] += card.cost as f32;
		}
		if (card.kind != Kind::Spell && card.cast > 0) {
			self.ecost[card.castele as usize] += (card.cast as f32) * 1.5;
		}
		if (card.isOf(card::Nova)) {
			self.ecost[0] -= if card.upped() { 24.0 } else { 12.0 };
		} else if (card.isOf(card::Immolation)) {
			self.ecost[0] -= 12.0;
			self.ecost[etg::Fire as usize] -= if card.upped() { 7.0 } else { 5.0 };
		} else if (card.isOf(card::GiftofOceanus)) {
			if (self.mark == etg::Water) {
				self.ecost[etg::Water as usize] -= 3.0;
			} else {
				self.ecost[etg::Water as usize] -= 2.0;
				self.ecost[self.mark as usize] -= 2.0;
			}
		} else if (card.isOf(card::Georesonator)) {
			self.ecost[self.mark as usize] -= 6.0;
			self.ecost[0] -= 4.0;
		}
		if (card.kind == Kind::Creature) {
			if let Some(&(_, sks)) = card.skill.iter().find(|&&(k, sks)| k == Event::OwnAttack) {
				for &sk in sks.iter() {
					if let Skill::quanta(q) = sk {
						self.ecost[q as usize] -= 3.0;
					} else if sk == Skill::siphon {
						self.ecost[etg::Darkness as usize] -= 2.0;
					}
				}
			}
		} else if (card.kind == Kind::Shield) {
			self.anyshield += 1;
		} else if (card.kind == Kind::Weapon) {
			self.anyweapon += 1;
		}
	}

	fn add_pillars(&mut self) {
		for i in 1..=12 {
			self.ecost[i] += self.ecost[0] / 12.0;
		}
		const MATBITS: u16 =
			1 << MATERIAL[0] | 1 << MATERIAL[1] | 1 << MATERIAL[2] | 1 << MATERIAL[3];
		const SPIBITS: u16 =
			1 << SPIRITUAL[0] | 1 << SPIRITUAL[1] | 1 << SPIRITUAL[2] | 1 << SPIRITUAL[3];
		const CARBITS: u16 =
			1 << CARDINAL[0] | 1 << CARDINAL[1] | 1 << CARDINAL[2] | 1 << CARDINAL[3];
		let mut qc: u16 = 0x1ffe;
		loop {
			for i in 1..=12 {
				if self.ecost[i] < 2.0 {
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
				self.deck.push(self.up_code(card::MaterialPillar as u16));
				for &e in MATERIAL.iter() {
					self.ecost[e as usize] -= 2.0;
				}
			} else if quadcount == 1 && hasspi {
				self.deck.push(self.up_code(card::SpiritualPillar as u16));
				for &e in SPIRITUAL.iter() {
					self.ecost[e as usize] -= 2.0;
				}
			} else if quadcount == 1 && hascar {
				self.deck.push(self.up_code(card::CardinalPillar as u16));
				for &e in CARDINAL.iter() {
					self.ecost[e as usize] -= 2.0;
				}
			} else {
				self.deck.push(self.up_code(card::QuantumPillar as u16));
				for i in 1..=12 {
					self.ecost[i] -= 1.25;
				}
			}
		}
		for i in 1..=12 {
			if qc & (1 << i) != 0 {
				for j in (0..self.ecost[i] as i32).step_by(5) {
					self.deck.push(self.up_code(etg::PillarList[i]));
				}
			}
		}
	}

	fn up_code(&self, code: u16) -> u16 {
		if self.uprate > 0.0 {
			card::AsUpped(code as i32, self.rng.borrow_mut().gen_bool(self.uprate)) as u16
		} else {
			code
		}
	}

	fn add_equipment(&mut self) {
		if self.anyshield == 0 {
			self.add_card(self.up_code(card::Shield as u16));
		}
		if self.anyweapon == 0 {
			self.add_card(self.default_weapon());
		}
	}

	fn default_weapon(&self) -> u16 {
		self.up_code(match self.mark {
			etg::Air | etg::Light => card::ShortBow,
			etg::Gravity | etg::Earth => card::Hammer,
			etg::Water | etg::Life => card::Wand,
			etg::Darkness | etg::Death => card::Dagger,
			etg::Entropy | etg::Aether => card::Disc,
			etg::Fire | etg::Time => card::BattleAxe,
			_ => card::ShortSword,
		} as u16)
	}

	fn finish(mut self) -> Vec<u16> {
		self.deck.push((self.mark as u16) + 9010);
		self.deck
	}
}

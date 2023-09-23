#![no_std]
#![allow(non_snake_case)]

use alloc::{string::String, vec::Vec};
use core::cmp::Ordering;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::etg;
pub use crate::game::CardSet;
use crate::game::{Flag, Kind, Stat};
pub use crate::generated::*;
use crate::skill::{Event, Skill};

#[derive(Clone, Copy)]
pub struct Cards {
	pub set: CardSet,
	pub data: &'static [Card],
}

#[derive(Clone, Copy)]
pub struct Card {
	pub code: u16,
	pub name: &'static str,
	pub kind: Kind,
	pub element: i8,
	pub rarity: i8,
	pub attack: i8,
	pub health: i8,
	pub cost: i8,
	pub costele: i8,
	pub cast: i8,
	pub castele: i8,
	pub flag: &'static u64,
	pub status: &'static [(Stat, i32)],
	pub skill: &'static [(Event, &'static [Skill])],
}

impl Cards {
	pub fn get(&self, code: i32) -> &'static Card {
		if let Some(card) = self.try_get(code) {
			card
		} else {
			panic!("Unknown code: {}", code)
		}
	}

	pub fn try_get(&self, code: i32) -> Option<&'static Card> {
		self.data
			.binary_search_by_key(&AsShiny(code, false), |card| card.code as i32)
			.ok()
			.and_then(|idx| self.data.get(idx))
	}

	pub fn try_get_index(&self, index: usize) -> Option<&'static Card> {
		self.data.get(index)
	}

	pub fn filter(&self, upped: bool) -> &'static [Card] {
		let pivot = self.data.len() / 2;
		if upped {
			&self.data[pivot..]
		} else {
			&self.data[..pivot]
		}
	}

	pub fn random_card<Ffilt, R>(
		&self,
		rng: &mut R,
		upped: bool,
		ffilt: Ffilt,
	) -> Option<&'static Card>
	where
		Ffilt: Fn(&'static Card) -> bool,
		R: rand::Rng,
	{
		use rand::seq::IteratorRandom;

		self.filter(upped)
			.iter()
			.filter(|c| (c.flag & Flag::token) == 0 && ffilt(c))
			.choose(rng)
	}
}

impl Card {
	pub const fn upped(&self) -> bool {
		Upped(self.code as i32)
	}

	pub const fn shiny(&self) -> bool {
		Shiny(self.code as i32)
	}

	pub const fn isOf(&self, code: i32) -> bool {
		IsOf(self.code as i32, code)
	}

	pub fn free(&self) -> bool {
		self.rarity == 0 && (self.flag & Flag::pillar) != 0 && self.upped()
	}
}

pub const fn IsOf(code: i32, ofcode: i32) -> bool {
	ofcode == AsShiny(AsUpped(code, false), false)
}

pub const fn As(code: i32, ofcode: i32) -> i32 {
	AsShiny(AsUpped(ofcode, Upped(code)), Shiny(code))
}

pub const fn Upped(code: i32) -> bool {
	let code = AsShiny(code, false);
	code >= 7000 || (code < 5000 && code >= 3000)
}

pub const fn Shiny(code: i32) -> bool {
	(code & 0x4000) != 0
}

pub const fn AsUpped(code: i32, upped: bool) -> i32 {
	code + if Upped(code) == upped {
		0
	} else if upped {
		2000
	} else {
		-2000
	}
}

pub const fn AsShiny(code: i32, shiny: bool) -> i32 {
	if shiny {
		code | 0x4000
	} else {
		code & 0x3fff
	}
}

pub const fn cardSetCards(set: CardSet) -> &'static Cards {
	match set {
		CardSet::Original => &OrigSet,
		_ => &OpenSet,
	}
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_codes(set: CardSet) -> Vec<u16> {
	cardSetCards(set)
		.data
		.iter()
		.map(|&card| card.code)
		.filter(|&code| !Upped(code as i32))
		.collect::<Vec<_>>()
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_index(set: CardSet, code: u16) -> Option<usize> {
	cardSetCards(set)
		.data
		.binary_search_by_key(&code, |card| card.code)
		.ok()
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_name(set: CardSet, index: usize) -> Option<String> {
	cardSetCards(set)
		.try_get_index(index)
		.map(|&card| String::from(card.name))
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_type(set: CardSet, index: usize) -> Option<Kind> {
	cardSetCards(set)
		.try_get_index(index)
		.map(|&card| card.kind)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_element(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set)
		.try_get_index(index)
		.map(|&card| card.element)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_rarity(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set)
		.try_get_index(index)
		.map(|&card| card.rarity)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_cost(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set)
		.try_get_index(index)
		.map(|&card| card.cost)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_costele(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set)
		.try_get_index(index)
		.map(|&card| card.costele)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_pillar(set: CardSet, index: usize) -> bool {
	cardSetCards(set)
		.try_get_index(index)
		.map(|&card| (card.flag & Flag::pillar) != 0)
		.unwrap_or(false)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_token(set: CardSet, index: usize) -> bool {
	cardSetCards(set)
		.try_get_index(index)
		.map(|&card| (card.flag & Flag::token) != 0)
		.unwrap_or(false)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn code_cmp(set: CardSet, x: i32, y: i32) -> i32 {
	let cards = cardSetCards(set);
	match code_cmp_core(cards, x, y) {
		Ordering::Less => -1,
		Ordering::Equal => 0,
		Ordering::Greater => 1,
	}
}

pub fn code_cmp_core(cards: &'static Cards, x: i32, y: i32) -> Ordering {
	if let (Some(cx), Some(cy)) = (cards.try_get(x), cards.try_get(y)) {
		cx.upped()
			.cmp(&cy.upped())
			.then(cx.element.cmp(&cy.element))
			.then((cy.flag & Flag::pillar).cmp(&(cx.flag & Flag::pillar)))
			.then(cx.cost.cmp(&cy.cost))
			.then(cx.kind.cmp(&cy.kind))
			.then(x.cmp(&y))
	} else {
		Ordering::Equal
	}
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn original_oracle(seed: i32) -> u16 {
	use rand::{Rng, SeedableRng};
	use rand_pcg::Pcg32;
	let mut rng = Pcg32::seed_from_u64(seed as u64);
	let nymph = rng.gen_bool(0.03);
	OrigSet
		.random_card(&mut rng, false, |c| {
			c.code != v_Relic as u16
				&& !(c.code >= v_MarkofEntropy as u16 && c.code <= v_MarkofAether as u16)
				&& !c.free() && nymph == etg::NymphList.contains(&(c.code + 4000))
		})
		.map(|c| c.code)
		.unwrap_or(0)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn selector_filter(set: CardSet, col: u32, element: i8, rarity: i8) -> Vec<u16> {
	let cards = cardSetCards(set);
	let mut result = Vec::with_capacity(15);
	for card in cards.filter(col > 2) {
		if (rarity == 4 || card.element == element)
			&& (rarity == 0 || card.rarity == rarity)
			&& match col % 3 {
				0 => card.kind == Kind::Creature,
				1 => card.kind <= Kind::Permanent,
				_ => card.kind == Kind::Spell,
			} {
			result.push(card.code);
		}
	}
	result.sort_unstable_by(|&x, &y| code_cmp_core(cards, x as i32, y as i32));
	result
}

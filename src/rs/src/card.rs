#![allow(non_snake_case)]

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

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
			.map(|idx| &self.data[idx])
			.ok()
	}

	pub fn try_get_index(&self, index: usize) -> Option<&'static Card> {
		self.data.get(index)
	}

	pub fn filter<Ffilt>(&self, upped: bool, ffilt: Ffilt) -> Vec<&'static Card>
	where
		Ffilt: Fn(&'static Card) -> bool,
	{
		(match self.set {
			CardSet::Open => &OpenCache,
			CardSet::Original => &OrigCache,
		}[upped as usize])
			.iter()
			.cloned()
			.map(|c| unsafe { self.data.get_unchecked(c as usize) })
			.filter(|c| ffilt(c))
			.collect::<Vec<_>>()
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

		(match self.set {
			CardSet::Open => &OpenCache,
			CardSet::Original => &OrigCache,
		}[upped as usize])
			.iter()
			.cloned()
			.map(|c| unsafe { self.data.get_unchecked(c as usize) })
			.filter(|c| ffilt(c))
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

const fn cardSetCards(set: CardSet) -> &'static Cards {
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
	cardSetCards(set).data.binary_search_by_key(&code, |card| card.code).ok()
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_type(set: CardSet, index: usize) -> Option<Kind> {
	cardSetCards(set).try_get_index(index).map(|&card| card.kind)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_element(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set).try_get_index(index).map(|&card| card.element)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_rarity(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set).try_get_index(index).map(|&card| card.rarity)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_attack(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set).try_get_index(index).map(|&card| card.attack)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_health(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set).try_get_index(index).map(|&card| card.health)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_cost(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set).try_get_index(index).map(|&card| card.cost)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_costele(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set).try_get_index(index).map(|&card| card.costele)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_cast(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set).try_get_index(index).map(|&card| card.cast)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_castele(set: CardSet, index: usize) -> Option<i8> {
	cardSetCards(set).try_get_index(index).map(|&card| card.castele)
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_stats(set: CardSet, index: usize) -> Option<Vec<i32>> {
	cardSetCards(set).try_get_index(index).map(|&card| {
		card.status
			.iter()
			.flat_map(|&(k, v)| [id_stat(k), v].into_iter())
			.chain(
				Flag(*card.flag)
					.into_iter()
					.flat_map(|k| [id_flag(k), 1].into_iter()),
			)
			.collect()
	})
}

#[cfg(target_arch = "wasm32")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn card_skills(set: CardSet, index: usize) -> Option<Vec<i32>> {
	cardSetCards(set).try_get_index(index).map(|&card| {
		card.skill
			.iter()
			.flat_map(|&(k, v)| {
				std::iter::once(u8::from(k) as i32 | (v.len() as i32) << 8).chain(
					v.iter()
						.map(|&sk| id_skill(sk) | sk.param1() << 16 | sk.param2() << 24),
				)
			})
			.collect::<Vec<_>>()
	})
}
#![allow(non_snake_case)]

pub use crate::game::CardSet;
use crate::game::Stat;
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
	pub kind: i8,
	pub element: i8,
	pub rarity: i8,
	pub attack: i8,
	pub health: i8,
	pub cost: i8,
	pub costele: i8,
	pub cast: i8,
	pub castele: i8,
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
	pub fn upped(&self) -> bool {
		Upped(self.code as i32)
	}

	pub fn shiny(&self) -> bool {
		Shiny(self.code as i32)
	}

	pub fn isOf(&self, code: i32) -> bool {
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

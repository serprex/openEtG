#![no_std]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(non_upper_case_globals)]

use alloc::borrow::Cow;
use alloc::boxed::Box;
use alloc::rc::Rc;
use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;
use core::default::Default;
use core::fmt::{self, Display, Write};
use core::hash::{Hash, Hasher};
use core::iter::once;

use fxhash::FxHasher64;
use rand::distributions::{uniform::SampleRange, uniform::SampleUniform, Distribution, Uniform};
use rand::seq::SliceRandom;
use rand::{Rng, SeedableRng};
use rand_pcg::Pcg32;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::card::{self, Card, Cards};
use crate::etg;
use crate::generated;
use crate::set_panic_hook;
use crate::skill::{Event, ProcData, Skill, SkillName, Skills};
use crate::text::SkillThing;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Copy, Hash, Eq, PartialEq)]
pub enum CardSet {
	Open,
	Original,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Copy, Default, Hash, Eq, PartialEq, Ord, PartialOrd)]
pub enum Kind {
	#[default]
	Weapon,
	Shield,
	Permanent,
	Spell,
	Creature,
	Player,
}

#[derive(Clone, Default)]
pub struct ThingData {
	pub kind: Kind,
	pub owner: i16,
	pub flag: Flag,
	pub status: Status,
	pub skill: Skills,
}

impl ThingData {
	fn hash(&self, hasher: &mut FxHasher64) {
		self.flag.0.hash(hasher);
		for &(k, v) in self.status.iter() {
			if v != 0 {
				k.hash(hasher);
				v.hash(hasher);
			}
		}
		for (k, v) in self.skill.iter() {
			if !v.is_empty() {
				k.hash(hasher);
				v.hash(hasher);
			}
		}
	}
}

#[derive(Clone, Default)]
pub struct PlayerData {
	pub thing: ThingData,
	pub foe: i16,
	pub leader: i16,
	pub weapon: i16,
	pub shield: i16,
	pub mark: i8,
	pub markpower: i8,
	pub deckpower: u8,
	pub drawpower: u8,
	pub creatures: [i16; 23],
	pub permanents: [i16; 16],
	pub quanta: [u8; 12],
	pub hand: [i16; 8],
	pub deck: Rc<Vec<i16>>,
}

impl PlayerData {
	pub fn quanta(&self, q: i16) -> u8 {
		self.quanta[(q - 1) as usize]
	}

	pub fn deck_mut(&mut self) -> &mut Vec<i16> {
		Rc::make_mut(&mut self.deck)
	}

	pub fn hand_full(&self) -> bool {
		self.hand[7] != 0
	}

	pub fn hand_len(&self) -> usize {
		self.hand_iter().count()
	}

	pub fn hand_last(&self) -> Option<i16> {
		if self.hand[0] == 0 {
			None
		} else {
			let mut idx = 7;
			loop {
				if self.hand[idx] != 0 {
					return Some(self.hand[idx]);
				}
				idx -= 1;
			}
		}
	}

	pub fn hand_push(&mut self, id: i16) -> i32 {
		for (idx, handid) in self.hand.iter_mut().enumerate() {
			if *handid == 0 {
				*handid = id;
				return idx as i32;
			}
		}
		-1
	}

	pub fn hand_remove(&mut self, idx: usize) {
		for i in idx..7 {
			self.hand[i] = self.hand[i + 1];
		}
		self.hand[7] = 0;
	}

	pub fn hand_iter(&self) -> impl Iterator<Item = i16> {
		self.hand.into_iter().take_while(|&id| id != 0)
	}
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Copy, Hash, Eq, PartialEq)]
pub enum Phase {
	Mulligan = 0,
	Play = 1,
	End = 2,
}

#[derive(Clone, Copy)]
pub enum GameMove {
	End(i16),
	Cast(i16, i16),
	Accept,
	Mulligan,
	Foe(i16),
	Resign(i16),
}

impl From<GameMove> for [i16; 3] {
	fn from(cmd: GameMove) -> [i16; 3] {
		match cmd {
			GameMove::End(t) => [0, 0, t],
			GameMove::Cast(c, t) => [1, c, t],
			GameMove::Accept => [2, 0, 0],
			GameMove::Mulligan => [3, 0, 0],
			GameMove::Foe(t) => [4, 0, t],
			GameMove::Resign(c) => [5, c, 0],
		}
	}
}

impl From<[i16; 3]> for GameMove {
	fn from(cmd: [i16; 3]) -> GameMove {
		match cmd[0] {
			0 => GameMove::End(cmd[2]),
			1 => GameMove::Cast(cmd[1], cmd[2]),
			2 => GameMove::Accept,
			3 => GameMove::Mulligan,
			4 => GameMove::Foe(cmd[2]),
			5 => GameMove::Resign(cmd[1]),
			_ => GameMove::Mulligan,
		}
	}
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Copy)]
pub enum Sfx {
	creaPlay,
	devour,
	dive,
	freeze,
	lobo,
	mulligan,
	permPlay,
	poison,
	skelify,
	stasis,
}

#[derive(Clone, Copy)]
pub enum Fx {
	Abomination,
	Adrenaline,
	Aflatoxin,
	Appeased,
	Atk(i16),
	Bolt(i16, i8),
	Card(i16),
	Catapult,
	Clear,
	Death,
	Delay(i16),
	Destroy,
	Devoured,
	Dive,
	Dmg(i16),
	Draft,
	Earthquake,
	Endow,
	EndPos(i16),
	Embezzle,
	Enchant,
	Evade,
	Forced,
	Fractal,
	Free,
	Freeze(i16),
	Hatch,
	Heal(i16),
	Improve,
	LastCard,
	Lightning,
	Liquid,
	Lives(i16),
	Lobotomize,
	Looted,
	Materialize,
	Momentum,
	Nightmare,
	Nullspell,
	Nymph,
	Oops,
	Paradox,
	Parallel,
	Poison(i16),
	Pull,
	Ren,
	Rewind,
	Salvage,
	Sfx(Sfx),
	Shatter,
	Shuffled,
	Silence,
	Sinkhole,
	Siphon,
	StartPos(i16),
	Quanta(i16, i8),
	Quintessence,
	Ready,
	Web,
}

pub struct Fxs(Vec<(i16, Fx)>);

impl Fxs {
	pub fn new() -> Fxs {
		Fxs(Vec::new())
	}

	pub fn js(&self) -> Vec<i16> {
		let mut ret = Vec::with_capacity(self.0.len() * 4);
		for &(id, fx) in self.0.iter() {
			ret.push(generated::id_fx(fx));
			ret.push(id);
			let (p1, p2) = match fx {
				Fx::Atk(x)
				| Fx::Card(x)
				| Fx::Delay(x)
				| Fx::Dmg(x)
				| Fx::EndPos(x)
				| Fx::Freeze(x)
				| Fx::Heal(x)
				| Fx::Lives(x)
				| Fx::Poison(x)
				| Fx::StartPos(x) => (x, 0),
				Fx::Sfx(sfx) => (sfx as i16, 0),
				Fx::Quanta(amt, e) | Fx::Bolt(amt, e) => (amt, e as i16),
				_ => (0, 0),
			};
			ret.push(p1);
			ret.push(p2);
		}
		ret
	}

	pub fn push(&mut self, id: i16, fx: Fx) {
		self.0.push((id, fx))
	}
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Copy, Hash, Ord, PartialOrd, Eq, PartialEq)]
pub enum Stat {
	adrenaline,
	atk,
	card,
	cast,
	castele,
	casts,
	charges,
	cost,
	costele,
	delayed,
	dive,
	flooding,
	frozen,
	gpull,
	hp,
	lives,
	maxhp,
	mode,
	nova,
	nova2,
	poison,
	shardgolem,
	sosa,
	steam,
	storedpower,
	swarmhp,
}

#[derive(Clone, Default)]
pub struct Status(pub Vec<(Stat, i16)>);

pub struct StatusVacant<'a> {
	pub status: &'a mut Status,
	pub idx: usize,
	pub stat: Stat,
}

pub struct StatusOccupied<'a> {
	pub status: &'a mut Status,
	pub idx: usize,
}

impl<'a> StatusOccupied<'a> {
	pub fn get(&self) -> i16 {
		self.status.0[self.idx].1
	}

	pub fn remove(mut self) {
		self.status.0.remove(self.idx);
	}
}

pub enum StatusEntry<'a> {
	Vacant(StatusVacant<'a>),
	Occupied(StatusOccupied<'a>),
}

impl<'a> StatusEntry<'a> {
	pub fn or_insert(self, val: i16) -> &'a mut i16 {
		match self {
			StatusEntry::Vacant(hole) => {
				hole.status.0.insert(hole.idx, (hole.stat, val));
				&mut hole.status.0[hole.idx].1
			}
			StatusEntry::Occupied(spot) => &mut spot.status.0[spot.idx].1,
		}
	}
}

impl Status {
	pub fn get(&self, stat: Stat) -> i16 {
		match self.0.binary_search_by_key(&stat, |kv| kv.0) {
			Err(_) => 0,
			Ok(idx) => self.0[idx].1,
		}
	}

	pub fn get_mut(&mut self, stat: Stat) -> Option<&mut i16> {
		match self.0.binary_search_by_key(&stat, |kv| kv.0) {
			Err(_) => None,
			Ok(idx) => Some(&mut self.0[idx].1),
		}
	}

	pub fn insert(&mut self, stat: Stat, val: i16) {
		match self.0.binary_search_by_key(&stat, |kv| kv.0) {
			Err(idx) => self.0.insert(idx, (stat, val)),
			Ok(idx) => self.0[idx].1 = val,
		}
	}

	pub fn entry(&mut self, stat: Stat) -> StatusEntry {
		match self.0.binary_search_by_key(&stat, |kv| kv.0) {
			Err(idx) => StatusEntry::Vacant(StatusVacant { status: self, idx, stat }),
			Ok(idx) => StatusEntry::Occupied(StatusOccupied { status: self, idx }),
		}
	}

	pub fn iter(&self) -> impl Iterator<Item = &(Stat, i16)> {
		self.0.iter()
	}

	pub fn iter_mut(&mut self) -> impl Iterator<Item = &mut (Stat, i16)> {
		self.0.iter_mut()
	}
}

#[derive(Copy, Clone, Default)]
pub struct Flag(pub u64);

impl Flag {
	pub const additive: u64 = 1 << 0;
	pub const aflatoxin: u64 = 1 << 1;
	pub const airborne: u64 = 1 << 2;
	pub const appeased: u64 = 1 << 3;
	pub const aquatic: u64 = 1 << 4;
	pub const burrowed: u64 = 1 << 5;
	pub const cloak: u64 = 1 << 6;
	pub const drawlock: u64 = 1 << 7;
	pub const golem: u64 = 1 << 8;
	pub const immaterial: u64 = 1 << 9;
	pub const momentum: u64 = 1 << 10;
	pub const mutant: u64 = 1 << 11;
	pub const neuro: u64 = 1 << 12;
	pub const nightfall: u64 = 1 << 13;
	pub const nocturnal: u64 = 1 << 14;
	pub const out: u64 = 1 << 15;
	pub const patience: u64 = 1 << 16;
	pub const pendstate: u64 = 1 << 17;
	pub const pillar: u64 = 1 << 18;
	pub const poisonous: u64 = 1 << 19;
	pub const precognition: u64 = 1 << 20;
	pub const protectdeck: u64 = 1 << 21;
	pub const psionic: u64 = 1 << 22;
	pub const ranged: u64 = 1 << 23;
	pub const ready: u64 = 1 << 24;
	pub const reflective: u64 = 1 << 25;
	pub const resigned: u64 = 1 << 26;
	pub const sabbath: u64 = 1 << 27;
	pub const sanctuary: u64 = 1 << 28;
	pub const stackable: u64 = 1 << 29;
	pub const token: u64 = 1 << 30;
	pub const tunnel: u64 = 1 << 31;
	pub const vindicated: u64 = 1 << 32;
	pub const voodoo: u64 = 1 << 33;
	pub const whetstone: u64 = 1 << 34;

	pub fn get(self, key: u64) -> bool {
		self.0 & key != 0
	}
}

pub struct FlagIter {
	value: u64,
	result: u64,
}

impl Iterator for FlagIter {
	type Item = u64;

	fn next(&mut self) -> Option<Self::Item> {
		while self.value != 0 {
			let result = if (self.value & 1) != 0 { Some(self.result) } else { None };

			self.value >>= 1;
			self.result <<= 1;

			if result.is_some() {
				return result;
			}
		}
		None
	}
}

impl IntoIterator for Flag {
	type Item = u64;
	type IntoIter = FlagIter;

	fn into_iter(self) -> Self::IntoIter {
		FlagIter { value: self.0, result: 1 }
	}
}

pub trait ThingGetter {
	type Value;

	fn get(self, ctx: &Game, id: i16) -> Self::Value;
	fn set(self, ctx: &mut Game, id: i16, val: Self::Value);
}

impl ThingGetter for Stat {
	type Value = i16;

	fn get(self, ctx: &Game, id: i16) -> Self::Value {
		ctx.get_thing(id).status.get(self)
	}

	fn set(self, ctx: &mut Game, id: i16, val: Self::Value) {
		*ctx.get_mut(id, self) = val;
	}
}

impl ThingGetter for u64 {
	type Value = bool;

	fn get(self, ctx: &Game, id: i16) -> Self::Value {
		ctx.get_thing(id).flag.get(self)
	}

	fn set(self, ctx: &mut Game, id: i16, val: Self::Value) {
		if val {
			ctx.get_thing_mut(id).flag.0 |= self;
		} else {
			ctx.get_thing_mut(id).flag.0 &= !self;
		}
	}
}

pub struct SkillsName<'a> {
	pub ctx: &'a Game,
	pub sk: &'a [Skill],
	pub id: i16,
}

impl<'a> Display for SkillsName<'a> {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		for &sk in self.sk {
			SkillName { ctx: self.ctx, sk, id: self.id }.fmt(f)?;
		}
		Ok(())
	}
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct Game {
	rng: Pcg32,
	pub turn: i16,
	pub winner: i16,
	pub phase: Phase,
	plprops: Vec<Rc<PlayerData>>,
	props: Vec<Rc<ThingData>>,
	attacks: Vec<(i16, i16)>,
	cards: &'static Cards,
	fx: Option<Fxs>,
}

impl Clone for Game {
	fn clone(&self) -> Game {
		Game {
			rng: self.rng.clone(),
			turn: self.turn,
			winner: self.winner,
			phase: self.phase,
			plprops: self.plprops.clone(),
			props: self.props.clone(),
			attacks: self.attacks.clone(),
			cards: self.cards,
			fx: None,
		}
	}
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl Game {
	#[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
	pub fn new(seed: u32, set: CardSet, players: u8, now: u32) -> Game {
		set_panic_hook();
		let mut plprops = Vec::with_capacity(players as usize);
		for id in 1..=players as i16 {
			let mut pl: PlayerData = Default::default();
			pl.thing.owner = id;
			pl.thing.kind = Kind::Player;
			pl.thing.status.insert(Stat::casts, 1);
			plprops.push(Rc::new(pl));
		}

		Game {
			rng: Pcg32::seed_from_u64(seed as u64),
			turn: 1,
			winner: 0,
			phase: if set == CardSet::Original { Phase::Play } else { Phase::Mulligan },
			plprops,
			props: Vec::new(),
			attacks: Vec::new(),
			cards: card::cardSetCards(set),
			fx: None,
		}
	}

	pub fn get_stat(&self, id: i16, k: i32) -> i16 {
		if let Some(k) = generated::stat_id(k) {
			self.get(id, k)
		} else if let Some(k) = generated::flag_id(k) {
			self.get(id, k) as i16
		} else {
			0
		}
	}

	pub fn get_mark(&self, id: i16) -> i8 {
		self.get_player(id).mark
	}

	pub fn get_drawpower(&self, id: i16) -> i16 {
		self.get_player(id).drawpower as i16
	}

	pub fn get_deckpower(&self, id: i16) -> i16 {
		self.get_player(id).deckpower as i16
	}

	pub fn get_markpower(&self, id: i16) -> i8 {
		self.get_player(id).markpower
	}

	fn props_idx(&self, id: i16) -> usize {
		id as usize - self.plprops.len() - 1
	}

	fn plprops_idx(&self, id: i16) -> usize {
		(id - 1) as usize
	}

	pub fn get_owner(&self, id: i16) -> i16 {
		if id <= self.players_len() {
			id
		} else {
			self.props[self.props_idx(id)].owner
		}
	}

	pub fn get_kind(&self, id: i16) -> Kind {
		if id <= self.players_len() {
			Kind::Player
		} else {
			self.props[self.props_idx(id)].kind
		}
	}

	pub fn get_foe(&self, id: i16) -> i16 {
		if id <= self.players_len() {
			self.plprops[self.plprops_idx(id)].foe
		} else {
			0
		}
	}

	pub fn get_weapon(&self, id: i16) -> i16 {
		if id <= self.players_len() {
			self.plprops[self.plprops_idx(id)].weapon
		} else {
			0
		}
	}

	pub fn get_shield(&self, id: i16) -> i16 {
		if id <= self.players_len() {
			self.plprops[self.plprops_idx(id)].shield
		} else {
			0
		}
	}

	pub fn clonegame(&self) -> Game {
		self.clone()
	}

	pub fn full_hand(&self, id: i16) -> bool {
		self.get_player(id).hand_full()
	}

	pub fn empty_hand(&self, id: i16) -> bool {
		self.get_player(id).hand[0] == 0
	}

	pub fn has_id(&self, id: i16) -> bool {
		id > 0 && (id as usize) <= self.props_len()
	}

	pub fn get_hand(&self, id: i16) -> Box<[i16]> {
		let pl = self.get_player(id);
		pl.hand[..pl.hand_len()].into()
	}

	pub fn deck_length(&self, id: i16) -> usize {
		self.get_player(id).deck.len()
	}

	pub fn get_quanta(&self, id: i16, ele: i16) -> u8 {
		self.get_player(id).quanta(ele)
	}

	pub fn count_creatures(&self, id: i16) -> i16 {
		self.get_player(id).creatures.into_iter().map(|cr| (cr != 0) as i16).sum()
	}

	pub fn count_permanents(&self, id: i16) -> i16 {
		self.get_player(id).permanents.into_iter().map(|cr| (cr != 0) as i16).sum()
	}

	pub fn hand_overlay(&self, id: i16, p1id: i16) -> i32 {
		if self.get(id, Stat::casts) == 0 {
			12
		} else if self.get(id, Flag::sanctuary) {
			8
		} else if (self.get(id, Stat::nova) >= 2 || self.get(id, Stat::nova2) >= 1)
			&& (id != p1id
				|| self.get_player(id).hand_iter().any(|x| {
					[
						card::v_Nova,
						card::AsUpped(card::v_Nova, true),
						card::Nova,
						card::AsUpped(card::Nova, true),
					]
					.contains(&self.get(x, Stat::card))
				})) {
			1
		} else {
			0
		}
	}

	pub fn hp_text(&self, id: i16, p1id: i16, p2id: i16, expected: i32) -> String {
		let mut s = format!("{}/{}", self.get(id, Stat::hp), self.get(id, Stat::maxhp));
		if expected != 0 && !self.is_cloaked(p2id) {
			write!(s, " ({})", expected);
		}
		let poison = self.get(id, Stat::poison);
		if poison != 0 {
			if poison > 0 {
				write!(s, "\n\n{} 1:2", poison);
			} else {
				write!(s, "\n\n{} 1:7", -poison);
			}
		}
		if self.get(id, Flag::neuro) {
			s.push_str(if poison == 0 { "\n\n1:10" } else { " 1:10" });
		}
		if id != p1id && id != self.get_foe(p1id) {
			s.push_str("\n(Not targeted)");
		}
		s
	}

	pub fn hash(&self) -> u32 {
		let mut hasher: FxHasher64 = Default::default();
		self.phase.hash(&mut hasher);
		self.turn.hash(&mut hasher);
		self.winner.hash(&mut hasher);
		self.cards.set.hash(&mut hasher);
		for (k, v) in self.plprops.iter().enumerate() {
			k.hash(&mut hasher);
			v.creatures.hash(&mut hasher);
			v.permanents.hash(&mut hasher);
			v.hand.hash(&mut hasher);
			v.deck.hash(&mut hasher);
			v.quanta.hash(&mut hasher);
			v.thing.hash(&mut hasher);
		}
		for (k, v) in self.props.iter().enumerate() {
			k.hash(&mut hasher);
			v.hash(&mut hasher);
		}
		let h64 = hasher.finish();
		(h64 >> 32) as u32 ^ h64 as u32
	}

	pub fn set_leader(&mut self, id: i16, leader: i16) {
		self.get_player_mut(id).leader = leader;
	}

	pub fn get_leader(&self, id: i16) -> i16 {
		self.get_player(id).leader
	}

	pub fn init_player(
		&mut self,
		id: i16,
		hp: i16,
		maxhp: i16,
		mark: i8,
		drawpower: u8,
		deckpower: u8,
		markpower: i8,
		mut deck: Vec<i16>,
	) {
		let plen = self.players_len();
		let leader = self.get_leader(id);
		for i in 1..plen {
			let pid = (id - 1 + i) % plen + 1;
			if leader != self.get_leader(pid) {
				self.get_player_mut(id).foe = pid;
			}
		}
		let decklen = deck.len();
		for _ in 1..deckpower {
			for i in 0..decklen {
				deck.push(deck[i]);
			}
		}
		for code in deck.iter_mut() {
			*code = self.new_thing(*code, id);
		}
		{
			let mut pl = self.get_player_mut(id);
			pl.deck = Rc::new(deck);
			pl.thing.status.insert(Stat::hp, hp);
			pl.thing.status.insert(Stat::maxhp, maxhp);
			pl.mark = mark;
			pl.drawpower = drawpower;
			pl.deckpower = deckpower;
			pl.markpower = markpower;
		}
		self.drawhand(id, 7);
		if self.cards.set == CardSet::Original
			&& self.get_player(id).hand.into_iter().all(|card| self.get(card, Stat::cost) != 0)
		{
			let pl = self.get_player_mut(id);
			let pldecklen = pl.deck.len();
			let oldhand = pl.hand;
			let mut newhand = [0; 8];
			for (idx, id) in
				pl.deck_mut().drain(if pldecklen <= 7 { 0 } else { pldecklen - 7 }..).enumerate()
			{
				newhand[idx] = id;
			}
			pl.deck_mut().extend_from_slice(&oldhand);
			pl.hand = newhand;
			for id in pl.hand_iter() {
				self.set_kind(id, Kind::Spell);
			}
		}
	}

	pub fn get_cast_skill(&self, id: i16) -> Option<String> {
		self.skill_text(id, Event::Cast).map(|s| s.to_string())
	}

	pub fn actinfo(&self, c: i16, t: i16) -> Option<String> {
		self.getSkill(c, Event::Cast).first().and_then(|&sk| {
			Some(match sk {
				Skill::firebolt => {
					format!(
						"{}",
						3 + (self.get_quanta(self.get_owner(c), etg::Fire) as i16
							- self.get(c, Stat::cost)) / 4
					)
				}
				Skill::drainlife => {
					format!(
						"{}",
						2 + (self.get_quanta(self.get_owner(c), etg::Darkness) as i16
							- self.get(c, Stat::cost)) / 5
					)
				}
				Skill::icebolt => {
					let bolts = (self.get_quanta(self.get_owner(c), etg::Water) as i16
						- self.get(c, Stat::cost))
						/ 5;
					format!("{} {}%", 2 + bolts, 35 + bolts * 5)
				}
				Skill::catapult => {
					let truehp = self.truehp(t).max(0);
					format!(
						"{}",
						(truehp * (if self.get(t, Stat::frozen) != 0 { 151 } else { 101 }) + 99)
							/ (truehp + 100)
					)
				}
				Skill::corpseexplosion => {
					format!("{}", 1 + self.truehp(t) / 8)
				}
				Skill::adrenaline => {
					let mut s = String::from("Extra: ");
					let num = etg::countAdrenaline(self.trueatk(t));
					for adrenaline in 2..=num {
						write!(s, "{},", self.trueatk_adrenaline(t, adrenaline));
					}
					if num > 1 {
						s.truncate(s.len() - 1);
					}
					s
				}
				_ => return None,
			})
		})
	}

	pub fn instance_text(&self, id: i16) -> String {
		let thing = self.get_thing(id);
		let card = self.cards.get(thing.status.get(Stat::card));
		if thing.kind == Kind::Spell {
			format!("{}\n{}:{}", card.name, thing.status.get(Stat::cost), thing.status.get(Stat::costele))
		} else {
			let charges = thing.status.get(Stat::charges);
			let mut text = self.active_text(id);
			match thing.kind {
				Kind::Creature => {
					write!(text, "\n{} | {}", self.trueatk(id), self.truehp(id));
					if charges != 0 {
						write!(text, " \u{00d7}{}", charges);
					}
				}
				Kind::Permanent => {
					if thing.flag.get(Flag::pillar) {
						text.clear();
						write!(
							text,
							"\n1:{}\u{00d7}{}",
							if thing.flag.get(Flag::pendstate) {
								self.get_mark(thing.owner)
							} else {
								card.element
							},
							charges
						);
					} else if thing.skill.get(Event::OwnAttack).map(|sk| sk.as_ref()).unwrap_or(&[])
						== &[Skill::locket]
					{
						write!(text, "\n1:{}", thing.status.get(Stat::mode));
					} else if charges != 0 {
						write!(text, "\n{}", charges);
					}
				}
				Kind::Weapon => {
					write!(text, "\n{}", self.trueatk(id));
					if charges != 0 {
						write!(text, " \u{00d7}{}", charges);
					}
				}
				Kind::Shield => {
					if charges != 0 {
						write!(text, "\n\u{00d7}{}", charges);
					} else {
						write!(text, "\n{}", self.truedr(id, 0));
					}
				}
				_ => (),
			};
			text
		}
	}

	pub fn thingText(&self, id: i16) -> String {
		let thing = self.get_thing(id);
		let mut ret = String::new();
		if thing.kind != Kind::Player {
			let instkind = if thing.kind == Kind::Spell {
				self.cards.get(self.get(id, Stat::card)).kind
			} else {
				thing.kind
			};
			if instkind == Kind::Creature || instkind == Kind::Weapon {
				write!(ret, "{}|{}/{}", self.trueatk(id), self.truehp(id), self.get(id, Stat::maxhp)).ok();
			} else if instkind == Kind::Shield {
				write!(ret, "{}", self.truedr(id, 0)).ok();
			}
			let skills = SkillThing::Thing(self, id).info();
			if ret.is_empty() {
				return skills;
			}
			if (!skills.is_empty()) {
				ret.push('\n');
				ret.push_str(&skills);
			}
		} else {
			write!(
				ret,
				"{}/{} {}cards\n{} drawpower\n",
				self.get(id, Stat::hp),
				self.get(id, Stat::maxhp),
				self.deck_length(id),
				self.get_drawpower(id)
			)
			.ok();
			if self.get(id, Stat::casts) == 0 {
				ret.push_str("silenced\n");
			}
			if self.get(id, Stat::gpull) != 0 {
				ret.push_str("gpull\n");
			}
			for k in self.get_thing(id).flag {
				ret.push_str(match k {
					Flag::aflatoxin => "aflatoxin\n",
					Flag::drawlock => "drawlock\n",
					Flag::neuro => "neuro\n",
					Flag::protectdeck => "protectdeck\n",
					Flag::sabbath => "sabbath\n",
					Flag::sanctuary => "sanctuary\n",
					_ => continue,
				});
			}
			for &(k, v) in self.get_thing(id).status.iter() {
				write!(
					ret,
					"{}{}",
					v,
					match k {
						Stat::nova => " nova\n",
						Stat::nova2 => " nova2\n",
						Stat::poison => " poison\n",
						Stat::sosa => " sosa\n",
						_ => continue,
					}
				)
				.ok();
			}
			ret.truncate(ret.len() - 1);
		}
		ret
	}

	pub fn next(&mut self, x: i16, c: i16, t: i16, fx: bool) -> Option<Vec<i16>> {
		self.fx = if fx { Some(Fxs::new()) } else { None };
		self.r#move([x, c, t].into());
		self.fx.take().map(|fxs| fxs.js())
	}

	pub fn getIndex(&self, id: i16) -> i32 {
		let owner = self.get_owner(id);
		match self.get_kind(id) {
			Kind::Player => id as i32 - 1,
			Kind::Weapon => {
				if self.get_weapon(owner) == id {
					0
				} else {
					-1
				}
			}
			Kind::Shield => {
				if self.get_shield(owner) == id {
					0
				} else {
					-1
				}
			}
			Kind::Creature => self
				.get_player(owner)
				.creatures
				.into_iter()
				.position(|pid| pid == id)
				.map(|p| p as i32)
				.unwrap_or(-1),
			Kind::Permanent => self
				.get_player(owner)
				.permanents
				.into_iter()
				.position(|pid| pid == id)
				.map(|p| p as i32)
				.unwrap_or(-1),
			Kind::Spell => self
				.get_player(owner)
				.hand
				.into_iter()
				.position(|pid| pid == id)
				.map(|p| p as i32)
				.unwrap_or(-1),
		}
	}

	pub fn material(&self, id: i16, kind: Option<Kind>) -> bool {
		let ckind = self.get_kind(id);
		(if let Some(kind) = kind {
			if kind == Kind::Permanent {
				ckind <= kind
			} else {
				ckind == kind
			}
		} else {
			ckind != Kind::Player
		}) && (ckind == Kind::Spell || !self.get(id, Flag::immaterial | Flag::burrowed))
	}

	pub fn visible_instances(&self, p1id: i16, p2id: i16) -> Vec<i16> {
		let cloaked = self.is_cloaked(p2id);
		let mut ids = Vec::with_capacity(98);
		for id in [p1id, p2id] {
			let isp1 = id == p1id;
			let pl = self.get_player(id);
			if isp1 || !cloaked {
				ids.extend(pl.hand_iter());
				if pl.weapon != 0 {
					ids.push(pl.weapon);
				}
				if pl.shield != 0 {
					ids.push(pl.shield);
				}
				let creas = pl.creatures.into_iter().filter(|&cr| cr != 0);
				if isp1 {
					ids.extend(creas);
				} else {
					ids.extend(creas.rev());
				}
			}
			ids.extend(
				pl.permanents
					.iter()
					.cloned()
					.filter(|&pr| pr != 0 && (isp1 || !cloaked || self.get(pr, Flag::cloak))),
			);
		}
		ids
	}

	pub fn visible_status(&self, id: i16) -> u32 {
		if self.get_kind(id) == Kind::Spell {
			0
		} else {
			(self.get(id, Flag::psionic) as u32)
				| (self.get(id, Flag::aflatoxin) as u32) << 1
				| ((!self.get(id, Flag::aflatoxin) && (self.get(id, Stat::poison) > 0)) as u32) << 2
				| (self.get(id, Flag::airborne) as u32) << 3
				| ((!self.get(id, Flag::airborne) && self.get(id, Flag::ranged)) as u32) << 4
				| (self.get(id, Flag::momentum) as u32) << 5
				| ((self.get(id, Stat::adrenaline) > 0) as u32) << 6
				| ((self.get(id, Stat::poison) < 0) as u32) << 7
				| ((self.get(id, Stat::delayed) > 0) as u32) << 8
				| ((id == self.get(self.get_owner(id), Stat::gpull)) as u32) << 9
				| ((self.get(id, Stat::frozen) > 0) as u32) << 10
		}
	}

	pub fn has_flooding(&self) -> bool {
		self.plprops.iter().any(|pl| pl.permanents.into_iter().any(|pr| pr != 0 && self.is_flooding(pr)))
	}

	pub fn has_protectonce(&self, id: i16) -> bool {
		self.hasskill(id, Event::Prespell, Skill::protectonce)
	}

	pub fn is_cloaked(&self, id: i16) -> bool {
		self.get_player(id).permanents.into_iter().any(|pr| pr != 0 && self.get(pr, Flag::cloak))
	}

	pub fn requires_target(&self, id: i16) -> bool {
		let skill = self.getSkill(id, Event::Cast);
		!skill.is_empty() && skill[0].targeting(self.cardset()).is_some()
	}

	pub fn can_target(&self, c: i16, t: i16) -> bool {
		self.getSkill(c, Event::Cast)
			.first()
			.and_then(|sk| sk.targeting(self.cardset()))
			.map(|tgt| tgt.full_check(self, c, t))
			.unwrap_or(false)
	}

	pub fn aisearch(&self) -> Box<[i16]> {
		use crate::aisearch::search;
		Box::<[i16; 3]>::new(search(self).into()) as Box<[i16]>
	}

	pub fn aieval(&self) -> i32 {
		use crate::aieval::eval;
		eval(self)
	}

	pub fn canactive(&self, id: i16) -> bool {
		let owner = self.get_owner(id);
		self.turn == owner
			&& self.phase == Phase::Play
			&& self.getIndex(id) != -1
			&& if self.get_kind(id) == Kind::Spell {
				self.get(owner, Stat::casts) != 0
					&& self.canspend(owner, self.get(id, Stat::costele), self.get(id, Stat::cost))
			} else {
				!self.getSkill(id, Event::Cast).is_empty()
					&& self.get(id, Stat::casts) != 0
					&& self.get(id, Stat::delayed) == 0
					&& self.get(id, Stat::frozen) == 0
					&& self.canspend(owner, self.get(id, Stat::castele), self.get(id, Stat::cast))
			}
	}

	pub fn canspend(&self, id: i16, qtype: i16, amt: i16) -> bool {
		if amt <= 0 {
			return true;
		}
		let player = self.get_player(id);
		if qtype == 0 {
			let mut totalq = amt;
			for &q in &player.quanta {
				totalq -= q as i16;
				if totalq <= 0 {
					return true;
				}
			}
			false
		} else {
			player.quanta[(qtype - 1) as usize] as i16 >= amt
		}
	}

	pub fn expected_damage(&self, samples: i16) -> Vec<i16> {
		let mut expected = vec![0; self.players().len()];
		if self.winner == 0 {
			let mut seedrng = self.rng.clone();
			for _ in 0..samples {
				let mut gclone = self.clone();
				gclone.rng = Pcg32::from_rng(&mut seedrng).unwrap();
				for pl in 1..=gclone.players_len() {
					let player = gclone.get_player(pl);
					let sh = player.shield;
					for pr in player.permanents {
						if pr != 0
							&& (gclone.hasskill(pr, Event::Attack, Skill::patience)
								|| gclone.get(pr, Flag::patience))
						{
							gclone.remove(pr);
						}
					}
					if sh != 0 && gclone.hasskill(sh, Event::Shield, Skill::deckblock) {
						gclone.remove(sh);
					}
				}
				gclone.r#move(GameMove::End(0));
				if gclone.winner == 0 {
					gclone.r#move(GameMove::End(0));
				}
				for pl in 1..=gclone.players_len() {
					expected[pl as usize - 1] +=
						(self.get(pl, Stat::hp).max(-500) - gclone.get(pl, Stat::hp).max(-500)) as i16;
				}
			}
			for x in expected.iter_mut() {
				*x /= samples;
			}
		}
		expected
	}

	pub fn tracedeath(&mut self) {
		self.setSkill(1, Event::Death, &[Skill::_tracedeath]);
	}

	pub fn tgt_to_pos(&self, id: i16, p1id: i16, landscape: bool) -> u32 {
		let owner = self.get_owner(id);
		if landscape {
			let (x, y) = match self.get_kind(id) {
				Kind::Player => return if id == p1id { 49|551<<12 } else { 49|49<<12 },
				Kind::Weapon => (207, 492),
				Kind::Shield => (207, 562),
				kind => {
					let i = self.getIndex(id);
					if i == -1 {
						return 0;
					}
					let i = i as u32;
					match kind {
						Kind::Creature => {
							let row = if i < 8 {
								0
							} else if i < 15 {
								1
							} else {
								2
							};
							let column = if row == 2 { i + 1 } else { i } % 8;
							(column * 90 + if row == 1 { 249 } else { 204 }, 334 + row * 44)
						}
						Kind::Permanent => (280 + (i % 9) * 70, 492 + (i / 9) * 70),
						Kind::Spell => {
							return 132 | (if owner != p1id { 36 } else { 336 } + i * 28) << 12
						}
						_ => return 0,
					}
				}
			};
			return x | if owner != p1id { 594 - y } else { y } << 12
		} else {
			let (x, y) = match self.get_kind(id) {
				Kind::Player => return if id == p1id { 49|851<<12 } else { 49|49<<12 },
				Kind::Weapon => (183, 671),
				Kind::Shield => (183, 741),
				kind => {
					let i = self.getIndex(id);
					if i == -1 {
						return 0;
					}
					let i = i as u32;
					match kind {
						Kind::Creature => {
							let row = if i < 8 {
								0
							} else if i < 15 {
								1
							} else {
								2
							};
							let column = if row == 2 { i + 1 } else { i } % 8;
							(column * 91 + if row == 1 { 92 } else { 47 }, 484 + row * 44)
						}
						Kind::Permanent => (250 + (i % 8) * 66, 671 + (i / 8) * 70),
						Kind::Spell => (190 + i * 69, 832),
						_ => return 0,
					}
				}
			};
			return x | if owner != p1id { 894 - y } else { y } << 12
		}
	}
}

impl Game {
	pub fn rng_range<T: SampleUniform, R: SampleRange<T>>(&mut self, range: R) -> T {
		self.rng.gen_range(range)
	}

	pub fn shuffle<T>(&mut self, slice: &mut [T]) {
		slice.shuffle(&mut self.rng);
	}

	pub fn players_len(&self) -> i16 {
		self.plprops.len() as i16
	}

	pub fn players(&self) -> &[Rc<PlayerData>] {
		&self.plprops
	}

	pub fn props_len(&self) -> usize {
		self.props.len() + self.plprops.len()
	}

	pub fn cardset(&self) -> CardSet {
		self.cards.set
	}

	pub fn get<T: ThingGetter>(&self, id: i16, k: T) -> T::Value {
		k.get(self, id)
	}

	pub fn set<T: ThingGetter>(&mut self, id: i16, k: T, val: T::Value) {
		k.set(self, id, val);
	}

	pub fn set_kind(&mut self, id: i16, val: Kind) {
		if id > self.players_len() {
			let idx = self.props_idx(id);
			Rc::make_mut(&mut self.props[idx]).kind = val;
		}
	}

	pub fn set_owner(&mut self, id: i16, val: i16) {
		if id > self.players_len() {
			let idx = self.props_idx(id);
			Rc::make_mut(&mut self.props[idx]).owner = val;
		}
	}

	pub fn choose<'a, 'b, T>(&'a mut self, slice: &'b [T]) -> Option<&'b T> {
		slice.choose(&mut self.rng)
	}

	pub fn cloneinst(&mut self, id: i16) -> i16 {
		self.new_id(self.props[self.props_idx(id)].clone())
	}

	pub fn get_player(&self, id: i16) -> &PlayerData {
		self.plprops[self.plprops_idx(id)].as_ref()
	}

	pub fn get_player_mut(&mut self, id: i16) -> &mut PlayerData {
		let idx = self.plprops_idx(id);
		Rc::make_mut(&mut self.plprops[idx])
	}

	pub fn get_thing(&self, id: i16) -> &ThingData {
		if id <= self.players_len() {
			&self.plprops[self.plprops_idx(id)].thing
		} else {
			self.props[self.props_idx(id)].as_ref()
		}
	}

	pub fn get_thing_mut(&mut self, id: i16) -> &mut ThingData {
		if id <= self.players_len() {
			let idx = self.plprops_idx(id);
			&mut Rc::make_mut(&mut self.plprops[idx]).thing
		} else {
			let idx = self.props_idx(id);
			Rc::make_mut(&mut self.props[idx])
		}
	}

	pub fn get_mut(&mut self, id: i16, k: Stat) -> &mut i16 {
		self.get_thing_mut(id).status.entry(k).or_insert(0)
	}

	pub fn get_cards(&self) -> Cards {
		*self.cards
	}

	pub fn get_card(&self, code: i16) -> &'static Card {
		self.cards.get(code)
	}

	pub fn random_card<Ffilt>(&mut self, upped: bool, ffilt: Ffilt) -> Option<&'static Card>
	where
		Ffilt: Fn(&Game, &'static Card) -> bool,
	{
		let mut rng = self.rng.clone();
		let card = self.cards.random_card(&mut rng, upped, |c| ffilt(self, c));
		self.rng = rng;
		card
	}

	pub fn skill_text(&self, id: i16, ev: Event) -> Option<SkillsName> {
		if let Some(sk) = self.get_thing(id).skill.get(ev) {
			if !sk.is_empty() {
				return Some(SkillsName { ctx: self, sk, id });
			}
		}
		None
	}

	pub fn active_text(&self, id: i16) -> String {
		if let Some(acast) = self.skill_text(id, Event::Cast) {
			return format!("{}:{}{}", self.get(id, Stat::cast), self.get(id, Stat::castele), acast);
		}

		for ev in [
			Event::Hit,
			Event::Death,
			Event::OwnDeath,
			Event::Buff,
			Event::Destroy,
			Event::Draw,
			Event::Play,
			Event::Spell,
			Event::Dmg,
			Event::Shield,
			Event::Postauto,
		] {
			if let Some(a) = self.skill_text(id, ev) {
				return format!(
					"{}{}",
					match ev {
						Event::Hit => "hit ",
						Event::Death => "death ",
						Event::OwnDeath => "owndeath ",
						Event::Buff => "buff ",
						Event::Destroy => "destroy ",
						Event::Draw => "draw ",
						Event::Play => "play ",
						Event::Spell => "spell ",
						Event::Dmg => "dmg ",
						Event::Shield => "shield ",
						Event::Postauto => "postauto ",
						_ => "",
					},
					a
				);
			}
		}

		if let Some(auto) = self.skill_text(id, Event::OwnAttack) {
			return auto.to_string();
		}

		String::new()
	}

	fn mutantactive(&mut self, id: i16, actives: &'static [Skill]) -> bool {
		self.lobo(id);
		let idx = self.rng.gen_range(-3..actives.len() as isize);
		if idx == -3 {
			self.addskills(id, Event::Death, &[Skill::growth(1, 1)]);
			false
		} else if idx < 0 {
			let flag = if idx == -1 { Flag::momentum } else { Flag::immaterial };
			self.set(id, flag, true);
			false
		} else {
			let cast = self.rng.gen_range(1..=2);
			let castele = self.cards.get(self.get(id, Stat::card)).element as i16;
			self.set(id, Stat::cast, cast);
			self.set(id, Stat::castele, castele);
			self.setSkill(id, Event::Cast, &actives[idx as usize..=idx as usize]);
			true
		}
	}

	pub fn o_mutantactive(&mut self, id: i16) -> bool {
		self.mutantactive(
			id,
			&[
				Skill::hatch,
				Skill::freeze(4),
				Skill::burrow,
				Skill::destroy,
				Skill::steal,
				Skill::dive,
				Skill::mend,
				Skill::paradox,
				Skill::lycanthropy,
				Skill::poison(1),
				Skill::gpull,
				Skill::devour,
				Skill::mutation,
				Skill::growth(2, 2),
				Skill::growth(2, 0),
				Skill::poisonfoe(1),
				Skill::deja,
				Skill::endow,
				Skill::guard,
				Skill::mitosis,
			],
		)
	}

	pub fn v_mutantactive(&mut self, id: i16) -> bool {
		self.mutantactive(
			id,
			&[
				Skill::v_hatch,
				Skill::freeze(3),
				Skill::burrow,
				Skill::destroy,
				Skill::v_steal,
				Skill::dive,
				Skill::mend,
				Skill::paradox,
				Skill::lycanthropy,
				Skill::poison(1),
				Skill::gpull,
				Skill::devour,
				Skill::v_mutation,
				Skill::growth(2, 2),
				Skill::growth(2, 0),
				Skill::poisonfoe(1),
				Skill::deja,
				Skill::v_endow,
				Skill::guard,
				Skill::mitosis,
			],
		)
	}

	pub fn is_flooding(&self, id: i16) -> bool {
		self.hasskill(id, Event::Attack, Skill::flooddeath) || self.get(id, Stat::flooding) != 0
	}

	pub fn calcCore(&self, id: i16, filterstat: u64) -> i16 {
		let owner = self.get_owner(id);
		for j in 0..2 {
			let pl = if j == 0 { owner } else { self.get_foe(owner) };
			for pr in self.get_player(pl).permanents {
				if pr != 0 && self.get(pr, filterstat) {
					return 1;
				}
			}
		}
		0
	}

	pub fn calcCore2(&self, id: i16, filterstat: u64) -> i16 {
		let mut bonus = 0;
		let owner = self.get_owner(id);
		for j in 0..2 {
			let pl = if j == 0 { owner } else { self.get_foe(owner) };
			for pr in self.get_player(pl).permanents {
				if pr != 0 && self.get(pr, filterstat) {
					if card::Upped(self.get(pr, Stat::card)) {
						return 2;
					}
					bonus = 1
				}
			}
		}
		bonus
	}

	pub fn isEclipseCandidate(&self, id: i16) -> bool {
		self.get(id, Flag::nocturnal) && self.get_kind(id) == Kind::Creature
	}

	pub fn isWhetCandidate(&self, id: i16) -> bool {
		self.get(id, Flag::golem)
			|| self.get_kind(id) == Kind::Weapon
			|| self.cards.get(self.get(id, Stat::card)).kind == Kind::Weapon
	}

	pub fn calcBonusAtk(&self, id: i16) -> i16 {
		(if self.isEclipseCandidate(id) { self.calcCore2(id, Flag::nightfall) } else { 0 })
			+ (if self.isWhetCandidate(id) { self.calcCore(id, Flag::whetstone) } else { 0 })
	}

	pub fn calcBonusHp(&self, id: i16) -> i16 {
		if id > self.players_len() {
			(if self.isEclipseCandidate(id) { self.calcCore(id, Flag::nightfall) } else { 0 })
				+ (if self.isWhetCandidate(id) { self.calcCore2(id, Flag::whetstone) } else { 0 })
				+ self.trigger_pure(Event::Hp, id, 0)
		} else {
			0
		}
	}

	pub fn truedr(&self, id: i16, t: i16) -> i16 {
		self.get(id, Stat::hp) + self.trigger_pure(Event::Buff, id, t)
	}

	pub fn truehp(&self, id: i16) -> i16 {
		self.get(id, Stat::hp) + self.calcBonusHp(id)
	}

	pub fn trueatk(&self, id: i16) -> i16 {
		self.trueatk_adrenaline(id, self.get(id, Stat::adrenaline))
	}

	pub fn trueatk_adrenaline(&self, id: i16, adrenaline: i16) -> i16 {
		let dmg = self
			.get(id, Stat::atk)
			.saturating_add(self.get(id, Stat::dive))
			.saturating_add(self.trigger_pure(Event::Buff, id, 0))
			.saturating_add(self.calcBonusAtk(id));
		etg::calcAdrenaline(
			adrenaline,
			if self.get(id, Flag::burrowed) && self.cards.set != CardSet::Original {
				(if dmg > 0 { dmg.saturating_add(1) } else { dmg }) / 2
			} else {
				dmg
			},
		)
	}

	pub fn incrAtk(&mut self, c: i16, amt: i16) {
		self.fx(c, Fx::Atk(amt));
		self.incrStatus(c, Stat::atk, amt);
	}

	pub fn attackCreature(&mut self, c: i16, t: i16) {
		self.attackCreatureDmg(c, t, self.trueatk(c))
	}

	pub fn attackCreatureDmg(&mut self, c: i16, t: i16, trueatk: i16) {
		if trueatk != 0 {
			let dmg = self.dmg(t, trueatk);
			if dmg != 0 {
				let mut data = ProcData::default();
				data.dmg = dmg;
				self.trigger_data(Event::Hit, c, t, &mut data);
				self.trigger_data(Event::Shield, t, c, &mut data);
			}
		}
	}

	pub fn attack(&mut self, id: i16, data: &ProcData) {
		loop {
			let mut data = data.clone();
			let kind = self.get_kind(id);
			if kind == Kind::Creature {
				self.dmg_die(id, self.get(id, Stat::poison), true);
			}
			self.set(id, Stat::casts, 1);
			let frozen = self.get(id, Stat::frozen);
			if frozen == 0 {
				self.proc_data(Event::Attack, id, &mut data);
				if kind != Kind::Shield && !data.get(ProcData::stasis) && self.get(id, Stat::delayed) == 0 {
					let mut trueatk = self.trueatk(id);
					if trueatk != 0 {
						let psionic = self.get(id, Flag::psionic);
						let mut bypass = psionic || self.get(id, Flag::momentum);
						if !bypass && self.get(id, Flag::burrowed) {
							bypass = self
								.get_player(self.get_owner(id))
								.permanents
								.into_iter()
								.any(|pr| pr != 0 && self.get(pr, Flag::tunnel))
						}
						let gpull = self.get(data.tgt, Stat::gpull);
						let shield = self.get_shield(data.tgt);
						if data.get(ProcData::freedom) {
							if bypass || (shield == 0 && gpull == 0) {
								trueatk = (trueatk * 3 + 1) / 2;
							} else {
								bypass = true;
							}
						}
						if psionic {
							self.spelldmg(data.tgt, trueatk);
						} else if bypass || trueatk < 0 {
							let mut hitdata = data.clone();
							hitdata.dmg = self.dmg(data.tgt, trueatk);
							self.trigger_data(Event::Hit, id, data.tgt, &mut hitdata);
						} else if gpull != 0 {
							self.attackCreatureDmg(id, gpull, trueatk);
						} else {
							let truedr = if shield != 0 { self.truedr(shield, id).min(trueatk) } else { 0 };
							let mut hitdata = data.clone();
							hitdata.dmg = trueatk - truedr;
							hitdata.blocked = truedr;
							if shield != 0 {
								self.trigger_data(Event::Shield, shield, id, &mut hitdata);
							}
							let finaldmg = hitdata.dmg;
							hitdata.blocked = trueatk - finaldmg;
							hitdata.dmg = self.dmg(data.tgt, finaldmg);
							if hitdata.dmg != 0 {
								self.trigger_data(Event::Hit, id, data.tgt, &mut hitdata);
							}
							if hitdata.blocked != 0 {
								self.trigger_data(Event::Blocked, id, shield, &mut hitdata);
							}
						}
					}
				}
			}
			self.maybeDecrStatus(id, Stat::frozen);
			self.maybeDecrStatus(id, Stat::delayed);
			self.set(id, Stat::dive, 0);
			if self.getIndex(id) != -1 {
				if self.get_kind(id) == Kind::Creature && self.truehp(id) <= 0 {
					self.die(id);
					if self.getIndex(id) == -1 {
						return;
					}
				}
				if frozen == 0 {
					self.trigger_data(Event::Postauto, id, 0, &mut data);
				}
				let adrenaline = self.get(id, Stat::adrenaline);
				if adrenaline != 0 {
					if adrenaline < etg::countAdrenaline(self.trueatk_adrenaline(id, 0)) {
						self.incrStatus(id, Stat::adrenaline, 1);
						continue;
					} else {
						self.set(id, Stat::adrenaline, 1);
					}
				}
			}
			return;
		}
	}

	pub fn v_attack(&mut self, id: i16, data: &ProcData) {
		loop {
			let mut data = data.clone();
			let kind = self.get_kind(id);
			if kind == Kind::Creature {
				let poison = self.get(id, Stat::poison);
				self.dmg_die(id, poison, true);
			}
			let frozen = self.get(id, Stat::frozen);
			self.set(id, Stat::casts, 1);
			self.set(id, Flag::ready, false);
			if frozen == 0
				|| self
					.getSkill(id, Event::OwnAttack)
					.iter()
					.any(|&s| matches!(s, Skill::growth(_, _) | Skill::siphon))
			{
				self.proc_data(Event::Attack, id, &mut data);
				if !data.get(ProcData::stasis) && frozen == 0 && self.get(id, Stat::delayed) == 0 {
					let mut trueatk = self.trueatk(id);
					if trueatk != 0 {
						let owner = self.get_owner(id);
						let target = self.get_foe(owner);
						let mut bypass = self.get(id, Flag::momentum);
						if data.get(ProcData::freedom) {
							bypass = true;
							trueatk = (trueatk * 3 + 1) / 2
						}
						if self.get(id, Flag::psionic) {
							self.spelldmg(target, trueatk);
						} else if bypass || trueatk < 0 {
							self.dmg(target, trueatk);
							let mut hitdata = data.clone();
							hitdata.dmg = trueatk;
							self.trigger_data(Event::Hit, id, target, &mut hitdata);
						} else if kind == Kind::Creature && self.get(target, Stat::gpull) != 0 {
							let dmg = self.dmg(self.get(target, Stat::gpull), trueatk);
							if self.getSkill(id, Event::Hit).iter().any(|&s| s == Skill::vampire) {
								self.dmg(owner, -dmg);
							}
						} else {
							let shield = self.get_shield(target);
							let truedr = if shield != 0 { self.truedr(shield, id).min(trueatk) } else { 0 };
							let mut hitdata = data.clone();
							let reducedmg = trueatk - truedr;
							hitdata.dmg = reducedmg;
							hitdata.blocked = truedr;
							if shield != 0 {
								self.trigger_data(Event::Shield, shield, id, &mut hitdata);
							}
							self.dmg(target, hitdata.dmg);
							if hitdata.dmg != 0 {
								self.trigger_data(Event::Hit, id, target, &mut hitdata);
							}
						}
					}
				}
			}
			self.maybeDecrStatus(id, Stat::frozen);
			self.maybeDecrStatus(id, Stat::delayed);
			self.set(id, Stat::dive, 0);
			if self.getIndex(id) != -1 {
				if self.get_kind(id) == Kind::Creature && self.truehp(id) <= 0 {
					self.die(id);
					return;
				}
				self.trigger_data(Event::Postauto, id, 0, &mut data);
				let adrenaline = self.get(id, Stat::adrenaline);
				if adrenaline != 0 {
					if adrenaline < etg::countAdrenaline(self.trueatk_adrenaline(id, 0)) {
						self.incrStatus(id, Stat::adrenaline, 1);
						continue;
					} else {
						self.set(id, Stat::adrenaline, 1);
					}
				}
			}
			return;
		}
	}

	pub fn dmg(&mut self, id: i16, dmg: i16) -> i16 {
		self.dmg_die(id, dmg, false)
	}

	pub fn spelldmg(&mut self, mut id: i16, dmg: i16) -> i16 {
		if id <= self.players_len() {
			let idx = self.plprops_idx(id);
			let pl = &self.plprops[idx];
			if pl.shield != 0 && self.get(pl.shield, Flag::reflective) {
				id = pl.foe;
			}
		}
		let mut dmgdata = ProcData::default();
		dmgdata.dmg = dmg;
		self.trigger_data(Event::Spelldmg, id, 0, &mut dmgdata);
		if dmgdata.get(ProcData::evade) {
			0
		} else {
			self.dmg(id, dmgdata.dmg)
		}
	}

	pub fn dmg_die(&mut self, mut id: i16, dmg: i16, dontdie: bool) -> i16 {
		if dmg == 0 {
			return 0;
		}
		let thing = self.get_thing(id);
		let mut kind = thing.kind;
		if kind == Kind::Weapon && dmg > 0 {
			id = thing.owner;
			kind = Kind::Player;
		}
		let sosa = thing.status.get(Stat::sosa) != 0;
		let realdmg = if sosa { -dmg } else { dmg };
		let (realdmg, capdmg) = if realdmg < 0 {
			let dmg = thing.status.get(Stat::hp).saturating_sub(thing.status.get(Stat::maxhp)).max(realdmg);
			(dmg, dmg)
		} else {
			let dmg = if kind == Kind::Player { realdmg } else { self.truehp(id).min(realdmg) };
			(if dontdie { realdmg } else { dmg }, dmg)
		};
		let hp = self.get_mut(id, Stat::hp);
		*hp = hp.saturating_sub(realdmg);
		if kind != Kind::Player {
			self.fx(id, Fx::Dmg(realdmg));
		}
		let mut dmgdata = ProcData::default();
		dmgdata.dmg = dmg;
		dmgdata.amt = capdmg;
		self.proc_data(Event::Dmg, id, &mut dmgdata);
		if dmg > 0 {
			if (!dontdie || kind == Kind::Player) && self.truehp(id) <= 0 {
				self.die(id);
			} else if self.get(id, Flag::voodoo) {
				let foe = self.get_foe(self.get_owner(id));
				self.dmg(foe, dmg);
			}
		}
		if realdmg < 0 {
			dmg
		} else if sosa {
			-capdmg
		} else {
			capdmg
		}
	}

	pub fn buffhp(&mut self, id: i16, amt: i16) -> i16 {
		if amt > 0 {
			let mut maxhp = self.get(id, Stat::maxhp) + amt;
			if maxhp > 500 {
				let kind = self.get_kind(id);
				if kind == Kind::Player {
					maxhp = 500;
				}
			}
			self.set(id, Stat::maxhp, maxhp);
		}
		self.dmg_die(id, -amt, true)
	}

	pub fn getSkill(&self, id: i16, k: Event) -> &[Skill] {
		self.get_thing(id).skill.get(k).map(|v| &v[..]).unwrap_or(&[])
	}

	pub fn setSkill(&mut self, id: i16, k: Event, val: &'static [Skill]) {
		self.get_thing_mut(id).skill.insert(k, Cow::Borrowed(val));
	}

	pub fn hasskill(&self, id: i16, k: Event, skill: Skill) -> bool {
		self.get_thing(id).skill.get(k).map(|ss| ss.iter().any(|&s| s == skill)).unwrap_or(false)
	}

	pub fn addskills(&mut self, id: i16, k: Event, skills: &'static [Skill]) {
		let thing = self.get_thing_mut(id);
		if let Some(smap) = thing.skill.get_mut(k) {
			smap.extend(skills);
		} else {
			thing.skill.insert(k, Cow::from(skills));
		}
	}

	pub fn rmskill(&mut self, id: i16, k: Event, skill: Skill) {
		let thing = self.get_thing_mut(id);
		if let Some(smap) = thing.skill.get_mut(k) {
			smap.retain(|&smaps| smaps != skill);
		}
	}

	pub fn iter_skills(&self, id: i16) -> impl Iterator<Item = (Event, &[Skill])> {
		self.get_thing(id).skill.iter()
	}

	pub fn new_thing(&mut self, code: i16, owner: i16) -> i16 {
		let mut thing = ThingData::default();
		thing.owner = owner;
		thing.status.insert(Stat::card, code);
		let card = self.cards.get(code);
		thing.status.insert(Stat::cast, card.cast as i16);
		thing.status.insert(Stat::castele, card.castele as i16);
		thing.status.insert(Stat::cost, card.cost as i16);
		thing.status.insert(Stat::costele, card.costele as i16);
		thing.status.insert(Stat::hp, card.health as i16);
		thing.status.insert(Stat::maxhp, card.health as i16);
		thing.status.insert(Stat::atk, card.attack as i16);
		thing.flag.0 |= card.flag;
		for &(k, v) in card.status.iter() {
			thing.status.insert(k, v);
		}
		thing.skill =
			Skills::from(card.skill.iter().map(|&(k, v)| (k, Cow::Borrowed(v))).collect::<Vec<_>>());
		self.new_id(Rc::new(thing))
	}

	pub fn transform(&mut self, c: i16, code: i16) {
		let card = self.cards.get(code);
		let thing = self.get_thing_mut(c);
		thing.status.insert(Stat::card, code);
		thing.status.insert(Stat::hp, card.health as i16);
		thing.status.insert(Stat::maxhp, card.health as i16);
		thing.status.insert(Stat::atk, card.attack as i16);
		thing.status.insert(Stat::cost, card.cost as i16);
		thing.status.insert(Stat::costele, card.costele as i16);
		thing.flag.0 &=
			!(Flag::additive
				| Flag::airborne | Flag::aquatic
				| Flag::golem | Flag::nightfall
				| Flag::nocturnal
				| Flag::pillar | Flag::poisonous
				| Flag::ranged | Flag::stackable
				| Flag::token | Flag::tunnel
				| Flag::voodoo | Flag::whetstone);
		thing.flag.0 |= card.flag;
		for &(k, v) in card.status {
			thing.status.insert(k, v);
		}
		thing.skill =
			Skills::from(card.skill.iter().map(|&(k, v)| (k, Cow::Borrowed(v))).collect::<Vec<_>>());
		if thing.flag.get(Flag::mutant) {
			let buff = self.rng.gen_range(0..25);
			if card.code < 5000 {
				self.buffhp(c, buff / 5);
				self.incrAtk(c, buff % 5);
				self.v_mutantactive(c);
			} else {
				self.buffhp(c, 1 + buff / 5);
				self.incrAtk(c, 1 + buff % 5);
				self.o_mutantactive(c);
			}
		} else {
			thing.status.insert(Stat::cast, card.cast as i16);
			thing.status.insert(Stat::castele, card.castele as i16);
		}
	}

	pub fn new_id(&mut self, ent: Rc<ThingData>) -> i16 {
		if self.props.len() < 32000 {
			self.props.push(ent);
			self.players_len() + self.props.len() as i16
		} else {
			self.die(self.turn);
			31999 + self.players_len()
		}
	}

	fn place(&mut self, kind: Kind, id: i16, thingid: i16, fromhand: bool) {
		self.set_owner(thingid, id);
		self.set_kind(thingid, kind);
		self.proc_data(
			Event::Play,
			thingid,
			&mut ProcData { flags: if fromhand { ProcData::fromhand } else { 0 }, ..Default::default() },
		);
	}

	pub fn setWeapon(&mut self, id: i16, weapon: i16) {
		self.setWeaponCore(id, weapon, false)
	}

	fn setWeaponCore(&mut self, id: i16, weapon: i16, fromhand: bool) {
		self.get_player_mut(id).weapon = weapon;
		self.place(Kind::Weapon, id, weapon, fromhand);
	}

	pub fn setShield(&mut self, id: i16, shield: i16) {
		self.setShieldCore(id, shield, false)
	}

	fn setShieldCore(&mut self, id: i16, shield: i16, fromhand: bool) {
		if !self.get(shield, Flag::additive)
			|| ({
				let curshield = self.get_shield(id);
				if curshield != 0
					&& card::IsOf(
						self.get(curshield, Stat::card),
						card::AsShiny(card::AsUpped(self.get(shield, Stat::card), false), false),
					) {
					let charges = self.get(shield, Stat::charges);
					self.incrStatus(curshield, Stat::charges, charges);
					self.fx(shield, Fx::EndPos(curshield));
					false
				} else {
					true
				}
			}) {
			self.get_player_mut(id).shield = shield;
		}
		self.place(Kind::Shield, id, shield, fromhand);
	}

	pub fn addCrea(&mut self, id: i16, crea: i16) {
		self.addCreaCore(id, crea, false)
	}

	pub fn addCreaCore(&mut self, id: i16, crea: i16, fromhand: bool) {
		let pl = self.get_player_mut(id);
		for cr in pl.creatures.iter_mut() {
			if *cr == 0 {
				*cr = crea;
				self.place(Kind::Creature, id, crea, fromhand);
				return;
			}
		}
	}

	pub fn addPerm(&mut self, id: i16, perm: i16) {
		self.addPermCore(id, perm, false)
	}

	fn addPermCore(&mut self, id: i16, perm: i16, fromhand: bool) {
		if self.get(perm, Flag::additive) {
			let code = card::AsShiny(self.get(perm, Stat::card), false);
			for pr in self.get_player(id).permanents {
				if pr != 0 && code == card::AsShiny(self.get(pr, Stat::card), false) {
					let charges = self.get(perm, Stat::charges);
					self.incrStatus(pr, Stat::charges, charges);
					self.place(Kind::Permanent, id, pr, fromhand);
					self.fx(perm, Fx::EndPos(pr));
					return;
				}
			}
		}
		let pl = self.get_player_mut(id);
		for pr in pl.permanents.iter_mut() {
			if *pr == 0 {
				*pr = perm;
				self.place(Kind::Permanent, id, perm, fromhand);
				return;
			}
		}
	}

	pub fn setCrea(&mut self, id: i16, index: usize, crea: i16) {
		let pl = self.get_player_mut(id);
		pl.creatures[index] = crea;
		self.place(Kind::Creature, id, crea, false);
	}

	pub fn addCard(&mut self, id: i16, cardid: i16) -> i32 {
		if !self.get_player(id).hand_full() {
			self.set_owner(cardid, id);
			self.set_kind(cardid, Kind::Spell);
			self.get_player_mut(id).hand_push(cardid)
		} else {
			-1
		}
	}

	pub fn delay(&mut self, mut id: i16, amt: i16) {
		if self.get_kind(id) == Kind::Player {
			id = self.get_weapon(id);
			if id == 0 {
				return;
			}
		}
		if amt > 0 {
			self.fx(id, Fx::Sfx(Sfx::stasis));
		}
		self.incrStatus(id, Stat::delayed, amt);
		if self.get(id, Flag::voodoo) {
			self.delay(self.get_foe(self.get_owner(id)), amt);
		}
	}

	pub fn freeze(&mut self, mut id: i16, amt: i16) {
		if self.get_kind(id) == Kind::Player {
			id = self.get_weapon(id);
			if id == 0 {
				return;
			}
		}
		let ownpoison = self.getSkill(id, Event::OwnPoison);
		let mut data = ProcData::default();
		data.amt = amt;
		self.trigger_data(Event::OwnFreeze, id, 0, &mut data);
		let amt = data.amt;
		if amt != 0 {
			if amt > 0 {
				self.fx(id, Fx::Sfx(Sfx::freeze));
			}
			self.set(id, Stat::frozen, amt);
			if self.get(id, Flag::voodoo) {
				self.freeze(self.get_foe(self.get_owner(id)), amt);
			}
		}
	}

	pub fn poison(&mut self, mut id: i16, amt: i16) {
		if amt != 0 {
			if self.get_kind(id) == Kind::Weapon {
				id = self.get_owner(id);
			}
			let ownpoison = self.getSkill(id, Event::OwnPoison);
			let mut data = ProcData::default();
			data.amt = amt;
			self.trigger_data(Event::OwnPoison, id, 0, &mut data);
			if data.amt > 0 {
				self.incrStatus(id, Stat::poison, data.amt);
				self.fx(id, Fx::Sfx(Sfx::poison));
				if self.get(id, Flag::voodoo) {
					self.poison(self.get_foe(self.get_owner(id)), data.amt);
				}
			}
		}
	}

	pub fn lobo(&mut self, id: i16) {
		let mut thing = self.get_thing_mut(id);
		for (k, v) in thing.skill.iter_mut() {
			v.to_mut().retain(|s| s.passive());
		}
	}

	pub fn trigger(&mut self, k: Event, c: i16, t: i16) {
		self.trigger_data(k, c, t, &mut ProcData::default())
	}

	pub fn trigger_data(&mut self, k: Event, c: i16, t: i16, data: &mut ProcData) {
		if let Some(ss) = self.get_thing(c).skill.get(k) {
			for &s in ss.clone().iter() {
				s.proc(self, c, t, data);
			}
		}
	}

	pub fn trigger_pure(&self, k: Event, c: i16, t: i16) -> i16 {
		let mut n = 0;
		if let Some(ss) = self.get_thing(c).skill.get(k) {
			for &s in ss.iter() {
				n += s.proc_pure(self, c, t);
			}
		}
		n
	}

	pub fn proc(&mut self, k: Event, c: i16) {
		let mut nodata = ProcData::default();
		self.proc_data(k, c, &mut nodata)
	}

	pub fn proc_data(&mut self, k: Event, c: i16, data: &mut ProcData) {
		let owner = self.get_owner(c);
		let foe = self.get_foe(owner);
		self.trigger_data(Event::own(k), c, c, data);
		for pl in [owner, foe] {
			self.trigger_data(k, pl, c, data);
			for cr in self.get_player(pl).creatures {
				if cr != 0 {
					self.trigger_data(k, cr, c, data);
				}
			}
			for pr in self.get_player(pl).permanents {
				if pr != 0 {
					self.trigger_data(k, pr, c, data);
				}
			}
			let shield = self.get_shield(pl);
			if shield != 0 {
				self.trigger_data(k, shield, c, data);
			}
			let weapon = self.get_weapon(pl);
			if weapon != 0 {
				self.trigger_data(k, weapon, c, data);
			}
		}
	}

	pub fn masscc<F>(&mut self, owner: i16, foe: i16, func: F)
	where
		F: Fn(&mut Game, i16),
	{
		for pr in self.get_player(owner).permanents {
			if pr != 0 && self.get(pr, Flag::cloak) {
				self.die(pr);
			}
		}
		if foe != 0 {
			for pr in self.get_player(foe).permanents {
				if pr != 0 && self.get(pr, Flag::cloak) {
					self.die(pr);
				}
			}
		}
		let crs = self.get_player(owner).creatures;
		let foecrs = if foe != 0 { Some(self.get_player(foe).creatures) } else { None };
		for i in 0..23 {
			let cr = crs[i];
			if cr != 0 && self.material(cr, None) {
				func(self, cr);
			}
			if let Some(ref foecrs) = foecrs {
				let cr = foecrs[i];
				if cr != 0 && self.material(cr, None) {
					func(self, cr);
				}
			}
		}
	}

	pub fn remove(&mut self, id: i16) -> i32 {
		let index = self.getIndex(id);
		if index != -1 {
			let owner = self.get_owner(id);
			match self.get_kind(id) {
				Kind::Weapon => self.get_player_mut(owner).weapon = 0,
				Kind::Shield => self.get_player_mut(owner).shield = 0,
				Kind::Creature => {
					let mut pl = self.get_player_mut(owner);
					if let StatusEntry::Occupied(o) = pl.thing.status.entry(Stat::gpull) {
						if o.get() == id {
							o.remove();
						}
					}
					pl.creatures[index as usize] = 0;
				}
				Kind::Permanent => {
					self.get_player_mut(owner).permanents[index as usize] = 0;
				}
				Kind::Spell => {
					self.get_player_mut(owner).hand_remove(index as usize);
				}
				Kind::Player => (),
			}
		}
		index
	}

	pub fn unsummon(&mut self, id: i16) {
		self.remove(id);
		let owner = self.get_owner(id);
		let handfull = self.get_player(owner).hand_full();
		if handfull {
			self.get_player_mut(owner).deck_mut().push(id);
		} else {
			self.addCard(owner, id);
		}
	}

	pub fn destroy(&mut self, id: i16) {
		if !self.get(id, Flag::stackable) || self.maybeDecrStatus(id, Stat::charges) < 2 {
			self.remove(id);
		}
	}

	pub fn die(&mut self, id: i16) {
		let idx = self.remove(id);
		if idx == -1 {
			return;
		}
		let kind = self.get_kind(id);
		if kind <= Kind::Permanent {
			self.proc(Event::Destroy, id);
		} else if kind == Kind::Spell {
			self.proc(Event::Discard, id);
		} else if kind == Kind::Creature {
			let mut data = ProcData::default();
			self.trigger_data(Event::Predeath, id, 0, &mut data);
			if !data.get(ProcData::evade) {
				if self.get(id, Flag::aflatoxin) {
					let card = self.get(id, Stat::card);
					let cellcode = if self.cards.set == CardSet::Open {
						card::As(card, card::MalignantCell)
					} else {
						card::v_MalignantCell
					};
					if card != cellcode {
						let owner = self.get_owner(id);
						let cell = self.new_thing(cellcode, owner);
						self.set_kind(cell, Kind::Creature);
						self.get_player_mut(owner).creatures[idx as usize] = cell;
					}
				}
				self.deatheffect(id, idx);
			}
		} else if kind == Kind::Player {
			self.set(id, Flag::out, true);
			if self.winner == 0 {
				let mut winners = 0;
				for pl in self.plprops.iter() {
					if !pl.thing.flag.get(Flag::out) {
						if winners == 0 {
							winners = pl.leader;
						} else {
							winners = 0;
							break;
						}
					}
				}
				if winners != 0 {
					self.winner = winners;
					self.phase = Phase::End;
				} else if self.turn == id {
					self.nextTurn();
				}
			}
		}
	}

	pub fn deatheffect(&mut self, id: i16, index: i32) {
		self.proc_data(Event::Death, id, &mut ProcData { index: index as i8, ..Default::default() });
	}

	pub fn draw(&mut self, id: i16) -> i16 {
		let pl = self.get_player_mut(id);
		if let Some(cardid) = pl.deck_mut().pop() {
			if pl.deck.is_empty() {
				self.fx(id, Fx::LastCard);
			}
			cardid
		} else {
			self.die(id);
			0
		}
	}

	pub fn drawcard(&mut self, id: i16) {
		self.drawcore(id, false)
	}

	pub fn drawstep(&mut self, id: i16) {
		self.drawcore(id, true)
	}

	fn drawcore(&mut self, id: i16, isstep: bool) {
		if !self.get_player(id).hand_full() {
			let cardid = if self.get(id, Flag::drawlock) {
				self.new_thing(card::Singularity, id)
			} else {
				self.draw(id)
			};
			if cardid != 0 && self.addCard(id, cardid) != -1 {
				self.fx(cardid, Fx::StartPos(-id));
				self.proc_data(
					Event::Draw,
					cardid,
					&mut ProcData {
						flags: if isstep { ProcData::drawstep } else { 0 },
						..Default::default()
					},
				);
			}
		}
	}

	pub fn mill(&mut self, id: i16, amt: i16) {
		if !self.get(id, Flag::protectdeck) {
			for _ in 0..amt {
				self.draw(id);
			}
		}
	}

	pub fn drawhand(&mut self, id: i16, size: usize) {
		let pl = self.get_player_mut(id);
		let mut deckrc = pl.deck.clone();
		let deck = Rc::make_mut(&mut deckrc);
		deck.extend(pl.hand_iter());
		pl.hand = [0; 8];
		deck[..].shuffle(&mut self.rng);
		for _ in 0..size {
			if let Some(cardid) = deck.pop() {
				self.fx(cardid, Fx::StartPos(-id));
				self.addCard(id, cardid);
			}
		}
		self.get_player_mut(id).deck = deckrc;
	}

	pub fn sanctified(&self, id: i16) -> bool {
		self.turn != id && self.get(id, Flag::sanctuary)
	}

	pub fn incrStatus(&mut self, id: i16, k: Stat, amt: i16) {
		let stat = self.get_mut(id, k);
		*stat = stat.saturating_add(amt);
	}

	pub fn maybeDecrStatus(&mut self, id: i16, k: Stat) -> i16 {
		let valref = self.get_mut(id, k);
		let val = *valref;
		if val > 0 {
			*valref -= 1
		}
		val
	}

	pub fn clearStatus(&mut self, id: i16) {
		let thing = self.get_thing_mut(id);
		thing.flag.0 &=
			!(Flag::additive
				| Flag::cloak | Flag::nightfall
				| Flag::stackable
				| Flag::tunnel | Flag::whetstone);
		for (st, ref mut val) in thing.status.iter_mut() {
			if matches!(st, Stat::charges | Stat::flooding) {
				*val = 0;
			}
		}
	}

	pub fn nextTurn(&mut self) -> i16 {
		loop {
			let turn = self.turn;
			let next = self.nextPlayer(turn);
			if next != turn {
				if self.cards.set != CardSet::Original {
					self.dmg(next, self.get(next, Stat::poison));
				}
				let pl = self.get_player_mut(next);
				if let Some(sosa) = pl.thing.status.get_mut(Stat::sosa) {
					if *sosa > 0 {
						*sosa -= 1;
					}
				}
				pl.thing.flag.0 &= !(Flag::sanctuary | Flag::precognition | Flag::protectdeck);
				for status in [Stat::nova, Stat::nova2] {
					if let Some(val) = pl.thing.status.get_mut(status) {
						*val = 0;
					}
				}
				for _ in 0..pl.drawpower {
					self.drawstep(next);
				}
				self.turn = next;
				self.proc(Event::Turnstart, next);
				if self.get(next, Flag::resigned) {
					self.die(next);
					continue;
				}
			}
			return next;
		}
	}

	fn proc_mark(&mut self, id: i16) -> bool {
		let (mark, markpower) = {
			let pl = self.get_player(id);
			(pl.mark as i16, pl.markpower as i16)
		};
		self.spend(id, mark, markpower * if mark > 0 { -1 } else { -3 })
	}

	pub fn nextPlayer(&self, id: i16) -> i16 {
		id % self.players_len() + 1
	}

	pub fn o_endturn(&mut self, id: i16) {
		self.proc_mark(id);
		let mut data =
			ProcData { tgt: self.get_foe(id), flags: ProcData::attackphase, ..Default::default() };
		self.proc_data(Event::Beginattack, id, &mut data);
		for pr in self.get_player(id).permanents {
			if pr != 0 {
				self.trigger_data(Event::OwnAttack, pr, 0, &mut data);
				self.set(pr, Stat::casts, 1);
				self.maybeDecrStatus(pr, Stat::frozen);
			}
		}
		for cr in self.get_player(id).creatures {
			if cr != 0 {
				self.attack(cr, &data);
			}
		}
		let shield = self.get_shield(id);
		if shield != 0 {
			self.attack(shield, &data);
		}
		let weapon = self.get_weapon(id);
		if weapon != 0 {
			self.attack(weapon, &data);
		}
		let thing = self.get_thing_mut(id);
		thing.status.insert(Stat::casts, 1);
		thing.flag.0 &= !(Flag::sabbath | Flag::drawlock);
	}

	pub fn v_endturn(&mut self, id: i16) {
		self.proc_mark(id);
		let foe = self.get_foe(id);
		self.dmg(foe, self.get(foe, Stat::poison));
		let mut data = ProcData { flags: ProcData::attackphase, ..ProcData::default() };
		let mut patienceFlag = false;
		let mut floodingIndex = 23;
		self.proc_data(Event::Beginattack, id, &mut data);
		for i in 0..16 {
			let pr = self.get_player(id).permanents[i];
			if pr != 0 {
				let flooding = self.get(pr, Stat::flooding) as usize;
				if flooding != 0 {
					if flooding < floodingIndex {
						floodingIndex = flooding;
					}
				} else if self.get(pr, Flag::patience) {
					patienceFlag = true;
				}
				self.trigger_data(Event::OwnAttack, pr, 0, &mut data);
				self.set(pr, Stat::casts, 1);
			}
			let pr = self.get_player(foe).permanents[i];
			if pr != 0 {
				let flooding = self.get(pr, Stat::flooding) as usize;
				if flooding != 0 {
					if flooding < floodingIndex {
						floodingIndex = flooding;
					}
					self.set(pr, Stat::flooding, 5);
				}
			}
		}
		for (i, cr) in self.get_player(id).creatures.into_iter().enumerate() {
			if cr != 0 {
				let crcard = self.cards.get(self.get(cr, Stat::card));
				if patienceFlag {
					let floodbuff =
						if i > floodingIndex && crcard.element == etg::Water as i8 { 5 } else { 2 };
					self.incrAtk(cr, floodbuff);
					self.buffhp(cr, floodbuff);
					if self.get(cr, Stat::delayed) == 0 {
						self.delay(cr, 1)
					}
				}
				self.v_attack(cr, &data);
				if i > floodingIndex
					&& crcard.element != etg::Water as i8
					&& crcard.element != etg::Chroma as i8
					&& !self.get(cr, Flag::immaterial)
					&& !self.get(cr, Flag::burrowed)
					&& self.getIndex(cr) != -1
				{
					self.die(cr);
				}
			}
		}
		let shield = self.get_shield(id);
		if shield != 0 {
			self.trigger_data(Event::OwnAttack, shield, 0, &mut data);
		}
		let weapon = self.get_weapon(id);
		if weapon != 0 {
			self.v_attack(weapon, &data);
		}
		self.set(id, Stat::casts, 1);
	}

	pub fn spend(&mut self, id: i16, qtype: i16, amt: i16) -> bool {
		if amt < 0 && self.get(id, Flag::sabbath) {
			return false;
		}
		self.spendscramble(id, qtype, amt)
	}

	pub fn spendscramble(&mut self, id: i16, qtype: i16, amt: i16) -> bool {
		if amt == 0 {
			true
		} else if !self.canspend(id, qtype, amt) {
			false
		} else {
			let mut quanta = self.get_player(id).quanta;
			let cap = if self.cards.set == CardSet::Original { 75 } else { 99 };
			if qtype == 0 {
				if amt < 0 {
					let uni12 = Uniform::from(0..12);
					for _ in 0..(-amt).min(1188) {
						let q = &mut quanta[uni12.sample(&mut self.rng)];
						*q += ((*q as i16) < cap) as u8;
					}
				} else {
					let total: u32 = quanta.iter().map(|&q| q as u32).sum();
					for n in 0..(amt as u32).min(1188) {
						let mut pick = self.rng.gen_range(0..total - n);
						for q in quanta.iter_mut() {
							if pick < *q as u32 {
								*q -= 1;
								break;
							}
							pick -= *q as u32;
						}
					}
				}
			} else {
				let q = &mut quanta[(qtype - 1) as usize];
				if amt < 0 {
					*q = (*q as i16).saturating_sub(amt).min(cap) as u8;
				} else {
					*q -= amt as u8;
				}
			}
			self.get_player_mut(id).quanta = quanta;
			true
		}
	}

	pub fn set_quanta(&mut self, id: i16, qtype: i16, val: u8) {
		self.get_player_mut(id).quanta[(qtype - 1) as usize] = val;
	}

	pub fn castSpell(&mut self, c: i16, t: i16, skill: Skill) {
		self.castSpellCore(c, t, skill, true)
	}

	pub fn castSpellNoSpell(&mut self, c: i16, t: i16, skill: Skill) {
		self.castSpellCore(c, t, skill, false)
	}

	pub fn castSpellCore(&mut self, c: i16, t: i16, skill: Skill, procspell: bool) {
		let mut data = ProcData { tgt: t, active: Some(skill), ..Default::default() };
		self.proc_data(Event::Prespell, c, &mut data);
		let t = data.tgt;
		let evade = data.get(ProcData::evade);
		if evade {
			if t != 0 {
				self.fx(t, Fx::Evade);
			}
		} else {
			skill.proc(self, c, t, &mut data);
			if procspell {
				self.proc_data(Event::Spell, c, &mut data);
			}
		}
	}

	pub fn play(&mut self, c: i16, t: i16, fromhand: bool) {
		let kind = self.cards.get(self.get(c, Stat::card)).kind;
		self.remove(c);
		if kind == Kind::Spell {
			self.castSpell(c, t, self.getSkill(c, Event::Cast)[0])
		} else {
			let owner = self.get_owner(c);
			self.set(c, Stat::casts, 0);
			if kind == Kind::Creature {
				self.fx(c, Fx::Sfx(Sfx::creaPlay));
			} else if kind <= Kind::Permanent {
				self.fx(c, Fx::Sfx(Sfx::permPlay));
			}
			match kind {
				Kind::Weapon => self.setWeaponCore(owner, c, fromhand),
				Kind::Shield => self.setShieldCore(owner, c, fromhand),
				Kind::Permanent => self.addPermCore(owner, c, fromhand),
				Kind::Creature => self.addCreaCore(owner, c, fromhand),
				_ => (),
			}
		}
	}

	pub fn useactive(&mut self, c: i16, t: i16) {
		let cowner = self.get_owner(c);
		let kind = self.get_kind(c);
		if kind == Kind::Spell {
			if self.spend(cowner, self.get(c, Stat::costele), self.get(c, Stat::cost)) {
				self.play(c, t, true);
				self.proc(Event::Cardplay, c);
				if self.get(cowner, Flag::neuro) {
					self.poison(cowner, 1);
				}
			}
		} else if self.spend(cowner, self.get(c, Stat::castele), self.get(c, Stat::cast)) {
			let casts = self.get(c, Stat::casts) - 1;
			self.set(c, Stat::casts, casts);
			if self.get(c, Flag::neuro) {
				self.poison(c, 1);
			}
			if let Some(skill) = self.getSkill(c, Event::Cast).first().cloned() {
				self.castSpell(c, t, skill);
			}
		}
	}

	pub fn queue_attack(&mut self, c: i16, t: i16) {
		self.attacks.push((c, t));
	}

	pub fn flush_attacks(&mut self) {
		if !self.attacks.is_empty() {
			let mut n = 0;
			let mut data = ProcData::default();
			while n < self.attacks.len() {
				let (c, t) = self.attacks[n];
				data.tgt = if t == 0 { self.get_foe(self.get_owner(c)) } else { t };
				self.attack(c, &data);
				n += 1;
			}
			self.attacks.clear();
		}
	}

	pub fn r#move(&mut self, cmd: GameMove) {
		match cmd {
			GameMove::End(c) => {
				if c != 0 {
					self.die(c);
				}
				if self.cards.set == CardSet::Open {
					self.o_endturn(self.turn)
				} else {
					self.v_endturn(self.turn)
				}
				self.flush_attacks();
				self.nextTurn();
			}
			GameMove::Cast(c, t) => {
				self.useactive(c, t);
				self.flush_attacks();
			}
			GameMove::Accept => {
				self.turn = self.nextPlayer(self.turn);
				if self.turn == 1 {
					self.phase = Phase::Play;
				}
			}
			GameMove::Mulligan => {
				let handlen = self.get_player(self.turn).hand_len();
				self.fx(self.turn, Fx::Sfx(Sfx::mulligan));
				self.drawhand(self.turn, handlen - 1);
			}
			GameMove::Foe(t) => {
				self.get_player_mut(self.turn).foe = t;
			}
			GameMove::Resign(c) => {
				if self.turn == c {
					self.die(c);
					self.nextTurn();
				} else {
					self.set(c, Flag::resigned, true);
				}
			}
		}
	}

	pub fn fx(&mut self, id: i16, fx: Fx) {
		if let Some(ref mut fxs) = self.fx {
			fxs.push(id, fx);
		}
	}
}

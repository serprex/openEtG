#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

use std::borrow::Cow;
use std::cmp;
use std::collections::hash_map::Entry;
use std::convert::TryFrom;
use std::default::Default;
use std::hash::{Hash, Hasher};
use std::iter::once;
use std::rc::Rc;

use arrayvec::ArrayVec;
use fxhash::{FxHashMap, FxHasher};
use rand::distributions::{Distribution, Uniform};
use rand::seq::SliceRandom;
use rand::{Rng, SeedableRng};
use rand_pcg::Pcg32;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::card::{self, Card, Cards};
use crate::etg;
use crate::generated;
use crate::skill::{Event, ProcData, Skill, Skills};
use crate::{now, set_panic_hook};

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Copy, Hash, Eq, PartialEq)]
pub enum CardSet {
	Open,
	Original,
}

#[derive(Clone, Default)]
pub struct ThingData {
	pub kind: i32,
	pub owner: i32,
	pub status: FxHashMap<Stat, i32>,
	pub skill: Skills,
}

#[derive(Clone, Default)]
pub struct PlayerData {
	pub thing: ThingData,
	pub foe: i32,
	pub leader: i32,
	pub weapon: i32,
	pub shield: i32,
	pub creatures: Rc<[i32; 23]>,
	pub permanents: Rc<[i32; 16]>,
	pub quanta: [u8; 12],
	pub hand: ArrayVec<[i32; 8]>,
	pub deck: Rc<Vec<i32>>,
}

impl PlayerData {
	pub fn quanta(&self, q: i32) -> u8 {
		self.quanta[(q - 1) as usize]
	}

	pub fn deck_mut(&mut self) -> &mut Vec<i32> {
		Rc::make_mut(&mut self.deck)
	}
}

#[derive(Clone)]
pub enum Entity {
	Thing(Rc<ThingData>),
	Player(Rc<PlayerData>),
}

impl Entity {
	pub fn get_thing(&self) -> &ThingData {
		match self {
			Entity::Thing(ref thing) => thing,
			Entity::Player(ref player) => &player.thing,
		}
	}

	pub fn get_thing_mut(&mut self) -> &mut ThingData {
		match self {
			Entity::Thing(ref mut thing) => Rc::make_mut(thing),
			Entity::Player(ref mut player) => &mut Rc::make_mut(player).thing,
		}
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
	End(i32),
	Cast(i32, i32),
	Accept,
	Mulligan,
	Foe(i32),
	Resign(i32),
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Copy)]
pub enum GameMoveType {
	end = 0,
	cast = 1,
	accept = 2,
	mulligan = 3,
	foe = 4,
	resign = 5,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Copy)]
pub struct JsGameMove {
	pub x: GameMoveType,
	pub c: i32,
	pub t: i32,
}

impl From<GameMove> for JsGameMove {
	fn from(cmd: GameMove) -> JsGameMove {
		let triplet = match cmd {
			GameMove::End(t) => (GameMoveType::end, 0, t),
			GameMove::Cast(c, t) => (GameMoveType::cast, c, t),
			GameMove::Accept => (GameMoveType::accept, 0, 0),
			GameMove::Mulligan => (GameMoveType::mulligan, 0, 0),
			GameMove::Foe(t) => (GameMoveType::foe, 0, t),
			GameMove::Resign(c) => (GameMoveType::resign, c, 0),
		};
		JsGameMove {
			x: triplet.0,
			c: triplet.1,
			t: triplet.2,
		}
	}
}

impl From<JsGameMove> for GameMove {
	fn from(cmd: JsGameMove) -> GameMove {
		match cmd.x {
			GameMoveType::end => GameMove::End(cmd.t),
			GameMoveType::cast => GameMove::Cast(cmd.c, cmd.t),
			GameMoveType::accept => GameMove::Accept,
			GameMoveType::mulligan => GameMove::Mulligan,
			GameMoveType::foe => GameMove::Foe(cmd.t),
			GameMoveType::resign => GameMove::Resign(cmd.c),
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
	Atk(i32),
	Card(i32),
	Catapult,
	Clear,
	Death,
	Delay(i32),
	Destroy,
	Devoured,
	Dive,
	Dmg(i32),
	Draft,
	Earthquake,
	Endow,
	EndPos(i32),
	Embezzle,
	Enchant,
	Evade,
	Forced,
	Fractal,
	Free,
	Freeze(i32),
	Hatch,
	Heal(i32),
	Improve,
	LastCard,
	Liquid,
	Lives(i32),
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
	Poison(i32),
	Pull,
	Ren,
	Rewind,
	Salvage,
	Sfx(Sfx),
	Shatter,
	Shuffled,
	Sinkhole,
	Siphon,
	StartPos(i32),
	Quanta(u16, u16),
	Quintessence,
	Ready,
	Web,
}

impl Fx {
	pub fn param(self) -> i32 {
		match self {
			Fx::Atk(amt) => amt,
			Fx::Card(code) => code,
			Fx::Delay(amt) => amt,
			Fx::Dmg(amt) => amt,
			Fx::EndPos(tgt) => tgt,
			Fx::Freeze(amt) => amt,
			Fx::Heal(amt) => amt,
			Fx::Lives(amt) => amt,
			Fx::Poison(amt) => amt,
			Fx::Sfx(sfx) => sfx as i32,
			Fx::StartPos(src) => src,
			Fx::Quanta(amt, e) => (amt as i32) | (e as i32) << 8,
			_ => 0,
		}
	}
}

pub struct Fxs(Vec<(i32, Fx)>);

impl Fxs {
	pub fn new() -> Fxs {
		Fxs(Vec::new())
	}

	pub fn js(&self) -> Vec<i32> {
		let mut ret = Vec::with_capacity(self.0.len() * 3);
		for &(id, fx) in self.0.iter() {
			ret.push(generated::id_fx(fx));
			ret.push(id);
			ret.push(fx.param());
		}
		ret
	}

	pub fn push(&mut self, id: i32, fx: Fx) {
		self.0.push((id, fx))
	}
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Copy, Hash, Eq, PartialEq)]
pub enum Stat {
	r#_creaturesDied,
	additive,
	adrenaline,
	aflatoxin,
	airborne,
	appeased,
	aquatic,
	atk,
	burrowed,
	card,
	cast,
	castele,
	casts,
	chargecap,
	charges,
	cloak,
	cost,
	costele,
	deckpower,
	delayed,
	dive,
	drawpower,
	epoch,
	flatline,
	flooding,
	frozen,
	golem,
	gpull,
	hope,
	hp,
	immaterial,
	lives,
	mark,
	markpower,
	maxhp,
	mode,
	momentum,
	mutant,
	neuro,
	nightfall,
	nocturnal,
	nothrottle,
	nova,
	nova2,
	out,
	patience,
	pendstate,
	pillar,
	poison,
	poisonous,
	precognition,
	psionic,
	ranged,
	ready,
	reflective,
	resigned,
	salvaged,
	sanctuary,
	shardgolem,
	sosa,
	stackable,
	steam,
	storedatk,
	storedpower,
	swarmhp,
	token,
	tunnel,
	vindicated,
	voodoo,
	whetstone,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct Game {
	rng: Pcg32,
	pub turn: i32,
	pub winner: i32,
	pub phase: Phase,
	players: Rc<Vec<i32>>,
	pub time: f64,
	pub duration: f64,
	props: Vec<Entity>,
	attacks: Vec<(i32, i32)>,
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
			players: self.players.clone(),
			time: 0.0,
			duration: 0.0,
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
	pub fn new(seed: u32, set: CardSet) -> Game {
		set_panic_hook();
		Game {
			rng: Pcg32::seed_from_u64(seed as u64),
			turn: 1,
			winner: 0,
			phase: if set == CardSet::Original {
				Phase::Play
			} else {
				Phase::Mulligan
			},
			players: Default::default(),
			time: now(),
			duration: 0.0,
			props: vec![Entity::Thing(Default::default())],
			attacks: Vec::new(),
			cards: if set == CardSet::Original {
				&card::OrigSet
			} else {
				&card::OpenSet
			},
			fx: None,
		}
	}

	pub fn get_stat(&self, id: i32, k: i32) -> i32 {
		if let Some(k) = generated::stat_id(k) {
			*self.get_thing(id).status.get(&k).unwrap_or(&0)
		} else {
			0
		}
	}

	pub fn get_owner(&self, id: i32) -> i32 {
		self.get_thing(id).owner
	}

	pub fn get_kind(&self, id: i32) -> i32 {
		self.get_thing(id).kind
	}

	pub fn get_foe(&self, id: i32) -> i32 {
		match self.props[id as usize] {
			Entity::Player(ref p) => p.foe,
			_ => 0,
		}
	}

	pub fn get_weapon(&self, id: i32) -> i32 {
		match self.props[id as usize] {
			Entity::Player(ref p) => p.weapon,
			_ => 0,
		}
	}

	pub fn get_shield(&self, id: i32) -> i32 {
		match self.props[id as usize] {
			Entity::Player(ref p) => p.shield,
			_ => 0,
		}
	}

	pub fn clonegame(&self) -> Game {
		self.clone()
	}

	pub fn cloneinst(&mut self, id: i32) -> i32 {
		self.new_id(self.props[id as usize].clone())
	}

	pub fn get_players(&self) -> Vec<i32> {
		(*self.players).clone()
	}

	pub fn full_hand(&self, id: i32) -> bool {
		self.get_player(id).hand.is_full()
	}

	pub fn empty_hand(&self, id: i32) -> bool {
		self.get_player(id).hand.is_empty()
	}

	pub fn has_id(&self, id: i32) -> bool {
		id >= 0 && (id as usize) < self.props.len()
	}

	pub fn get_permanents(&self, id: i32) -> Vec<i32> {
		self.get_player(id).permanents.iter().cloned().collect()
	}

	pub fn get_creatures(&self, id: i32) -> Vec<i32> {
		self.get_player(id).creatures.iter().cloned().collect()
	}

	pub fn get_hand(&self, id: i32) -> Vec<i32> {
		self.get_player(id).hand.iter().cloned().collect()
	}

	pub fn deck_length(&self, id: i32) -> usize {
		self.get_player(id).deck.len()
	}

	pub fn get_quanta(&self, id: i32) -> Vec<u8> {
		self.get_player(id).quanta.iter().cloned().collect()
	}

	pub fn count_creatures(&self, id: i32) -> i32 {
		self.get_player(id)
			.creatures
			.iter()
			.map(|&cr| (cr != 0) as i32)
			.sum()
	}

	pub fn count_permanents(&self, id: i32) -> i32 {
		self.get_player(id)
			.permanents
			.iter()
			.map(|&cr| (cr != 0) as i32)
			.sum()
	}

	pub fn hash(&self) -> i32 {
		let mut hasher: FxHasher = Default::default();
		self.phase.hash(&mut hasher);
		self.turn.hash(&mut hasher);
		self.winner.hash(&mut hasher);
		self.cards.set.hash(&mut hasher);
		for (k, v) in self.props.iter().enumerate() {
			k.hash(&mut hasher);
			let thing = match v {
				Entity::Player(p) => {
					p.creatures.hash(&mut hasher);
					p.permanents.hash(&mut hasher);
					p.hand.hash(&mut hasher);
					p.deck.hash(&mut hasher);
					p.quanta.hash(&mut hasher);
					&p.thing
				}
				Entity::Thing(t) => t,
			};
			for (&k, &v) in thing.status.iter() {
				if v != 0 {
					k.hash(&mut hasher);
					v.hash(&mut hasher);
				}
			}
			for (&k, v) in thing.skill.iter() {
				if !v.is_empty() {
					k.hash(&mut hasher);
					v.hash(&mut hasher);
				}
			}
		}
		let h64 = hasher.finish();
		((h64 >> 32) as u32 ^ h64 as u32) as i32
	}

	pub fn new_player(&mut self) -> i32 {
		let id = self.new_id(Entity::Player(Default::default()));
		self.set_owner(id, id);
		self.set_kind(id, etg::Player);
		self.set(id, Stat::casts, 1);
		Rc::make_mut(&mut self.players).push(id);
		id
	}

	pub fn set_leader(&mut self, id: i32, leader: i32) {
		self.get_player_mut(id).leader = leader;
	}

	pub fn get_leader(&self, id: i32) -> i32 {
		self.get_player(id).leader
	}

	pub fn init_player(
		&mut self,
		id: i32,
		hp: i32,
		maxhp: i32,
		mark: i32,
		drawpower: i32,
		deckpower: i32,
		markpower: i32,
		mut deck: Vec<i32>,
	) {
		let plen = self.players.len();
		let idx = self.getIndex(id) as usize;
		let leader = self.get_leader(id);
		for i in 1..plen {
			let pid = self.players[(idx + i) % plen];
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
		self.set(id, Stat::hp, hp);
		self.set(id, Stat::maxhp, maxhp);
		self.set(id, Stat::mark, mark);
		self.set(id, Stat::drawpower, drawpower);
		self.set(id, Stat::deckpower, deckpower);
		self.set(id, Stat::markpower, markpower);
		for code in deck.iter_mut() {
			*code = self.new_thing(*code, id);
		}
		self.get_player_mut(id).deck = Rc::new(deck);
		self.drawhand(id, 7);
		if self.cards.set == CardSet::Original
			&& self
				.get_player(id)
				.hand
				.iter()
				.all(|&card| self.get(card, Stat::cost) != 0)
		{
			let pl = self.get_player_mut(id);
			let pldecklen = pl.deck.len();
			let oldhand = pl.hand.clone();
			let newhand: ArrayVec<[i32; 8]> = pl
				.deck_mut()
				.drain(if pldecklen <= 7 { 0 } else { pldecklen - 7 }..)
				.collect();
			pl.deck_mut().extend_from_slice(&oldhand);
			pl.hand = newhand;
			for &id in pl.hand.clone().iter() {
				self.set_kind(id, etg::Spell);
			}
		}
	}

	pub fn new_thing(&mut self, code: i32, owner: i32) -> i32 {
		let mut thing = ThingData::default();
		thing.owner = owner;
		thing.status.insert(Stat::card, code);
		let card = self.cards.get(code);
		thing.status.insert(Stat::cast, card.cast as i32);
		thing.status.insert(Stat::castele, card.castele as i32);
		thing.status.insert(Stat::cost, card.cost as i32);
		thing.status.insert(Stat::costele, card.costele as i32);
		thing.status.insert(Stat::hp, card.health as i32);
		thing.status.insert(Stat::maxhp, card.health as i32);
		thing.status.insert(Stat::atk, card.attack as i32);
		thing.status.insert(Stat::casts, 0);
		for &(k, v) in card.status.iter() {
			thing.status.insert(k, v);
		}
		thing.skill = Skills::from(
			card.skill
				.iter()
				.map(|&(k, v)| (k, Cow::Borrowed(v)))
				.collect::<Vec<_>>(),
		);
		self.new_id(Entity::Thing(Rc::new(thing)))
	}

	pub fn transform(&mut self, c: i32, code: i32) {
		let card = self.get_card(code);
		let thing = self.get_thing_mut(c);
		thing.status.insert(Stat::card, code);
		thing.status.insert(Stat::hp, card.health as i32);
		thing.status.insert(Stat::maxhp, card.health as i32);
		thing.status.insert(Stat::atk, card.attack as i32);
		thing.status.insert(Stat::cost, card.cost as i32);
		thing.status.insert(Stat::costele, card.costele as i32);
		for passive in &[
			Stat::additive,
			Stat::airborne,
			Stat::aquatic,
			Stat::golem,
			Stat::nocturnal,
			Stat::pillar,
			Stat::poisonous,
			Stat::ranged,
			Stat::stackable,
			Stat::swarmhp,
			Stat::token,
			Stat::voodoo,
		] {
			if let Some(val) = thing.status.get_mut(passive) {
				*val = 0;
			}
		}
		for &(k, v) in card.status {
			thing.status.insert(k, v);
		}
		thing.skill = Skills::from(
			card.skill
				.iter()
				.map(|&(k, v)| (k, Cow::Borrowed(v)))
				.collect::<Vec<_>>(),
		);
		if thing.status.get(&Stat::mutant).cloned().unwrap_or(0) != 0 {
			let buff = self.rng.gen_range(0, 25);
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
			thing.status.insert(Stat::cast, card.cast as i32);
			thing.status.insert(Stat::castele, card.castele as i32);
		}
	}

	pub fn rng(&mut self) -> f64 {
		self.rng.gen()
	}

	pub fn upto(&mut self, n: i32) -> i32 {
		self.rng.gen_range(0, n)
	}

	pub fn rng_ratio(&mut self, numerator: u32, denominator: u32) -> bool {
		self.rng.gen_ratio(numerator, denominator)
	}

	pub fn nextPlayer(&self, id: i32) -> i32 {
		for i in 0..self.players.len() - 1 {
			if self.players[i] == id {
				return self.players[i + 1];
			}
		}
		return self.players[0];
	}

	pub fn get_stats(&self, id: i32) -> Vec<i32> {
		self.get_thing(id)
			.status
			.iter()
			.flat_map(|(&k, &v)| once(generated::id_stat(k)).chain(once(v)))
			.collect()
	}

	pub fn get_skills(&self, id: i32) -> Vec<i32> {
		self.get_thing(id)
			.skill
			.iter()
			.flat_map(|(&k, v)| {
				once(u8::from(k) as i32 | (v.len() as i32) << 8).chain(
					v.iter()
						.map(|&sk| generated::id_skill(sk) | sk.param1() << 16 | sk.param2() << 24),
				)
			})
			.collect()
	}

	pub fn get_one_skill(&self, id: i32, k: u8) -> Vec<i32> {
		self.get_thing(id)
			.skill
			.get(Event::try_from(k).unwrap())
			.map(|sk| sk.as_ref())
			.unwrap_or(&[])
			.iter()
			.map(|&sk| generated::id_skill(sk))
			.collect()
	}

	pub fn next(&mut self, x: GameMoveType, c: i32, t: i32, fx: bool) -> Option<Vec<i32>> {
		self.fx = if fx { Some(Fxs::new()) } else { None };
		self.r#move(JsGameMove { x, c, t }.into());
		self.fx.take().map(|fxs| fxs.js())
	}

	pub fn getIndex(&self, id: i32) -> i32 {
		let owner = self.get_owner(id);
		match self.get_kind(id) {
			etg::Player => self
				.players
				.iter()
				.position(|&pid| pid == id)
				.map(|p| p as i32)
				.unwrap_or(-1),
			etg::Weapon => {
				if self.get_weapon(owner) == id {
					0
				} else {
					-1
				}
			}
			etg::Shield => {
				if self.get_shield(owner) == id {
					0
				} else {
					-1
				}
			}
			etg::Creature => self
				.get_player(owner)
				.creatures
				.iter()
				.position(|&pid| pid == id)
				.map(|p| p as i32)
				.unwrap_or(-1),
			etg::Permanent => self
				.get_player(owner)
				.permanents
				.iter()
				.position(|&pid| pid == id)
				.map(|p| p as i32)
				.unwrap_or(-1),
			etg::Spell => self
				.get_player(owner)
				.hand
				.iter()
				.position(|&pid| pid == id)
				.map(|p| p as i32)
				.unwrap_or(-1),
			_ => -1,
		}
	}

	pub fn material(&self, id: i32, kind: i32) -> bool {
		let ckind = self.get_kind(id);
		(if kind == etg::Permanent {
			ckind <= kind
		} else if kind != 0 {
			ckind == kind
		} else {
			ckind != etg::Player
		}) && (ckind == etg::Spell
			|| (self.get(id, Stat::immaterial) == 0 && self.get(id, Stat::burrowed) == 0))
	}

	pub fn truedr(&self, id: i32) -> i32 {
		self.get(id, Stat::hp) + self.trigger_pure(Event::Buff, id, 0)
	}

	pub fn truehp(&self, id: i32) -> i32 {
		self.get(id, Stat::hp) + self.calcBonusHp(id)
	}

	pub fn trueatk(&self, id: i32) -> i32 {
		self.trueatk_adrenaline(id, self.get(id, Stat::adrenaline))
	}

	pub fn is_flooding(&self, id: i32) -> bool {
		self.hasskill(id, Event::Attack, Skill::flooddeath) || self.get(id, Stat::flooding) != 0
	}

	pub fn has_protectonce(&self, id: i32) -> bool {
		self.hasskill(id, Event::Prespell, Skill::protectonce)
	}

	pub fn is_cloaked(&self, id: i32) -> bool {
		self.get_player(id)
			.permanents
			.iter()
			.any(|&pr| pr != 0 && self.get(pr, Stat::cloak) != 0)
	}

	pub fn requires_target(&self, id: i32) -> bool {
		let skill = self.getSkill(id, Event::Cast);
		!skill.is_empty() && skill[0].targetting().is_some()
	}

	pub fn can_target(&self, c: i32, t: i32) -> bool {
		self.getSkill(c, Event::Cast)
			.first()
			.and_then(|sk| sk.targetting())
			.map(|tgt| tgt.full_check(self, c, t))
			.unwrap_or(false)
	}

	pub fn aisearch(&self) -> JsGameMove {
		use crate::aisearch::search;
		search(self).into()
	}

	pub fn aieval(&self) -> f32 {
		use crate::aieval::eval;
		eval(self)
	}

	pub fn canactive(&self, id: i32) -> bool {
		let owner = self.get_owner(id);
		self.turn == owner
			&& self.phase == Phase::Play
			&& self.getIndex(id) != -1
			&& if self.get_kind(id) == etg::Spell {
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

	pub fn canspend(&self, id: i32, qtype: i32, amt: i32) -> bool {
		if amt <= 0 {
			return true;
		}
		let player = self.get_player(id);
		if qtype == 0 {
			let mut totalq = amt;
			for &q in &player.quanta {
				totalq -= q as i32;
				if totalq <= 0 {
					return true;
				}
			}
			false
		} else {
			player.quanta[(qtype - 1) as usize] as i32 >= amt
		}
	}

	pub fn expected_damage(&self, samples: i16) -> Vec<i16> {
		let pcount = self.players.len();
		let mut expected = vec![0; pcount];
		if self.winner == 0 {
			let mut seedrng = self.rng.clone();
			for _ in 0..samples {
				let mut gclone = self.clone();
				gclone.rng = Pcg32::from_rng(&mut seedrng).unwrap();
				for &pl in gclone.players.clone().iter() {
					for &pr in gclone.get_player(pl).permanents.clone().iter() {
						if pr != 0
							&& (gclone.hasskill(pr, Event::Attack, Skill::patience)
								|| gclone.get(pr, Stat::patience) != 0)
						{
							gclone.remove(pr);
						}
					}
				}
				gclone.r#move(GameMove::End(0));
				if gclone.winner == 0 {
					gclone.r#move(GameMove::End(0));
				}
				for (idx, &pl) in gclone.players.iter().enumerate() {
					expected[idx] += (cmp::max(self.get(pl, Stat::hp), -500)
						- cmp::max(gclone.get(pl, Stat::hp), -500)) as i16;
				}
			}
			for x in expected.iter_mut() {
				*x /= samples;
			}
		}
		expected
	}

	pub fn r#_tracedeath(&mut self) {
		self.setSkill(1, Event::Death, &[Skill::_tracedeath]);
	}
}

impl Game {
	pub fn shuffle<T>(&mut self, slice: &mut [T]) {
		slice.shuffle(&mut self.rng);
	}

	pub fn props_len(&self) -> usize {
		self.props.len()
	}

	pub fn get(&self, id: i32, k: Stat) -> i32 {
		*self.get_thing(id).status.get(&k).unwrap_or(&0)
	}

	pub fn cardset(&self) -> CardSet {
		self.cards.set
	}

	pub fn set(&mut self, id: i32, k: Stat, val: i32) {
		*self.get_mut(id, k) = val;
	}

	pub fn set_kind(&mut self, id: i32, val: i32) {
		self.get_thing_mut(id).kind = val;
	}

	pub fn set_owner(&mut self, id: i32, val: i32) {
		self.get_thing_mut(id).owner = val;
	}

	pub fn choose<'a, 'b, T>(&'a mut self, slice: &'b [T]) -> Option<&'b T> {
		slice.choose(&mut self.rng)
	}

	pub fn players_ref(&self) -> &[i32] {
		&self.players
	}

	pub fn players(&self) -> Rc<Vec<i32>> {
		self.players.clone()
	}

	pub fn get_player(&self, id: i32) -> &PlayerData {
		match self.props[id as usize] {
			Entity::Player(ref player) => player,
			_ => panic!("Not a player: {}", id),
		}
	}

	pub fn get_player_mut(&mut self, id: i32) -> &mut PlayerData {
		match self.props[id as usize] {
			Entity::Player(ref mut player) => Rc::make_mut(player),
			_ => panic!("Not a player: {}", id),
		}
	}

	pub fn get_thing(&self, id: i32) -> &ThingData {
		self.props[id as usize].get_thing()
	}

	pub fn get_thing_mut(&mut self, id: i32) -> &mut ThingData {
		self.props[id as usize].get_thing_mut()
	}

	pub fn get_mut(&mut self, id: i32, k: Stat) -> &mut i32 {
		self.get_thing_mut(id).status.entry(k).or_default()
	}

	pub fn get_card(&self, code: i32) -> &'static Card {
		self.cards.get(code)
	}

	pub fn random_card<Ffilt>(&mut self, upped: bool, ffilt: Ffilt) -> Option<&'static Card>
	where
		Ffilt: Fn(&Game, &'static Card) -> bool,
	{
		self.cards
			.filter(upped, |c| ffilt(self, c))
			.choose(&mut self.rng)
			.cloned()
	}

	fn mutantactive(&mut self, id: i32, actives: &'static [Skill], ondeath: Skill) -> bool {
		self.lobo(id);
		let idx = self.rng.gen_range(-3, actives.len() as isize);
		if idx == -3 {
			self.addskill(id, Event::Death, ondeath);
			false
		} else if idx < 0 {
			let status: Stat = [Stat::momentum, Stat::immaterial][(!idx) as usize];
			self.set(id, status, 1);
			false
		} else {
			let cast = self.upto(2) + 1;
			let castele = self.get_card(self.get(id, Stat::card)).element as i32;
			self.set(id, Stat::cast, cast);
			self.set(id, Stat::castele, castele);
			self.setSkill(id, Event::Cast, &actives[idx as usize..=idx as usize]);
			true
		}
	}

	pub fn o_mutantactive(&mut self, id: i32) -> bool {
		self.mutantactive(
			id,
			&[
				Skill::hatch,
				Skill::freeze,
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
				Skill::poison(1),
				Skill::deja,
				Skill::endow,
				Skill::guard,
				Skill::mitosis,
			],
			Skill::growth(1, 1),
		)
	}

	pub fn v_mutantactive(&mut self, id: i32) -> bool {
		self.mutantactive(
			id,
			&[
				Skill::v_hatch,
				Skill::v_freeze,
				Skill::v_burrow,
				Skill::v_destroy,
				Skill::v_steal,
				Skill::v_dive,
				Skill::v_mend,
				Skill::v_paradox,
				Skill::v_lycanthropy,
				Skill::v_infect,
				Skill::v_gpull,
				Skill::v_devour,
				Skill::v_mutation,
				Skill::v_growth,
				Skill::v_ablaze,
				Skill::poisonfoe(1),
				Skill::v_deja,
				Skill::v_endow,
				Skill::v_guard,
				Skill::v_mitosis,
			],
			Skill::v_growth1,
		)
	}

	pub fn calcCore(&self, id: i32, filterstat: Stat) -> i32 {
		let owner = self.get_owner(id);
		for j in 0..2 {
			let pl = if j == 0 { owner } else { self.get_foe(owner) };
			for pr in self.get_player(pl).permanents.iter().cloned() {
				if pr != 0 && self.get(pr, filterstat) != 0 {
					return 1;
				}
			}
		}
		0
	}

	pub fn calcCore2(&self, id: i32, filterstat: Stat) -> i32 {
		let mut bonus = 0;
		let owner = self.get_owner(id);
		for j in 0..2 {
			let pl = if j == 0 { owner } else { self.get_foe(owner) };
			for pr in self.get_player(pl).permanents.iter().cloned() {
				if pr != 0 && self.get(pr, filterstat) != 0 {
					if card::Upped(self.get(pr, Stat::card)) {
						return 2;
					}
					bonus = 1
				}
			}
		}
		bonus
	}

	pub fn isEclipseCandidate(&self, id: i32) -> bool {
		self.get(id, Stat::nocturnal) != 0 && self.get_kind(id) == etg::Creature
	}

	pub fn isWhetCandidate(&self, id: i32) -> bool {
		self.get(id, Stat::golem) != 0
			|| self.get_kind(id) == etg::Weapon
			|| self.cards.get(self.get(id, Stat::card)).kind as i32 == etg::Weapon
	}

	pub fn calcBonusAtk(&self, id: i32) -> i32 {
		(if self.isEclipseCandidate(id) {
			self.calcCore2(id, Stat::nightfall)
		} else {
			0
		}) + (if self.isWhetCandidate(id) {
			self.calcCore(id, Stat::whetstone)
		} else {
			0
		})
	}

	pub fn calcBonusHp(&self, id: i32) -> i32 {
		match self.props[id as usize] {
			Entity::Thing(_) => {
				(if self.isEclipseCandidate(id) {
					self.calcCore(id, Stat::nightfall)
				} else {
					0
				}) + (if self.isWhetCandidate(id) {
					self.calcCore2(id, Stat::whetstone)
				} else {
					0
				}) + self.trigger_pure(Event::Hp, id, 0)
			}
			_ => 0,
		}
	}

	pub fn trueatk_adrenaline(&self, id: i32, adrenaline: i32) -> i32 {
		let dmg = self.get(id, Stat::atk)
			+ self.get(id, Stat::dive)
			+ self.trigger_pure(Event::Buff, id, 0)
			+ self.calcBonusAtk(id);
		etg::calcAdrenaline(
			adrenaline,
			if self.get(id, Stat::burrowed) != 0 && self.cards.set != CardSet::Original {
				(dmg + 1) / 2
			} else {
				dmg
			},
		)
	}

	pub fn incrAtk(&mut self, c: i32, amt: i32) {
		self.fx(c, Fx::Atk(amt));
		self.incrStatus(c, Stat::atk, amt);
	}

	pub fn attackCreature(&mut self, c: i32, t: i32, trueatk: Option<i32>) {
		let trueatk = trueatk.unwrap_or_else(|| self.trueatk(c));
		if trueatk != 0 {
			let dmg = self.dmg(t, trueatk);
			let mut data = ProcData::default();
			data.dmg = dmg;
			if dmg != 0 {
				self.trigger_data(Event::Hit, c, t, &mut data);
			}
			self.trigger_data(Event::Shield, t, c, &mut data);
		}
	}

	pub fn attack(&mut self, id: i32, data: &mut ProcData) {
		loop {
			let mut data = data.clone();
			let kind = self.get_kind(id);
			if kind == etg::Creature {
				self.dmg_die(id, self.get(id, Stat::poison), true);
			}
			self.set(id, Stat::casts, 1);
			let frozen = self.get(id, Stat::frozen);
			if frozen == 0 {
				self.proc_data(Event::Attack, id, &mut data);
				let target = &mut data.tgt;
				let target = if *target == 0 {
					let foe = self.get_foe(self.get_owner(id));
					*target = foe;
					foe
				} else {
					*target
				};
				let stasis = data.stasis;
				let freedom = data.freedom;
				if !stasis && self.get(id, Stat::delayed) == 0 {
					let mut trueatk = self.trueatk(id);
					if trueatk != 0 {
						let psionic = self.get(id, Stat::psionic) != 0;
						let mut bypass = psionic || self.get(id, Stat::momentum) != 0;
						if !bypass && self.get(id, Stat::burrowed) != 0 {
							bypass = self
								.get_player(self.get_owner(id))
								.permanents
								.iter()
								.any(|&pr| pr != 0 && self.get(pr, Stat::tunnel) != 0)
						}
						let gpull = self.get(target, Stat::gpull);
						let shield = self.get_shield(target);
						if freedom {
							if bypass || (shield == 0 && gpull == 0) {
								trueatk = (trueatk * 3 + 1) / 2;
							} else {
								bypass = true;
							}
						}
						if psionic {
							self.spelldmg(target, trueatk);
						} else if bypass || trueatk < 0 {
							let mut hitdata = ProcData::default();
							hitdata.dmg = self.dmg(target, trueatk);
							self.trigger_data(Event::Hit, id, target, &mut hitdata);
						} else {
							if gpull != 0 {
								self.attackCreature(id, gpull, Some(trueatk));
							} else {
								let truedr = if shield != 0 {
									cmp::min(self.truedr(shield), trueatk)
								} else {
									0
								};
								let mut hitdata = ProcData::default();
								let reducedmg = trueatk - truedr;
								hitdata.dmg = reducedmg;
								hitdata.blocked = truedr;
								if shield != 0 {
									self.trigger_data(Event::Shield, shield, id, &mut hitdata);
								}
								let finaldmg = hitdata.dmg;
								hitdata.blocked += reducedmg - finaldmg;
								let dmg = self.dmg(target, finaldmg);
								hitdata.dmg = dmg;
								if dmg > 0 {
									self.trigger_data(Event::Hit, id, target, &mut hitdata);
								}
								if dmg != trueatk {
									self.trigger_data(Event::Blocked, id, shield, &mut hitdata);
								}
							}
						}
					}
				}
			}
			self.maybeDecrStatus(id, Stat::frozen);
			self.maybeDecrStatus(id, Stat::delayed);
			self.set(id, Stat::dive, 0);
			if self.getIndex(id) != -1 {
				if self.get_kind(id) == etg::Creature && self.truehp(id) <= 0 {
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

	pub fn v_attack(&mut self, id: i32, data: &mut ProcData) {
		loop {
			let mut data = data.clone();
			let kind = self.get_kind(id);
			if kind == etg::Creature {
				let poison = self.get(id, Stat::poison);
				self.dmg_die(id, poison, true);
			}
			let frozen = self.get(id, Stat::frozen);
			self.set(id, Stat::casts, 1);
			self.set(id, Stat::ready, 0);
			if frozen == 0
				|| self.getSkill(id, Event::OwnAttack).iter().any(|&s| {
					matches!(
						s,
						Skill::v_acceleration(_) | Skill::v_siphon
					)
				}) {
				self.proc_data(Event::Attack, id, &mut data);
				let freedom = data.freedom;
				let stasis = data.stasis;
				if !stasis && frozen == 0 && self.get(id, Stat::delayed) == 0 {
					let mut trueatk = self.trueatk(id);
					if trueatk != 0 {
						let owner = self.get_owner(id);
						let target = self.get_foe(owner);
						let mut bypass = self.get(id, Stat::momentum) != 0;
						if freedom {
							bypass = true;
							trueatk = (trueatk * 3 + 1) / 2
						}
						if self.get(id, Stat::psionic) != 0 {
							self.spelldmg(target, trueatk);
						} else if bypass || trueatk < 0 {
							let mut hitdata = ProcData::default();
							hitdata.dmg = self.dmg(target, trueatk);
							self.trigger_data(Event::Hit, id, target, &mut hitdata);
						} else if kind == etg::Creature && self.get(target, Stat::gpull) != 0 {
							let dmg = self.dmg(self.get(target, Stat::gpull), trueatk);
							if self
								.getSkill(id, Event::Hit)
								.iter()
								.any(|&s| s == Skill::v_vampire)
							{
								self.dmg(owner, -dmg);
							}
						} else {
							let shield = self.get_shield(target);
							let truedr = if shield != 0 {
								cmp::min(self.truedr(shield), trueatk)
							} else {
								0
							};
							let mut hitdata = ProcData::default();
							let reducedmg = trueatk - truedr;
							hitdata.dmg = reducedmg;
							hitdata.blocked = truedr;
							if shield != 0 {
								self.trigger_data(Event::Shield, shield, id, &mut hitdata);
							}
							let dmg = self.dmg(target, hitdata.dmg);
							hitdata.dmg = dmg;
							if dmg > 0 {
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
				if self.get_kind(id) == etg::Creature && self.truehp(id) <= 0 {
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

	pub fn dmg(&mut self, id: i32, dmg: i32) -> i32 {
		self.dmg_die(id, dmg, false)
	}

	pub fn spelldmg(&mut self, mut id: i32, dmg: i32) -> i32 {
		match self.props[id as usize] {
			Entity::Player(ref p) => {
				if p.shield != 0 && self.get(p.shield, Stat::reflective) != 0 {
					id = p.foe;
				}
			}
			_ => (),
		}
		let mut dmgdata = ProcData::default();
		dmgdata.dmg = dmg;
		self.trigger_data(Event::Spelldmg, id, 0, &mut dmgdata);
		if dmgdata.evade {
			0
		} else {
			self.dmg(id, dmgdata.dmg)
		}
	}

	pub fn dmg_die(&mut self, id: i32, dmg: i32, dontdie: bool) -> i32 {
		if dmg == 0 {
			return 0;
		};
		let kind = self.get_kind(id);
		if kind == etg::Weapon {
			if dmg < 0 {
				0
			} else {
				let owner = self.get_owner(id);
				self.dmg(owner, dmg)
			}
		} else {
			let sosa = self.get(id, Stat::sosa) != 0;
			let realdmg = if sosa { -dmg } else { dmg };
			let capdmg = if realdmg < 0 {
				cmp::max(self.get(id, Stat::hp) - self.get(id, Stat::maxhp), realdmg)
			} else if kind != etg::Player {
				cmp::min(self.truehp(id), realdmg)
			} else {
				realdmg
			};
			*self.get_mut(id, Stat::hp) -= capdmg;
			if kind != etg::Player {
				self.fx(id, Fx::Dmg(capdmg));
			}
			let mut dmgdata = ProcData::default();
			dmgdata.dmg = dmg;
			self.proc_data(Event::Dmg, id, &mut dmgdata);
			if self.truehp(id) <= 0 {
				if !dontdie {
					self.die(id);
				}
			} else if dmg > 0 && self.get(id, Stat::voodoo) != 0 {
				let foe = self.get_foe(self.get_owner(id));
				self.dmg(foe, dmg);
			}
			if sosa {
				-capdmg
			} else {
				capdmg
			}
		}
	}

	pub fn buffhp(&mut self, id: i32, amt: i32) -> i32 {
		if amt > 0 {
			let mut maxhp = self.get(id, Stat::maxhp) + amt;
			if maxhp > 500 {
				let kind = self.get_kind(id);
				if kind == etg::Player {
					maxhp = 500;
				}
			}
			self.set(id, Stat::maxhp, maxhp);
		}
		self.dmg_die(id, -amt, true)
	}

	pub fn getSkill(&self, id: i32, k: Event) -> &[Skill] {
		self.get_thing(id)
			.skill
			.get(k)
			.map(|v| &v[..])
			.unwrap_or(&[])
	}

	pub fn setSkill(&mut self, id: i32, k: Event, val: &'static [Skill]) {
		self.get_thing_mut(id).skill.insert(k, Cow::Borrowed(val));
	}

	pub fn hasskill(&self, id: i32, k: Event, skill: Skill) -> bool {
		self.get_thing(id)
			.skill
			.get(k)
			.map(|ss| ss.iter().any(|&s| s == skill))
			.unwrap_or(false)
	}

	pub fn addskill(&mut self, id: i32, k: Event, skill: Skill) {
		let thing = self.get_thing_mut(id);
		if let Some(smap) = thing.skill.get_mut(k) {
			smap.to_mut().push(skill);
		} else {
			thing.skill.insert(k, Cow::from(vec![skill]));
		}
	}

	pub fn rmskill(&mut self, id: i32, k: Event, skill: Skill) {
		let thing = self.get_thing_mut(id);
		if let Some(smap) = thing.skill.get_mut(k) {
			smap.to_mut().retain(|&smaps| smaps != skill);
		}
	}

	pub fn iter_skills(&self, id: i32) -> impl Iterator<Item = (Event, &[Skill])> {
		self.get_thing(id)
			.skill
			.iter()
			.map(|(&k, v)| (k, v.as_ref()))
	}

	pub fn new_id(&mut self, ent: Entity) -> i32 {
		let id = self.props.len() as i32;
		self.props.push(ent);
		id
	}

	fn place(&mut self, kind: i32, id: i32, thingid: i32, fromhand: bool) {
		self.set_owner(thingid, id);
		self.set_kind(thingid, kind);
		self.proc_data(
			Event::Play,
			thingid,
			&mut ProcData {
				fromhand: fromhand,
				..Default::default()
			},
		);
	}

	pub fn setWeapon(&mut self, id: i32, weapon: i32) {
		self.setWeaponCore(id, weapon, false)
	}

	fn setWeaponCore(&mut self, id: i32, weapon: i32, fromhand: bool) {
		self.get_player_mut(id).weapon = weapon;
		self.place(etg::Weapon, id, weapon, fromhand);
	}

	pub fn setShield(&mut self, id: i32, shield: i32) {
		self.setShieldCore(id, shield, false)
	}

	fn setShieldCore(&mut self, id: i32, shield: i32, fromhand: bool) {
		if self.get(shield, Stat::additive) == 0
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
		self.place(etg::Shield, id, shield, fromhand);
	}

	pub fn addCrea(&mut self, id: i32, crea: i32) {
		self.addCreaCore(id, crea, false)
	}

	pub fn addCreaCore(&mut self, id: i32, crea: i32, fromhand: bool) {
		debug_assert!(id < crea);
		let pl = self.get_player_mut(id);
		for cr in Rc::make_mut(&mut pl.creatures).iter_mut() {
			if *cr == 0 {
				*cr = crea;
				self.place(etg::Creature, id, crea, fromhand);
				return;
			}
		}
	}

	pub fn addPerm(&mut self, id: i32, perm: i32) {
		self.addPermCore(id, perm, false)
	}

	fn addPermCore(&mut self, id: i32, perm: i32, fromhand: bool) {
		debug_assert!(id < perm);
		let additive = self.get(perm, Stat::additive);
		if additive != 0 {
			let code = card::AsShiny(self.get(perm, Stat::card), false);
			for &pr in self.get_player(id).permanents.clone().iter() {
				if pr != 0 && code == card::AsShiny(self.get(pr, Stat::card), false) {
					let charges = self.get(perm, Stat::charges);
					self.incrStatus(pr, Stat::charges, charges);
					self.place(etg::Permanent, id, pr, fromhand);
					self.fx(perm, Fx::EndPos(pr));
					return;
				}
			}
		}
		let pl = self.get_player_mut(id);
		for pr in Rc::make_mut(&mut pl.permanents).iter_mut() {
			if *pr == 0 {
				*pr = perm;
				self.place(etg::Permanent, id, perm, fromhand);
				return;
			}
		}
	}

	pub fn setCrea(&mut self, id: i32, index: i32, crea: i32) {
		let pl = self.get_player_mut(id);
		Rc::make_mut(&mut pl.creatures)[index as usize] = crea;
		self.place(etg::Creature, id, crea, false);
	}

	pub fn addCard(&mut self, id: i32, cardid: i32) -> i32 {
		if !self.get_player(id).hand.is_full() {
			self.set_owner(cardid, id);
			self.set_kind(cardid, etg::Spell);
			let pl = self.get_player_mut(id);
			pl.hand.push(cardid);
			(pl.hand.len() - 1) as i32
		} else {
			-1
		}
	}

	pub fn delay(&mut self, mut id: i32, amt: i32) {
		if self.get_kind(id) == etg::Player {
			id = self.get_weapon(id);
			if id == 0 {
				return;
			}
		}
		if amt > 0 {
			self.fx(id, Fx::Sfx(Sfx::stasis));
		}
		self.incrStatus(id, Stat::delayed, amt);
		let voodoo = self.get(id, Stat::voodoo);
		if voodoo != 0 {
			self.delay(self.get_foe(self.get_owner(id)), amt);
		}
	}

	pub fn freeze(&mut self, mut id: i32, amt: i32) {
		if self.get_kind(id) == etg::Player {
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
			let voodoo = self.get(id, Stat::voodoo);
			if voodoo != 0 {
				self.freeze(self.get_foe(self.get_owner(id)), amt);
			}
		}
	}

	pub fn poison(&mut self, mut id: i32, amt: i32) {
		if self.get_kind(id) == etg::Weapon {
			id = self.get_owner(id);
		}
		let ownpoison = self.getSkill(id, Event::OwnPoison);
		let mut data = ProcData::default();
		data.amt = amt;
		self.trigger_data(Event::OwnPoison, id, 0, &mut data);
		let amt = data.amt;
		if data.amt != 0 {
			self.incrStatus(id, Stat::poison, amt);
			if amt > 0 {
				self.fx(id, Fx::Sfx(Sfx::poison));
				let voodoo = self.get(id, Stat::voodoo);
				if voodoo != 0 {
					self.poison(self.get_foe(self.get_owner(id)), amt);
				}
			}
		}
	}

	pub fn lobo(&mut self, id: i32) {
		let mut thing = self.get_thing_mut(id);
		for (&k, v) in thing.skill.iter_mut() {
			v.to_mut().retain(|s| s.passive());
		}
	}

	pub fn trigger(&mut self, k: Event, c: i32, t: i32) {
		self.trigger_data(k, c, t, &mut ProcData::default())
	}

	pub fn trigger_data(&mut self, k: Event, c: i32, t: i32, data: &mut ProcData) {
		if let Some(ss) = self.get_thing(c).skill.get(k) {
			for &s in ss.clone().iter() {
				s.proc(self, c, t, data);
			}
		}
	}

	pub fn trigger_pure(&self, k: Event, c: i32, t: i32) -> i32 {
		let mut n = 0;
		if let Some(ss) = self.get_thing(c).skill.get(k) {
			for &s in ss.iter() {
				n += s.proc_pure(self, c, t);
			}
		}
		n
	}

	pub fn proc(&mut self, k: Event, c: i32) {
		let mut nodata = ProcData::default();
		self.proc_data(k, c, &mut nodata)
	}

	pub fn proc_data(&mut self, k: Event, c: i32, data: &mut ProcData) {
		let owner = self.get_owner(c);
		let foe = self.get_foe(owner);
		self.trigger_data(Event::own(k), c, c, data);
		self.trigger_data(k, 0, c, data);
		for &pl in &[owner, foe] {
			for &cr in self.get_player(pl).creatures.clone().iter() {
				if cr != 0 {
					self.trigger_data(k, cr, c, data);
				}
			}
			for &pr in self.get_player(pl).permanents.clone().iter() {
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

	pub fn masscc<F>(&mut self, owner: i32, foe: i32, func: F)
	where
		F: Fn(&mut Game, i32),
	{
		for &pr in self.get_player(owner).permanents.clone().iter() {
			if pr != 0 && self.get(pr, Stat::cloak) != 0 {
				self.die(pr);
			}
		}
		if foe != 0 {
			for &pr in self.get_player(foe).permanents.clone().iter() {
				if pr != 0 && self.get(pr, Stat::cloak) != 0 {
					self.die(pr);
				}
			}
		}
		let crs = self.get_player(owner).creatures.clone();
		let foecrs = if foe != 0 {
			Some(self.get_player(foe).creatures.clone())
		} else {
			None
		};
		for i in 0..23 {
			let cr = crs[i];
			if cr != 0 && self.material(cr, 0) {
				func(self, cr);
			}
			if let Some(ref foecrs) = foecrs {
				let cr = foecrs[i];
				if cr != 0 && self.material(cr, 0) {
					func(self, cr);
				}
			}
		}
	}

	pub fn remove(&mut self, id: i32) -> i32 {
		let index = self.getIndex(id);
		if index != -1 {
			let owner = self.get_owner(id);
			match self.get_kind(id) {
				etg::Weapon => self.get_player_mut(owner).weapon = 0,
				etg::Shield => self.get_player_mut(owner).shield = 0,
				etg::Creature => {
					let mut pl = self.get_player_mut(owner);
					if let Entry::Occupied(o) = pl.thing.status.entry(Stat::gpull) {
						if *o.get() == id {
							o.remove();
						}
					}
					Rc::make_mut(&mut pl.creatures)[index as usize] = 0;
				}
				etg::Permanent => {
					Rc::make_mut(&mut self.get_player_mut(owner).permanents)[index as usize] = 0;
				}
				etg::Spell => {
					self.get_player_mut(owner).hand.remove(index as usize);
				}
				_ => (),
			}
		}
		index
	}

	pub fn unsummon(&mut self, id: i32) {
		self.remove(id);
		let owner = self.get_owner(id);
		let handfull = self.get_player(owner).hand.is_full();
		if handfull {
			self.get_player_mut(owner).deck_mut().push(id);
		} else {
			self.addCard(owner, id);
		}
	}

	pub fn destroy(&mut self, id: i32, data: Option<&mut ProcData>) {
		if self.get(id, Stat::stackable) == 0 || self.maybeDecrStatus(id, Stat::charges) < 2 {
			self.remove(id);
		}
		if let Some(data) = data {
			self.proc_data(Event::Destroy, id, data);
		}
	}

	pub fn die(&mut self, id: i32) {
		let idx = self.remove(id);
		if idx == -1 {
			return;
		}
		let kind = self.get_kind(id);
		if kind <= etg::Permanent {
			self.proc(Event::Destroy, id);
		} else if kind == etg::Spell {
			self.proc(Event::Discard, id);
		} else if kind == etg::Creature {
			let mut data = ProcData::default();
			self.trigger_data(Event::Predeath, id, 0, &mut data);
			if !data.evade {
				if self.get(id, Stat::aflatoxin) != 0 {
					let card = self.get(id, Stat::card);
					let cellcode = if self.cards.set == CardSet::Open {
						card::As(card, card::MalignantCell)
					} else {
						card::v_MalignantCell
					};
					if card != cellcode {
						let owner = self.get_owner(id);
						let cell = self.new_thing(cellcode, owner);
						self.set_kind(cell, etg::Creature);
						Rc::make_mut(&mut self.get_player_mut(owner).creatures)[idx as usize] =
							cell;
					}
				}
				self.deatheffect(id, idx);
			}
		} else if kind == etg::Player {
			self.set(id, Stat::out, 1);
			if self.winner == 0 {
				let mut winners = 0;
				for &pl in self.players.iter() {
					if self.get(pl, Stat::out) == 0 {
						let leader = self.get_leader(pl);
						if winners == 0 {
							winners = leader;
						} else {
							winners = 0;
							break;
						}
					}
				}
				if winners != 0 {
					self.winner = winners;
					self.phase = Phase::End;
					self.duration = now() - self.time;
				}
			}
		}
	}

	pub fn deatheffect(&mut self, id: i32, index: i32) {
		self.proc_data(
			Event::Death,
			id,
			&mut ProcData {
				index: index as i8,
				..Default::default()
			},
		);
	}

	pub fn draw(&mut self, id: i32) -> i32 {
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

	pub fn drawcard(&mut self, id: i32) {
		self.drawcore(id, false)
	}

	pub fn drawstep(&mut self, id: i32) {
		self.drawcore(id, true)
	}

	fn drawcore(&mut self, id: i32, isstep: bool) {
		if !self.get_player(id).hand.is_full() {
			let cardid = self.draw(id);
			if cardid != 0 && self.addCard(id, cardid) != -1 {
				self.fx(cardid, Fx::StartPos(-id));
				self.proc_data(
					Event::Draw,
					id,
					&mut ProcData {
						drawstep: isstep,
						..Default::default()
					},
				);
			}
		}
	}

	pub fn mill(&mut self, id: i32, mut amt: i32) {
		let deckpower = self.get(id, Stat::deckpower);
		if deckpower > 1 {
			amt *= deckpower;
		}
		for _ in 0..amt {
			self.draw(id);
		}
	}

	pub fn drawhand(&mut self, id: i32, size: usize) {
		let pl = self.get_player_mut(id);
		let mut deckrc = pl.deck.clone();
		let deck = Rc::make_mut(&mut deckrc);
		deck.extend(pl.hand.drain(..));
		deck[..].shuffle(&mut self.rng);
		for _ in 0..size {
			if let Some(cardid) = deck.pop() {
				self.fx(cardid, Fx::StartPos(-id));
				self.addCard(id, cardid);
			}
		}
		self.get_player_mut(id).deck = deckrc;
	}

	pub fn incrStatus(&mut self, id: i32, k: Stat, amt: i32) {
		let stat = self.get_mut(id, k);
		*stat = stat.saturating_add(amt);
	}

	pub fn maybeDecrStatus(&mut self, id: i32, k: Stat) -> i32 {
		let valref = self.get_mut(id, k);
		let val = *valref;
		if val > 0 {
			*valref -= 1
		}
		val
	}

	pub fn clearStatus(&mut self, id: i32) {
		let thing = self.get_thing_mut(id);
		for status in &[
			Stat::additive,
			Stat::charges,
			Stat::chargecap,
			Stat::cloak,
			Stat::epoch,
			Stat::flooding,
			Stat::nothrottle,
			Stat::stackable,
		] {
			if let Some(val) = thing.status.get_mut(status) {
				*val = 0;
			}
		}
	}

	pub fn nextTurn(&mut self) -> i32 {
		loop {
			let turn = self.turn;
			let next = self.nextPlayer(turn);
			if next != turn {
				if self.cards.set != CardSet::Original {
					self.dmg(next, self.get(next, Stat::poison));
				}
				let thing = self.get_thing_mut(next);
				if let Some(sosa) = thing.status.get_mut(&Stat::sosa) {
					if *sosa > 0 {
						*sosa -= 1;
					}
				}
				for status in &[Stat::nova, Stat::nova2, Stat::sanctuary, Stat::precognition] {
					if let Some(val) = thing.status.get_mut(status) {
						*val = 0;
					}
				}
				for _ in 0..self.get(next, Stat::drawpower) {
					self.drawstep(next);
				}
				self.turn = next;
				self.proc(Event::Turnstart, next);
				if self.get(next, Stat::resigned) != 0 {
					self.die(next);
					continue;
				}
			}
			return next;
		}
	}

	pub fn o_endturn(&mut self, id: i32) {
		let mark = self.get(id, Stat::mark);
		let markpower = self.get(id, Stat::markpower);
		self.spend(id, mark, markpower * if mark > 0 { -1 } else { -3 });
		let mut data = ProcData {
			tgt: self.get_foe(id),
			attackphase: true,
			..Default::default()
		};
		self.proc_data(Event::Beginattack, id, &mut data);
		for &pr in self.get_player(id).permanents.clone().iter() {
			if pr != 0 {
				self.trigger_data(Event::OwnAttack, pr, 0, &mut data);
				self.set(pr, Stat::casts, 1);
				self.maybeDecrStatus(pr, Stat::frozen);
			}
		}
		for &cr in self.get_player(id).creatures.clone().iter() {
			if cr != 0 {
				self.attack(cr, &mut data);
			}
		}
		let shield = self.get_shield(id);
		if shield != 0 {
			self.set(shield, Stat::casts, 1);
			self.trigger_data(Event::OwnAttack, shield, 0, &mut data);
		}
		let weapon = self.get_weapon(id);
		if weapon != 0 {
			self.attack(weapon, &mut data);
		}
		let thing = self.get_thing_mut(id);
		thing.status.insert(Stat::casts, 1);
		if let Some(val) = thing.status.get_mut(&Stat::flatline) {
			*val = 0;
		}
	}

	pub fn v_endturn(&mut self, id: i32) {
		let mark = self.get(id, Stat::mark);
		let markpower = self.get(id, Stat::markpower);
		self.spend(id, mark, markpower * if mark > 0 { -1 } else { -3 });
		let foe = self.get_foe(id);
		self.dmg(foe, self.get(foe, Stat::poison));
		let mut data = ProcData::default();
		data.attackphase = true;
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
				} else if self.get(pr, Stat::patience) != 0 {
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
		for (i, &cr) in self.get_player(id).creatures.clone().iter().enumerate() {
			if cr != 0 {
				let crcard = self.get_card(self.get(cr, Stat::card));
				if patienceFlag {
					let floodbuff = if i > floodingIndex && crcard.element == etg::Water as i8 {
						5
					} else {
						2
					};
					self.incrAtk(cr, floodbuff);
					self.buffhp(cr, floodbuff);
					if self.get(cr, Stat::delayed) == 0 {
						self.delay(cr, 1)
					}
				}
				self.v_attack(cr, &mut data);
				if i > floodingIndex
					&& crcard.element != etg::Water as i8
					&& crcard.element != etg::Chroma as i8
					&& self.get(cr, Stat::immaterial) == 0
					&& self.get(cr, Stat::burrowed) == 0
					&& self.getIndex(cr) != -1
				{
					self.die(cr);
				}
			}
		}
		let shield = self.get_shield(id);
		if shield != 0 {
			self.set(shield, Stat::casts, 1);
			self.trigger_data(Event::OwnAttack, shield, 0, &mut data);
		}
		let weapon = self.get_weapon(id);
		if weapon != 0 {
			self.v_attack(weapon, &mut data);
		}
		self.set(id, Stat::casts, 1);
	}

	pub fn spend(&mut self, id: i32, qtype: i32, amt: i32) -> bool {
		if amt < 0 && self.get(id, Stat::flatline) != 0 {
			return false;
		}
		self.spendscramble(id, qtype, amt)
	}

	pub fn spendscramble(&mut self, id: i32, qtype: i32, amt: i32) -> bool {
		if amt == 0 {
			true
		} else if !self.canspend(id, qtype, amt) {
			false
		} else {
			let mut quanta = self.get_player(id).quanta;
			let cap = if self.cards.set == CardSet::Original {
				75
			} else {
				99
			};
			if qtype == 0 {
				if amt < 0 {
					let amt = cmp::min(-amt, 1188);
					let uni12 = Uniform::from(0..12);
					for _ in 0..amt {
						let q = &mut quanta[uni12.sample(&mut self.rng)];
						if (*q as i32) < cap {
							*q += 1;
						}
					}
				} else {
					let amt = cmp::min(amt, 1188);
					let total: u32 = quanta.iter().map(|&q| q as u32).sum();
					for n in 0..amt as u32 {
						let mut pick = self.rng.gen_range(0, total - n);
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
					*q = cmp::min((*q as i32).saturating_sub(amt), cap) as u8;
				} else {
					*q -= amt as u8;
				}
			}
			self.get_player_mut(id).quanta = quanta;
			true
		}
	}

	pub fn set_quanta(&mut self, id: i32, qtype: i32, val: u8) {
		self.get_player_mut(id).quanta[(qtype - 1) as usize] = val;
	}

	pub fn castSpell(&mut self, c: i32, t: i32, skill: Skill) {
		self.castSpellCore(c, t, skill, true)
	}

	pub fn castSpellNoSpell(&mut self, c: i32, t: i32, skill: Skill) {
		self.castSpellCore(c, t, skill, false)
	}

	pub fn castSpellCore(&mut self, c: i32, t: i32, skill: Skill, procspell: bool) {
		let mut data = ProcData {
			tgt: t,
			active: Some(skill),
			..Default::default()
		};
		self.proc_data(Event::Prespell, c, &mut data);
		let t = data.tgt;
		let evade = data.evade;
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

	pub fn play(&mut self, c: i32, t: i32, fromhand: bool) {
		let kind = self.get_card(self.get(c, Stat::card)).kind as i32;
		self.remove(c);
		if kind == etg::Spell {
			self.castSpell(c, t, self.getSkill(c, Event::Cast)[0])
		} else {
			let owner = self.get_owner(c);
			self.set(c, Stat::casts, 0);
			if kind == etg::Creature {
				self.fx(c, Fx::Sfx(Sfx::creaPlay));
			} else if kind <= etg::Permanent {
				self.fx(c, Fx::Sfx(Sfx::permPlay));
			}
			match kind {
				etg::Weapon => self.setWeaponCore(owner, c, fromhand),
				etg::Shield => self.setShieldCore(owner, c, fromhand),
				etg::Permanent => self.addPermCore(owner, c, fromhand),
				etg::Creature => self.addCreaCore(owner, c, fromhand),
				_ => (),
			}
		}
	}

	pub fn useactive(&mut self, c: i32, t: i32) {
		let cowner = self.get_owner(c);
		let kind = self.get_kind(c);
		if kind == etg::Spell {
			if self.spend(cowner, self.get(c, Stat::costele), self.get(c, Stat::cost)) {
				self.play(c, t, true);
				self.proc(Event::Cardplay, c);
				if self.get(cowner, Stat::neuro) != 0 {
					self.poison(cowner, 1);
				}
			}
		} else if self.spend(cowner, self.get(c, Stat::castele), self.get(c, Stat::cast)) {
			let casts = self.get(c, Stat::casts) - 1;
			self.set(c, Stat::casts, casts);
			if self.get(c, Stat::neuro) != 0 {
				self.poison(c, 1);
			}
			let skill = self.getSkill(c, Event::Cast)[0];
			self.castSpell(c, t, skill);
		}
	}

	pub fn queue_attack(&mut self, c: i32, t: i32) {
		self.attacks.push((c, t));
	}

	pub fn flush_attacks(&mut self) {
		let mut n = 0;
		while n < self.attacks.len() {
			let (c, t) = self.attacks[n];
			let mut data = ProcData::default();
			if t != 0 {
				data.tgt = t;
			}
			self.attack(c, &mut data);
			n += 1;
		}
		self.attacks.clear();
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
				let handlen = self.get_player(self.turn).hand.len();
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
					self.set(c, Stat::resigned, 1);
				}
			}
		}
	}

	pub fn fx(&mut self, id: i32, fx: Fx) {
		if let Some(ref mut fxs) = self.fx {
			fxs.push(id, fx);
		}
	}
}

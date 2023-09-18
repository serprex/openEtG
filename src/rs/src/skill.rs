#![no_std]
#![allow(non_camel_case_types)]
#![allow(non_upper_case_globals)]

use alloc::borrow::Cow;
use alloc::rc::Rc;
use alloc::vec;
use alloc::vec::Vec;
use core::cmp;
use core::iter::once;
use core::num::{NonZeroU32, NonZeroU8};

use crate::card::{self, CardSet};
use crate::etg;
use crate::game::{Entity, Flag, Fx, Game, Kind, Sfx, Stat, ThingData};

#[derive(Clone, Copy, Hash, Eq, PartialEq)]
pub struct Event(NonZeroU8);

impl Event {
	pub const Attack: Event = Event(unsafe { NonZeroU8::new_unchecked(1) });
	pub const Beginattack: Event = Event(unsafe { NonZeroU8::new_unchecked(2) });
	pub const Blocked: Event = Event(unsafe { NonZeroU8::new_unchecked(3) });
	pub const Buff: Event = Event(unsafe { NonZeroU8::new_unchecked(4) });
	pub const Cardplay: Event = Event(unsafe { NonZeroU8::new_unchecked(5) });
	pub const Cast: Event = Event(unsafe { NonZeroU8::new_unchecked(6) });
	pub const Death: Event = Event(unsafe { NonZeroU8::new_unchecked(7) });
	pub const Destroy: Event = Event(unsafe { NonZeroU8::new_unchecked(8) });
	pub const Discard: Event = Event(unsafe { NonZeroU8::new_unchecked(9) });
	pub const Dmg: Event = Event(unsafe { NonZeroU8::new_unchecked(10) });
	pub const Draw: Event = Event(unsafe { NonZeroU8::new_unchecked(11) });
	pub const Freeze: Event = Event(unsafe { NonZeroU8::new_unchecked(12) });
	pub const Hit: Event = Event(unsafe { NonZeroU8::new_unchecked(13) });
	pub const Hp: Event = Event(unsafe { NonZeroU8::new_unchecked(14) });
	pub const Play: Event = Event(unsafe { NonZeroU8::new_unchecked(15) });
	pub const Poison: Event = Event(unsafe { NonZeroU8::new_unchecked(16) });
	pub const Postauto: Event = Event(unsafe { NonZeroU8::new_unchecked(17) });
	pub const Predeath: Event = Event(unsafe { NonZeroU8::new_unchecked(18) });
	pub const Prespell: Event = Event(unsafe { NonZeroU8::new_unchecked(19) });
	pub const Shield: Event = Event(unsafe { NonZeroU8::new_unchecked(20) });
	pub const Spell: Event = Event(unsafe { NonZeroU8::new_unchecked(21) });
	pub const Spelldmg: Event = Event(unsafe { NonZeroU8::new_unchecked(22) });
	pub const Turnstart: Event = Event(unsafe { NonZeroU8::new_unchecked(23) });
	pub const OwnAttack: Event = Self::own(Self::Attack);
	pub const OwnBeginattack: Event = Self::own(Self::Beginattack);
	pub const OwnBlocked: Event = Self::own(Self::Blocked);
	pub const OwnBuff: Event = Self::own(Self::Buff);
	pub const OwnCardplay: Event = Self::own(Self::Cardplay);
	pub const OwnCast: Event = Self::own(Self::Cast);
	pub const OwnDeath: Event = Self::own(Self::Death);
	pub const OwnDestroy: Event = Self::own(Self::Destroy);
	pub const OwnDiscard: Event = Self::own(Self::Discard);
	pub const OwnDmg: Event = Self::own(Self::Dmg);
	pub const OwnDraw: Event = Self::own(Self::Draw);
	pub const OwnFreeze: Event = Self::own(Self::Freeze);
	pub const OwnHit: Event = Self::own(Self::Hit);
	pub const OwnHp: Event = Self::own(Self::Hp);
	pub const OwnPlay: Event = Self::own(Self::Play);
	pub const OwnPoison: Event = Self::own(Self::Poison);
	pub const OwnPostauto: Event = Self::own(Self::Postauto);
	pub const OwnPredeath: Event = Self::own(Self::Predeath);
	pub const OwnPrespell: Event = Self::own(Self::Prespell);
	pub const OwnShield: Event = Self::own(Self::Shield);
	pub const OwnSpell: Event = Self::own(Self::Spell);
	pub const OwnSpelldmg: Event = Self::own(Self::Spelldmg);
	pub const OwnTurnstart: Event = Self::own(Self::Turnstart);

	pub const fn own(e: Event) -> Event {
		Event(unsafe { NonZeroU8::new_unchecked(e.0.get() | 128) })
	}

	pub const fn on(e: Event) -> Event {
		Event(unsafe { NonZeroU8::new_unchecked(e.0.get() & 127) })
	}
}

impl From<Event> for u8 {
	fn from(ev: Event) -> Self {
		ev.0.get()
	}
}

impl TryFrom<u8> for Event {
	type Error = ();

	fn try_from(x: u8) -> Result<Self, ()> {
		if x != 0 && x != 128 {
			Ok(Event(unsafe { NonZeroU8::new_unchecked(x) }))
		} else {
			Err(())
		}
	}
}

#[derive(Copy, Clone, Default)]
pub struct ProcData {
	pub active: Option<Skill>,
	pub amt: i32,
	pub blocked: i32,
	pub dmg: i32,
	pub tgt: i32,
	pub index: i8,
	pub flags: u16,
}

impl ProcData {
	pub const patience: u16 = 1 << 0;
	pub const salvaged: u16 = 1 << 1;
	pub const stasis: u16 = 1 << 2;
	pub const evade: u16 = 1 << 3;
	pub const attackphase: u16 = 1 << 4;
	pub const drawstep: u16 = 1 << 5;
	pub const fromhand: u16 = 1 << 6;
	pub const freedom: u16 = 1 << 7;
	pub const flood: u16 = 1 << 8;
	pub const nothrottle: u16 = 1 << 9;
	pub const vindicated: u16 = 1 << 10;

	pub fn get(self, flag: u16) -> bool {
		(self.flags & flag) != 0
	}
}

impl From<Skill> for ProcData {
	fn from(skill: Skill) -> ProcData {
		ProcData {
			active: Some(skill),
			..Default::default()
		}
	}
}

fn throttle(ctx: &Game, data: &ProcData, c: i32) -> bool {
	ctx.get(c, Stat::adrenaline) < 3 || data.get(ProcData::nothrottle)
}

pub struct SkillsVacant<'a> {
	pub skills: &'a mut Skills,
	pub k: Event,
}

impl<'a> SkillsVacant<'a> {
	pub fn insert(self, value: Cow<'static, [Skill]>) -> &'a mut Cow<'static, [Skill]> {
		self.skills.0.push((self.k, value));
		&mut self.skills.0.last_mut().unwrap().1
	}
}

pub struct SkillsOccupied<'a> {
	pub skills: &'a mut Skills,
	pub idx: usize,
}

impl<'a> SkillsOccupied<'a> {
	pub fn into_mut(self) -> &'a mut Cow<'static, [Skill]> {
		&mut self.skills.0[self.idx].1
	}
}

pub enum SkillsEntry<'a> {
	Vacant(SkillsVacant<'a>),
	Occupied(SkillsOccupied<'a>),
}

#[derive(Clone, Default)]
pub struct Skills(pub Vec<(Event, Cow<'static, [Skill]>)>);

impl From<Vec<(Event, Cow<'static, [Skill]>)>> for Skills {
	fn from(x: Vec<(Event, Cow<'static, [Skill]>)>) -> Skills {
		Skills(x)
	}
}

impl From<&[(Event, Cow<'static, [Skill]>)]> for Skills {
	fn from(x: &[(Event, Cow<'static, [Skill]>)]) -> Skills {
		Skills(Vec::from(x))
	}
}

impl Skills {
	pub fn get(&self, needle: Event) -> Option<&Cow<'static, [Skill]>> {
		for &(k, ref v) in self.0.iter() {
			if k == needle {
				return Some(v);
			}
		}
		None
	}

	pub fn get_mut(&mut self, needle: Event) -> Option<&mut Cow<'static, [Skill]>> {
		for &mut (k, ref mut v) in self.0.iter_mut() {
			if k == needle {
				return Some(v);
			}
		}
		None
	}

	pub fn remove(&mut self, needle: Event) {
		for idx in 0..self.0.len() {
			if self.0[idx].0 == needle {
				self.0.remove(idx);
				return;
			}
		}
	}

	pub fn iter(&self) -> impl Iterator<Item = (Event, &Cow<'static, [Skill]>)> {
		self.0.iter().map(|&(k, ref v)| (k, v))
	}

	pub fn iter_mut(&mut self) -> impl Iterator<Item = (Event, &mut Cow<'static, [Skill]>)> {
		self.0.iter_mut().map(|&mut (k, ref mut v)| (k, v))
	}

	pub fn clear(&mut self) {
		self.0.clear()
	}

	pub fn insert(&mut self, k: Event, v: Cow<'static, [Skill]>) {
		for &mut (ev, ref mut sk) in self.0.iter_mut() {
			if k == ev {
				*sk = v;
				return;
			}
		}
		self.0.push((k, v));
	}

	pub fn entry<'a>(&'a mut self, k: Event) -> SkillsEntry<'a> {
		for (idx, ref kv) in self.0.iter_mut().enumerate() {
			if kv.0 == k {
				return SkillsEntry::Occupied(SkillsOccupied { skills: self, idx });
			}
		}
		SkillsEntry::Vacant(SkillsVacant { skills: self, k })
	}
}

#[cfg_attr(not(target_arch = "wasm32"), derive(Debug))]
#[derive(Eq, PartialEq, Clone, Copy, Hash)]
pub enum Skill {
	r#_tracedeath,
	abomination,
	absorbdmg,
	absorber,
	acceleration,
	accretion,
	accumulation,
	adrenaline,
	aflatoxin,
	aggroskele,
	alphawolf,
	antimatter,
	appease,
	autoburrow,
	autoburrowoff,
	autoburrowproc,
	axe,
	axedraw,
	bblood,
	becomearctic,
	beguile,
	beguilestop,
	bellweb,
	blackhole,
	bless,
	blockwithcharge,
	bloodmoon,
	bolsterintodeck,
	boneyard,
	bounce,
	bow,
	bravery,
	brawl,
	brew,
	brokenmirror,
	bubbleclear,
	burrow,
	butterfly,
	catapult,
	catlife,
	cell,
	chaos,
	chimera,
	chromastat,
	clear,
	cold,
	corpseexplosion,
	counter,
	countimmbur,
	cpower,
	creatureupkeep,
	cseed,
	cseed2,
	dagger,
	deadalive,
	deathwish,
	deckblast,
	decrsteam,
	deepdive,
	deepdiveproc,
	deepdiveproc2,
	deja,
	deployblobs,
	despair,
	destroy,
	destroycard,
	detain,
	devour,
	die,
	disarm,
	disc,
	discping,
	disfield,
	disshield,
	dive,
	divinity,
	dmgproduce,
	draft,
	drainlife,
	drawcopy,
	drawequip,
	drawpillar,
	dryspell,
	dshield,
	dshieldoff,
	duality,
	earthquake,
	eatspell,
	elf,
	embezzle,
	embezzledeath,
	empathy,
	enchant,
	endow,
	envenom,
	epidemic,
	epoch,
	epochreset,
	equalize,
	evade(i16),
	evade100,
	evadecrea,
	evadespell,
	evolve,
	feed,
	fickle,
	fiery,
	firebolt,
	firebrand,
	firestorm(i16),
	firewall,
	flood,
	flooddeath,
	flyingweapon,
	flyself,
	foedraw,
	forcedraw,
	forceplay,
	fractal,
	freedom,
	freeevade,
	freeze(u8),
	freezeperm,
	fungusrebirth,
	gaincharge2,
	gaintimecharge,
	gas,
	give,
	golemhit,
	gpull,
	gpullspell,
	grave,
	growth(i8, i8),
	guard,
	halveatk,
	hammer,
	hasten,
	hatch,
	heal,
	heatmirror,
	hitownertwice,
	holylight,
	hope,
	icebolt,
	icegrowth(i8, i8),
	ignite,
	ignitediscard,
	immolate(i16),
	improve,
	inertia,
	inflation,
	ink,
	innovation,
	integrity,
	jelly,
	jetstream,
	lightning,
	liquid,
	livingweapon,
	lobotomize,
	locket,
	locketshift,
	loot,
	losecharge,
	luciferin,
	lycanthropy,
	martyr,
	mend,
	metamorph,
	midas,
	mill,
	millpillar,
	mimic,
	miracle,
	mitosis,
	mitosisspell,
	momentum,
	mummy,
	mutant,
	mutation,
	neuro,
	neuroify,
	nightmare,
	nightshade,
	noeatspell,
	nothrottle,
	nova,
	nova2,
	nullspell,
	nymph,
	obsession,
	ouija,
	ouijadestroy,
	ouijagrowth,
	pacify,
	pairproduce,
	paleomagnetism,
	pandemonium,
	pandemonium2,
	pandemonium3,
	paradox,
	parallel,
	patience,
	pend,
	phoenix,
	photosynthesis,
	pillar,
	pillar1,
	quadpillar(u16),
	quadpillar1(u16),
	plague,
	platearmor(i16),
	poison(i16),
	poisonfoe(i16),
	powerdrain,
	precognition,
	predator,
	predatoroff,
	protectall,
	protectonce,
	protectoncedmg,
	purify,
	quanta(i8),
	quantagift,
	quint,
	quinttog,
	r#static,
	rage,
	randomdr,
	readiness,
	reap,
	rebirth,
	reducemaxhp,
	regen,
	regenerate(i16),
	regeneratespell,
	regrade,
	reinforce,
	ren,
	resummon,
	reveal,
	rewind,
	ricochet,
	sabbath,
	sadism,
	salvage,
	salvageoff,
	sanctify,
	scatter,
	scramble,
	scramblespam,
	serendipity,
	shardgolem,
	shtriga,
	shuffle3,
	silence,
	sing,
	singularity,
	sinkhole,
	siphon,
	siphonactive,
	siphonstrength,
	skeleton,
	skull,
	skyblitz,
	slow,
	snipe,
	solar,
	sosa,
	soulcatch,
	spores,
	sskin,
	staff,
	stasis,
	stasisdraw,
	steal,
	steam,
	stoneform,
	storm(i16),
	summon(u16),
	swarm,
	swave,
	tempering(i16),
	tesseractsummon,
	thorn(i16),
	throwrock,
	tick,
	tidalhealing,
	tornado,
	trick,
	turngolem,
	unappease,
	unsanctify,
	unsummon,
	unsummonquanta,
	unvindicate,
	upkeep,
	upload,
	vampire,
	vend,
	vengeance,
	vindicate,
	virtue,
	virusinfect,
	virusplague,
	void,
	voidshell,
	web,
	weight,
	wind,
	wings,
	wisdom,
	yoink,
	v_bblood,
	v_blackhole,
	v_bow,
	v_burrow,
	v_cold,
	v_cseed,
	v_dagger,
	v_dessication,
	v_divinity,
	v_drainlife(u8),
	v_dshield,
	v_endow,
	v_fiery,
	v_firebolt(u8),
	v_firewall,
	v_flyingweapon,
	v_freedom,
	v_freeevade,
	v_gaincharge2,
	v_gratitude,
	v_hatch,
	v_heal,
	v_holylight,
	v_hope,
	v_hopedr,
	v_icebolt(u8),
	v_improve,
	v_integrity,
	v_mutation,
	v_noluci,
	v_nymph,
	v_obsession,
	v_pandemonium,
	v_plague,
	v_readiness,
	v_relic,
	v_rewind,
	v_salvage,
	v_scramble,
	v_serendipity,
	v_silence,
	v_singularity,
	v_slow,
	v_steal,
	v_stoneform,
	v_storm(i16),
	v_swarm,
	v_swarmhp,
	v_thorn,
	v_unburrow,
	v_virusplague,
	v_void,
}

#[derive(Clone, Copy)]
pub struct Tgt(NonZeroU32);

impl Tgt {
	pub const own: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(1 << 1) });
	pub const foe: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(2 << 1) });
	pub const notself: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(3 << 1) });
	pub const all: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(4 << 1) });
	pub const card: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(5 << 1) });
	pub const pill: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(6 << 1) });
	pub const weap: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(7 << 1) });
	pub const shie: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(8 << 1) });
	pub const playerweap: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(9 << 1) });
	pub const perm: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(10 << 1) });
	pub const nonstack: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(11 << 1) });
	pub const permstack: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(12 << 1) });
	pub const crea: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(13 << 1) });
	pub const creacrea: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(14 << 1) });
	pub const play: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(15 << 1) });
	pub const notplay: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(16 << 1) });
	pub const sing: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(17 << 1) });
	pub const butterfly: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(18 << 1) });
	pub const v_butterfly: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(19 << 1) });
	pub const devour: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(20 << 1) });
	pub const paradox: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(21 << 1) });
	pub const notskele: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(22 << 1) });
	pub const forceplay: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(23 << 1) });
	pub const airbornecrea: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(24 << 1) });
	pub const golem: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(25 << 1) });
	pub const groundcrea: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(26 << 1) });
	pub const wisdom: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(27 << 1) });
	pub const quinttog: Tgt = Tgt(unsafe { NonZeroU32::new_unchecked(28 << 1) });
	pub const _own: u32 = 1 << 1;
	pub const _foe: u32 = 2 << 1;
	pub const _notself: u32 = 3 << 1;
	pub const _all: u32 = 4 << 1;
	pub const _card: u32 = 5 << 1;
	pub const _pill: u32 = 6 << 1;
	pub const _weap: u32 = 7 << 1;
	pub const _shie: u32 = 8 << 1;
	pub const _playerweap: u32 = 9 << 1;
	pub const _perm: u32 = 10 << 1;
	pub const _nonstack: u32 = 11 << 1;
	pub const _permstack: u32 = 12 << 1;
	pub const _crea: u32 = 13 << 1;
	pub const _creacrea: u32 = 14 << 1;
	pub const _play: u32 = 15 << 1;
	pub const _notplay: u32 = 16 << 1;
	pub const _sing: u32 = 17 << 1;
	pub const _butterfly: u32 = 18 << 1;
	pub const _v_butterfly: u32 = 19 << 1;
	pub const _devour: u32 = 20 << 1;
	pub const _paradox: u32 = 21 << 1;
	pub const _notskele: u32 = 22 << 1;
	pub const _forceplay: u32 = 23 << 1;
	pub const _airbornecrea: u32 = 24 << 1;
	pub const _golem: u32 = 25 << 1;
	pub const _groundcrea: u32 = 26 << 1;
	pub const _wisdom: u32 = 27 << 1;
	pub const _quinttog: u32 = 28 << 1;
	pub const And: u32 = 2;
	pub const Or: u32 = 3;

	const fn or(self) -> Tgt {
		Tgt(unsafe { NonZeroU32::new_unchecked(3 | self.0.get() << 2) })
	}

	const fn and(self) -> Tgt {
		Tgt(unsafe { NonZeroU32::new_unchecked(1 | self.0.get() << 2) })
	}

	const fn mix(self, tgt: Tgt) -> Tgt {
		Tgt(unsafe { NonZeroU32::new_unchecked(self.0.get() | tgt.0.get() << 6) })
	}

	pub fn full_check(self, ctx: &Game, c: i32, t: i32) -> bool {
		let kind = ctx.get_kind(t);
		(if kind == Kind::Player {
			!ctx.get(t, Flag::out)
		} else {
			let owner = ctx.get_owner(t);
			ctx.getIndex(t) != -1
				&& (owner == ctx.turn || !ctx.is_cloaked(owner) || ctx.get(t, Flag::cloak))
		}) && self.check(ctx, c, t)
	}

	pub fn check(self, ctx: &Game, c: i32, t: i32) -> bool {
		self.check_core(ctx, c, t, &mut 0)
	}

	fn check_core(self, ctx: &Game, c: i32, t: i32, idx: &mut usize) -> bool {
		let val = self.0.get() >> *idx;
		if (val & 1) == 0 {
			*idx += 6;
			match val & 63 {
				Tgt::_own => ctx.get_owner(c) == ctx.get_owner(t),
				Tgt::_foe => ctx.get_owner(c) != ctx.get_owner(t),
				Tgt::_notself => c != t,
				Tgt::_all => true,
				Tgt::_card => c != t && ctx.get_kind(t) == Kind::Spell,
				Tgt::_pill => ctx.material(t, Some(Kind::Permanent)) && ctx.get(t, Flag::pillar),
				Tgt::_weap => {
					let tkind = ctx.get_kind(t);
					ctx.material(t, None)
						&& (tkind == Kind::Weapon
							|| (tkind != Kind::Spell && {
								let card = ctx.get(t, Stat::card);
								card != 0 && ctx.get_card(card).kind == Kind::Weapon
							}))
				}
				Tgt::_shie => {
					let tkind = ctx.get_kind(t);
					ctx.material(t, None)
						&& (tkind == Kind::Shield
							|| (tkind != Kind::Spell && {
								let card = ctx.get(t, Stat::card);
								card != 0 && ctx.get_card(card).kind == Kind::Shield
							}))
				}
				Tgt::_playerweap => ctx.get_kind(t) == Kind::Weapon,
				Tgt::_perm => ctx.material(t, Some(Kind::Permanent)),
				Tgt::_nonstack => !ctx.get(t, Flag::stackable),
				Tgt::_permstack => {
					ctx.material(t, Some(Kind::Permanent)) && ctx.get(t, Flag::stackable)
				}
				Tgt::_crea => ctx.material(t, Some(Kind::Creature)),
				Tgt::_creacrea => {
					ctx.material(t, Some(Kind::Creature)) && ctx.get_kind(t) == Kind::Creature
				}
				Tgt::_play => ctx.get_kind(t) == Kind::Player,
				Tgt::_notplay => ctx.get_kind(t) != Kind::Player,
				Tgt::_sing => {
					ctx.material(t, Some(Kind::Creature))
						&& ctx
							.getSkill(t, Event::Cast)
							.iter()
							.all(|&s| s != Skill::sing)
				}
				Tgt::_butterfly => {
					let tkind = ctx.get_kind(t);
					(tkind == Kind::Creature || tkind == Kind::Weapon)
						&& !ctx.get(t, Flag::immaterial | Flag::burrowed)
						&& (ctx.trueatk(t) < 3 || (tkind == Kind::Creature && ctx.truehp(t) < 3))
				}
				Tgt::_v_butterfly => ctx.material(t, Some(Kind::Creature)) && ctx.trueatk(t) < 3,
				Tgt::_devour => {
					ctx.material(t, Some(Kind::Creature)) && ctx.truehp(t) < ctx.truehp(c)
				}
				Tgt::_paradox => {
					ctx.material(t, Some(Kind::Creature)) && ctx.truehp(t) < ctx.trueatk(t)
				}
				Tgt::_notskele => {
					ctx.material(t, Some(Kind::Creature))
						&& !card::IsOf(ctx.get(t, Stat::card), card::Skeleton)
				}
				Tgt::_forceplay => {
					ctx.get_kind(t) == Kind::Spell
						|| (ctx.material(t, None)
							&& ctx
								.getSkill(t, Event::Cast)
								.first()
								.map(|&s| s != Skill::forceplay)
								.unwrap_or(false))
				}
				Tgt::_airbornecrea => {
					ctx.material(t, Some(Kind::Creature)) && ctx.get(t, Flag::airborne)
				}
				Tgt::_golem => {
					let tkind = ctx.get_kind(t);
					(tkind == Kind::Weapon || tkind == Kind::Creature) && ctx.get(t, Flag::golem)
				}
				Tgt::_groundcrea => {
					ctx.material(t, Some(Kind::Creature)) && !ctx.get(t, Flag::airborne)
				}
				Tgt::_wisdom => {
					let tkind = ctx.get_kind(t);
					(tkind == Kind::Creature || tkind == Kind::Weapon)
						&& !ctx.get(t, Flag::burrowed)
				}
				Tgt::_quinttog => ctx.get_kind(t) == Kind::Creature && !ctx.get(t, Flag::burrowed),
				_ => false,
			}
		} else {
			*idx += 2;
			if (val & 2) == 0 {
				self.check_core(ctx, c, t, idx) && self.check_core(ctx, c, t, idx)
			} else {
				self.check_core(ctx, c, t, idx) || self.check_core(ctx, c, t, idx)
			}
		}
	}
}

fn pillarcore(ctx: &mut Game, c: i32, n: i32) {
	let card = ctx.get_card(ctx.get(c, Stat::card));
	ctx.spend(
		ctx.get_owner(c),
		card.element as i32,
		n * if card.element > 0 { -1 } else { -3 },
	);
}

fn quadpillarcore(ctx: &mut Game, eles: u16, c: i32, n: i32) {
	let owner = ctx.get_owner(c);
	for _ in 0..n {
		let r = ctx.rng_range(0..16);
		ctx.spend(owner, ((eles >> ((r << 2) & 12)) & 15) as i32, -1);
		if ctx.rng_ratio(2, 3) {
			ctx.spend(owner, ((eles >> (r & 12)) & 15) as i32, -1);
		}
	}
}

const fn legacy_banned(code: i32) -> bool {
	matches!(
		code,
		card::v_ShardofFocus
			| card::v_FateEgg
			| card::v_Immortal
			| card::v_Scarab
			| card::v_DevonianDragon
			| card::v_Chimera
	)
}

enum Soya {
	Flag(u64),
	Stat(Stat, i32),
	Skill(Event, [Skill; 1]),
}

impl Skill {
	pub const fn passive(self) -> bool {
		matches!(
			self,
			Self::abomination
				| Self::becomearctic
				| Self::beguilestop
				| Self::bounce | Self::catlife
				| Self::cell | Self::chromastat
				| Self::counter | Self::decrsteam
				| Self::deepdiveproc
				| Self::deepdiveproc2
				| Self::dshieldoff
				| Self::elf | Self::firebrand
				| Self::martyr | Self::mummy
				| Self::obsession
				| Self::predatoroff
				| Self::protectonce
				| Self::protectoncedmg
				| Self::salvage | Self::siphon
				| Self::skeleton | Self::swarm
				| Self::virtue | Self::v_obsession
				| Self::v_salvage
				| Self::v_singularity
				| Self::v_swarm
		)
	}

	pub fn targeting(self, set: CardSet) -> Option<Tgt> {
		Some(match self {
			Self::acceleration => Tgt::crea,
			Self::accretion => {
				if set == CardSet::Open {
					Tgt::perm
				} else {
					Tgt::perm.mix(Tgt::play).or()
				}
			}
			Self::adrenaline => Tgt::crea,
			Self::aflatoxin => {
				if set == CardSet::Open {
					Tgt::crea.mix(Tgt::play).or()
				} else {
					Tgt::crea
				}
			}
			Self::aggroskele => Tgt::crea,
			Self::antimatter => {
				if set == CardSet::Open {
					Tgt::crea.mix(Tgt::weap).or()
				} else {
					Tgt::crea
				}
			}
			Self::appease => Tgt::own.mix(Tgt::notself.mix(Tgt::crea).and()).and(),
			Self::bblood => Tgt::crea,
			Self::beguile => Tgt::crea,
			Self::bellweb => Tgt::crea,
			Self::blackhole => Tgt::play,
			Self::bless => {
				if set == CardSet::Open {
					Tgt::crea.mix(Tgt::weap).or()
				} else {
					Tgt::crea
				}
			}
			Self::bolsterintodeck => Tgt::crea,
			Self::bubbleclear => Tgt::crea.mix(Tgt::perm).or(),
			Self::butterfly => {
				if set == CardSet::Open {
					Tgt::butterfly
				} else {
					Tgt::v_butterfly
				}
			}
			Self::catapult => Tgt::own.mix(Tgt::crea).and(),
			Self::clear => Tgt::crea.mix(Tgt::perm).or(),
			Self::corpseexplosion => Tgt::own.mix(Tgt::crea).and(),
			Self::cpower => {
				if set == CardSet::Open {
					Tgt::crea.mix(Tgt::weap).or()
				} else {
					Tgt::crea
				}
			}
			Self::cseed => Tgt::crea,
			Self::cseed2 => Tgt::all,
			Self::destroy => Tgt::perm,
			Self::destroycard => Tgt::card.mix(Tgt::play).or(),
			Self::detain | Skill::devour => Tgt::devour,
			Self::discping => Tgt::crea.mix(Tgt::play).or(),
			Self::drainlife => Tgt::crea.mix(Tgt::play).or(),
			Self::draft => Tgt::crea,
			Self::dshield => Tgt::crea,
			Self::earthquake => {
				if set == CardSet::Open {
					Tgt::permstack
				} else {
					Tgt::pill
				}
			}
			Self::embezzle => Tgt::crea,
			Self::enchant => Tgt::perm,
			Self::endow => Tgt::weap,
			Self::envenom => Tgt::weap.mix(Tgt::shie).or(),
			Self::equalize => Tgt::crea.mix(Tgt::card.mix(Tgt::notself).and()).or(),
			Self::feed => Tgt::crea,
			Self::fickle => Tgt::card,
			Self::firebolt => Tgt::crea.mix(Tgt::play).or(),
			Self::firestorm(_) => Tgt::play,
			Self::flyingweapon => Tgt::playerweap,
			Self::forceplay => Tgt::forceplay,
			Self::fractal => Tgt::crea,
			Self::freeze(_) => {
				if set == CardSet::Open {
					Tgt::crea.mix(Tgt::weap).or()
				} else {
					Tgt::crea
				}
			}
			Self::freezeperm => Tgt::perm.mix(Tgt::nonstack).and(),
			Self::give => Tgt::notself.mix(Tgt::own.mix(Tgt::notplay).and()).and(),
			Self::golemhit => Tgt::notself.mix(Tgt::golem).and(),
			Self::gpullspell => {
				if set == CardSet::Open {
					Tgt::crea.mix(Tgt::play).or()
				} else {
					Tgt::crea
				}
			}
			Self::guard => Tgt::crea,
			Self::heal => Tgt::crea.mix(Tgt::play).or(),
			Self::holylight => Tgt::crea.mix(Tgt::play).or(),
			Self::icebolt => Tgt::crea.mix(Tgt::play).or(),
			Self::immolate(_) => Tgt::own.mix(Tgt::crea).and(),
			Self::improve => Tgt::crea,
			Self::innovation => Tgt::card,
			Self::jelly => Tgt::crea,
			Self::jetstream => Tgt::crea,
			Self::lightning => Tgt::crea.mix(Tgt::play).or(),
			Self::liquid => Tgt::crea,
			Self::livingweapon => Tgt::crea,
			Self::lobotomize => Tgt::crea,
			Self::locketshift => Tgt::all,
			Self::mend => Tgt::crea,
			Self::metamorph => Tgt::all,
			Self::midas => Tgt::perm,
			Self::mill => Tgt::play,
			Self::millpillar => Tgt::play,
			Self::mitosisspell => {
				if set == CardSet::Open {
					Tgt::crea
				} else {
					Tgt::creacrea
				}
			}
			Self::momentum => {
				if set == CardSet::Open {
					Tgt::crea.mix(Tgt::weap).or()
				} else {
					Tgt::crea
				}
			}
			Self::mutation => Tgt::crea,
			Self::neuroify => Tgt::crea.mix(Tgt::play).or(),
			Self::nightmare => Tgt::crea,
			Self::nightshade => Tgt::crea,
			Self::nymph => Tgt::pill,
			Self::pacify => Tgt::crea.mix(Tgt::weap).or(),
			Self::pandemonium2 => Tgt::play,
			Self::paradox => Tgt::paradox,
			Self::parallel => Tgt::crea,
			Self::plague => Tgt::play,
			Self::platearmor(_) => {
				if set == CardSet::Open {
					Tgt::crea.mix(Tgt::play).or()
				} else {
					Tgt::crea
				}
			}
			Self::poison(_) => Tgt::crea,
			Self::powerdrain => Tgt::crea,
			Self::purify => Tgt::crea.mix(Tgt::play).or(),
			Self::quint => Tgt::crea,
			Self::quinttog => Tgt::quinttog,
			Self::rage => Tgt::crea,
			Self::readiness | Self::v_readiness => Tgt::crea,
			Self::reap => Tgt::notskele,
			Self::regeneratespell => Tgt::crea.mix(Tgt::perm.mix(Tgt::nonstack).and()).or(),
			Self::regrade => Tgt::notself
				.mix(Tgt::notplay.mix(Tgt::card.mix(Tgt::nonstack).or()).and())
				.and(),
			Self::reinforce => Tgt::crea,
			Self::ren => Tgt::crea,
			Self::resummon => Tgt::crea,
			Self::rewind | Self::v_rewind => Tgt::crea,
			Self::sabbath => Tgt::play,
			Self::scatter => Tgt::play.mix(Tgt::card.mix(Tgt::notself).and()).or(),
			Self::scramble => Tgt::play,
			Self::scramblespam => Tgt::play,
			Self::shuffle3 => Tgt::crea,
			Self::silence => Tgt::crea.mix(Tgt::play).or(),
			Self::sing => Tgt::sing,
			Self::sinkhole => Tgt::crea,
			Self::siphonactive => Tgt::notself.mix(Tgt::crea.mix(Tgt::weap).or()).and(),
			Self::siphonstrength => Tgt::notself.mix(Tgt::crea).and(),
			Self::snipe => Tgt::crea,
			Self::stasisdraw => Tgt::play,
			Self::steal | Self::v_steal => Tgt::foe.mix(Tgt::perm).and(),
			Self::storm(_) => Tgt::play,
			Self::swave => Tgt::crea.mix(Tgt::play).or(),
			Self::tempering(i16) => Tgt::weap,
			Self::throwrock => Tgt::crea,
			Self::trick => Tgt::crea,
			Self::unsummon => Tgt::crea,
			Self::unsummonquanta => Tgt::crea,
			Self::upload => Tgt::crea.mix(Tgt::weap).or(),
			Self::virusinfect => Tgt::crea,
			Self::virusplague => Tgt::play,
			Self::web => {
				if set == CardSet::Open {
					Tgt::airbornecrea
				} else {
					Tgt::crea
				}
			}
			Self::wisdom => {
				if set == CardSet::Open {
					Tgt::wisdom
				} else {
					Tgt::quinttog
				}
			}
			Self::yoink => Tgt::foe.mix(Tgt::play.mix(Tgt::card).or()).and(),
			Self::v_bblood => Tgt::crea,
			Self::v_cseed => Tgt::crea,
			Self::v_drainlife(_) => Tgt::crea.mix(Tgt::play).or(),
			Self::v_endow => Tgt::weap,
			Self::v_firebolt(_) => Tgt::crea.mix(Tgt::play).or(),
			Self::v_holylight => Tgt::crea.mix(Tgt::play).or(),
			Self::v_icebolt(_) => Tgt::crea.mix(Tgt::play).or(),
			Self::v_improve => Tgt::crea,
			Self::v_mutation => Tgt::crea,
			Self::v_nymph => Tgt::pill,
			_ => return None,
		})
	}

	pub const fn param1(self) -> i32 {
		match self {
			Skill::evade(x)
			| Skill::firestorm(x)
			| Skill::immolate(x)
			| Skill::platearmor(x)
			| Skill::poison(x)
			| Skill::poisonfoe(x)
			| Skill::regenerate(x)
			| Skill::storm(x)
			| Skill::tempering(x)
			| Skill::thorn(x)
			| Skill::v_storm(x) => x as i32,
			Skill::summon(x) | Skill::quadpillar(x) | Skill::quadpillar1(x) => x as i32,
			Skill::quanta(x) => x as i32,
			Skill::freeze(x)
			| Skill::v_drainlife(x)
			| Skill::v_firebolt(x)
			| Skill::v_icebolt(x) => x as i32,
			Skill::growth(x, _) | Skill::icegrowth(x, _) => x as i32,
			_ => 0,
		}
	}

	pub const fn param2(self) -> i32 {
		match self {
			Skill::growth(_, x) | Skill::icegrowth(_, x) => x as i32,
			_ => 0,
		}
	}

	pub fn proc(self, ctx: &mut Game, c: i32, t: i32, data: &mut ProcData) {
		match self {
			Self::r#_tracedeath => {
				ctx.incrStatus(ctx.turn, Stat::creaturesDied, 1);
			}
			Self::abomination => {
				if data.tgt == c && data.active == Some(Self::mutation) {
					Skill::improve.proc(ctx, c, c, data);
					data.flags |= ProcData::evade;
				}
			}
			Self::absorbdmg => {
				ctx.incrStatus(c, Stat::storedpower, data.blocked);
			}
			Self::absorber => {
				ctx.spend(ctx.get_owner(c), etg::Fire, -3);
			}
			Self::acceleration => {
				ctx.lobo(t);
				let upped = card::Upped(ctx.get(c, Stat::card));
				ctx.setSkill(
					t,
					Event::OwnAttack,
					if upped {
						&[Skill::growth(3, -1)]
					} else {
						&[Skill::growth(2, -1)]
					},
				);
			}
			Self::accretion => {
				if ctx.get_kind(t) != Kind::Player {
					Skill::destroy.proc(ctx, c, t, data);
				}
				let is_open = ctx.cardset() == CardSet::Open;
				ctx.buffhp(c, if is_open { 10 } else { 15 });
				if ctx.truehp(c) > if is_open { 30 } else { 45 } {
					let owner = ctx.get_owner(c);
					let card = ctx.get(c, Stat::card);
					if is_open {
						ctx.remove(c);
					} else {
						ctx.die(c);
					}
					ctx.transform(
						c,
						card::As(
							card,
							if is_open {
								card::BlackHole
							} else {
								card::v_BlackHole
							},
						),
					);
					ctx.addCard(owner, c);
				}
			}
			Self::adrenaline => {
				ctx.fx(t, Fx::Adrenaline);
				ctx.set(t, Stat::adrenaline, 1);
			}
			Self::aflatoxin => {
				ctx.fx(t, Fx::Aflatoxin);
				ctx.poison(t, 2);
				ctx.set(t, Flag::aflatoxin, true);
			}
			Self::aggroskele => {
				let ccard = ctx.get(c, Stat::card);
				let owner = ctx.get_owner(c);
				let skele = ctx.new_thing(card::As(ccard, card::Skeleton), owner);
				ctx.addCrea(owner, skele);
				let mut dmg = 0;
				for &cr in ctx.get_player(owner).creatures.clone().iter() {
					if cr != 0 {
						let crcard = ctx.get(cr, Stat::card);
						if card::IsOf(crcard, card::Skeleton) {
							dmg += ctx.trueatk(cr);
						}
					}
				}
				ctx.dmg(t, dmg);
			}
			Self::alphawolf => {
				let ccard = ctx.get(c, Stat::card);
				let owner = ctx.get_owner(c);
				for _ in 0..2 {
					let wolf = ctx.new_thing(card::As(ccard, card::PackWolf), owner);
					ctx.addCrea(owner, wolf);
					ctx.fx(wolf, Fx::StartPos(c));
				}
			}
			Self::antimatter => {
				ctx.incrAtk(t, ctx.trueatk(t) * -2);
			}
			Self::appease => {
				ctx.set(c, Flag::appeased, true);
				ctx.fx(c, Fx::Appeased);
				Skill::devour.proc(ctx, c, t, data);
			}
			Self::equalize => {
				if ctx.get_kind(t) == Kind::Creature {
					let ttrueatk = ctx.trueatk(t);
					let hp = ctx.get(t, Stat::hp);
					ctx.set(t, Stat::maxhp, ttrueatk);
					ctx.dmg(t, hp - ttrueatk);
				} else {
					ctx.set(t, Stat::costele, etg::Chroma);
				}
			}
			Self::autoburrow => {
				ctx.addskills(c, Event::Play, &[Self::autoburrowproc]);
			}
			Self::autoburrowoff => {
				ctx.rmskill(c, Event::Play, Self::autoburrowproc);
			}
			Self::autoburrowproc => {
				if let Some(Skill::burrow) = ctx.getSkill(t, Event::Cast).first() {
					Skill::burrow.proc(ctx, t, 0, data);
				}
			}
			Self::axedraw => {
				ctx.incrStatus(c, Stat::dive, 1);
			}
			Self::bblood => {
				ctx.buffhp(t, 20);
				ctx.delay(t, 5);
			}
			Self::becomearctic => {
				ctx.transform(c, card::As(ctx.get(c, Stat::card), card::ArcticSquid));
				data.amt = 0;
			}
			Self::beguile => {
				let town = ctx.get_owner(t);
				let foe = ctx.get_foe(town);
				ctx.remove(t);
				ctx.addCrea(foe, t);
				if c != t {
					ctx.addskills(t, Event::Turnstart, &[Skill::beguilestop]);
				}
			}
			Self::beguilestop => {
				if t == ctx.get_owner(c) {
					let thing = ctx.get_thing_mut(c);
					if let Some(smap) = thing.skill.get_mut(Event::Turnstart) {
						let smap = smap.to_mut();
						if let Some(idx) = smap.iter().position(|&s| s == Skill::beguilestop) {
							smap.remove(idx);
						}
					}
					Skill::beguile.proc(ctx, c, c, data);
				}
			}
			Self::bellweb => {
				Skill::web.proc(ctx, c, t, data);
				ctx.set(t, Flag::aquatic, true);
			}
			Self::blackhole | Self::v_blackhole => {
				let t = if t == 0 {
					ctx.get_foe(ctx.get_owner(c))
				} else {
					t
				};
				if !ctx.sanctified(t) {
					let mut heal = 0;
					for q in ctx.get_player_mut(t).quanta.iter_mut() {
						let amt = cmp::min(*q, 3);
						heal -= amt as i32;
						*q -= amt;
					}
					ctx.dmg(ctx.get_owner(c), heal);
				}
			}
			Self::bless => {
				ctx.incrAtk(t, 3);
				ctx.buffhp(t, 3);
			}
			Self::blockwithcharge => {
				if ctx.maybeDecrStatus(c, Stat::charges) < 2 {
					if ctx.cardset() == CardSet::Open {
						ctx.die(c);
					} else {
						ctx.remove(c);
					}
				}
				data.dmg = 0;
			}
			Self::bloodmoon => {
				let owner = ctx.get_owner(c);
				for &cr in ctx.get_player(owner).creatures.clone().iter() {
					if cr != 0 {
						if ctx.get(cr, Flag::nocturnal)
							&& !ctx.hasskill(cr, Event::Hit, Skill::vampire)
						{
							ctx.addskills(cr, Event::Hit, &[Skill::vampire]);
						}
						if ctx.get(cr, Flag::aquatic)
							&& !ctx.hasskill(cr, Event::OwnAttack, Skill::quanta(etg::Light as i8))
						{
							ctx.addskills(cr, Event::OwnAttack, &[Skill::quanta(etg::Light as i8)]);
						}
						if ctx.get(cr, Flag::golem)
							&& !ctx.hasskill(cr, Event::Hit, Skill::reducemaxhp)
						{
							ctx.addskills(cr, Event::Hit, &[Skill::reducemaxhp]);
						}
					}
				}
			}
			Self::bolsterintodeck => {
				let card = ctx.get(t, Stat::card);
				let owner = ctx.get_owner(c);
				let cards = &[
					ctx.new_thing(card, owner),
					ctx.new_thing(card, owner),
					ctx.new_thing(card, owner),
				];
				ctx.get_player_mut(owner).deck_mut().extend(cards);
			}
			Self::boneyard => {
				let skele = if ctx.cardset() == CardSet::Open {
					card::Skeleton
				} else {
					card::v_Skeleton
				};
				if !card::IsOf(ctx.get(t, Stat::card), skele) {
					let owner = ctx.get_owner(c);
					let skele = ctx.new_thing(card::As(ctx.get(c, Stat::card), skele), owner);
					ctx.addCrea(owner, skele);
				}
			}
			Self::bounce => {
				ctx.set(c, Stat::hp, ctx.get(c, Stat::maxhp));
				ctx.rmskill(c, Event::Predeath, Skill::bounce);
				ctx.unsummon(c);
				data.flags |= ProcData::evade;
			}
			Self::bravery => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				if !ctx.sanctified(foe)
					&& !ctx.get(foe, Flag::drawlock)
					&& !ctx.get(owner, Flag::drawlock)
				{
					let n = if ctx.cardset() != CardSet::Open
						&& ctx.get_player(owner).mark == etg::Fire
					{
						3
					} else {
						2
					};
					for _ in 0..n {
						if ctx.get_player(owner).hand_full() || ctx.get_player(foe).hand_full() {
							break;
						}
						ctx.drawcard(owner);
						ctx.drawcard(foe);
					}
				}
			}
			Self::brawl => {
				let owner = ctx.get_owner(c);
				let foecreatures = ctx.get_player(ctx.get_foe(owner)).creatures.clone();
				for (i, &cr) in ctx.get_player(owner).creatures.clone().iter().enumerate() {
					if cr != 0 {
						let fcr = foecreatures[i];
						if fcr == 0 {
							ctx.queue_attack(cr, 0);
						} else {
							ctx.attackCreature(cr, fcr);
							ctx.attackCreature(fcr, cr);
						}
					}
				}
				ctx.set_quanta(owner, etg::Gravity, 0);
			}
			Self::brew => {
				let owner = ctx.get_owner(c);
				let alchcard = etg::AlchemyList[ctx.rng_range(1..=12)] as i32;
				let inst = ctx.new_thing(card::As(ctx.get(c, Stat::card), alchcard), owner);
				ctx.fx(inst, Fx::StartPos(c));
				ctx.addCard(owner, inst);
			}
			Self::brokenmirror => {
				let owner = ctx.get_owner(c);
				if data.get(ProcData::fromhand)
					&& ctx.get_kind(t) == Kind::Creature
					&& owner != ctx.get_owner(t)
				{
					let phantom =
						ctx.new_thing(card::As(ctx.get(c, Stat::card), card::Phantom), owner);
					ctx.fx(phantom, Fx::StartPos(c));
					ctx.addCrea(owner, phantom);
				}
			}
			Self::bubbleclear => {
				Skill::clear.proc(ctx, c, t, data);
				ctx.addskills(t, Event::Prespell, &[Skill::protectonce]);
				ctx.addskills(t, Event::Spelldmg, &[Skill::protectoncedmg]);
			}
			Self::burrow => {
				if ctx.get(c, Flag::burrowed) {
					ctx.set(c, Flag::burrowed, false);
					ctx.set(c, Stat::cast, 1);
				} else {
					ctx.set(c, Flag::airborne, false);
					ctx.set(c, Flag::burrowed, true);
					ctx.set(c, Stat::cast, 0);
				}
			}
			Self::butterfly => {
				ctx.lobo(t);
				ctx.setSkill(t, Event::Cast, &[Skill::destroy]);
				ctx.set(t, Stat::cast, 3);
				ctx.set(t, Stat::castele, etg::Entropy);
			}
			Self::catapult => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				ctx.fx(t, Fx::Catapult);
				ctx.fx(t, Fx::EndPos(foe));
				ctx.die(t);
				let truehp = ctx.truehp(t);
				let frozen = ctx.get(t, Stat::frozen);
				let is_open = ctx.cardset() == CardSet::Open;
				ctx.dmg(
					foe,
					(truehp * (if frozen != 0 { 151 } else { 101 }) + 99) / (truehp + 100),
				);
				ctx.poison(
					foe,
					ctx.get(t, Stat::poison) + (is_open && ctx.get(t, Flag::poisonous)) as i32,
				);
				if frozen != 0 {
					ctx.freeze(foe, if is_open { frozen } else { 3 })
				}
			}
			Self::catlife => {
				let owner = ctx.get_owner(c);
				let pl = ctx.get_player(owner);
				let index = data.index;
				if pl.creatures[index as usize] == 0 {
					let lives = ctx.maybeDecrStatus(c, Stat::lives);
					if lives > 1 {
						ctx.fx(c, Fx::Lives(lives));
						let card = ctx.get_card(ctx.get(c, Stat::card));
						ctx.set(c, Stat::maxhp, card.health as i32);
						ctx.set(c, Stat::hp, card.health as i32);
						ctx.set(c, Stat::atk, card.attack as i32);
						ctx.setCrea(owner, index as i32, c);
					}
				}
			}
			Self::cell => {
				ctx.transform(c, card::As(ctx.get(c, Stat::card), card::MalignantCell));
				data.amt = 0;
			}
			Self::chaos => {
				let rng = ctx.rng();
				if rng < 0.5 {
					if rng < 0.3 {
						if ctx.get_kind(t) == Kind::Creature && !ctx.get(t, Flag::ranged) {
							Skill::cseed.proc(ctx, c, t, data);
						}
					} else if card::Upped(ctx.get(c, Stat::card)) {
						data.dmg = 0;
					}
				}
			}
			Self::chimera => {
				let is_open = ctx.cardset() == CardSet::Open;
				let mut hp = 0;
				let mut atk = 0;
				let owner = ctx.get_owner(c);
				for &cr in ctx.get_player(owner).creatures.iter() {
					if cr != 0 {
						hp += ctx.truehp(cr);
						atk += ctx.trueatk(cr);
					}
				}
				let chim = ctx.new_thing(
					card::As(
						ctx.get(c, Stat::card),
						if is_open {
							card::Chimera
						} else {
							card::v_Chimera
						},
					),
					owner,
				);
				ctx.set(chim, Stat::maxhp, hp);
				ctx.set(chim, Stat::hp, hp);
				ctx.set(chim, Stat::atk, atk);
				ctx.set(chim, Flag::momentum, true);
				if is_open {
					ctx.set(chim, Flag::airborne, true);
				} else {
					ctx.rmskill(chim, Event::Cast, Skill::chimera);
				}
				ctx.set_kind(chim, Kind::Creature);
				let crs = Rc::make_mut(&mut ctx.get_player_mut(owner).creatures);
				crs[0] = chim;
				for cr in crs[1..].iter_mut() {
					*cr = 0;
				}
				ctx.set(owner, Stat::gpull, chim);
			}
			Self::chromastat => {
				let n = cmp::min(ctx.truehp(c) + ctx.trueatk(c), 1188);
				ctx.fx(c, Fx::Quanta(n as u16, etg::Chroma as u8));
				ctx.spend(ctx.get_owner(c), etg::Chroma, -n);
			}
			Self::clear => {
				ctx.fx(t, Fx::Clear);
				let thing = ctx.get_thing_mut(t);
				thing.flag.0 &= !(Flag::aflatoxin | Flag::neuro | Flag::momentum | Flag::psionic);
				for status in [Stat::poison, Stat::adrenaline, Stat::delayed, Stat::frozen] {
					if let Some(val) = thing.status.get_mut(status) {
						*val = 0;
					}
				}
				if thing.kind == Kind::Creature {
					ctx.dmg(t, -1);
					if ctx.hasskill(t, Event::Turnstart, Skill::beguilestop) {
						Skill::beguilestop.proc(ctx, t, ctx.get_owner(t), data);
					}
				}
			}
			Self::cold => {
				if !ctx.get(t, Flag::ranged) && ctx.rng_ratio(3, 10) {
					ctx.freeze(t, 3);
				}
			}
			Self::corpseexplosion => {
				let dmg = 1 + ctx.truehp(t) / 8;
				ctx.die(t);
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				let poison = ctx.get(t, Stat::poison) + ctx.get(t, Flag::poisonous) as i32;
				ctx.masscc(
					foe,
					if card::Upped(ctx.get(c, Stat::card)) {
						0
					} else {
						owner
					},
					|ctx, cr| {
						if cr != t {
							ctx.spelldmg(cr, dmg);
							ctx.poison(cr, poison);
						}
					},
				);
				ctx.spelldmg(foe, dmg);
				ctx.poison(
					foe,
					ctx.get(t, Stat::poison) + ctx.get(t, Flag::poisonous) as i32,
				);
			}
			Self::counter => {
				if ctx.get(c, Stat::frozen) == 0
					&& ctx.get(c, Stat::delayed) == 0
					&& data.dmg > 0 && ctx.getIndex(c) != -1
				{
					ctx.attackCreature(c, t);
				}
			}
			Self::cpower => {
				let buff = ctx.rng_range(0..25);
				ctx.buffhp(t, buff / 5 + 1);
				ctx.incrAtk(t, buff % 5 + 1);
			}
			Self::creatureupkeep => {
				if ctx.get_kind(t) == Kind::Creature {
					Skill::upkeep.proc(ctx, t, 0, data);
				}
			}
			Self::cseed => {
				if let Some(sk) = ctx.choose(&[
					Skill::drainlife,
					Skill::firebolt,
					Skill::freeze(6),
					Skill::gpullspell,
					Skill::icebolt,
					Skill::poison(1),
					Skill::lightning,
					Skill::lobotomize,
					Skill::parallel,
					Skill::rewind,
					Skill::snipe,
					Skill::swave,
				]) {
					return sk.proc(ctx, c, t, data);
				}
			}
			Self::cseed2 => {
				let upped = ctx.rng_ratio(1, 2);
				if let Some(card) = ctx.random_card(upped, |ctx, card| {
					card.kind == Kind::Spell
						&& card
							.skill
							.first()
							.and_then(|&(k, skills)| {
								debug_assert!(k == Event::Cast);
								skills.first()
							})
							.and_then(|sk| sk.targeting(ctx.cardset()))
							.map(|tgt| tgt.check(ctx, c, t))
							.unwrap_or_default()
				}) {
					ctx.fx(t, Fx::Card(card.code));
					ctx.castSpellNoSpell(
						c,
						t,
						card.skill
							.first()
							.and_then(|&(_, skills)| skills.first().cloned())
							.unwrap(),
					);
				}
			}
			Self::deadalive => {
				let index = ctx.getIndex(c);
				ctx.fx(c, Fx::Death);
				ctx.deatheffect(c, index);
			}
			Self::deathwish => {
				let tgt = data.tgt;
				let owner = ctx.get_owner(c);
				if tgt != 0
					&& owner != ctx.get_owner(t)
					&& owner == ctx.get_owner(tgt)
					&& ctx.get(c, Stat::frozen) == 0
					&& ctx.get(c, Stat::delayed) == 0
					&& data
						.active
						.and_then(|sk| sk.targeting(ctx.cardset()))
						.map(|tgt| tgt.check(ctx, t, c))
						.unwrap_or(false)
				{
					if !ctx.hasskill(tgt, Event::Prespell, Skill::deathwish) {
						data.tgt = c;
					} else {
						let totaldw = ctx
							.get_player(owner)
							.creatures
							.iter()
							.map(|&cr| {
								(cr != 0 && ctx.hasskill(cr, Event::Prespell, Skill::deathwish))
									as u32
							})
							.sum::<u32>();
						if totaldw > 0 && ctx.rng_ratio(1, totaldw) {
							data.tgt = c;
						}
					}
				}
			}
			Self::deckblast => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				let pl = ctx.get_player(owner);
				let dmg = pl.deck.len() as i32 / pl.deckpower as i32;
				ctx.spelldmg(foe, dmg);
				if ctx.get(c, Stat::costele) == etg::Time {
					ctx.get_player_mut(owner).deck_mut().clear();
				}
			}
			Self::decrsteam => {
				if ctx.maybeDecrStatus(c, Stat::steam) != 0 {
					ctx.incrAtk(c, -1);
				}
			}
			Self::deepdive => {
				ctx.setSkill(c, Event::Cast, &[Skill::freezeperm]);
				ctx.set(c, Stat::castele, etg::Gravity);
				ctx.set(c, Flag::airborne, false);
				ctx.set(c, Flag::burrowed, true);
				ctx.addskills(c, Event::Turnstart, &[Skill::deepdiveproc]);
			}
			Self::deepdiveproc => {
				if t == ctx.get_owner(c) {
					ctx.rmskill(c, Event::Turnstart, Skill::deepdiveproc);
					ctx.addskills(c, Event::Turnstart, &[Skill::deepdiveproc2]);
					ctx.set(c, Flag::airborne, true);
					ctx.set(c, Flag::burrowed, false);
					ctx.set(c, Stat::dive, ctx.trueatk(c) * 2);
				}
			}
			Self::deepdiveproc2 => {
				ctx.rmskill(c, Event::Turnstart, Skill::deepdiveproc2);
				ctx.setSkill(c, Event::Cast, &[Skill::deepdive]);
				ctx.set(c, Stat::castele, etg::Water);
				ctx.set(c, Flag::airborne, false);
			}
			Self::deja => {
				ctx.rmskill(c, Event::Cast, Skill::deja);
				Skill::parallel.proc(ctx, c, c, data);
			}
			Self::deployblobs => {
				let blob = card::As(ctx.get(c, Stat::card), card::Blob);
				let owner = ctx.get_owner(c);
				for _ in 0..3 {
					let inst = ctx.new_thing(blob, owner);
					ctx.fx(inst, Fx::StartPos(c));
					ctx.addCrea(owner, inst);
				}
				ctx.incrAtk(c, -2);
				ctx.dmg(c, 2);
			}
			Self::despair => {
				if !ctx.get(t, Flag::ranged) {
					let owner = ctx.get_owner(c);
					let nocturnal: u32 = ctx
						.get_player(owner)
						.creatures
						.iter()
						.map(|&cr| ctx.get(cr, Flag::nocturnal) as u32)
						.sum();
					if ctx.rng_ratio(40 + nocturnal, 100) {
						ctx.incrAtk(t, -1);
						ctx.dmg(t, 1);
					}
				}
			}
			Self::destroy => {
				ctx.fx(t, Fx::Destroy);
				ctx.destroy(t, Some(data));
			}
			Self::destroycard => {
				let kind = ctx.get_kind(t);
				if kind == Kind::Player {
					ctx.mill(t, 1);
				} else if !ctx.sanctified(ctx.get_owner(t)) {
					ctx.die(t);
				}
			}
			Self::detain => {
				ctx.dmg(t, 1);
				ctx.incrAtk(t, -1);
				Self::growth(1, 1).proc(ctx, c, 0, data);
				ctx.set(t, Flag::airborne, false);
				ctx.set(t, Flag::burrowed, true);
			}
			Self::devour => {
				ctx.fx(t, Fx::Sfx(Sfx::devour));
				ctx.fx(t, Fx::Devoured);
				ctx.buffhp(c, 1);
				ctx.incrAtk(c, 1);
				if ctx.get(t, Flag::poisonous) {
					ctx.poison(c, 1);
				}
				ctx.die(t);
			}
			Self::die => ctx.die(c),
			Self::disarm => {
				if ctx.get_kind(t) == Kind::Player {
					let weapon = ctx.get_weapon(t);
					if weapon != 0 {
						ctx.unsummon(weapon);
					}
				}
			}
			Self::discping => {
				ctx.dmg(t, 1);
				ctx.remove(c);
				ctx.addCard(ctx.get_owner(c), c);
			}
			Self::disfield => {
				if ctx.cardset() == CardSet::Open || !ctx.get(ctx.get_owner(c), Flag::sanctuary) {
					let owner = ctx.get_owner(c);
					if !ctx.spend(owner, etg::Chroma, data.dmg) {
						for q in ctx.get_player_mut(owner).quanta.iter_mut() {
							*q = 0;
						}
						ctx.remove(c);
					}
					data.dmg = 0;
				}
			}
			Self::disshield => {
				if ctx.cardset() == CardSet::Open || !ctx.get(ctx.get_owner(c), Flag::sanctuary) {
					let owner = ctx.get_owner(c);
					if !ctx.spend(owner, etg::Entropy, (data.dmg + 2) / 3) {
						ctx.set_quanta(owner, etg::Entropy, 0);
						ctx.remove(c);
					}
					data.dmg = 0;
				}
			}
			Self::dive => {
				ctx.fx(c, Fx::Sfx(Sfx::dive));
				ctx.fx(c, Fx::Dive);
				let trueatk = ctx.trueatk(c);
				if ctx.cardset() == CardSet::Open {
					ctx.set(c, Stat::dive, trueatk);
				} else {
					ctx.incrStatus(c, Stat::dive, trueatk);
				}
			}
			Self::divinity => {
				let owner = ctx.get_owner(c);
				let maxhp = ctx.get_mut(owner, Stat::maxhp);
				*maxhp = cmp::min(*maxhp + 24, 500);
				ctx.dmg(owner, -16);
			}
			Self::dmgproduce => {
				ctx.spend(ctx.get_owner(c), etg::Chroma, -data.dmg);
			}
			Self::draft => {
				ctx.fx(c, Fx::Draft);
				let isborne = !ctx.get(t, Flag::airborne);
				ctx.set(t, Flag::airborne, isborne);
				if isborne {
					ctx.incrAtk(t, 3);
					ctx.rmskill(t, Event::Cast, Skill::burrow);
				} else {
					ctx.spelldmg(t, 3);
				}
			}
			Self::drainlife => {
				let owner = ctx.get_owner(c);
				let bonus = ctx.get_player(owner).quanta(etg::Darkness) as i32 / 5;
				ctx.fx(t, Fx::Bolt(bonus as u16, etg::Darkness as u8));
				let heal = ctx.spelldmg(t, 2 + bonus);
				ctx.dmg(owner, -heal);
			}
			Self::drawcopy => {
				let owner = ctx.get_owner(c);
				let town = ctx.get_owner(t);
				if owner != town {
					let inst = ctx.cloneinst(t);
					ctx.addCard(owner, inst);
					ctx.fx(inst, Fx::StartPos(-town));
				}
			}
			Self::drawequip => {
				let owner = ctx.get_owner(c);
				for p in 0..2 {
					let pl = if p == 0 { owner } else { ctx.get_foe(owner) };
					for (idx, &card) in ctx.get_player(pl).deck.iter().enumerate().rev() {
						let kind = ctx.get_card(ctx.get(card, Stat::card)).kind;
						if kind == Kind::Weapon || kind == Kind::Shield {
							if ctx.addCard(pl, card) != -1 {
								ctx.fx(card, Fx::StartPos(-pl));
								ctx.get_player_mut(pl).deck_mut().remove(idx);
								ctx.proc(Event::Draw, pl);
							}
							break;
						}
					}
				}
			}
			Self::drawpillar => {
				let owner = ctx.get_owner(c);
				if let Some(&card) = ctx.get_player(owner).deck.last() {
					if ctx.get(card, Flag::pillar) {
						ctx.drawcard(owner);
					}
				}
			}
			Self::dryspell => {
				let owner = ctx.get_owner(c);
				ctx.masscc(owner, ctx.get_foe(owner), |ctx, cr| {
					let q = -ctx.spelldmg(cr, 1);
					ctx.spend(owner, etg::Water, q);
				});
			}
			Self::dshield => {
				ctx.set(t, Flag::immaterial, true);
				ctx.addskills(t, Event::Turnstart, &[Skill::dshieldoff]);
			}
			Self::dshieldoff => {
				let owner = ctx.get_owner(c);
				if owner == t {
					ctx.set(c, Flag::immaterial, false);
					if ctx.cardset() != CardSet::Open {
						ctx.set(c, Flag::psionic, false);
					}
					ctx.rmskill(c, Event::Turnstart, Skill::dshieldoff);
				}
			}
			Self::duality => {
				let owner = ctx.get_owner(c);
				if !ctx.get_player(owner).hand_full() {
					let foe = ctx.get_foe(owner);
					let foepl = ctx.get_player(foe);
					if let Some(&card) = foepl.deck.last() {
						let inst = ctx.cloneinst(card);
						ctx.addCard(owner, inst);
						ctx.fx(inst, Fx::StartPos(c));
					}
				}
			}
			Self::earthquake => {
				ctx.fx(t, Fx::Earthquake);
				if ctx.get(t, Stat::charges) > 3 {
					ctx.incrStatus(t, Stat::charges, -3);
				} else {
					ctx.remove(t);
				}
				ctx.proc_data(Event::Destroy, t, data);
			}
			Self::eatspell => {
				if ctx.get_kind(t) == Kind::Spell
					&& ctx.get_card(ctx.get(t, Stat::card)).kind == Kind::Spell
				{
					Skill::growth(1, 1).proc(ctx, c, 0, data);
					ctx.rmskill(c, Event::Prespell, Skill::eatspell);
					data.flags |= ProcData::evade;
				}
			}
			Self::elf => {
				if data.tgt == c && data.active == Some(Skill::cseed) {
					ctx.transform(c, card::As(ctx.get(c, Stat::card), card::FallenElf));
					data.flags |= ProcData::evade;
				}
			}
			Self::embezzle => {
				ctx.fx(t, Fx::Embezzle);
				ctx.lobo(t);
				ctx.addskills(t, Event::Hit, &[Skill::forcedraw]);
				ctx.addskills(t, Event::OwnDeath, &[Skill::embezzledeath]);
			}
			Self::embezzledeath => {
				ctx.mill(ctx.get_foe(ctx.get_owner(c)), 2);
			}
			Self::empathy => {
				let owner = ctx.get_owner(c);
				let heal = ctx.count_creatures(owner);
				ctx.fx(c, Fx::Heal(heal));
				ctx.dmg(owner, -heal);
				if ctx.cardset() == CardSet::Open && !ctx.spend(owner, etg::Life, heal / 8) {
					ctx.set_quanta(owner, etg::Life, 0);
					ctx.die(c);
				}
			}
			Self::enchant => {
				ctx.fx(t, Fx::Enchant);
				ctx.set(t, Flag::immaterial, true);
			}
			Self::endow => {
				ctx.fx(t, Fx::Endow);
				ctx.incrAtk(c, ctx.trueatk(t) - ctx.trigger_pure(Event::Buff, t, 0));
				ctx.buffhp(c, 2);
				ctx.set(c, Stat::cast, ctx.get(t, Stat::cast));
				ctx.set(c, Stat::castele, ctx.get(t, Stat::castele));
				let tgt = ctx.get_thing(t);
				let tstatus = tgt.status.clone();
				{
					let newskill = tgt.skill.clone();
					let tflag = tgt.flag.0;
					let mut sader = ctx.get_thing_mut(c);
					sader.skill = newskill;
					sader.flag.0 |= tflag;
				}
				if ctx.hasskill(c, Event::Cast, Skill::endow) {
					ctx.rmskill(c, Event::Cast, Skill::endow);
				}
				for &(k, v) in tstatus.clone().iter() {
					match k {
						Stat::hp
						| Stat::maxhp
						| Stat::atk
						| Stat::card
						| Stat::castele
						| Stat::cast
						| Stat::costele
						| Stat::cost => (),
						Stat::adrenaline => ctx.set(c, k, v),
						_ => ctx.incrStatus(c, k, v),
					}
				}
			}
			Self::envenom => {
				ctx.addskills(t, Event::Shield, &[Skill::thorn(25)]);
				let thing = ctx.get_thing_mut(t);
				if let Some(hit) = thing.skill.get_mut(Event::Hit) {
					let hit = hit.to_mut();
					for sk in hit.iter_mut() {
						match sk {
							Skill::poison(ref mut x) => {
								*x = x.saturating_add(1);
								return;
							}
							_ => (),
						}
					}
					hit.push(Skill::poison(1));
				} else {
					thing
						.skill
						.insert(Event::Hit, Cow::Borrowed(&[Skill::poison(1)]))
				}
			}
			Self::epidemic => {
				ctx.poison(ctx.get_foe(ctx.get_owner(c)), ctx.get(t, Stat::poison));
			}
			Self::epoch => {
				let epoch = ctx.get_mut(c, Stat::charges);
				*epoch += 1;
				if *epoch > 1 {
					Skill::silence.proc(ctx, c, ctx.get_owner(t), data);
				}
			}
			Self::epochreset => {
				ctx.set(c, Stat::charges, 0);
			}
			Self::evade(chance) => {
				if ctx.rng_ratio(chance as u32, 100) {
					data.dmg = 0;
				}
			}
			Self::evade100 => {
				data.dmg = 0;
			}
			Self::evadecrea => {
				if data.tgt == c
					&& ctx.get_owner(c) != ctx.get_owner(t)
					&& ctx.get_kind(t) == Kind::Creature
				{
					data.flags |= ProcData::evade;
				}
			}
			Self::evadespell => {
				if data.tgt == c
					&& ctx.get_owner(c) != ctx.get_owner(t)
					&& ctx.get_kind(t) == Kind::Spell
					&& ctx.get_card(ctx.get(t, Stat::card)).kind == Kind::Spell
				{
					data.flags |= ProcData::evade;
				}
			}
			Self::evolve => {
				ctx.transform(
					c,
					card::As(
						ctx.get(c, Stat::card),
						if ctx.cardset() == CardSet::Open {
							card::Shrieker
						} else {
							card::v_Shrieker
						},
					),
				);
				ctx.set(c, Flag::burrowed, false);
			}
			Self::feed => {
				ctx.poison(t, 1);
				Skill::growth(3, 3).proc(ctx, c, 0, data);
				ctx.set(c, Flag::immaterial, false);
			}
			Self::fickle => {
				let town = ctx.get_owner(t);
				if !ctx.sanctified(town) {
					let mut cards = Vec::new();
					for (idx, &id) in ctx.get_player(town).deck.iter().enumerate() {
						if ctx.canspend(town, ctx.get(id, Stat::costele), ctx.get(id, Stat::cost)) {
							cards.push(idx);
						}
					}
					if let Some(&pick) = ctx.choose(&cards) {
						let handidx = ctx.getIndex(t) as usize;
						let pl = ctx.get_player_mut(town);
						let deckid = pl.deck[pick];
						pl.hand[handidx] = deckid;
						pl.deck_mut()[pick] = t;
						ctx.set_kind(deckid, Kind::Spell);
						ctx.set_owner(deckid, town);
					}
				}
			}
			Self::firebolt => {
				let bonus = ctx.get_player(ctx.get_owner(c)).quanta(etg::Fire) as i32 / 4;
				ctx.fx(t, Fx::Bolt(bonus as u16, etg::Fire as u8));
				ctx.spelldmg(t, 3 + bonus);
				ctx.set(t, Stat::frozen, 0);
			}
			Self::firebrand => {
				if data.tgt == c && matches!(data.active, Some(Skill::tempering(_))) {
					ctx.incrStatus(c, Stat::charges, 1);
				}
			}
			Self::firestorm(dmg) => {
				ctx.masscc(t, 0, |ctx, cr| {
					ctx.set(cr, Stat::frozen, 0);
					ctx.spelldmg(cr, dmg as i32);
				});
			}
			Self::firewall => {
				if !ctx.get(t, Flag::ranged) {
					ctx.spelldmg(t, 1);
				}
			}
			Self::flood => {
				data.flags |= ProcData::flood;
			}
			Self::flooddeath => {
				if ctx.get_kind(t) == Kind::Creature
					&& !ctx.get(t, Flag::aquatic)
					&& ctx.material(t, None)
					&& ctx.getIndex(t) > 4
				{
					ctx.die(t);
				}
			}
			Self::flyingweapon => {
				ctx.remove(t);
				ctx.set(t, Flag::airborne, true);
				ctx.addCrea(ctx.get_owner(t), t);
			}
			Self::flyself => {
				if ctx.get_kind(c) == Kind::Weapon {
					Skill::flyingweapon
				} else {
					Skill::livingweapon
				}
				.proc(ctx, c, c, data);
			}
			Self::foedraw => {
				let owner = ctx.get_owner(c);
				if !ctx.get_player(owner).hand_full() {
					let foe = ctx.get_foe(owner);
					if !ctx.get(foe, Flag::protectdeck) {
						let id = ctx.draw(foe);
						if id != 0 && ctx.addCard(owner, id) != -1 {
							ctx.fx(id, Fx::StartPos(-foe));
							ctx.proc(Event::Draw, owner);
						}
					}
				}
			}
			Self::forcedraw => {
				let town = ctx.get_owner(t);
				if !ctx.sanctified(town) {
					ctx.drawcard(town);
				}
			}
			Self::forceplay => {
				let town = ctx.get_owner(t);
				let tgting = if ctx.get_kind(t) == Kind::Spell {
					if ctx.sanctified(town) {
						return;
					}
					let card = ctx.get_card(ctx.get(t, Stat::card));
					if card.kind == Kind::Spell {
						card.skill[0].1[0].targeting(ctx.cardset())
					} else {
						None
					}
				} else {
					ctx.getSkill(t, Event::Cast)
						.first()
						.and_then(|&sk| sk.targeting(ctx.cardset()))
				};
				let realturn = ctx.turn;
				ctx.turn = town;
				if ctx.get(t, Stat::casts) < 1 {
					ctx.set(t, Stat::casts, 1);
				}
				if ctx.canactive(t) {
					if let Some(tgt) = if let Some(tgting) = tgting {
						let mut tgts = Vec::with_capacity(50 * ctx.players_ref().len());
						for &id in ctx.players_ref().iter() {
							let pl = ctx.get_player(id);
							tgts.extend(
								once(id)
									.chain(once(pl.weapon))
									.chain(once(pl.shield))
									.chain(pl.creatures.iter().cloned())
									.chain(pl.permanents.iter().cloned())
									.chain(pl.hand_iter())
									.filter(|&id| id != 0 && tgting.full_check(ctx, t, id)),
							);
						}
						ctx.choose(&tgts).cloned()
					} else {
						Some(0)
					} {
						ctx.fx(t, Fx::Forced);
						ctx.useactive(t, tgt);
					}
				}
				ctx.turn = realturn;
			}
			Self::fractal => {
				ctx.fx(t, Fx::Fractal);
				let owner = ctx.get_owner(c);
				ctx.set_quanta(owner, etg::Aether, 0);
				let copies = 8 - ctx.get_player(owner).hand_len();
				let code = ctx.get(t, Stat::card);
				for _ in 0..copies {
					let inst = ctx.new_thing(code, owner);
					ctx.fx(inst, Fx::StartPos(t));
					ctx.addCard(owner, inst);
				}
			}
			Self::freedom => {
				if ctx.get_owner(c) == ctx.get_owner(t)
					&& ctx.get_kind(t) == Kind::Creature
					&& ctx.get(t, Flag::airborne)
					&& !data.get(ProcData::freedom)
					&& ctx.rng_ratio(1, 4)
				{
					ctx.fx(t, Fx::Free);
					data.flags |= ProcData::freedom;
				}
			}
			Self::freeevade => {
				if !data.get(ProcData::evade) {
					let tgt = data.tgt;
					let tgtowner = ctx.get_owner(tgt);
					if tgt != 0
						&& tgtowner == ctx.get_owner(c)
						&& tgtowner != ctx.get_owner(t)
						&& ctx.get_kind(tgt) == Kind::Creature
						&& ctx.get(tgt, Flag::airborne)
						&& ctx.get(tgt, Stat::frozen) == 0
						&& ctx.rng_ratio(1, 5)
					{
						data.flags |= ProcData::evade;
					}
				}
			}
			Self::freeze(amt) => ctx.freeze(t, amt as i32),
			Self::freezeperm => ctx.freeze(t, 3),
			Self::fungusrebirth => {
				ctx.transform(c, card::As(ctx.get(c, Stat::card), card::Fungus));
			}
			Self::gaincharge2 | Self::v_gaincharge2 => {
				if c != t {
					ctx.incrStatus(c, Stat::charges, 2);
				}
			}
			Self::gaintimecharge => {
				if !data.get(ProcData::drawstep) && ctx.get_owner(c) == ctx.get_owner(t) {
					ctx.incrStatus(c, Stat::charges, 1);
				}
			}
			Self::gas => {
				let owner = ctx.get_owner(c);
				let gas = if ctx.cardset() == CardSet::Open {
					card::UnstableGas
				} else {
					card::v_UnstableGas
				};
				let gas = ctx.new_thing(card::As(ctx.get(c, Stat::card), gas), owner);
				ctx.addPerm(owner, gas);
			}
			Self::give => {
				let owner = ctx.get_owner(c);
				ctx.dmg(
					owner,
					if card::Upped(ctx.get(c, Stat::card)) {
						-10
					} else {
						-5
					},
				);
				let kind = ctx.get_kind(t);
				if kind != Kind::Spell && ctx.hasskill(t, Event::OwnAttack, Skill::singularity) {
					ctx.die(t);
				} else {
					ctx.remove(t);
					let foe = ctx.get_foe(owner);
					if kind == Kind::Permanent {
						ctx.addPerm(foe, t);
					} else if kind == Kind::Creature {
						ctx.addCrea(foe, t);
					} else if kind == Kind::Shield {
						ctx.setShield(foe, t);
					} else if kind == Kind::Weapon {
						ctx.setWeapon(foe, t);
					} else {
						ctx.addCard(foe, t);
					}
				}
			}
			Self::golemhit => {
				ctx.queue_attack(t, 0);
			}
			Self::gpull => Skill::gpullspell.proc(ctx, c, c, data),
			Self::gpullspell => {
				ctx.fx(t, Fx::Pull);
				if ctx.get_kind(t) == Kind::Creature {
					ctx.set(ctx.get_owner(t), Stat::gpull, t);
				} else {
					ctx.set(t, Stat::gpull, 0);
				}
			}
			Self::grave => {
				ctx.set(c, Flag::burrowed, false);
				ctx.transform(c, ctx.get(t, Stat::card));
				ctx.set(c, Flag::nocturnal, true);
			}
			Self::growth(atk, hp) => {
				ctx.incrAtk(c, atk as i32);
				ctx.buffhp(c, hp as i32);
			}
			Self::guard => {
				ctx.delay(c, 1);
				ctx.delay(t, 1);
				let tnotairborne = !ctx.get(t, Flag::airborne);
				if ctx.cardset() == CardSet::Open {
					if tnotairborne || ctx.get(c, Flag::airborne) {
						ctx.attackCreature(c, t);
					}
				} else if tnotairborne {
					ctx.dmg(t, ctx.trueatk(c));
				}
			}
			Self::halveatk => {
				let stored = (ctx.get(c, Stat::atk) + 1) / 2;
				ctx.incrStatus(c, Stat::storedpower, stored);
				ctx.incrAtk(c, -stored);
			}
			Self::hasten => {
				ctx.drawcard(ctx.get_owner(c));
			}
			Self::hatch => {
				ctx.fx(c, Fx::Hatch);
				let ccard = ctx.get(c, Stat::card);
				if let Some(rcard) = ctx.random_card(card::Upped(ccard), |ctx, card| {
					card.kind == Kind::Creature && card.code as i32 != card::AsShiny(ccard, false)
				}) {
					ctx.transform(c, card::AsShiny(rcard.code as i32, card::Shiny(ccard)));
					ctx.set(c, Stat::casts, 1);
				}
			}
			Self::heal => {
				ctx.dmg(t, -20);
			}
			Self::heatmirror => {
				let owner = ctx.get_owner(c);
				if data.get(ProcData::fromhand)
					&& ctx.get_kind(t) == Kind::Creature
					&& owner != ctx.get_owner(t)
				{
					let spark = ctx.new_thing(card::As(ctx.get(c, Stat::card), card::Spark), owner);
					ctx.fx(spark, Fx::StartPos(c));
					ctx.addCrea(owner, spark);
				}
			}
			Self::hitownertwice => {
				if !ctx.hasskill(c, Event::Turnstart, Skill::predatoroff) {
					ctx.addskills(c, Event::Turnstart, &[Skill::predatoroff]);
					let owner = ctx.get_owner(c);
					ctx.queue_attack(c, owner);
					ctx.queue_attack(c, owner);
				}
			}
			Self::holylight => {
				if card::Upped(ctx.get(c, Stat::card)) {
					ctx.spend(ctx.get_owner(c), etg::Light, -1);
				}
				if ctx.get(t, Flag::nocturnal) {
					ctx.spelldmg(t, 10);
				} else {
					ctx.dmg(t, -10);
				}
			}
			Self::icebolt => {
				let owner = ctx.get_owner(c);
				let bonus = ctx.get_player(owner).quanta(etg::Water) as i32 / 5;
				ctx.fx(t, Fx::Bolt(bonus as u16, etg::Water as u8));
				if ctx.rng_range(0..20) < 7 + bonus {
					ctx.freeze(
						t,
						if card::Upped(ctx.get(c, Stat::card)) {
							4
						} else {
							3
						},
					);
				}
				ctx.spelldmg(t, 2 + bonus);
			}
			Self::icegrowth(atk, hp) => {
				data.amt = 0;
				Skill::growth(atk, hp).proc(ctx, c, t, data);
			}
			Self::ignite => {
				ctx.die(c);
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				ctx.spelldmg(foe, 20);
				ctx.masscc(foe, owner, |ctx, cr| {
					ctx.spelldmg(cr, 1);
				});
			}
			Self::ignitediscard => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				ctx.spelldmg(foe, 5);
			}
			Self::immolate(x) => {
				ctx.die(t);
				if !ctx.hasskill(t, Event::OwnAttack, Skill::singularity)
					&& !ctx.hasskill(t, Event::OwnAttack, Skill::v_singularity)
				{
					let owner = ctx.get_owner(c);
					for e in 1..13 {
						ctx.spend(owner, e, -1);
					}
					ctx.spend(owner, etg::Fire, -(x as i32));
				}
			}
			Self::improve => {
				ctx.fx(t, Fx::Improve);
				ctx.set(t, Flag::mutant, true);
				if let Some(card) = ctx.random_card(false, |ctx, card| card.kind == Kind::Creature)
				{
					ctx.transform(t, card.code as i32);
				}
			}
			Self::inertia => {
				let tgt = data.tgt;
				if tgt != 0 {
					let owner = ctx.get_owner(c);
					if tgt != owner {
						let tgtowner = ctx.get_owner(tgt);
						if owner == tgtowner {
							ctx.spend(owner, etg::Gravity, -2);
						}
					}
				}
			}
			Self::inflation => {
				let mut tgts = Vec::with_capacity(50 * ctx.players_ref().len());
				for &id in ctx.players_ref().iter() {
					let pl = ctx.get_player(id);
					tgts.extend(
						once(pl.weapon)
							.chain(once(pl.shield))
							.chain(pl.creatures.iter().cloned())
							.chain(pl.permanents.iter().cloned())
							.filter(|&id| id != 0 && ctx.material(id, None)),
					);
				}
				for id in tgts {
					let cast = ctx.get_mut(id, Stat::cast);
					*cast = cast.saturating_add(1);
					if *cast == 1 {
						ctx.set(id, Stat::castele, etg::Chroma);
					}
				}
			}
			Self::ink => {
				let owner = ctx.get_owner(c);
				let p = ctx.new_thing(card::As(ctx.get(c, Stat::card), card::Cloak), owner);
				ctx.set(p, Stat::charges, 1);
				ctx.addPerm(owner, p);
			}
			Self::innovation => {
				let town = ctx.get_owner(t);
				if !ctx.sanctified(town) {
					ctx.die(t);
					for _ in 0..3 {
						ctx.drawcard(town);
					}
				}
				ctx.mill(ctx.get_owner(c), 1);
			}
			Self::integrity => {
				const shardSkills: [[Skill; 6]; 12] = [
					[
						Skill::deadalive,
						Skill::mutation,
						Skill::paradox,
						Skill::improve,
						Skill::improve,
						Skill::antimatter,
					],
					[
						Skill::poison(1),
						Skill::poison(1),
						Skill::poison(2),
						Skill::poison(3),
						Skill::aflatoxin,
						Skill::aflatoxin,
					],
					[
						Skill::devour,
						Skill::devour,
						Skill::devour,
						Skill::devour,
						Skill::devour,
						Skill::blackhole,
					],
					[
						Skill::burrow,
						Skill::stoneform,
						Skill::guard,
						Skill::guard,
						Skill::bblood,
						Skill::throwrock,
					],
					[
						Skill::growth(2, 2),
						Skill::adrenaline,
						Skill::adrenaline,
						Skill::adrenaline,
						Skill::adrenaline,
						Skill::mitosis,
					],
					[
						Skill::growth(1, 0),
						Skill::growth(2, 0),
						Skill::tempering(5),
						Skill::destroy,
						Skill::destroy,
						Skill::rage,
					],
					[
						Skill::steam,
						Skill::steam,
						Skill::freeze(4),
						Skill::freeze(5),
						Skill::nymph,
						Skill::nymph,
					],
					[
						Skill::mend,
						Skill::endow,
						Skill::endow,
						Skill::luciferin,
						Skill::luciferin,
						Skill::reinforce,
					],
					[
						Skill::summon(5908),
						Skill::summon(5908),
						Skill::snipe,
						Skill::dive,
						Skill::gas,
						Skill::gas,
					],
					[
						Skill::summon(6010),
						Skill::summon(6010),
						Skill::deja,
						Skill::deja,
						Skill::precognition,
						Skill::precognition,
					],
					[
						Skill::siphonstrength,
						Skill::siphonstrength,
						Skill::yoink,
						Skill::liquid,
						Skill::liquid,
						Skill::steal,
					],
					[
						Skill::lobotomize,
						Skill::lobotomize,
						Skill::lobotomize,
						Skill::quint,
						Skill::quinttog,
						Skill::wisdom,
					],
				];
				const ShardStats: [&[(u8, Soya)]; 12] = [
					&[(3, Soya::Skill(Event::Hit, [Skill::scramble]))],
					&[
						(1, Soya::Skill(Event::Death, [Skill::growth(1, 1)])),
						(1, Soya::Flag(Flag::nocturnal)),
						(2, Soya::Skill(Event::Hit, [Skill::poison(1)])),
					],
					&[(2, Soya::Flag(Flag::momentum))],
					&[],
					&[
						(1, Soya::Flag(Flag::poisonous)),
						(2, Soya::Stat(Stat::adrenaline, 1)),
						(4, Soya::Skill(Event::OwnAttack, [Skill::regenerate(5)])),
					],
					&[(1, Soya::Skill(Event::Buff, [Skill::fiery]))],
					&[
						(1, Soya::Flag(Flag::aquatic)),
						(3, Soya::Skill(Event::Hit, [Skill::regen])),
					],
					&[
						(
							1,
							Soya::Skill(Event::OwnAttack, [Skill::quanta(etg::Light as i8)]),
						),
						(2, Soya::Skill(Event::Blocked, [Skill::virtue])),
						(3, Soya::Skill(Event::OwnDmg, [Skill::martyr])),
						(4, Soya::Skill(Event::OwnFreeze, [Skill::growth(2, 2)])),
						(5, Soya::Skill(Event::Hit, [Skill::disarm])),
						(6, Soya::Skill(Event::OwnAttack, [Skill::sanctify])),
					],
					&[(1, Soya::Flag(Flag::airborne))],
					&[(2, Soya::Skill(Event::Hit, [Skill::neuro]))],
					&[
						(1, Soya::Flag(Flag::nocturnal)),
						(1, Soya::Flag(Flag::voodoo)),
						(2, Soya::Skill(Event::OwnAttack, [Skill::siphon])),
						(3, Soya::Skill(Event::Hit, [Skill::vampire])),
						(4, Soya::Skill(Event::Hit, [Skill::reducemaxhp])),
						(5, Soya::Skill(Event::Destroy, [Skill::loot])),
						(6, Soya::Skill(Event::OwnDeath, [Skill::catlife])),
						(6, Soya::Stat(Stat::lives, 69105)),
					],
					&[(3, Soya::Flag(Flag::immaterial))],
				];
				let mut tally = [0u8; 12];
				tally[etg::Earth as usize - 1] = 1;
				let mut stat2 = 2;
				let owner = ctx.get_owner(c);
				let mut idx = 0;
				let mut len = ctx.get_player(owner).hand_len();
				while idx < len {
					let code = ctx.get(ctx.get_player(owner).hand[idx], Stat::card);
					if etg::ShardList[1..]
						.iter()
						.any(|&shard| card::IsOf(code, shard as i32))
					{
						let card = ctx.get_card(code);
						tally[card.element as usize - 1] += 1;
						stat2 += if card::Upped(code) { 4 } else { 3 };
						ctx.get_player_mut(owner).hand_remove(idx);
						len -= 1;
					} else {
						idx += 1;
					}
				}
				let mut shmax = 0;
				let mut shidx = 0;
				let mut shlen = 0;
				for (idx, &count) in tally.iter().enumerate() {
					let count = count as usize;
					if count > shmax {
						shmax = count;
						shidx = idx;
						shlen = 1;
					} else if count != 0 && count == shmax {
						shlen += 1;
						if (ctx.rng_ratio(1, shlen)) {
							shidx = idx;
						}
					}
				}
				shmax = cmp::min(shmax - 1, 5);
				let soicode = ctx.get(c, Stat::card);
				let active = match shardSkills[shidx][shmax..=shmax] {
					[Skill::summon(code)] => Cow::from(vec![Skill::summon(card::AsUpped(
						code as i32,
						card::Upped(soicode as i32),
					) as u16)]),
					ref x => Cow::from(x),
				};
				let activecost = match active[0] {
					Skill::burrow => 1,
					Skill::stoneform => 1,
					Skill::guard => 1,
					Skill::bblood => 2,
					Skill::throwrock => 2,
					Skill::deadalive => 1,
					Skill::mutation => 2,
					Skill::paradox => 2,
					Skill::improve => 2,
					Skill::antimatter => 3,
					Skill::poison(_) => 1,
					Skill::aflatoxin => 2,
					Skill::devour => 3,
					Skill::blackhole => 3,
					Skill::growth(2, 2) => 2,
					Skill::adrenaline => 2,
					Skill::mitosis => 3,
					Skill::growth(1, 0) => 1,
					Skill::growth(2, 0) => 2,
					Skill::tempering(_) => 2,
					Skill::destroy => 3,
					Skill::rage => 2,
					Skill::steam => 2,
					Skill::freeze(_) => 2,
					Skill::nymph => 3,
					Skill::mend => 1,
					Skill::endow => 2,
					Skill::luciferin => 3,
					Skill::reinforce => 3,
					Skill::summon(_) => 2,
					Skill::snipe => 2,
					Skill::dive => 2,
					Skill::gas => 2,
					Skill::deja => 4,
					Skill::precognition => 2,
					Skill::siphonstrength => 2,
					Skill::yoink => 2,
					Skill::liquid => 2,
					Skill::steal => 3,
					Skill::lobotomize => 2,
					Skill::quint => 2,
					Skill::quinttog => 2,
					Skill::wisdom => 2,
					_ => 0,
				};
				let mut shardgolem = ThingData::default();
				shardgolem.flag.0 |= Flag::golem;
				shardgolem.status.insert(Stat::atk, stat2 / 2);
				shardgolem.status.insert(Stat::maxhp, stat2 / 2);
				shardgolem.status.insert(Stat::hp, stat2 / 2);
				shardgolem.status.insert(Stat::castele, etg::Earth);
				shardgolem.status.insert(Stat::cast, activecost);
				shardgolem.skill.insert(Event::Cast, active);
				for idx in 0..ShardStats.len() {
					let count = tally[idx];
					for &(n, ref soya) in ShardStats[idx].iter() {
						if count < n {
							break;
						}
						match soya {
							&Soya::Flag(flag) => {
								shardgolem.flag.0 |= flag;
							}
							&Soya::Stat(stat, val) => {
								shardgolem.status.insert(stat, val);
							}
							&Soya::Skill(ev, ref sk) => match shardgolem.skill.entry(ev) {
								SkillsEntry::Occupied(o) => {
									o.into_mut().to_mut().extend_from_slice(sk);
								}
								SkillsEntry::Vacant(v) => {
									v.insert(Cow::from(&sk[..]));
								}
							},
						}
					}
				}
				let golemcode = card::As(soicode, card::ShardGolem);
				let golemcard = ctx.get_card(golemcode);
				shardgolem.status.insert(Stat::card, golemcode);
				shardgolem.status.insert(Stat::cost, golemcard.cost as i32);
				shardgolem.status.insert(Stat::costele, etg::Earth);
				let golemid = ctx.new_id(Entity::Thing(Rc::new(shardgolem)));
				ctx.set(owner, Stat::shardgolem, golemid);
				let inst = ctx.new_thing(golemcode, owner);
				ctx.addCreaCore(owner, inst, true);
			}
			Self::jelly => {
				let code = ctx.get(t, Stat::card);
				let card = ctx.get_card(code);
				ctx.transform(t, card::As(code, card::PinkJelly));
				ctx.set(t, Stat::castele, card.element as i32);
				ctx.set(
					t,
					Stat::cast,
					if card.element == etg::Chroma as i8 {
						12
					} else {
						4
					},
				);
				ctx.set(t, Stat::atk, 7);
				ctx.set(t, Stat::maxhp, 4);
				ctx.set(t, Stat::hp, 4);
			}
			Self::jetstream => {
				if ctx.get(t, Flag::airborne) {
					ctx.dmg(t, 1);
					ctx.incrAtk(t, 3);
				} else {
					ctx.set(t, Flag::airborne, true);
				}
			}
			Self::lightning => {
				ctx.fx(t, Fx::Lightning);
				ctx.spelldmg(t, 5);
			}
			Self::liquid => {
				ctx.fx(t, Fx::Liquid);
				ctx.lobo(t);
				ctx.setSkill(t, Event::Hit, &[Skill::vampire]);
				ctx.poison(t, 1);
			}
			Self::livingweapon => {
				let town = ctx.get_owner(t);
				let weapon = ctx.get_weapon(town);
				if weapon != 0 {
					ctx.unsummon(weapon);
				}
				ctx.dmg(town, -ctx.truehp(t));
				ctx.remove(t);
				ctx.setWeapon(town, t);
			}
			Self::lobotomize => {
				ctx.fx(t, Fx::Sfx(Sfx::lobo));
				ctx.fx(t, Fx::Lobotomize);
				ctx.lobo(t);
				if ctx.cardset() == CardSet::Open {
					ctx.set(t, Flag::psionic, false);
				} else {
					ctx.get_thing_mut(t).flag.0 &= !(Flag::momentum | Flag::psionic | Flag::mutant);
					ctx.set(t, Stat::casts, 0);
				}
			}
			Self::locket => {
				if ctx.get(c, Stat::frozen) == 0 {
					let mode = ctx.get(c, Stat::mode);
					let owner = ctx.get_owner(c);
					ctx.spend(
						owner,
						if mode != -1 {
							mode
						} else {
							ctx.get_player(owner).mark
						},
						-1,
					);
				}
			}
			Self::locketshift => {
				ctx.set(
					c,
					Stat::mode,
					if ctx.get_kind(t) == Kind::Player {
						ctx.get_player(t).mark
					} else {
						ctx.get_card(ctx.get(t, Stat::card)).element as i32
					},
				);
			}
			Self::loot => {
				let owner = ctx.get_owner(c);
				if owner == ctx.get_owner(t)
					&& !ctx.hasskill(c, Event::Turnstart, Skill::salvageoff)
				{
					let foe = ctx.get_foe(owner);
					let mut candidates = Vec::with_capacity(18);
					let pl = ctx.get_player(foe);
					candidates.extend(
						once(pl.weapon)
							.chain(once(pl.shield))
							.chain(pl.permanents.iter().cloned())
							.filter(|&pr| pr != 0 && ctx.material(pr, None)),
					);
					if let Some(&pr) = ctx.choose(&candidates) {
						ctx.fx(c, Fx::Looted);
						Skill::steal.proc(ctx, c, pr, data);
						ctx.addskills(c, Event::Turnstart, &[Skill::salvageoff]);
					}
				}
			}
			Self::losecharge => {
				if ctx.maybeDecrStatus(c, Stat::charges) == 0 {
					if ctx.get_kind(c) == Kind::Creature {
						ctx.die(c);
					} else {
						ctx.remove(c);
					}
				}
			}
			Self::luciferin => {
				let owner = ctx.get_owner(c);
				ctx.dmg(owner, -10);
				for &cr in ctx.get_player(owner).creatures.clone().iter() {
					if cr != 0 {
						let thing = ctx.get_thing(cr);
						if thing.skill.iter().all(|(k, v)| {
							k == Event::OwnPlay
								|| k == Event::OwnDiscard || v.iter().all(|&sk| sk.passive())
						}) {
							ctx.addskills(cr, Event::OwnAttack, &[Skill::quanta(etg::Light as i8)]);
						}
					}
				}
			}
			Self::lycanthropy => {
				ctx.buffhp(c, 5);
				ctx.incrAtk(c, 5);
				ctx.get_thing_mut(c).skill.remove(Event::Cast);
				if ctx.cardset() == CardSet::Open {
					ctx.set(c, Flag::nocturnal, true);
				}
			}
			Self::martyr => {
				if data.dmg > 0 {
					ctx.incrAtk(c, data.dmg);
				} else {
					let owner = ctx.get_owner(c);
					ctx.dmg(owner, data.amt);
				}
			}
			Self::mend => {
				ctx.dmg(
					t,
					if ctx.cardset() == CardSet::Open {
						-10
					} else {
						-5
					},
				);
			}
			Self::metamorph => {
				let owner = ctx.get_owner(c);
				let newmark = if ctx.get_kind(t) == Kind::Player {
					ctx.get_player(t).mark
				} else {
					ctx.get_card(ctx.get(t, Stat::card)).element as i32
				};
				let mut pl = ctx.get_player_mut(owner);
				pl.mark = newmark;
				pl.markpower = pl.markpower.saturating_add(1);
			}
			Self::midas => {
				let reliccard = card::As(ctx.get(t, Stat::card), card::GoldenRelic);
				if ctx.get(t, Flag::stackable) && ctx.get(t, Stat::charges) > 1 {
					ctx.destroy(t, None);
					let town = ctx.get_owner(t);
					let relic = ctx.new_thing(reliccard, town);
					ctx.set(relic, Stat::casts, ctx.get(t, Stat::casts));
					ctx.addPerm(town, relic);
				} else {
					ctx.clearStatus(t);
					ctx.transform(t, reliccard);
					ctx.set(t, Stat::maxhp, 1);
					ctx.set(t, Stat::hp, 1);
					ctx.set(t, Stat::atk, 1);
				}
			}
			Self::mill => {
				ctx.mill(t, 1);
			}
			Self::millpillar => {
				if let Some(&card) = ctx.get_player(t).deck.last() {
					if ctx.get(card, Flag::pillar) {
						ctx.draw(t);
					}
				}
			}
			Self::mimic => {
				if c != t && ctx.get_kind(t) == Kind::Creature {
					ctx.transform(c, ctx.get(t, Stat::card));
					ctx.addskills(c, Event::Play, &[Skill::mimic]);
				}
			}
			Self::miracle => {
				let owner = ctx.get_owner(c);
				ctx.set_quanta(owner, etg::Light, 0);
				if ctx.get(owner, Stat::sosa) == 0 {
					ctx.set(owner, Stat::hp, ctx.get(owner, Stat::maxhp) - 1);
				} else {
					ctx.set(owner, Stat::hp, 1);
				}
			}
			Self::mitosis => {
				let owner = ctx.get_owner(c);
				let child = ctx.new_thing(ctx.get(c, Stat::card), owner);
				ctx.fx(child, Fx::StartPos(c));
				ctx.play(child, c, false);
			}
			Self::mitosisspell => {
				ctx.lobo(t);
				let costele = ctx.get(t, Stat::costele);
				let cost = ctx.get(t, Stat::cost);
				ctx.setSkill(t, Event::Cast, &[Skill::mitosis]);
				ctx.set(t, Stat::castele, costele);
				ctx.set(t, Stat::cast, cost);
				if ctx.cardset() == CardSet::Open {
					ctx.buffhp(t, 1);
				}
			}
			Self::momentum => {
				ctx.fx(t, Fx::Momentum);
				ctx.incrAtk(t, 1);
				ctx.buffhp(t, 1);
				ctx.set(t, Flag::momentum, true);
			}
			Self::mummy => {
				if data.tgt == c && data.active == Some(Self::rewind) {
					ctx.transform(c, card::As(ctx.get(c, Stat::card), card::Pharaoh));
					data.flags |= ProcData::evade;
				}
			}
			Self::mutant => {
				if !ctx.o_mutantactive(c) {
					ctx.setSkill(c, Event::Cast, &[Skill::web]);
					let cast = ctx.rng_range(1..=2);
					ctx.set(c, Stat::cast, cast);
				}
				let castele = ctx.rng_range(1..=12);
				ctx.set(c, Stat::castele, castele);
				ctx.set(c, Flag::mutant, true);
			}
			Self::mutation => {
				let r = ctx.rng();
				if r < 0.1 {
					ctx.fx(c, Fx::Oops);
					ctx.die(t);
				} else if r < 0.5 {
					Skill::improve.proc(ctx, c, t, data);
				} else {
					ctx.fx(c, Fx::Abomination);
					ctx.transform(t, card::Abomination);
				}
			}
			Self::neuro => {
				if throttle(ctx, data, c) {
					ctx.poison(t, 1);
					if ctx.cardset() == CardSet::Open || ctx.get_kind(t) == Kind::Player {
						ctx.set(t, Flag::neuro, true);
					}
				}
			}
			Self::neuroify => {
				let poison = ctx.get(t, Stat::poison);
				if poison > 0 {
					ctx.set(t, Flag::neuro, true);
				} else {
					ctx.set(t, Stat::poison, 0);
				}
			}
			Self::nightmare => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				if !ctx.sanctified(foe) {
					ctx.fx(t, Fx::Nightmare);
					let card = ctx.get(t, Stat::card);
					let copies = 8 - ctx.get_player(foe).hand_len() as i32;
					let dmg = if ctx.cardset() == CardSet::Open {
						ctx.spelldmg(foe, copies * if card::Upped(card) { 2 } else { 1 })
					} else {
						ctx.dmg(foe, copies * 2)
					};
					ctx.dmg(owner, -dmg);
					for _ in 0..copies {
						let inst = ctx.new_thing(card, foe);
						ctx.fx(inst, Fx::StartPos(t));
						ctx.addCard(foe, inst);
					}
				}
			}
			Self::nightshade => {
				Skill::lycanthropy.proc(ctx, t, 0, data);
			}
			Self::noeatspell => {
				if t == ctx.get_owner(c) {
					ctx.rmskill(c, Event::Prespell, Skill::eatspell);
				}
			}
			Self::nothrottle => {
				if t == ctx.get_owner(c) {
					data.flags |= ProcData::nothrottle;
				}
			}
			Self::nova => {
				let owner = ctx.get_owner(c);
				for i in 1..13 {
					ctx.spend(owner, i, -1);
				}
				ctx.incrStatus(owner, Stat::nova, 1);
				if ctx.get(owner, Stat::nova) >= 3 {
					let shiny = card::Shiny(ctx.get(c, Stat::card));
					let singu = if ctx.cardset() == CardSet::Open {
						card::Singularity
					} else {
						card::v_Singularity
					};
					ctx.transform(c, card::AsShiny(singu, shiny));
					ctx.addCrea(owner, c);
				}
			}
			Self::nova2 => {
				let owner = ctx.get_owner(c);
				for i in 1..13 {
					ctx.spend(owner, i, -2);
				}
				ctx.incrStatus(owner, Stat::nova2, 1);
				if ctx.get(owner, Stat::nova2) >= 2 {
					let shiny = card::Shiny(ctx.get(c, Stat::card));
					let singu = if ctx.cardset() == CardSet::Open {
						card::Singularity
					} else {
						card::v_Singularity
					};
					ctx.transform(c, card::AsShiny(card::AsUpped(singu, true), shiny));
					ctx.addCrea(owner, c);
				}
			}
			Self::nullspell => {
				if !ctx.hasskill(c, Event::Prespell, Skill::eatspell) {
					ctx.fx(c, Fx::Nullspell);
					ctx.addskills(c, Event::Prespell, &[Skill::eatspell]);
					ctx.addskills(c, Event::Turnstart, &[Skill::noeatspell]);
				}
			}
			Self::nymph => {
				ctx.fx(t, Fx::Nymph);
				let code = ctx.get(t, Stat::card);
				let card = ctx.get_card(code);
				let nymphcode = etg::NymphList[if card.element as i32 == etg::Chroma {
					match ctx.getSkill(t, Event::OwnAttack) {
						&[Skill::quadpillar(eles)] => {
							((eles >> (ctx.rng_range(0..4) << 2)) & 15) as usize
						}
						_ => ctx.rng_range(1..=12),
					}
				} else {
					card.element as usize
				}];
				let town = ctx.get_owner(t);
				let nymph = ctx.new_thing(card::As(code, nymphcode as i32), town);
				ctx.fx(nymph, Fx::StartPos(t));
				ctx.addCrea(town, nymph);
				ctx.destroy(t, None);
			}
			Self::obsession => {
				ctx.spelldmg(
					ctx.get_owner(c),
					if card::Upped(ctx.get(c, Stat::card)) {
						13
					} else {
						10
					},
				);
			}
			Self::ouija => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				if !ctx.sanctified(foe) && !ctx.get_player(foe).hand_full() {
					let inst = ctx.new_thing(card::OuijaEssence, foe);
					ctx.fx(inst, Fx::StartPos(c));
					ctx.addCard(foe, inst);
				}
			}
			Self::ouijadestroy => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				let maxhp = ctx.get_mut(foe, Stat::maxhp);
				*maxhp = cmp::min(*maxhp + 1, 500);
			}
			Self::ouijagrowth => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				let inst = ctx.new_thing(card::OuijaEssence, foe);
				ctx.fx(inst, Fx::StartPos(c));
				ctx.addPerm(foe, inst);
			}
			Self::pacify => {
				ctx.incrAtk(t, -ctx.trueatk(t));
			}
			Self::pairproduce => {
				for &pr in ctx.get_player(ctx.get_owner(c)).permanents.clone().iter() {
					if pr != 0 && ctx.get(pr, Flag::pillar) {
						ctx.trigger(Event::OwnAttack, pr, 0);
					}
				}
			}
			Self::paleomagnetism => {
				let owner = ctx.get_owner(c);
				let roll = ctx.rng_ratio(2, 3);
				let e = ctx
					.get_player(if roll { owner } else { ctx.get_foe(owner) })
					.mark;
				if let Some(newcard) = ctx.random_card(false, |ctx, card| {
					card.element as i32 == e && card.rarity != -1 && (card.flag & Flag::pillar) != 0
				}) {
					let inst =
						ctx.new_thing(card::As(ctx.get(c, Stat::card), newcard.code as i32), owner);
					ctx.fx(inst, Fx::StartPos(c));
					ctx.addPerm(owner, inst);
				}
			}
			Self::pandemonium => {
				let owner = ctx.get_owner(c);
				ctx.masscc(ctx.get_foe(owner), owner, |ctx, cr| {
					Skill::cseed.proc(ctx, c, cr, &mut ProcData::default());
				});
			}
			Self::pandemonium2 => {
				ctx.masscc(t, 0, |ctx, cr| {
					Skill::cseed.proc(ctx, c, cr, &mut ProcData::default());
				});
			}
			Self::pandemonium3 => {
				let mut ids = Vec::new();
				for &pid in ctx.players_ref() {
					let pl = ctx.get_player(pid);
					ids.extend(
						once(pid)
							.chain(once(pl.weapon))
							.chain(once(pl.shield))
							.chain(pl.creatures.clone().iter().cloned())
							.chain(pl.permanents.clone().iter().cloned())
							.chain(pl.hand_iter())
							.filter(|&id| id != 0),
					);
				}
				ctx.shuffle(&mut ids[..]);
				for &id in ids.iter() {
					if ctx.getIndex(id) != -1 {
						if ctx.get(id, Flag::cloak) {
							ctx.die(id);
						} else {
							Skill::cseed2.proc(ctx, c, id, data);
						}
					}
				}
			}
			Self::paradox => {
				ctx.fx(t, Fx::Paradox);
				ctx.die(t);
			}
			Self::parallel => {
				ctx.fx(t, Fx::Parallel);
				let is_open = ctx.cardset() == CardSet::Open;
				if card::IsOf(
					ctx.get(t, Stat::card),
					if is_open {
						card::Chimera
					} else {
						card::v_Chimera
					},
				) {
					return Skill::chimera.proc(ctx, c, t, data);
				}
				let clone = ctx.cloneinst(t);
				let owner = ctx.get_owner(c);
				ctx.fx(clone, Fx::StartPos(t));
				ctx.addCrea(owner, clone);
				if ctx.get(clone, Flag::mutant) {
					let buff = ctx.rng_range(0..25);
					ctx.buffhp(clone, buff / 5);
					ctx.incrAtk(clone, buff % 5);
					if is_open {
						ctx.o_mutantactive(clone);
					} else {
						ctx.v_mutantactive(clone);
					}
				}
				if !is_open {
					ctx.set(clone, Stat::casts, 0);
				}
				if ctx.get(clone, Flag::voodoo) {
					let foe = ctx.get_foe(owner);
					ctx.dmg(foe, ctx.get(clone, Stat::maxhp) - ctx.get(clone, Stat::hp));
					if is_open {
						ctx.poison(foe, ctx.get(clone, Stat::poison));
						let foeweapon = ctx.get_player(foe).weapon;
						if foeweapon != 0 {
							ctx.delay(foeweapon, ctx.get(clone, Stat::delayed));
							ctx.freeze(foeweapon, ctx.get(clone, Stat::frozen));
						}
					}
				}
			}
			Self::patience => {
				if !data.get(ProcData::patience)
					&& ctx.get_kind(t) == Kind::Creature
					&& data.get(ProcData::attackphase)
					&& ctx.get_owner(c) == ctx.get_owner(t)
					&& ctx.get(c, Stat::frozen) == 0
				{
					let floodbuff = data.get(ProcData::flood) && ctx.getIndex(t) > 4;
					ctx.incrAtk(
						t,
						if floodbuff {
							5
						} else if ctx.get(t, Flag::burrowed) {
							4
						} else {
							2
						},
					);
					ctx.buffhp(t, if floodbuff { 2 } else { 1 });
					data.flags |= ProcData::stasis | ProcData::patience;
				}
			}
			Self::pend => {
				let pendstate = ctx.get(c, Flag::pendstate);
				let owner = ctx.get_owner(c);
				let ele = if pendstate {
					ctx.get_player(owner).mark
				} else {
					ctx.get_card(ctx.get(c, Stat::card)).element as i32
				};
				ctx.spend(
					owner,
					ele,
					ctx.get(c, Stat::charges) * if ele == etg::Chroma { -3 } else { -1 },
				);
				ctx.set(c, Flag::pendstate, !pendstate);
			}
			Self::phoenix => {
				let index = data.index;
				let owner = ctx.get_owner(c);
				if ctx.get_player(owner).creatures[index as usize] == 0 {
					let ash = ctx.new_thing(
						card::As(
							ctx.get(c, Stat::card),
							if ctx.cardset() == CardSet::Open {
								card::Ash
							} else {
								card::v_Ash
							},
						),
						owner,
					);
					ctx.setCrea(owner, index as i32, ash);
				}
			}
			Self::photosynthesis => {
				ctx.fx(c, Fx::Quanta(2, etg::Life as u8));
				ctx.spend(ctx.get_owner(c), etg::Life, -2);
				if ctx.get(c, Stat::castele) != etg::Chroma || ctx.get(c, Stat::cast) > 1 {
					ctx.set(c, Stat::casts, 1);
				}
			}
			Self::pillar => pillarcore(ctx, c, ctx.get(c, Stat::charges)),
			Self::pillar1 => pillarcore(ctx, c, 1),
			Self::plague => {
				ctx.masscc(t, 0, |ctx, cr| {
					ctx.poison(cr, 1);
				});
			}
			Self::platearmor(x) => {
				ctx.buffhp(t, x as i32);
			}
			Self::poison(amt) => {
				if throttle(ctx, data, c) {
					ctx.poison(t, amt as i32);
				}
			}
			Self::poisonfoe(amt) => {
				ctx.poison(ctx.get_foe(ctx.get_owner(c)), amt as i32);
			}
			Self::powerdrain => {
				let halfhp = (ctx.truehp(t) + 1) / 2;
				let halfatk = (ctx.trueatk(t) + 1) / 2;
				ctx.dmg(t, halfhp);
				ctx.incrAtk(t, -halfatk);
				let owner = ctx.get_owner(c);
				let candidates = ctx
					.get_player(owner)
					.creatures
					.iter()
					.map(|&cr| (cr != 0) as u32)
					.sum();
				if candidates > 0 {
					let mut candidate = ctx.rng_range(0..candidates);
					for &cr in ctx.get_player(owner).creatures.iter() {
						if cr != 0 {
							if candidate == 0 {
								ctx.buffhp(cr, halfhp);
								ctx.incrAtk(cr, halfatk);
								break;
							} else {
								candidate -= 1;
							}
						}
					}
				} else if owner == ctx.get_owner(t) {
					ctx.buffhp(t, halfhp);
					ctx.incrAtk(t, halfatk);
				}
			}
			Self::precognition => {
				let owner = ctx.get_owner(c);
				ctx.drawcard(owner);
				ctx.set(owner, Flag::precognition, true);
			}
			Self::predator => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				if ctx.get_player(foe).hand_len() > 4
					&& !ctx.hasskill(c, Event::Turnstart, Skill::predatoroff)
				{
					ctx.addskills(c, Event::Turnstart, &[Skill::predatoroff]);
					ctx.queue_attack(c, 0);
					if !ctx.sanctified(foe) {
						if let Some(card) = ctx.get_player(foe).hand_last() {
							ctx.die(card);
						}
					}
				}
			}
			Self::predatoroff => {
				ctx.rmskill(c, Event::Turnstart, Skill::predatoroff);
			}
			Self::protectall => {
				let pl = ctx.get_player(ctx.get_owner(c));
				for pr in once(pl.weapon)
					.chain(once(pl.shield))
					.chain(pl.creatures.clone().iter().cloned())
					.chain(pl.permanents.clone().iter().cloned())
				{
					if pr != 0 {
						ctx.addskills(pr, Event::Prespell, &[Skill::protectonce]);
						ctx.addskills(pr, Event::Spelldmg, &[Skill::protectoncedmg]);
					}
				}
			}
			Self::protectonce => {
				if data.tgt == c && ctx.get_owner(c) != ctx.get_owner(t) {
					ctx.rmskill(c, Event::Prespell, Skill::protectonce);
					ctx.rmskill(c, Event::Spelldmg, Skill::protectoncedmg);
					data.flags |= ProcData::evade;
				}
			}
			Self::protectoncedmg => {
				ctx.rmskill(c, Event::Prespell, Skill::protectonce);
				ctx.rmskill(c, Event::Spelldmg, Skill::protectoncedmg);
				data.flags |= ProcData::evade;
			}
			Self::purify => {
				let thing = ctx.get_thing_mut(t);
				let poison = thing.status.entry(Stat::poison).or_insert(0);
				if *poison < 0 {
					*poison = poison.saturating_sub(2);
				} else {
					*poison = -2;
				}
				thing.flag.0 &= !(Flag::aflatoxin | Flag::neuro);
				if let Some(val) = thing.status.get_mut(Stat::sosa) {
					*val = 0;
				}
			}
			Self::quadpillar(eles) => quadpillarcore(ctx, eles, c, ctx.get(c, Stat::charges)),
			Self::quadpillar1(eles) => quadpillarcore(ctx, eles, c, 1),
			Self::quanta(e) => {
				ctx.fx(c, Fx::Quanta(1, e as u8));
				ctx.spend(ctx.get_owner(c), e as i32, -1);
			}
			Self::quantagift => {
				let owner = ctx.get_owner(c);
				let mark = ctx.get_player(owner).mark;
				if mark == etg::Water {
					ctx.spend(owner, etg::Water, -3);
				} else {
					ctx.spend(owner, mark, if mark == 0 { -6 } else { -2 });
					ctx.spend(owner, etg::Water, -2);
				}
			}
			Self::quint => {
				ctx.fx(t, Fx::Quintessence);
				ctx.set(t, Flag::immaterial, true);
				ctx.set(t, Stat::frozen, 0);
			}
			Self::quinttog => {
				if !ctx.get(t, Flag::immaterial) {
					return Skill::quint.proc(ctx, c, t, data);
				} else {
					ctx.fx(t, Fx::Materialize);
					ctx.set(t, Flag::immaterial, false);
				}
			}
			Self::r#static => {
				ctx.spelldmg(ctx.get_foe(ctx.get_owner(c)), 2);
			}
			Self::rage => {
				let dmg = if card::Upped(ctx.get(c, Stat::card)) {
					6
				} else {
					5
				};
				ctx.incrAtk(t, dmg);
				ctx.spelldmg(t, dmg);
				if ctx.cardset() == CardSet::Open {
					ctx.set(t, Stat::frozen, 0);
				}
			}
			Self::randomdr => {
				let dr = ctx.rng_range(
					0..if card::Upped(ctx.get(c, Stat::card)) {
						4
					} else {
						3
					},
				);
				ctx.set(c, Stat::hp, dr);
				ctx.set(c, Stat::maxhp, dr);
			}
			Self::readiness => {
				ctx.fx(t, Fx::Ready);
				ctx.set(t, Stat::cast, 0);
				ctx.set(t, Stat::casts, 1);
			}
			Self::reap => {
				let atk = ctx.trueatk(t);
				let hp = ctx.truehp(t);
				let idx = ctx.getIndex(t);
				let card = ctx.get(t, Stat::card);
				ctx.die(t);
				let town = ctx.get_owner(t);
				if ctx.get_player(town).creatures[idx as usize] == 0 {
					let skele = ctx.new_thing(card::As(card, card::Skeleton), town);
					ctx.set(skele, Stat::atk, atk);
					ctx.set(skele, Stat::maxhp, hp);
					ctx.set(skele, Stat::hp, hp);
					ctx.setCrea(town, idx, skele);
					ctx.fx(skele, Fx::Sfx(Sfx::skelify));
				}
			}
			Self::rebirth => {
				ctx.transform(
					c,
					card::As(
						ctx.get(c, Stat::card),
						if ctx.cardset() == CardSet::Open {
							card::Phoenix
						} else {
							card::v_Phoenix
						},
					),
				);
			}
			Self::reducemaxhp => {
				let dmg = data.dmg;
				let maxhp = ctx.get_mut(t, Stat::maxhp);
				*maxhp = cmp::max(*maxhp - dmg, 1);
				let maxhp = *maxhp;
				if maxhp > 500 && ctx.get_kind(t) == Kind::Player {
					ctx.set(t, Stat::maxhp, 500);
				}
				let hp = ctx.get_mut(t, Stat::hp);
				if *hp > maxhp {
					*hp = maxhp;
				}
			}
			Self::regen => {
				if throttle(ctx, data, c) {
					ctx.incrStatus(ctx.get_owner(c), Stat::poison, -1);
				}
			}
			Self::regenerate(amt) => {
				if ctx.cardset() == CardSet::Open || ctx.get(c, Stat::delayed) == 0 {
					ctx.fx(t, Fx::Heal(amt as i32));
					ctx.dmg(ctx.get_owner(c), -(amt as i32));
				}
			}
			Self::regeneratespell => {
				ctx.lobo(t);
				ctx.addskills(t, Event::OwnAttack, &[Skill::regenerate(5)]);
				if ctx.get_kind(t) <= Kind::Permanent {
					ctx.clearStatus(t);
				}
			}
			Self::regrade => {
				let code = ctx.get(t, Stat::card);
				let recode = card::AsUpped(code, !card::Upped(code));
				ctx.transform(t, recode);
				ctx.spend(ctx.get_owner(c), ctx.get_card(recode).element as i32, -1);
			}
			Self::reinforce => {
				ctx.fx(c, Fx::EndPos(t));
				let hp = ctx.truehp(c);
				let atk = ctx.trueatk(c);
				ctx.buffhp(t, hp);
				ctx.incrAtk(t, atk);
				ctx.remove(c);
			}
			Self::ren => {
				if !ctx.hasskill(t, Event::Predeath, Skill::bounce) {
					ctx.fx(t, Fx::Ren);
					ctx.addskills(t, Event::Predeath, &[Skill::bounce]);
				}
			}
			Self::resummon => {
				ctx.remove(t);
				let owner = ctx.get_owner(t);
				ctx.addCrea(owner, t);
			}
			Self::reveal => {
				ctx.set(ctx.get_owner(c), Flag::precognition, true);
			}
			Self::rewind => {
				let town = ctx.get_owner(t);
				if !ctx.get(town, Flag::protectdeck) {
					ctx.fx(t, Fx::Rewind);
					ctx.fx(t, Fx::EndPos(-town));
					ctx.remove(t);
					let card = ctx.get(t, Stat::card);
					let inst = ctx.new_thing(card, town);
					ctx.get_player_mut(town).deck_mut().push(inst);
				}
			}
			Self::ricochet => {
				if ctx.get_kind(t) == Kind::Spell
					&& ctx.get_card(ctx.get(t, Stat::card)).kind == Kind::Spell
				{
					if let Some(skill) = data.active {
						if let Some(tgting) = skill.targeting(ctx.cardset()) {
							let town = ctx.get_owner(t);
							let mut tgts = Vec::with_capacity(50 * ctx.players_ref().len());
							for &caster in ctx.players().iter() {
								ctx.set_owner(t, caster);
								for &pid in ctx.players_ref() {
									let pl = ctx.get_player(pid);
									tgts.extend(
										once(pl.weapon)
											.chain(once(pl.shield))
											.chain(pl.creatures.iter().cloned())
											.chain(pl.permanents.iter().cloned())
											.chain(pl.hand_iter())
											.filter(|&id| id != 0 && tgting.check(ctx, t, id))
											.map(|id| (id, caster)),
									);
								}
							}
							if let Some(&(tgt, src)) = ctx.choose(&tgts) {
								ctx.set_owner(t, src);
								ctx.castSpellNoSpell(t, tgt, skill);
							}
							ctx.set_owner(t, town);
						}
					}
				}
			}
			Self::sabbath => {
				if !ctx.sanctified(t) {
					ctx.set(t, Flag::sabbath, true);
				}
				let owner = ctx.get_owner(c);
				ctx.masscc(ctx.get_foe(owner), 0, |ctx, cr| {
					ctx.set(cr, Stat::casts, 0);
				});
				ctx.masscc(owner, 0, |ctx, cr| {
					ctx.dmg(cr, -10);
				});
				ctx.set(t, Flag::protectdeck, true);
			}
			Self::sadism => {
				if ctx.get_kind(t) != Kind::Player && data.dmg > 0 {
					ctx.dmg(ctx.get_owner(c), -data.dmg);
				}
			}
			Self::salvage => {
				Skill::growth(1, 1).proc(ctx, c, t, data);
				let owner = ctx.get_owner(c);
				if ctx.turn != owner
					&& !data.get(ProcData::salvaged)
					&& !ctx.hasskill(c, Event::Turnstart, Skill::salvageoff)
				{
					ctx.fx(c, Fx::Salvage);
					data.flags |= ProcData::salvaged;
					let inst = ctx.new_thing(ctx.get(t, Stat::card), owner);
					ctx.addCard(owner, inst);
					ctx.fx(inst, Fx::StartPos(t));
					ctx.addskills(c, Event::Turnstart, &[Skill::salvageoff]);
				}
			}
			Self::salvageoff => {
				ctx.rmskill(c, Event::Turnstart, Skill::salvageoff);
			}
			Self::sanctify => {
				ctx.set(ctx.get_owner(c), Flag::sanctuary, true);
			}
			Self::scatter => {
				let town = ctx.get_owner(t);
				if !ctx.sanctified(town) {
					ctx.fx(t, Fx::Sfx(Sfx::mulligan));
					if town == t {
						ctx.drawhand(t, ctx.get_player(t).hand_len());
					} else {
						let decklen = ctx.get_player(town).deck.len();
						if decklen > 0 {
							let handidx = ctx.getIndex(t);
							if handidx != -1 {
								let handidx = handidx as usize;
								let idx = ctx.rng_range(0..decklen);
								let pl = ctx.get_player_mut(town);
								let deckid = pl.deck[idx];
								pl.hand[handidx] = deckid;
								pl.deck_mut()[idx] = t;
								ctx.set_kind(deckid, Kind::Spell);
								ctx.set_owner(deckid, town);
							}
						}
					}
				}
				let mut pl = ctx.get_player_mut(ctx.get_owner(c));
				pl.markpower = pl.markpower.saturating_add(1);
			}
			Self::scramble => {
				if ctx.get_kind(t) == Kind::Player && !ctx.sanctified(t) {
					for _ in 0..9 {
						if ctx.spendscramble(t, etg::Chroma, 1) {
							ctx.spendscramble(t, etg::Chroma, -1);
						}
					}
				}
			}
			Self::scramblespam => {
				Skill::scramble.proc(ctx, c, t, data);
				ctx.set(c, Stat::casts, 1);
			}
			Self::serendipity => {
				let owner = ctx.get_owner(c);
				let num = cmp::min(8 - ctx.get_player(owner).hand_len(), 3);
				let mut anyentro = false;
				let ccard = ctx.get(c, Stat::card);
				for i in (0..num).rev() {
					if let Some(card) = ctx.random_card(card::Upped(ccard), |ctx, card| {
						(card.flag & Flag::pillar) == 0
							&& (i > 0 || anyentro || card.element as i32 == etg::Entropy)
					}) {
						if card.element as i32 == etg::Entropy {
							anyentro = true;
						}
						let inst = ctx
							.new_thing(card::AsShiny(card.code as i32, card::Shiny(ccard)), owner);
						ctx.fx(inst, Fx::StartPos(c));
						ctx.addCard(owner, inst);
					}
				}
			}
			Self::shardgolem => {
				if ctx.get(c, Stat::maxhp) == 0 {
					let golemid = ctx.get(ctx.get_owner(c), Stat::shardgolem);
					if golemid != 0 {
						let golem = ctx.get_thing(golemid);
						let status = golem.status.clone();
						let skill = golem.skill.clone();
						let thing = ctx.get_thing_mut(c);
						thing.status = status;
						thing.skill = skill;
					}
				}
			}
			Self::shtriga => {
				if ctx.get_owner(c) == t {
					ctx.set(c, Flag::immaterial, true);
				}
			}
			Self::shuffle3 => {
				let owner = ctx.get_owner(c);
				let decklen = ctx.get_player(owner).deck.len() as i32;
				let idx1 = ctx.rng_range(0..decklen + 1) as usize;
				let idx2 = ctx.rng_range(0..decklen + 2) as usize;
				let idx3 = ctx.rng_range(0..decklen + 3) as usize;
				let card = ctx.get(t, Stat::card);
				let c1 = ctx.new_thing(card, owner);
				let c2 = ctx.new_thing(card, owner);
				let c3 = ctx.new_thing(card, owner);
				let deck = ctx.get_player_mut(owner).deck_mut();
				deck.insert(idx1, c1);
				deck.insert(idx2, c2);
				deck.insert(idx3, c3);
				Skill::losecharge.proc(ctx, c, c, data);
			}
			Self::silence => {
				if !ctx.sanctified(t) {
					ctx.set(t, Stat::casts, 0);
				}
			}
			Self::sing => {
				ctx.queue_attack(t, ctx.get_owner(t));
			}
			Self::singularity | Self::v_singularity => {
				if ctx.trueatk(c) > 0 {
					return Skill::antimatter.proc(ctx, c, c, data);
				}
				let mut r = ctx.rng_range(0..12);
				if self == Self::singularity && r > 9 {
					r = 0;
				}
				if r == 0 {
					let owner = ctx.get_owner(c);
					let cap = if self == Self::singularity { 99 } else { 75 };
					for q in ctx.get_player_mut(ctx.get_foe(owner)).quanta.iter_mut() {
						*q += (*q < cap) as u8;
					}
				} else if r < 5 {
					if self == Self::v_singularity {
						ctx.lobo(c);
					}
					if r < 3 {
						ctx.setSkill(c, Event::Hit, &[Skill::vampire]);
					} else {
						ctx.set(c, Flag::immaterial, true);
					}
				} else if r < 7 {
					let buff = ctx.rng_range(0..25);
					ctx.buffhp(c, buff / 5 + 1);
					ctx.incrAtk(c, -1 - buff % 5);
				} else if r < 9 {
					let a = ctx.get_mut(c, Stat::adrenaline);
					if *a == 0 {
						*a = 1;
					}
				} else if r < 11 {
					Skill::parallel.proc(ctx, c, c, data);
				}
			}
			Self::sinkhole => {
				ctx.fx(c, Fx::Sinkhole);
				ctx.set(t, Flag::airborne, false);
				ctx.set(t, Flag::burrowed, true);
				ctx.lobo(t);
				ctx.setSkill(t, Event::Cast, &[Skill::burrow]);
				ctx.set(
					t,
					Stat::cast,
					if card::Upped(ctx.get(c, Stat::card)) {
						2
					} else {
						1
					},
				);
				ctx.set(t, Stat::castele, etg::Earth);
				ctx.set(t, Stat::casts, 0);
			}
			Self::siphon => {
				if throttle(ctx, data, c) {
					let owner = ctx.get_owner(c);
					let foe = ctx.get_foe(owner);
					if !ctx.sanctified(foe) && ctx.spend(foe, etg::Chroma, 1) {
						ctx.fx(c, Fx::Quanta(1, etg::Darkness as u8));
						ctx.spend(owner, etg::Darkness, -1);
					}
				}
			}
			Self::siphonactive => {
				ctx.fx(c, Fx::Siphon);
				let cskill = ctx.get_thing(t).skill.clone();
				ctx.get_thing_mut(c).skill = cskill;
				ctx.set(c, Stat::cast, ctx.get(t, Stat::cast));
				ctx.set(c, Stat::castele, ctx.get(t, Stat::castele));
				ctx.set(c, Stat::casts, 1);
				ctx.lobo(t);
			}
			Self::siphonstrength => {
				ctx.incrAtk(t, -1);
				ctx.incrAtk(c, 1);
			}
			Self::skeleton => {
				if data.tgt == c && data.active == Some(Skill::rewind) {
					Skill::hatch.proc(ctx, c, 0, data);
					data.flags |= ProcData::evade;
				}
			}
			Self::skull => {
				let (cardskele, cardmalig) = if ctx.cardset() == CardSet::Open {
					(card::Skeleton, card::MalignantCell)
				} else {
					(card::v_Skeleton, card::v_MalignantCell)
				};
				if ctx.get_kind(t) == Kind::Creature
					&& !card::IsOf(ctx.get(t, Stat::card), cardskele)
				{
					let thp = ctx.truehp(t);
					if thp <= 0 || ctx.rng() < 0.5 / thp as f64 {
						let index = ctx.getIndex(t);
						if index != -1 {
							let town = ctx.get_owner(t);
							ctx.fx(t, Fx::Death);
							ctx.die(t);
							let cr = ctx.get_player(town).creatures[index as usize];
							if cr == 0 || ctx.get(cr, Stat::card) != cardmalig {
								let skele = ctx
									.new_thing(card::As(ctx.get(cr, Stat::card), cardskele), town);
								ctx.setCrea(town, index, skele);
								ctx.fx(skele, Fx::Sfx(Sfx::skelify));
							}
						}
					}
				}
			}
			Self::skyblitz => {
				let owner = ctx.get_owner(c);
				ctx.set_quanta(owner, etg::Air, 0);
				for &cr in ctx.get_player(owner).creatures.clone().iter() {
					if cr != 0 && ctx.get(cr, Flag::airborne) && ctx.material(cr, None) {
						ctx.fx(cr, Fx::Dive);
						ctx.incrStatus(cr, Stat::dive, ctx.trueatk(cr));
					}
				}
			}
			Self::slow => {
				if !ctx.get(t, Flag::ranged) {
					ctx.delay(t, 2);
				}
			}
			Self::snipe => {
				ctx.dmg(t, 3);
			}
			Self::solar => {
				let owner = ctx.get_owner(c);
				if ctx.cardset() == CardSet::Open || !ctx.get(owner, Flag::sanctuary) {
					ctx.spend(owner, etg::Light, -1);
				}
			}
			Self::sosa => {
				ctx.fx(t, Fx::Sfx(Sfx::mulligan));
				let upped = card::Upped(ctx.get(c, Stat::card));
				let owner = ctx.get_owner(c);
				let pl = ctx.get_player_mut(owner);
				for (idx, q) in pl.quanta.iter_mut().enumerate() {
					if (idx as i32) + 1 != etg::Death {
						*q = 0;
					}
				}
				if ctx.cardset() == CardSet::Open {
					ctx.set(owner, Stat::sosa, 0);
					ctx.dmg(owner, if upped { 40 } else { 48 });
					ctx.set(owner, Stat::sosa, 2);
				} else {
					let sosa = ctx.get(owner, Stat::sosa);
					ctx.set(owner, Stat::sosa, 0);
					ctx.dmg(owner, if upped { 40 } else { 48 });
					ctx.set(owner, Stat::sosa, sosa + 2);
				}
			}
			Self::soulcatch => {
				let amt: i32 =
					if ctx.cardset() == CardSet::Original && !card::Upped(ctx.get(c, Stat::card)) {
						2
					} else {
						3
					};
				ctx.fx(c, Fx::Quanta(amt as u16, etg::Death as u8));
				ctx.spend(ctx.get_owner(c), etg::Death, -amt);
			}
			Self::spores => {
				let ccard = ctx.get(c, Stat::card);
				let owner = ctx.get_owner(c);
				for _ in 0..2 {
					let spore = ctx.new_thing(card::As(ccard, card::Spore), owner);
					ctx.addCrea(owner, spore);
					ctx.fx(spore, Fx::StartPos(c));
				}
			}
			Self::sskin => {
				let owner = ctx.get_owner(c);
				let mut amount = ctx.get_player(owner).quanta(etg::Earth) as i32;
				if ctx.cardset() != CardSet::Open {
					amount -= ctx.get_card(ctx.get(c, Stat::card)).cost as i32;
				};
				ctx.buffhp(owner, amount);
			}
			Self::stasis => {
				if ctx.get_kind(t) == Kind::Creature
					&& (data.flags & (ProcData::attackphase | ProcData::stasis))
						== ProcData::attackphase
				{
					ctx.fx(t, Fx::Sfx(Sfx::stasis));
					data.flags |= ProcData::stasis;
				}
			}
			Self::stasisdraw => {
				ctx.set(t, Flag::drawlock, true);
				ctx.set(t, Flag::protectdeck, true);
			}
			Self::steal => {
				let owner = ctx.get_owner(c);
				let t = if ctx.get(t, Flag::stackable) {
					let clone = ctx.cloneinst(t);
					ctx.set(clone, Stat::charges, 1);
					ctx.fx(clone, Fx::StartPos(t));
					ctx.destroy(t, None);
					clone
				} else {
					ctx.remove(t);
					t
				};
				ctx.set(t, Stat::casts, 0);
				let kind = ctx.get_kind(t);
				if kind == Kind::Permanent {
					ctx.addPerm(owner, t);
				} else if kind == Kind::Weapon {
					ctx.setWeapon(owner, t);
				} else {
					ctx.setShield(owner, t);
				}
			}
			Self::steam => {
				ctx.incrStatus(c, Stat::steam, 5);
				ctx.incrAtk(c, 5);
				if !ctx.hasskill(c, Event::Postauto, Skill::decrsteam) {
					ctx.addskills(c, Event::Postauto, &[Skill::decrsteam]);
				}
			}
			Self::stoneform | Self::v_stoneform => {
				ctx.buffhp(c, 20);
				ctx.rmskill(c, Event::Cast, self);
				ctx.set(c, Flag::golem, true);
			}
			Self::storm(dmg) => {
				ctx.masscc(t, 0, |ctx, cr| {
					ctx.spelldmg(cr, dmg as i32);
				});
			}
			Self::summon(code) => {
				let owner = ctx.get_owner(c);
				let inst = ctx.new_thing(
					card::AsShiny(code as i32, card::Shiny(ctx.get(c, Stat::card))),
					owner,
				);
				ctx.fx(inst, Fx::StartPos(c));
				ctx.addCrea(owner, inst);
			}
			Self::swave => {
				if ctx.get(t, Stat::frozen) != 0 {
					ctx.fx(t, Fx::Shatter);
					ctx.die(t);
				} else {
					if ctx.get_kind(t) == Kind::Player {
						let weapon = ctx.get_weapon(t);
						if weapon != 0 && ctx.get(weapon, Stat::frozen) != 0 {
							ctx.fx(weapon, Fx::Shatter);
							ctx.destroy(weapon, None);
						}
					}
					ctx.spelldmg(t, 4);
				}
			}
			Self::tempering(atk) => {
				ctx.incrAtk(t, atk as i32);
				ctx.set(t, Stat::frozen, 0);
			}
			Self::tesseractsummon => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				let mut candidates = Vec::with_capacity(23);
				for n in 0..3 {
					let pl = if n > 0 {
						candidates.clear();
						owner
					} else {
						foe
					};
					candidates.extend(
						ctx.get_player(pl)
							.deck
							.iter()
							.cloned()
							.enumerate()
							.filter(|&(idx, id)| {
								ctx.get_card(ctx.get(id, Stat::card)).kind == Kind::Creature
							})
							.map(|(idx, id)| idx),
					);
					if let Some(&pick) = ctx.choose(&candidates) {
						let id = ctx.get_player_mut(pl).deck_mut().remove(pick);
						ctx.fx(id, Fx::StartPos(-pl));
						ctx.addCrea(pl, id);
						ctx.freeze(id, (ctx.get(id, Stat::cost) + 3) / 4);
					}
				}
			}
			Self::thorn(chance) => {
				if !ctx.get(t, Flag::ranged) && ctx.rng_ratio(chance as u32, 100) {
					ctx.poison(t, 1);
				}
			}
			Self::throwrock => {
				let card = ctx.get(c, Stat::card);
				ctx.dmg(t, if card::Upped(card) { 4 } else { 3 });
				let town = ctx.get_owner(t);
				let idx = ctx.rng_range(0..=ctx.get_player(town).deck.len());
				let newrock = ctx.new_thing(card::As(card, card::ThrowRock), town);
				let pl = ctx.get_player_mut(town);
				pl.deck_mut().insert(idx, newrock);
			}
			Self::tick => {
				let upped = card::Upped(ctx.get(c, Stat::card));
				ctx.dmg(c, if upped { 3 } else { 1 });
				if ctx.get(c, Stat::hp) <= 0 {
					let foe = ctx.get_foe(ctx.get_owner(c));
					if upped {
						ctx.masscc(foe, 0, |ctx, cr| {
							ctx.dmg(cr, 4);
						});
					} else {
						ctx.spelldmg(foe, 18);
					}
				}
			}
			Self::tidalhealing => {
				for &cr in ctx.get_player(ctx.get_owner(c)).creatures.clone().iter() {
					if cr != 0 {
						ctx.set(cr, Stat::poison, 0);
						ctx.set(cr, Stat::frozen, 0);
						if ctx.get(cr, Flag::aquatic) && !ctx.hasskill(cr, Event::Hit, Skill::regen)
						{
							ctx.addskills(cr, Event::Hit, &[Skill::regen]);
						}
					}
				}
			}
			Self::tornado => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				let upped = card::Upped(ctx.get(c, Stat::card));
				for i in 0..3 {
					let pl = if i == 2 {
						if upped {
							break;
						} else {
							owner
						}
					} else {
						foe
					};
					let mut perms = Vec::with_capacity(18);
					let plpl = ctx.get_player(pl);
					perms.extend(
						once(plpl.weapon)
							.chain(once(plpl.shield))
							.chain(plpl.permanents.iter().cloned())
							.filter(|&pr| pr != 0 && ctx.material(pr, None)),
					);
					if let Some(&pr) = ctx.choose(&perms) {
						ctx.fx(pr, Fx::Shuffled);
						let newowner = if ctx.rng_ratio(1, 2) {
							pl
						} else {
							ctx.get_foe(pl)
						};
						let idx = ctx.rng_range(0..=ctx.get_player(newowner).deck.len());
						let inst = ctx.new_thing(ctx.get(pr, Stat::card), newowner);
						ctx.get_player_mut(newowner).deck_mut().insert(idx, inst);
						ctx.destroy(pr, None);
					}
				}
			}
			Self::trick => {
				let town = ctx.get_owner(t);
				let tcodedull = card::AsShiny(ctx.get(t, Stat::card), false);
				let candidates = ctx
					.get_player(town)
					.deck
					.iter()
					.cloned()
					.enumerate()
					.filter(|&(idx, id)| {
						let code = ctx.get(id, Stat::card);
						let card = ctx.get_card(code);
						card.kind == Kind::Creature && card::AsShiny(code, false) != tcodedull
					})
					.map(|(idx, id)| idx)
					.collect::<Vec<_>>();
				if let Some(&pick) = ctx.choose(&candidates) {
					let tidx = ctx.getIndex(t);
					let pl = ctx.get_player_mut(town);
					let pickid = pl.deck[pick as usize];
					pl.deck_mut()[pick as usize] = t;
					ctx.setCrea(town, tidx, pickid);
					ctx.fx(pickid, Fx::StartPos(-town));
					ctx.fx(t, Fx::EndPos(-town));
				}
			}
			Self::turngolem => {
				ctx.remove(c);
				let thing = ctx.get_thing_mut(c);
				let stored =
					core::mem::replace(thing.status.entry(Stat::storedpower).or_insert(0), 0);
				thing.skill.remove(Event::Cast);
				thing.status.insert(Stat::atk, stored / 2);
				thing.status.insert(Stat::maxhp, stored);
				thing.status.insert(Stat::hp, stored);
				let owner = thing.owner;
				ctx.addCrea(owner, c);
				ctx.set(owner, Stat::gpull, c);
			}
			Self::unappease => {
				if ctx.get(c, Flag::appeased) {
					ctx.set(c, Flag::appeased, false);
				} else if ctx.hasskill(c, Event::Cast, Skill::appease) {
					data.tgt = ctx.get_owner(c);
				}
			}
			Self::unsanctify => {
				ctx.set(ctx.get_foe(ctx.get_owner(c)), Flag::sanctuary, false);
			}
			Self::unsummon => {
				let town = ctx.get_owner(t);
				if ctx.get_player(town).hand_full() {
					return Skill::rewind.proc(ctx, c, t, data);
				} else {
					ctx.remove(t);
					let inst = ctx.new_thing(ctx.get(t, Stat::card), town);
					ctx.fx(inst, Fx::StartPos(c));
					ctx.addCard(town, inst);
				}
			}
			Self::unsummonquanta => {
				let costele = ctx.get(t, Stat::costele);
				let cost = ctx.get(t, Stat::cost);
				ctx.spend(ctx.get_owner(c), costele as i32, -cost as i32);
				return Skill::unsummon.proc(ctx, c, t, data);
			}
			Self::unvindicate => {
				ctx.set(c, Flag::vindicated, false);
			}
			Self::upkeep => {
				if !ctx.spend(
					ctx.get_owner(c),
					ctx.get_card(ctx.get(c, Stat::card)).element as i32,
					1,
				) {
					ctx.die(c);
				}
			}
			Self::upload => {
				let buff = ctx.dmg(c, 2);
				ctx.incrAtk(t, buff);
			}
			Self::vampire => {
				ctx.fx(c, Fx::Heal(data.dmg));
				ctx.dmg(ctx.get_owner(c), -data.dmg);
			}
			Self::vend => {
				ctx.drawcard(ctx.get_owner(c));
				ctx.die(c);
			}
			Self::vengeance => {
				let owner = ctx.get_owner(c);
				if owner == ctx.get_owner(t) && ctx.get_leader(owner) != ctx.get_leader(ctx.turn) {
					if ctx.maybeDecrStatus(c, Stat::charges) < 2 {
						ctx.remove(c);
					}
					for &cr in ctx.get_player(owner).creatures.clone().iter() {
						if cr != 0 && cr != t {
							ctx.queue_attack(cr, 0);
						}
					}
				}
			}
			Self::vindicate => {
				if ctx.get_owner(c) == ctx.get_owner(t)
					&& !ctx.get(c, Flag::vindicated)
					&& !data.get(ProcData::vindicated)
				{
					ctx.set(c, Flag::vindicated, true);
					data.flags |= ProcData::vindicated;
					ctx.queue_attack(t, 0);
				}
			}
			Self::virtue => {
				ctx.buffhp(ctx.get_owner(c), data.blocked);
			}
			Self::virusinfect => {
				ctx.die(c);
				ctx.poison(t, 1);
			}
			Self::virusplague => {
				ctx.die(c);
				return Skill::plague.proc(ctx, c, t, data);
			}
			Self::void => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				let maxhp = ctx.get_mut(foe, Stat::maxhp);
				*maxhp = cmp::max(*maxhp - 3, 1);
				let maxhp = *maxhp;
				let hp = ctx.get_mut(foe, Stat::hp);
				if *hp > maxhp {
					*hp = maxhp;
				}
			}
			Self::voidshell => {
				let owner = ctx.get_owner(c);
				let maxhp = ctx.get_mut(owner, Stat::maxhp);
				*maxhp -= data.dmg;
				let maxhp = if *maxhp < 1 {
					*maxhp = 1;
					ctx.remove(c);
					1
				} else {
					*maxhp
				};
				let hp = ctx.get_mut(owner, Stat::hp);
				if *hp > maxhp {
					*hp = maxhp;
				}
				data.dmg = 0;
			}
			Self::web => {
				ctx.fx(t, Fx::Web);
				ctx.set(t, Flag::airborne, false);
			}
			Self::weight => {
				if ctx.get_kind(t) == Kind::Creature && ctx.truehp(t) > 5 {
					data.dmg = 0;
				}
			}
			Self::wind => {
				let stored = core::mem::replace(ctx.get_mut(c, Stat::storedpower), 0);
				ctx.incrAtk(c, stored);
				ctx.buffhp(c, stored);
			}
			Self::wings => {
				if !ctx.get(t, Flag::airborne | Flag::ranged) {
					data.dmg = 0;
				}
			}
			Self::wisdom => {
				ctx.incrAtk(t, if ctx.cardset() == CardSet::Open { 3 } else { 4 });
				if ctx.get(t, Flag::immaterial) {
					ctx.set(t, Flag::psionic, true);
				}
			}
			Self::yoink => {
				if ctx.get_kind(t) == Kind::Player {
					Skill::foedraw.proc(ctx, c, t, data);
				} else {
					let town = ctx.get_owner(t);
					if !ctx.sanctified(town) {
						ctx.remove(t);
						let owner = ctx.get_owner(c);
						if !ctx.get_player(owner).hand_full() {
							ctx.addCard(owner, t);
						}
					}
				}
			}
			Self::v_bblood => {
				ctx.buffhp(t, 20);
				ctx.set(t, Stat::delayed, 6);
				if ctx.get(t, Flag::voodoo) {
					let weapon = ctx.get_weapon(ctx.get_foe(ctx.get_owner(t)));
					if weapon != 0 {
						ctx.set(weapon, Stat::delayed, 6);
					}
				}
			}
			Self::v_burrow => {
				ctx.set(c, Flag::burrowed, true);
				ctx.setSkill(c, Event::Cast, &[Skill::v_unburrow]);
				ctx.set(c, Stat::cast, 0);
				*ctx.get_mut(c, Stat::atk) /= 2;
			}
			Self::v_cold => {
				if ctx.get_kind(t) == Kind::Creature && data.dmg > 0 && ctx.rng_ratio(3, 10) {
					ctx.freeze(t, 3);
				}
			}
			Self::v_cseed => {
				if let Some(sk) = ctx.choose(&[
					Skill::v_drainlife(0),
					Skill::v_firebolt(0),
					Skill::freeze(3),
					Skill::gpullspell,
					Skill::v_icebolt(0),
					Skill::poison(1),
					Skill::lightning,
					Skill::lobotomize,
					Skill::parallel,
					Skill::v_rewind,
					Skill::snipe,
					Skill::swave,
				]) {
					return sk.proc(ctx, c, t, data);
				}
			}
			Self::v_dessication => {
				let owner = ctx.get_owner(c);
				ctx.masscc(ctx.get_foe(owner), 0, |ctx, cr| {
					let gain = -ctx.dmg(cr, 2);
					ctx.spend(owner, etg::Water, gain);
				});
			}
			Self::v_divinity => {
				let owner = ctx.get_owner(c);
				let amt = if ctx.get_player(owner).mark == etg::Light {
					24
				} else {
					16
				};
				let maxhp = ctx.get_mut(owner, Stat::maxhp);
				*maxhp = cmp::min(*maxhp + amt, 500);
				ctx.dmg(owner, -amt);
			}
			Self::v_drainlife(cost) => {
				let owner = ctx.get_owner(c);
				let bonus = (ctx.get_player(owner).quanta(etg::Darkness) + cost) as i32 / 10;
				let heal = ctx.spelldmg(t, 2 + bonus * 2);
				ctx.dmg(owner, -heal);
			}
			Self::v_dshield => {
				ctx.set(c, Flag::immaterial, true);
				ctx.addskills(t, Event::Turnstart, &[Skill::dshieldoff]);
			}
			Self::v_endow => {
				ctx.fx(t, Fx::Endow);
				if ctx.get(t, Flag::momentum) {
					ctx.set(c, Flag::momentum, true);
				}
				if ctx.get(t, Flag::ranged) {
					ctx.set(c, Flag::ranged, true);
				}
				ctx.set(c, Stat::cast, ctx.get(t, Stat::cast));
				ctx.set(c, Stat::castele, ctx.get(t, Stat::castele));
				ctx.incrAtk(c, ctx.trueatk(t) - ctx.trigger_pure(Event::Buff, t, 0));
				ctx.buffhp(c, 2);
				ctx.get_thing_mut(c).skill = ctx.get_thing(t).skill.clone();
			}
			Self::v_firebolt(cost) => {
				ctx.spelldmg(
					t,
					3 + 3
						* ((ctx.get_player(ctx.get_owner(c)).quanta(etg::Fire) + cost) as i32 / 10),
				);
			}
			Self::v_firewall => {
				if ctx.get_kind(t) == Kind::Creature {
					ctx.dmg(t, 1);
				}
			}
			Self::v_flyingweapon => {
				let owner = ctx.get_owner(c);
				let wp = ctx.get_player(owner).weapon;
				if wp != 0 {
					ctx.remove(wp);
					let cr = ctx.new_thing(ctx.get(wp, Stat::card), owner);
					ctx.set(cr, Flag::airborne, true);
					ctx.addCrea(owner, cr);
				}
			}
			Self::v_freedom => {
				if ctx.get_owner(c) == ctx.get_owner(t)
					&& ctx.get_kind(t) == Kind::Creature
					&& ctx.get(t, Flag::airborne)
					&& !data.get(ProcData::freedom)
					&& ctx.rng_range(0..4) < ctx.get(c, Stat::charges)
				{
					ctx.fx(t, Fx::Free);
					data.flags |= ProcData::freedom;
				}
			}
			Self::v_freeevade => {
				let tgt = data.tgt;
				let tgtowner = ctx.get_owner(tgt);
				if tgt != 0
					&& tgtowner == ctx.get_owner(c)
					&& tgtowner != ctx.get_owner(t)
					&& ctx.get_kind(tgt) == Kind::Creature
					&& ctx.get(tgt, Flag::airborne)
					&& ctx.get_card(ctx.get(tgt, Stat::card)).element as i32 == etg::Air
					&& ctx.rng_range(0..4) < ctx.get(c, Stat::charges)
				{
					data.flags |= ProcData::evade;
				}
			}
			Self::v_gratitude => {
				let owner = ctx.get_owner(c);
				ctx.dmg(
					owner,
					if ctx.get_player(owner).mark == etg::Life {
						-5
					} else {
						-3
					},
				);
			}
			Self::v_hatch => {
				ctx.fx(t, Fx::Hatch);
				if let Some(card) =
					ctx.random_card(card::Upped(ctx.get(c, Stat::card)), |ctx, card| {
						card.kind == Kind::Creature
							&& !legacy_banned(card::AsUpped(card.code as i32, false))
					}) {
					ctx.transform(c, card.code as i32);
				}
				if ctx.get(c, Flag::ready) {
					ctx.set(c, Stat::casts, 0);
					Skill::parallel.proc(ctx, c, c, data);
				}
			}
			Self::v_heal => {
				ctx.dmg(ctx.get_owner(c), -20);
			}
			Self::v_holylight => {
				ctx.dmg(
					t,
					if !ctx.get(t, Flag::nocturnal) {
						-10
					} else {
						10
					},
				);
			}
			Self::v_hope => {
				let dr = Self::hope.proc_pure(ctx, c, t);
				ctx.set(c, Stat::hope, dr);
			}
			Self::v_icebolt(cost) => {
				let owner = ctx.get_owner(c);
				let bonus = (ctx.get_player(owner).quanta(etg::Water) + cost) as i32 / 10;
				if ctx.rng_range(0..20) < 7 + bonus * 2 {
					ctx.freeze(
						t,
						if card::Upped(ctx.get(c, Stat::card)) {
							4
						} else {
							3
						},
					);
				}
				ctx.spelldmg(t, 2 + bonus * 2);
			}
			Self::v_improve => {
				ctx.fx(t, Fx::Improve);
				ctx.set(t, Flag::mutant, true);
				if let Some(card) = ctx.random_card(false, |ctx, card| {
					card.kind == Kind::Creature && !legacy_banned(card.code as i32)
				}) {
					ctx.transform(t, card.code as i32);
				}
			}
			Self::v_integrity => {
				const shardSkills: [[Skill; 6]; 12] = [
					[
						Skill::deadalive,
						Skill::v_mutation,
						Skill::paradox,
						Skill::v_improve,
						Skill::v_scramble,
						Skill::antimatter,
					],
					[
						Skill::poison(1),
						Skill::growth(1, 1),
						Skill::growth(1, 1),
						Skill::poison(1),
						Skill::aflatoxin,
						Skill::poison(2),
					],
					[
						Skill::devour,
						Skill::devour,
						Skill::devour,
						Skill::devour,
						Skill::devour,
						Skill::v_blackhole,
					],
					[
						Skill::v_burrow,
						Skill::v_stoneform,
						Skill::guard,
						Skill::guard,
						Skill::v_bblood,
						Skill::v_bblood,
					],
					[
						Skill::growth(2, 2),
						Skill::adrenaline,
						Skill::adrenaline,
						Skill::adrenaline,
						Skill::adrenaline,
						Skill::mitosis,
					],
					[
						Skill::growth(2, 0),
						Skill::growth(2, 0),
						Skill::v_fiery,
						Skill::destroy,
						Skill::destroy,
						Skill::rage,
					],
					[
						Skill::steam,
						Skill::steam,
						Skill::freeze(3),
						Skill::freeze(3),
						Skill::v_nymph,
						Skill::v_nymph,
					],
					[
						Skill::mend,
						Skill::v_endow,
						Skill::v_endow,
						Skill::luciferin,
						Skill::luciferin,
						Skill::luciferin,
					],
					[
						Skill::summon(1908),
						Skill::summon(1908),
						Skill::snipe,
						Skill::dive,
						Skill::gas,
						Skill::gas,
					],
					[
						Skill::summon(2010),
						Skill::summon(2010),
						Skill::deja,
						Skill::deja,
						Skill::precognition,
						Skill::precognition,
					],
					[
						Skill::vampire,
						Skill::vampire,
						Skill::vampire,
						Skill::vampire,
						Skill::liquid,
						Skill::v_steal,
					],
					[
						Skill::lobotomize,
						Skill::lobotomize,
						Skill::lobotomize,
						Skill::quint,
						Skill::quint,
						Skill::quint,
					],
				];
				let soicode = ctx.get(c, Stat::card);
				let mut tally = [0u8; 12];
				tally[etg::Earth as usize - 1] = 1;
				let mut hp = if card::Upped(soicode) { 2 } else { 1 };
				let mut atk = hp + 3;
				let owner = ctx.get_owner(c);
				let mut idx = 0;
				let mut len = ctx.get_player(owner).hand_len();
				while idx < len {
					let code = ctx.get(ctx.get_player(owner).hand[idx], Stat::card);
					if etg::ShardList[1..]
						.iter()
						.any(|&shard| card::IsOf(code, shard as i32))
					{
						let card = ctx.get_card(code);
						tally[card.element as usize - 1] += 1;
						let (hpbuff, atkbuff) = match card.element as i32 {
							etg::Earth => (1, 4),
							etg::Gravity => (0, 6),
							etg::Fire => (3, 0),
							_ => (2, 2),
						};
						hp += hpbuff;
						atk += atkbuff;
						if card::Upped(code) {
							hp += 1;
							atk += 1;
						}
						ctx.get_player_mut(owner).hand_remove(idx);
						len -= 1;
					} else {
						idx += 1;
					}
				}
				let mut shpick = 0;
				let mut shmax = 0;
				for (idx, &count) in tally.iter().enumerate() {
					let count = count as usize;
					if count > shmax {
						shmax = count;
						shpick = idx;
					}
				}
				shmax = cmp::min(shmax - 1, 5);
				let active = Cow::from(&shardSkills[shpick][shmax..=shmax]);
				let activecost = match active[0] {
					Skill::v_burrow => 1,
					Skill::v_stoneform => 1,
					Skill::guard => 1,
					Skill::v_bblood => 2,
					Skill::deadalive => 1,
					Skill::v_mutation => 2,
					Skill::paradox => 2,
					Skill::v_improve => 2,
					Skill::v_scramble => -2,
					Skill::antimatter => 4,
					Skill::growth(1, 1) => -4,
					Skill::poison(_) => {
						if shmax == 0 {
							1
						} else {
							-2
						}
					}
					Skill::aflatoxin => 2,
					Skill::devour => 3,
					Skill::v_blackhole => 4,
					Skill::growth(2, 2) => 2,
					Skill::adrenaline => 2,
					Skill::mitosis => 4,
					Skill::growth(2, 0) => 1,
					Skill::v_fiery => -3,
					Skill::destroy => 3,
					Skill::rage => 2,
					Skill::steam => 2,
					Skill::freeze(_) => 2,
					Skill::v_nymph => 4,
					Skill::v_heal => 1,
					Skill::v_endow => 2,
					Skill::luciferin => 4,
					Skill::summon(_) => 2,
					Skill::snipe => 2,
					Skill::dive => 2,
					Skill::gas => 2,
					Skill::deja => 4,
					Skill::neuro => -2,
					Skill::precognition => 2,
					Skill::siphon => -1,
					Skill::vampire => -2,
					Skill::liquid => 2,
					Skill::v_steal => 3,
					Skill::lobotomize => 2,
					Skill::quint => 2,
					_ => 0,
				};
				let mut shardgolem = ThingData::default();
				shardgolem.status.insert(Stat::atk, atk);
				shardgolem.status.insert(Stat::maxhp, hp);
				shardgolem.status.insert(Stat::hp, hp);
				match activecost {
					-4 => {
						shardgolem.skill.insert(Event::Death, active);
					}
					-3 => {
						shardgolem.skill.insert(Event::Buff, active);
					}
					-2 => {
						shardgolem.skill.insert(Event::Hit, active);
					}
					-1 => {
						shardgolem.skill.insert(Event::OwnAttack, active);
					}
					_ => {
						shardgolem.status.insert(Stat::castele, etg::Earth);
						shardgolem.status.insert(Stat::cast, activecost);
						shardgolem.skill.insert(Event::Cast, active);
					}
				}
				if tally[etg::Air as usize - 1] > 0 {
					shardgolem.flag.0 |= Flag::airborne;
				}
				if tally[etg::Darkness as usize - 1] > 1 {
					shardgolem.flag.0 |= Flag::voodoo;
				} else if tally[etg::Darkness as usize - 1] > 0 {
					match shardgolem.skill.entry(Event::OwnAttack) {
						SkillsEntry::Occupied(o) => {
							o.into_mut().to_mut().push(Skill::siphon);
						}
						SkillsEntry::Vacant(v) => {
							v.insert(Cow::from(&[Skill::siphon][..]));
						}
					}
				}
				if tally[etg::Aether as usize - 1] > 1 {
					shardgolem.flag.0 |= Flag::immaterial;
				}
				if tally[etg::Gravity as usize - 1] > 1 {
					shardgolem.flag.0 |= Flag::momentum;
				}
				if tally[etg::Life as usize - 1] > 1 {
					shardgolem.status.insert(Stat::adrenaline, 1);
				}
				let golemcode = card::As(soicode, card::v_ShardGolem);
				let golemcard = ctx.get_card(golemcode);
				shardgolem.status.insert(Stat::card, golemcode);
				shardgolem.status.insert(Stat::cost, golemcard.cost as i32);
				shardgolem.status.insert(Stat::costele, etg::Earth);
				let golemid = ctx.new_id(Entity::Thing(Rc::new(shardgolem)));
				ctx.set(owner, Stat::shardgolem, golemid);
				let inst = ctx.new_thing(golemcode, owner);
				ctx.addCreaCore(owner, inst, true);
			}
			Self::v_mutation => {
				let r = ctx.rng();
				if r < 0.1 {
					ctx.fx(c, Fx::Oops);
					ctx.die(t);
				} else if r < 0.5 {
					Skill::v_improve.proc(ctx, c, t, data);
				} else {
					ctx.fx(c, Fx::Abomination);
					ctx.transform(t, card::v_Abomination);
				}
			}
			Self::v_noluci => (),
			Self::v_nymph => {
				ctx.fx(t, Fx::Nymph);
				let code = ctx.get(t, Stat::card);
				let card = ctx.get_card(code);
				let nymphcode =
					etg::NymphList[if card.element as i32 == etg::Chroma || card.rarity == 15 {
						ctx.rng_range(1..=12)
					} else {
						card.element as usize
					}] - 4000;
				let town = ctx.get_owner(t);
				let nymph = ctx.new_thing(card::As(code, nymphcode as i32), town);
				ctx.fx(nymph, Fx::StartPos(t));
				ctx.addCrea(town, nymph);
				ctx.destroy(t, None);
			}
			Self::v_obsession => {
				ctx.dmg(
					ctx.get_owner(c),
					if card::Upped(ctx.get(c, Stat::card)) {
						13
					} else {
						10
					},
				);
			}
			Self::v_pandemonium => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				ctx.masscc(
					foe,
					if card::Upped(ctx.get(c, Stat::card)) {
						0
					} else {
						owner
					},
					|ctx, cr| {
						Skill::v_cseed.proc(ctx, c, cr, &mut ProcData::default());
					},
				);
			}
			Self::v_plague => {
				ctx.masscc(ctx.get_foe(ctx.get_owner(c)), 0, |ctx, cr| {
					ctx.poison(cr, 1);
				});
			}
			Self::v_readiness => {
				ctx.fx(t, Fx::Ready);
				ctx.set(t, Stat::cast, 0);
				if ctx.get_card(ctx.get(t, Stat::card)).element as i32 == etg::Time
					&& !ctx.get(t, Flag::ready)
				{
					ctx.set(t, Flag::ready, true);
					ctx.set(t, Stat::casts, 2);
				}
			}
			Self::v_relic => {
				ctx.addCard(ctx.get_owner(c), c);
			}
			Self::v_rewind => {
				let card = ctx.get(t, Stat::card);
				if card::IsOf(card, card::v_Skeleton) {
					Skill::v_hatch.proc(ctx, t, 0, data);
				} else if card::IsOf(card, card::v_Mummy) {
					ctx.transform(t, card::As(card, card::v_Pharaoh));
				} else {
					let poison = ctx.get(t, Stat::poison);
					if poison < 0 && ctx.get(t, Flag::voodoo) {
						ctx.poison(ctx.get_foe(ctx.get_owner(t)), -poison);
					}
					return Skill::rewind.proc(ctx, c, t, data);
				}
			}
			Self::v_salvage => {
				let owner = ctx.get_owner(c);
				if owner != ctx.turn
					&& owner != ctx.get_owner(t)
					&& !ctx.get(c, Flag::salvaged)
					&& !ctx.get(t, Flag::salvaged)
				{
					ctx.set(c, Flag::salvaged, true);
					ctx.set(t, Flag::salvaged, true);
					let inst = ctx.new_thing(ctx.get(t, Stat::card), owner);
					ctx.addCard(owner, inst);
				}
			}
			Self::v_scramble => {
				if ctx.get_kind(t) == Kind::Player && !ctx.sanctified(t) {
					let mut n = 0;
					while n > -9 && ctx.spend(t, etg::Chroma, 1) {
						n -= 1;
					}
					ctx.spend(t, etg::Chroma, n);
				}
			}
			Self::v_serendipity => {
				let owner = ctx.get_owner(c);
				let num = cmp::min(8 - ctx.get_player(owner).hand_len(), 3);
				let mut anyentro = false;
				let ccard = ctx.get(c, Stat::card);
				for i in (0..num).rev() {
					if let Some(card) = ctx.random_card(card::Upped(ccard), |ctx, card| {
						card.rarity != 15
							&& card.rarity != 20 && !card::IsOf(card.code as i32, card::v_Relic)
							&& !card::IsOf(card.code as i32, card::v_Miracle)
							&& !etg::ShardList[1..]
								.iter()
								.any(|&shard| card::IsOf(card.code as i32, shard as i32 - 4000))
							&& (i > 0 || anyentro || card.element as i32 == etg::Entropy)
					}) {
						if card.element as i32 == etg::Entropy {
							anyentro = true;
						}
						let inst = ctx
							.new_thing(card::AsShiny(card.code as i32, card::Shiny(ccard)), owner);
						ctx.fx(inst, Fx::StartPos(c));
						ctx.addCard(owner, inst);
					}
				}
			}
			Self::v_silence => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				return Skill::silence.proc(ctx, c, foe, data);
			}
			Self::v_slow => {
				if ctx.get_kind(t) == Kind::Creature {
					ctx.delay(t, 2);
				}
			}
			Self::v_steal => {
				let kind = ctx.get_kind(t);
				let owner = ctx.get_owner(c);
				let card = ctx.get(t, Stat::card);
				if ctx.get(t, Flag::stackable) {
					ctx.destroy(t, None);
					if kind == Kind::Shield {
						let shield = ctx.get_shield(owner);
						if shield != 0 && card == ctx.get(shield, Stat::card) {
							ctx.incrStatus(shield, Stat::charges, 1);
						} else {
							let inst = ctx.new_thing(card, owner);
							ctx.fx(inst, Fx::StartPos(t));
							ctx.set(inst, Stat::charges, 1);
							ctx.setShield(owner, inst);
						}
					} else {
						let inst = ctx.new_thing(card, owner);
						ctx.fx(inst, Fx::StartPos(t));
						ctx.addPerm(owner, inst);
					}
				} else {
					ctx.remove(t);
					ctx.set(t, Stat::casts, 0);
					if card::IsOf(card, card::v_Sundial) {
						ctx.incrStatus(t, Stat::charges, 1);
					}
					if kind == Kind::Permanent {
						ctx.addPerm(owner, t);
					} else if kind == Kind::Weapon {
						ctx.setWeapon(owner, t);
					} else {
						ctx.setShield(owner, t);
					}
				}
			}
			Self::v_storm(dmg) => {
				return Skill::storm(dmg).proc(ctx, c, ctx.get_foe(ctx.get_owner(c)), data)
			}
			Self::v_swarm => {
				let hp: i32 = ctx
					.get_player(ctx.get_owner(c))
					.creatures
					.iter()
					.map(|&cr| {
						(cr != 0 && ctx.hasskill(cr, Event::OwnAttack, Skill::v_swarm)) as i32
					})
					.sum();
				ctx.set(c, Stat::swarmhp, hp - 1);
			}
			Self::v_thorn => {
				if ctx.get_kind(t) == Kind::Creature && data.dmg > 0 && ctx.rng_ratio(3, 4) {
					ctx.poison(t, 1);
				}
			}
			Self::v_unburrow => {
				ctx.set(c, Flag::burrowed, false);
				ctx.setSkill(c, Event::Cast, &[Skill::v_burrow]);
				ctx.set(c, Stat::cast, 1);
				*ctx.get_mut(c, Stat::atk) *= 2;
			}
			Self::v_virusplague => {
				ctx.die(c);
				return Skill::v_plague.proc(ctx, c, t, data);
			}
			Self::v_void => {
				let amt = if ctx.get_player(ctx.get_owner(c)).mark == etg::Darkness {
					3
				} else {
					2
				} * ctx.get(c, Stat::charges);
				let foe = ctx.get_foe(ctx.get_owner(c));
				let maxhp = ctx.get_mut(foe, Stat::maxhp);
				*maxhp = cmp::max(*maxhp - amt, 1);
				let maxhp = *maxhp;
				let hp = ctx.get_mut(foe, Stat::hp);
				if *hp > maxhp {
					*hp = maxhp;
				}
			}
			Self::accumulation
			| Self::axe
			| Self::bow
			| Self::countimmbur
			| Self::dagger
			| Self::disc
			| Self::fiery
			| Self::hammer
			| Self::hope
			| Self::staff
			| Self::swarm
			| Self::v_bow
			| Self::v_dagger
			| Self::v_fiery
			| Self::v_hopedr
			| Self::v_swarmhp => panic!("Pure skill triggered with impurity"),
		}
	}

	pub fn proc_pure(self, ctx: &Game, c: i32, t: i32) -> i32 {
		match self {
			Self::accumulation => ctx.get(c, Stat::charges),
			Self::axe => {
				let mark = ctx.get_player(ctx.get_owner(c)).mark;
				(mark == etg::Fire || mark == etg::Time) as i32
			}
			Self::bow | Self::v_bow => {
				let mark = ctx.get_player(ctx.get_owner(c)).mark;
				(mark == etg::Air || mark == etg::Light) as i32
			}
			Self::countimmbur => ctx
				.players_ref()
				.iter()
				.map(|&pl| {
					let p = ctx.get_player(pl);
					once(p.shield)
						.chain(once(p.weapon))
						.chain(p.creatures.iter().cloned())
						.chain(p.permanents.iter().cloned())
						.filter(|&id| id != 0 && ctx.get(id, Flag::immaterial | Flag::burrowed))
						.count()
				})
				.sum::<usize>() as i32,
			Self::dagger => {
				let owner = ctx.get_owner(c);
				let mark = ctx.get_player(owner).mark;
				(mark == etg::Death || mark == etg::Darkness) as i32
					+ ctx
						.get_player(owner)
						.permanents
						.iter()
						.filter(|&&pr| {
							pr != 0 && {
								let card = ctx.get_card(ctx.get(pr, Stat::card));
								(card.flag & Flag::pillar) == 0
									&& matches!(card.element as i32, etg::Darkness | etg::Death)
							}
						})
						.count() as i32
			}
			Self::disc => {
				let mark = ctx.get_player(ctx.get_owner(c)).mark;
				(mark == etg::Entropy || mark == etg::Aether) as i32
			}
			Self::hammer => {
				let mark = ctx.get_player(ctx.get_owner(c)).mark;
				(mark == etg::Gravity || mark == etg::Earth) as i32
			}
			Self::hope => ctx
				.get_player(ctx.get_owner(c))
				.creatures
				.iter()
				.filter(|&&cr| {
					cr != 0 && ctx.hasskill(cr, Event::OwnAttack, Skill::quanta(etg::Light as i8))
				})
				.count() as i32,
			Self::fiery | Self::v_fiery => {
				let pl = ctx.get_player(ctx.get_owner(c));
				pl.quanta(etg::Fire) as i32 / 5
			}
			Self::staff => {
				let mark = ctx.get_player(ctx.get_owner(c)).mark;
				(mark == etg::Life || mark == etg::Water) as i32
			}
			Self::swarm => ctx
				.get_player(ctx.get_owner(c))
				.creatures
				.iter()
				.filter(|&&cr| cr != 0 && ctx.hasskill(cr, Event::Hp, Skill::swarm))
				.count() as i32,
			Self::v_dagger => {
				let mark = ctx.get_player(ctx.get_owner(c)).mark;
				(mark == etg::Death || mark == etg::Darkness) as i32
			}
			Self::v_hopedr => ctx.get(c, Stat::hope),
			Self::v_swarmhp => ctx.get(c, Stat::swarmhp),
			_ => 0,
		}
	}
}

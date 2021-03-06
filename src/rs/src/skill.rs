#![allow(non_camel_case_types)]
#![allow(non_upper_case_globals)]

use std::borrow::Cow;
use std::cmp;
use std::convert::TryFrom;
use std::iter::once;
use std::num::NonZeroU8;
use std::rc::Rc;

use crate::card;
use crate::etg;
use crate::game::{Entity, Flag, Fx, Game, Sfx, Stat, ThingData};

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
	pub patience: bool,
	pub salvaged: bool,
	pub stasis: bool,
	pub evade: bool,
	pub index: i8,
	pub attackphase: bool,
	pub drawstep: bool,
	pub fromhand: bool,
	pub freedom: bool,
	pub flood: bool,
	pub floodpaid: bool,
	pub vindicated: bool,
}

impl From<Skill> for ProcData {
	fn from(skill: Skill) -> ProcData {
		ProcData {
			active: Some(skill),
			..Default::default()
		}
	}
}

fn throttle(ctx: &Game, c: i32) -> bool {
	ctx.get(c, Stat::adrenaline) < 3
		|| (ctx.get_kind(c) == etg::Creature && {
			let weapon = ctx.get_weapon(ctx.get_owner(c));
			weapon != 0 && ctx.get(weapon, Flag::nothrottle)
		})
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

	pub fn iter(&self) -> impl Iterator<Item = (&Event, &Cow<'static, [Skill]>)> {
		self.0.iter().map(|&(ref k, ref v)| (k, v))
	}

	pub fn iter_mut(&mut self) -> impl Iterator<Item = (&Event, &mut Cow<'static, [Skill]>)> {
		self.0.iter_mut().map(|&mut (ref k, ref mut v)| (k, v))
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
	flooddeath,
	floodtoll,
	flyingweapon,
	flyself,
	foedraw,
	forcedraw,
	forceplay,
	fractal,
	freedom,
	freeevade,
	freeze,
	freezeperm,
	fungusrebirth,
	gaincharge2,
	gaintimecharge,
	gas,
	give,
	golemhit,
	gpull,
	gpullspell,
	gratitude,
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
	nova,
	nova2,
	nullspell,
	nymph,
	obsession,
	ouija,
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
	pillcar,
	pillcar1,
	pillmat,
	pillmat1,
	pillspi,
	pillspi1,
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
	regenerate,
	regeneratespell,
	regrade,
	reinforce,
	ren,
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
	tempering,
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
	v_acceleration(i8),
	v_accelerationspell(i8),
	v_accretion,
	v_aflatoxin,
	v_antimatter,
	v_bblood,
	v_blackhole,
	v_bless,
	v_blockwithcharge,
	v_boneyard,
	v_bow,
	v_bravery,
	v_burrow,
	v_butterfly,
	v_chimera,
	v_cold,
	v_cpower,
	v_cseed,
	v_dagger,
	v_deja,
	v_dessication,
	v_destroy,
	v_devour,
	v_disfield,
	v_disshield,
	v_dive,
	v_divinity,
	v_drainlife(u8),
	v_dryspell,
	v_dshield,
	v_dshieldoff,
	v_duality,
	v_earthquake,
	v_empathy,
	v_endow,
	v_evolve,
	v_fiery,
	v_firebolt(u8),
	v_firewall,
	v_flyingweapon,
	v_freedom,
	v_freeevade,
	v_freeze,
	v_gaincharge2,
	v_gas,
	v_gpullspell,
	v_gratitude,
	v_guard,
	v_hammer,
	v_hatch,
	v_heal,
	v_holylight,
	v_hope,
	v_hopedr,
	v_icebolt(u8),
	v_improve,
	v_infect,
	v_integrity,
	v_liquid,
	v_lobotomize,
	v_losecharge,
	v_luciferin,
	v_lycanthropy,
	v_mend,
	v_mitosis,
	v_mitosisspell,
	v_momentum,
	v_mutation,
	v_neuro,
	v_nightmare,
	v_noluci,
	v_nova,
	v_nova2,
	v_nymph,
	v_obsession,
	v_pandemonium,
	v_paradox,
	v_parallel,
	v_phoenix,
	v_plague,
	v_platearmor(i16),
	v_precognition,
	v_queen,
	v_rage,
	v_readiness,
	v_rebirth,
	v_regenerate,
	v_relic,
	v_rewind,
	v_salvage,
	v_scarab,
	v_scramble,
	v_serendipity,
	v_silence,
	v_singularity,
	v_siphon,
	v_skull,
	v_skyblitz,
	v_slow,
	v_solar,
	v_sosa,
	v_soulcatch,
	v_sskin,
	v_steal,
	v_steam,
	v_stoneform,
	v_storm2,
	v_storm3,
	v_swarm,
	v_swarmhp,
	v_thorn,
	v_unburrow,
	v_upkeep,
	v_virusinfect,
	v_virusplague,
	v_void,
	v_web,
	v_wisdom,
}

#[derive(Eq, PartialEq, Clone, Copy, Hash)]
pub enum Tgt<'a> {
	own,
	foe,
	notself,
	all,
	card,
	pill,
	weap,
	shie,
	playerweap,
	perm,
	nonstack,
	permstack,
	crea,
	creacrea,
	play,
	notplay,
	sing,
	butterfly,
	v_butterfly,
	devour,
	paradox,
	notskele,
	forceplay,
	airbornecrea,
	golem,
	groundcrea,
	wisdom,
	quinttog,
	And(&'a [Tgt<'a>]),
	Or(&'a [Tgt<'a>]),
}

fn quadpillarcore(ctx: &mut Game, ele: i32, c: i32, n: i32) {
	let owner = ctx.get_owner(c);
	for _ in 0..n {
		let r = ctx.rng_range(0..16);
		ctx.spend(owner, (ele >> ((r & 3) << 2)) & 15, -1);
		if ctx.rng_ratio(2, 3) {
			ctx.spend(owner, (ele >> (r & 12)) & 15, -1);
		}
	}
}
const QUAD_PILLAR_MAT: i32 = etg::Earth | etg::Fire << 4 | etg::Water << 8 | etg::Air << 12;
const QUAD_PILLAR_SPI: i32 = etg::Death | etg::Life << 4 | etg::Light << 8 | etg::Darkness << 12;
const QUAD_PILLAR_CAR: i32 = etg::Entropy | etg::Gravity << 4 | etg::Time << 8 | etg::Aether << 12;

fn legacy_banned(code: i32) -> bool {
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
	pub fn passive(self) -> bool {
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
				| Self::salvage | Self::siphon
				| Self::skeleton | Self::swarm
				| Self::virtue | Self::v_obsession
				| Self::v_salvage
				| Self::v_singularity
				| Self::v_siphon | Self::v_swarm
		)
	}

	pub fn targetting(self) -> Option<Tgt<'static>> {
		Some(match self {
			Self::acceleration => Tgt::crea,
			Self::accretion => Tgt::perm,
			Self::adrenaline => Tgt::crea,
			Self::aflatoxin => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::aggroskele => Tgt::crea,
			Self::antimatter => Tgt::Or(&[Tgt::crea, Tgt::weap]),
			Self::appease => Tgt::And(&[Tgt::own, Tgt::notself, Tgt::crea]),
			Self::bblood => Tgt::crea,
			Self::beguile => Tgt::crea,
			Self::bellweb => Tgt::crea,
			Self::blackhole => Tgt::play,
			Self::bless => Tgt::Or(&[Tgt::crea, Tgt::weap]),
			Self::bolsterintodeck => Tgt::crea,
			Self::bubbleclear => Tgt::Or(&[Tgt::crea, Tgt::perm]),
			Self::butterfly => Tgt::butterfly,
			Self::catapult => Tgt::And(&[Tgt::own, Tgt::crea]),
			Self::clear => Tgt::Or(&[Tgt::crea, Tgt::perm]),
			Self::corpseexplosion => Tgt::And(&[Tgt::own, Tgt::crea]),
			Self::cpower => Tgt::Or(&[Tgt::crea, Tgt::weap]),
			Self::cseed => Tgt::crea,
			Self::cseed2 => Tgt::all,
			Self::destroy => Tgt::perm,
			Self::destroycard => Tgt::Or(&[Tgt::card, Tgt::play]),
			Self::detain => Tgt::devour,
			Self::devour => Tgt::devour,
			Self::discping => Tgt::crea,
			Self::drainlife => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::draft => Tgt::crea,
			Self::dshield => Tgt::crea,
			Self::earthquake => Tgt::permstack,
			Self::embezzle => Tgt::crea,
			Self::enchant => Tgt::perm,
			Self::endow => Tgt::weap,
			Self::envenom => Tgt::Or(&[Tgt::weap, Tgt::shie]),
			Self::equalize => Tgt::Or(&[Tgt::crea, Tgt::And(&[Tgt::card, Tgt::notself])]),
			Self::feed => Tgt::crea,
			Self::fickle => Tgt::card,
			Self::firebolt => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::firestorm(_) => Tgt::play,
			Self::flyingweapon => Tgt::playerweap,
			Self::forceplay => Tgt::forceplay,
			Self::fractal => Tgt::crea,
			Self::freeze => Tgt::Or(&[Tgt::crea, Tgt::weap]),
			Self::freezeperm => Tgt::And(&[Tgt::perm, Tgt::nonstack]),
			Self::give => Tgt::And(&[Tgt::notself, Tgt::own, Tgt::notplay]),
			Self::golemhit => Tgt::And(&[Tgt::notself, Tgt::golem]),
			Self::gpullspell => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::guard => Tgt::crea,
			Self::heal => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::holylight => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::icebolt => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::immolate(_) => Tgt::And(&[Tgt::own, Tgt::crea]),
			Self::improve => Tgt::crea,
			Self::innovation => Tgt::card,
			Self::jelly => Tgt::crea,
			Self::jetstream => Tgt::airbornecrea,
			Self::lightning => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::liquid => Tgt::crea,
			Self::livingweapon => Tgt::crea,
			Self::lobotomize => Tgt::crea,
			Self::locketshift => Tgt::all,
			Self::mend => Tgt::crea,
			Self::metamorph => Tgt::all,
			Self::midas => Tgt::perm,
			Self::mill => Tgt::play,
			Self::millpillar => Tgt::play,
			Self::mitosisspell => Tgt::crea,
			Self::momentum => Tgt::Or(&[Tgt::crea, Tgt::weap]),
			Self::mutation => Tgt::crea,
			Self::neuroify => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::nightmare => Tgt::crea,
			Self::nightshade => Tgt::crea,
			Self::nymph => Tgt::pill,
			Self::pacify => Tgt::Or(&[Tgt::crea, Tgt::weap]),
			Self::pandemonium2 => Tgt::play,
			Self::paradox => Tgt::paradox,
			Self::parallel => Tgt::crea,
			Self::plague => Tgt::play,
			Self::platearmor(_) => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::poison(_) => Tgt::crea,
			Self::powerdrain => Tgt::crea,
			Self::purify => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::quint => Tgt::crea,
			Self::quinttog => Tgt::quinttog,
			Self::rage => Tgt::crea,
			Self::readiness => Tgt::crea,
			Self::reap => Tgt::notskele,
			Self::regeneratespell => Tgt::Or(&[Tgt::crea, Tgt::And(&[Tgt::perm, Tgt::nonstack])]),
			Self::regrade => Tgt::And(&[
				Tgt::notself,
				Tgt::notplay,
				Tgt::Or(&[Tgt::card, Tgt::nonstack]),
			]),
			Self::reinforce => Tgt::crea,
			Self::ren => Tgt::crea,
			Self::rewind => Tgt::crea,
			Self::sabbath => Tgt::play,
			Self::scatter => Tgt::Or(&[Tgt::play, Tgt::And(&[Tgt::card, Tgt::notself])]),
			Self::scramble => Tgt::play,
			Self::scramblespam => Tgt::play,
			Self::shuffle3 => Tgt::crea,
			Self::silence => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::sing => Tgt::sing,
			Self::sinkhole => Tgt::crea,
			Self::siphonactive => Tgt::And(&[Tgt::notself, Tgt::crea]),
			Self::siphonstrength => Tgt::And(&[Tgt::notself, Tgt::crea]),
			Self::snipe => Tgt::crea,
			Self::stasisdraw => Tgt::play,
			Self::steal => Tgt::And(&[Tgt::foe, Tgt::perm]),
			Self::storm(_) => Tgt::play,
			Self::swave => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::tempering => Tgt::weap,
			Self::throwrock => Tgt::crea,
			Self::trick => Tgt::crea,
			Self::unsummon => Tgt::crea,
			Self::unsummonquanta => Tgt::crea,
			Self::upload => Tgt::Or(&[Tgt::crea, Tgt::weap]),
			Self::virusinfect => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::virusplague => Tgt::play,
			Self::web => Tgt::airbornecrea,
			Self::wisdom => Tgt::wisdom,
			Self::yoink => Tgt::And(&[Tgt::foe, Tgt::Or(&[Tgt::play, Tgt::card])]),
			Self::v_accelerationspell(_) => Tgt::crea,
			Self::v_accretion => Tgt::Or(&[Tgt::perm, Tgt::play]),
			Self::v_aflatoxin => Tgt::crea,
			Self::v_antimatter => Tgt::crea,
			Self::v_bblood => Tgt::crea,
			Self::v_bless => Tgt::crea,
			Self::v_butterfly => Tgt::v_butterfly,
			Self::v_cpower => Tgt::crea,
			Self::v_cseed => Tgt::crea,
			Self::v_destroy => Tgt::perm,
			Self::v_devour => Tgt::devour,
			Self::v_drainlife(_) => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::v_earthquake => Tgt::pill,
			Self::v_endow => Tgt::weap,
			Self::v_firebolt(_) => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::v_freeze => Tgt::crea,
			Self::v_gpullspell => Tgt::crea,
			Self::v_guard => Tgt::crea,
			Self::v_holylight => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::v_icebolt(_) => Tgt::Or(&[Tgt::crea, Tgt::play]),
			Self::v_improve => Tgt::crea,
			Self::v_infect => Tgt::crea,
			Self::v_liquid => Tgt::crea,
			Self::v_lobotomize => Tgt::crea,
			Self::v_mend => Tgt::crea,
			Self::v_mitosisspell => Tgt::creacrea,
			Self::v_momentum => Tgt::crea,
			Self::v_mutation => Tgt::crea,
			Self::v_nightmare => Tgt::crea,
			Self::v_nymph => Tgt::pill,
			Self::v_paradox => Tgt::paradox,
			Self::v_parallel => Tgt::crea,
			Self::v_platearmor(_) => Tgt::crea,
			Self::v_rage => Tgt::crea,
			Self::v_readiness => Tgt::crea,
			Self::v_rewind => Tgt::crea,
			Self::v_steal => Tgt::And(&[Tgt::foe, Tgt::perm]),
			Self::v_virusinfect => Tgt::crea,
			Self::v_web => Tgt::crea,
			Self::v_wisdom => Tgt::quinttog,
			_ => return None,
		})
	}

	pub fn param1(self) -> i32 {
		match self {
			Skill::evade(x)
			| Skill::firestorm(x)
			| Skill::immolate(x)
			| Skill::platearmor(x)
			| Skill::poison(x)
			| Skill::poisonfoe(x)
			| Skill::storm(x)
			| Skill::thorn(x)
			| Skill::v_platearmor(x) => x as i32,
			Skill::summon(x) => x as i32,
			Skill::quanta(x) | Skill::v_acceleration(x) | Skill::v_accelerationspell(x) => x as i32,
			Skill::v_drainlife(x) | Skill::v_firebolt(x) | Skill::v_icebolt(x) => x as i32,
			Skill::growth(x, _) | Skill::icegrowth(x, _) => x as i32,
			_ => 0,
		}
	}

	pub fn param2(self) -> i32 {
		match self {
			Skill::growth(_, x) | Skill::icegrowth(_, x) => x as i32,
			_ => 0,
		}
	}

	pub fn proc(self, ctx: &mut Game, c: i32, t: i32, data: &mut ProcData) {
		match self {
			Self::r#_tracedeath => {
				ctx.incrStatus(ctx.turn, Stat::_creaturesDied, 1);
			}
			Self::abomination => {
				if data.tgt == c && data.active == Some(Self::mutation) {
					Skill::improve.proc(ctx, c, c, data);
					data.evade = true;
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
				Skill::destroy.proc(ctx, c, t, data);
				ctx.buffhp(c, 10);
				if ctx.truehp(c) > 30 {
					let owner = ctx.get_owner(c);
					let card = ctx.get(c, Stat::card);
					ctx.remove(c);
					ctx.transform(c, card::As(card, card::BlackHole));
					ctx.addCard(owner, c);
				}
			}
			Self::adrenaline => {
				ctx.fx(t, Fx::Adrenaline);
				ctx.set(t, Stat::adrenaline, 1);
			}
			Self::aflatoxin | Self::v_aflatoxin => {
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
			Self::antimatter | Self::v_antimatter => {
				let delta = ctx.trueatk(t) * -2;
				ctx.incrAtk(t, delta);
			}
			Self::appease => {
				ctx.set(c, Flag::appeased, true);
				ctx.fx(c, Fx::Appeased);
				Skill::devour.proc(ctx, c, t, data);
			}
			Self::equalize => {
				if ctx.get_kind(t) == etg::Creature {
					let ttrueatk = ctx.trueatk(t);
					let hp = ctx.get(t, Stat::hp);
					ctx.set(t, Stat::maxhp, ttrueatk);
					ctx.dmg(t, hp - ttrueatk);
				} else {
					ctx.set(t, Stat::costele, etg::Chroma);
				}
			}
			Self::autoburrow => {
				ctx.addskill(c, Event::Play, Self::autoburrowproc);
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
					ctx.addskill(t, Event::Turnstart, Skill::beguilestop);
				}
			}
			Self::beguilestop => {
				if t == ctx.get_owner(c) {
					ctx.rmskill(c, Event::Turnstart, Skill::beguilestop);
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
			Self::bless | Self::v_bless => {
				ctx.incrAtk(t, 3);
				ctx.buffhp(t, 3);
			}
			Self::blockwithcharge => {
				if ctx.maybeDecrStatus(c, Stat::charges) < 2 {
					ctx.die(c);
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
							ctx.addskill(cr, Event::Hit, Skill::vampire);
						}
						if ctx.get(cr, Flag::aquatic)
							&& !ctx.hasskill(cr, Event::OwnAttack, Skill::quanta(etg::Light as i8))
						{
							ctx.addskill(cr, Event::OwnAttack, Skill::quanta(etg::Light as i8));
						}
						if ctx.get(cr, Flag::golem)
							&& !ctx.hasskill(cr, Event::Hit, Skill::reducemaxhp)
						{
							ctx.addskill(cr, Event::Hit, Skill::reducemaxhp);
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
				if !card::IsOf(ctx.get(t, Stat::card), card::Skeleton) {
					let owner = ctx.get_owner(c);
					let skele =
						ctx.new_thing(card::As(ctx.get(c, Stat::card), card::Skeleton), owner);
					ctx.addCrea(owner, skele);
				}
			}
			Self::bounce => {
				ctx.set(c, Stat::hp, ctx.get(c, Stat::maxhp));
				ctx.rmskill(c, Event::Predeath, Skill::bounce);
				ctx.unsummon(c);
				data.evade = true;
			}
			Self::bravery => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				if !ctx.sanctified(foe)
					&& !ctx.get(foe, Flag::drawlock)
					&& !ctx.get(owner, Flag::drawlock)
				{
					for _ in 0..2 {
						if ctx.get_player(owner).hand.is_full()
							|| ctx.get_player(foe).hand.is_full()
						{
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
				let alchcard = etg::AlchemyList[ctx.rng_range(1..=12)];
				let inst = ctx.new_thing(card::As(ctx.get(c, Stat::card), alchcard), owner);
				ctx.fx(inst, Fx::StartPos(c));
				ctx.addCard(owner, inst);
			}
			Self::brokenmirror => {
				let owner = ctx.get_owner(c);
				if data.fromhand && ctx.get_kind(t) == etg::Creature && owner != ctx.get_owner(t) {
					let phantom =
						ctx.new_thing(card::As(ctx.get(c, Stat::card), card::Phantom), owner);
					ctx.fx(phantom, Fx::StartPos(c));
					ctx.addCrea(owner, phantom);
				}
			}
			Self::bubbleclear => {
				Skill::clear.proc(ctx, c, t, data);
				ctx.addskill(t, Event::Prespell, Skill::protectonce);
				ctx.addskill(t, Event::Spelldmg, Skill::protectoncedmg);
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
			Self::butterfly | Self::v_butterfly => {
				ctx.lobo(t);
				ctx.setSkill(t, Event::Cast, &[Skill::destroy]);
				ctx.set(t, Stat::cast, 3);
				ctx.set(t, Stat::castele, etg::Entropy);
			}
			Self::catapult => {
				ctx.fx(t, Fx::Catapult);
				ctx.die(t);
				let foe = ctx.get_foe(ctx.get_owner(c));
				let truehp = ctx.truehp(t);
				let frozen = ctx.get(t, Stat::frozen);
				ctx.dmg(
					foe,
					(truehp * (if frozen != 0 { 151 } else { 101 }) + 99) / (truehp + 100),
				);
				ctx.poison(
					foe,
					ctx.get(t, Stat::poison)
						+ (self == Self::catapult && ctx.get(t, Flag::poisonous)) as i32,
				);
				if frozen != 0 {
					ctx.freeze(foe, if self == Self::catapult { frozen } else { 3 })
				}
			}
			Self::catlife => {
				let owner = ctx.get_owner(c);
				let pl = ctx.get_player(owner);
				let index = data.index;
				if pl.creatures[index as usize] == 0 {
					let lives = ctx.maybeDecrStatus(c, Stat::lives);
					if lives != 0 {
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
						if ctx.get_kind(t) == etg::Creature && !ctx.get(t, Flag::ranged) {
							Skill::cseed.proc(ctx, c, t, data);
						}
					} else if card::Upped(ctx.get(c, Stat::card)) {
						data.dmg = 0;
					}
				}
			}
			Self::chimera | Self::v_chimera => {
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
						if self == Skill::chimera {
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
				if self == Self::chimera {
					ctx.set(chim, Flag::airborne, true);
				}
				ctx.set_kind(chim, etg::Creature);
				let crs = Rc::make_mut(&mut ctx.get_player_mut(owner).creatures);
				crs[0] = chim;
				for cr in crs[1..].iter_mut() {
					*cr = 0;
				}
				ctx.set(owner, Stat::gpull, chim);
			}
			Self::chromastat => {
				let n = cmp::min(ctx.truehp(c) + ctx.trueatk(c), 1188);
				ctx.fx(c, Fx::Quanta(n as u16, etg::Chroma as u16));
				ctx.spend(ctx.get_owner(c), etg::Chroma, -n);
			}
			Self::clear => {
				ctx.fx(t, Fx::Clear);
				let thing = ctx.get_thing_mut(t);
				thing.flag.0 &= !(Flag::aflatoxin | Flag::neuro | Flag::momentum | Flag::psionic);
				for status in &[Stat::poison, Stat::adrenaline, Stat::delayed, Stat::frozen] {
					if let Some(val) = thing.status.get_mut(status) {
						*val = 0;
					}
				}
				if thing.kind == etg::Creature {
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
				ctx.masscc(
					foe,
					if card::Upped(ctx.get(c, Stat::card)) {
						0
					} else {
						owner
					},
					|ctx, cr| {
						ctx.spelldmg(cr, dmg);
					},
				);
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
			Self::cpower | Self::v_cpower => {
				let buff = ctx.rng_range(0..25);
				ctx.buffhp(t, buff / 5 + 1);
				ctx.incrAtk(t, buff % 5 + 1);
			}
			Self::creatureupkeep => {
				if ctx.get_kind(t) == etg::Creature {
					Skill::upkeep.proc(ctx, t, 0, data);
				}
			}
			Self::cseed => {
				if let Some(sk) = ctx.choose(&[
					Skill::drainlife,
					Skill::firebolt,
					Skill::freeze,
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
					if card.kind == etg::Spell as i8 {
						if let Some(&(k, skills)) = card.skill.first() {
							debug_assert!(k == Event::Cast);
							if let Some(tgt) = skills.first().and_then(|sk| sk.targetting()) {
								if tgt.check(ctx, c, t) {
									return true;
								}
							}
						}
					}
					false
				}) {
					ctx.fx(t, Fx::Card(card.code));
					ctx.castSpell(
						c,
						t,
						card.skill
							.first()
							.and_then(|&(k, skills)| skills.first().cloned())
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
						.and_then(|sk| sk.targetting())
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
						if ctx.rng_ratio(1, totaldw) {
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
				ctx.addskill(c, Event::Turnstart, Skill::deepdiveproc);
			}
			Self::deepdiveproc => {
				if t == ctx.get_owner(c) {
					ctx.rmskill(c, Event::Turnstart, Skill::deepdiveproc);
					ctx.addskill(c, Event::Turnstart, Skill::deepdiveproc2);
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
					let devs = ctx
						.get_player(owner)
						.creatures
						.clone()
						.iter()
						.filter(|&&cr| ctx.hasskill(cr, Event::OwnAttack, Skill::siphon))
						.count();
					if ctx.rng() < 1.4 - (0.95f64).powf(devs as f64) {
						ctx.incrAtk(t, -1);
						ctx.dmg(t, 1);
					}
				}
			}
			Self::destroy | Self::v_destroy => {
				ctx.fx(t, Fx::Destroy);
				ctx.destroy(t, Some(data));
			}
			Self::destroycard => {
				let kind = ctx.get_kind(t);
				if kind == etg::Player {
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
			Self::devour | Self::v_devour => {
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
				if ctx.get_kind(t) == etg::Player {
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
				let owner = ctx.get_owner(c);
				if !ctx.spend(owner, etg::Chroma, data.dmg) {
					for q in ctx.get_player_mut(owner).quanta.iter_mut() {
						*q = 0;
					}
					ctx.remove(c);
				}
				data.dmg = 0;
			}
			Self::disshield => {
				let owner = ctx.get_owner(c);
				if !ctx.spend(owner, etg::Entropy, (data.dmg + 2) / 3) {
					ctx.set_quanta(owner, etg::Entropy, 0);
					ctx.remove(c);
				}
				data.dmg = 0;
			}
			Self::dive => {
				ctx.fx(c, Fx::Sfx(Sfx::dive));
				ctx.fx(c, Fx::Dive);
				ctx.set(c, Stat::dive, ctx.trueatk(c));
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
						let kind = ctx.get_card(ctx.get(card, Stat::card)).kind as i32;
						if kind == etg::Weapon || kind == etg::Shield {
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
			Self::dryspell | Self::v_dryspell => {
				let owner = ctx.get_owner(c);
				ctx.masscc(owner, ctx.get_foe(owner), |ctx, cr| {
					let q = -ctx.spelldmg(cr, 1);
					ctx.spend(owner, etg::Water, q);
				});
			}
			Self::dshield => {
				ctx.set(t, Flag::immaterial, true);
				ctx.addskill(t, Event::Turnstart, Skill::dshieldoff);
			}
			Self::dshieldoff => {
				let owner = ctx.get_owner(c);
				if owner == t {
					ctx.set(c, Flag::immaterial, false);
					ctx.rmskill(c, Event::Turnstart, Skill::dshieldoff);
				}
			}
			Self::duality | Self::v_duality => {
				let owner = ctx.get_owner(c);
				if !ctx.get_player(owner).hand.is_full() {
					let foe = ctx.get_foe(owner);
					let foepl = ctx.get_player(foe);
					if let Some(&card) = foepl.deck.last() {
						let inst = ctx.cloneinst(card);
						ctx.addCard(owner, inst);
						ctx.fx(inst, Fx::StartPos(c));
					}
				}
			}
			Self::earthquake | Self::v_earthquake => {
				ctx.fx(t, Fx::Earthquake);
				if ctx.get(t, Stat::charges) > 3 {
					ctx.incrStatus(t, Stat::charges, -3);
				} else {
					ctx.remove(t);
				}
				ctx.proc_data(Event::Destroy, t, data);
			}
			Self::eatspell => {
				if ctx.get_kind(t) == etg::Spell
					&& ctx.get_card(ctx.get(t, Stat::card)).kind as i32 == etg::Spell
				{
					Skill::growth(1, 1).proc(ctx, c, 0, data);
					ctx.rmskill(c, Event::Prespell, Skill::eatspell);
					data.evade = true;
				}
			}
			Self::elf => {
				if data.tgt == c && data.active == Some(Skill::cseed) {
					ctx.transform(c, card::As(ctx.get(c, Stat::card), card::FallenElf));
					data.evade = true;
				}
			}
			Self::embezzle => {
				ctx.fx(t, Fx::Embezzle);
				ctx.lobo(t);
				ctx.addskill(t, Event::Hit, Skill::forcedraw);
				ctx.addskill(t, Event::OwnDeath, Skill::embezzledeath);
			}
			Self::embezzledeath => {
				ctx.mill(ctx.get_foe(ctx.get_owner(c)), 2);
			}
			Self::empathy => {
				let owner = ctx.get_owner(c);
				let heal = ctx.count_creatures(owner);
				ctx.fx(c, Fx::Heal(heal));
				ctx.dmg(owner, -heal);
				if !ctx.spend(owner, etg::Life, heal / 8) {
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
				ctx.get_thing_mut(c).skill = ctx.get_thing(t).skill.clone();
				if ctx.hasskill(c, Event::Cast, Skill::endow) {
					ctx.rmskill(c, Event::Cast, Skill::endow);
				}
				for (&k, &v) in ctx.get_thing(t).status.clone().iter() {
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
				ctx.addskill(t, Event::Shield, Skill::thorn(25));
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
				let epoch = ctx.get_mut(c, Stat::epoch);
				*epoch += 1;
				if *epoch > 1 {
					Skill::silence.proc(ctx, c, ctx.get_owner(t), data);
				}
			}
			Self::epochreset => {
				ctx.set(c, Stat::epoch, 0);
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
					&& ctx.get_kind(t) == etg::Creature
				{
					data.evade = true;
				}
			}
			Self::evadespell => {
				if data.tgt == c
					&& ctx.get_owner(c) != ctx.get_owner(t)
					&& ctx.get_kind(t) == etg::Spell
					&& ctx.get_card(ctx.get(t, Stat::card)).kind as i32 == etg::Spell
				{
					data.evade = true;
				}
			}
			Self::evolve => {
				ctx.transform(c, card::As(ctx.get(c, Stat::card), card::Shrieker));
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
						ctx.set_kind(deckid, etg::Spell);
						ctx.set_owner(deckid, town);
					}
				}
			}
			Self::firebolt => {
				let bonus = ctx.get_player(ctx.get_owner(c)).quanta(etg::Fire) as i32 / 4;
				ctx.spelldmg(t, 3 + bonus);
				ctx.set(t, Stat::frozen, 0);
			}
			Self::firebrand => {
				if data.tgt == c && data.active == Some(Skill::tempering) {
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
			Self::flooddeath => {
				if ctx.get_kind(t) == etg::Creature
					&& !ctx.get(t, Flag::aquatic)
					&& ctx.material(t, 0)
					&& ctx.getIndex(t) > 4
				{
					ctx.die(t);
				}
			}
			Self::floodtoll => {
				let owner = ctx.get_owner(c);
				if owner == t {
					if !data.floodpaid && !ctx.spend(owner, etg::Water, 1) {
						ctx.die(c);
					}
					data.floodpaid = true;
				}
				data.flood = true;
			}
			Self::flyingweapon => {
				ctx.remove(t);
				ctx.set(t, Flag::airborne, true);
				ctx.addCrea(ctx.get_owner(t), t);
			}
			Self::flyself => {
				if ctx.get_kind(c) == etg::Weapon {
					Skill::flyingweapon
				} else {
					Skill::livingweapon
				}
				.proc(ctx, c, c, data);
			}
			Self::foedraw => {
				let owner = ctx.get_owner(c);
				if !ctx.get_player(owner).hand.is_full() {
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
				let tgting = if ctx.get_kind(t) == etg::Spell {
					if ctx.sanctified(town) {
						return;
					}
					let card = ctx.get_card(ctx.get(t, Stat::card));
					if card.kind as i32 == etg::Spell {
						card.skill[0].1[0].targetting()
					} else {
						None
					}
				} else {
					ctx.getSkill(t, Event::Cast)
						.first()
						.and_then(|&sk| sk.targetting())
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
									.chain(pl.hand.iter().cloned())
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
				let copies = 8 - ctx.get_player(owner).hand.len();
				let code = ctx.get(t, Stat::card);
				for _ in 0..copies {
					let inst = ctx.new_thing(code, owner);
					ctx.fx(inst, Fx::StartPos(t));
					ctx.addCard(owner, inst);
				}
			}
			Self::freedom => {
				if ctx.get_owner(c) == ctx.get_owner(t)
					&& ctx.get_kind(t) == etg::Creature
					&& ctx.get(t, Flag::airborne)
					&& !data.freedom && ctx.rng_ratio(3, 10)
				{
					ctx.fx(t, Fx::Free);
					data.freedom = true;
				}
			}
			Self::freeevade => {
				if !data.evade {
					let tgt = data.tgt;
					let tgtowner = ctx.get_owner(tgt);
					if tgt != 0
						&& tgtowner == ctx.get_owner(c)
						&& tgtowner != ctx.get_owner(t)
						&& ctx.get_kind(tgt) == etg::Creature
						&& ctx.get(tgt, Flag::airborne)
						&& ctx.get(tgt, Stat::frozen) == 0
						&& ctx.rng_ratio(1, 5)
					{
						data.evade = true;
					}
				}
			}
			Self::freeze | Self::v_freeze => {
				ctx.freeze(
					t,
					if card::Upped(ctx.get(c, Stat::card)) {
						4
					} else {
						3
					},
				);
			}
			Self::freezeperm => Skill::freeze.proc(ctx, c, t, data),
			Self::fungusrebirth => {
				ctx.transform(c, card::As(ctx.get(c, Stat::card), card::Fungus));
			}
			Self::gaincharge2 | Self::v_gaincharge2 => {
				if c != t {
					ctx.incrStatus(c, Stat::charges, 2);
				}
			}
			Self::gaintimecharge => {
				if !data.drawstep && ctx.get_owner(c) == ctx.get_owner(t) {
					ctx.incrStatus(c, Stat::charges, 1);
				}
			}
			Self::gas => {
				let owner = ctx.get_owner(c);
				let gas = ctx.new_thing(card::As(ctx.get(c, Stat::card), card::UnstableGas), owner);
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
				if kind != etg::Spell && ctx.hasskill(t, Event::OwnAttack, Skill::singularity) {
					ctx.die(t);
				} else {
					ctx.remove(t);
					let foe = ctx.get_foe(owner);
					if kind == etg::Permanent {
						ctx.addPerm(foe, t);
					} else if kind == etg::Creature {
						ctx.addCrea(foe, t);
					} else if kind == etg::Shield {
						ctx.setShield(foe, t);
					} else if kind == etg::Weapon {
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
			Self::gpullspell | Self::v_gpullspell => {
				ctx.fx(t, Fx::Pull);
				if ctx.get_kind(t) == etg::Creature {
					ctx.set(ctx.get_owner(t), Stat::gpull, t);
				} else {
					ctx.set(t, Stat::gpull, 0);
				}
			}
			Self::gratitude => {
				ctx.dmg(ctx.get_owner(c), -4);
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
				if ctx.get(c, Flag::airborne) || !ctx.get(t, Flag::airborne) {
					ctx.attackCreature(c, t);
				}
			}
			Self::halveatk => {
				let stored = (ctx.get(c, Stat::atk) + 1) / 2;
				ctx.incrStatus(c, Stat::storedatk, stored);
				ctx.incrAtk(c, -stored);
			}
			Self::hasten => {
				ctx.drawcard(ctx.get_owner(c));
			}
			Self::hatch => {
				ctx.fx(c, Fx::Hatch);
				let ccard = ctx.get(c, Stat::card);
				if let Some(rcard) = ctx.random_card(card::Upped(ccard), |ctx, card| {
					card.kind as i32 == etg::Creature
				}) {
					ctx.transform(c, card::AsShiny(rcard.code as i32, card::Shiny(ccard)));
				}
			}
			Self::heal => {
				ctx.dmg(t, -20);
			}
			Self::heatmirror => {
				let owner = ctx.get_owner(c);
				if data.fromhand && ctx.get_kind(t) == etg::Creature && owner != ctx.get_owner(t) {
					let spark = ctx.new_thing(card::As(ctx.get(c, Stat::card), card::Spark), owner);
					ctx.fx(spark, Fx::StartPos(c));
					ctx.addCrea(owner, spark);
				}
			}
			Self::hitownertwice => {
				if !ctx.hasskill(c, Event::Turnstart, Skill::predatoroff) {
					ctx.addskill(c, Event::Turnstart, Skill::predatoroff);
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
				if let Some(card) =
					ctx.random_card(false, |ctx, card| card.kind as i32 == etg::Creature)
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
							.filter(|&id| id != 0 && ctx.material(id, 0)),
					);
				}
				for &id in tgts.iter() {
					let cast = ctx.get_mut(id, Stat::cast);
					*cast += 1;
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
						Skill::bblood,
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
						Skill::tempering,
						Skill::destroy,
						Skill::destroy,
						Skill::rage,
					],
					[
						Skill::steam,
						Skill::steam,
						Skill::freeze,
						Skill::freeze,
						Skill::nymph,
						Skill::nymph,
					],
					[
						Skill::mend,
						Skill::endow,
						Skill::endow,
						Skill::luciferin,
						Skill::luciferin,
						Skill::luciferin,
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
						Skill::quint,
						Skill::quint,
					],
				];
				const ShardStats: [&[(u8, Soya)]; 12] = [
					&[(3, Soya::Skill(Event::Hit, [Skill::scramble]))],
					&[
						(1, Soya::Skill(Event::Death, [Skill::growth(1, 1)])),
						(1, Soya::Flag(Flag::nocturnal)),
					],
					&[(2, Soya::Flag(Flag::momentum))],
					&[(2, Soya::Skill(Event::Hit, [Skill::poison(1)]))],
					&[
						(1, Soya::Flag(Flag::poisonous)),
						(2, Soya::Stat(Stat::adrenaline, 1)),
						(4, Soya::Skill(Event::OwnAttack, [Skill::regenerate])),
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
				let mut len = ctx.get_player(owner).hand.len();
				while idx < len {
					let code = ctx.get(ctx.get_player(owner).hand[idx], Stat::card);
					if etg::ShardList[1..]
						.iter()
						.any(|&shard| card::IsOf(code, shard))
					{
						let card = ctx.get_card(code);
						tally[card.element as usize - 1] += 1;
						stat2 += if card::Upped(code) { 4 } else { 3 };
						ctx.get_player_mut(owner).hand.remove(idx);
						len -= 1;
					} else {
						idx += 1;
					}
				}
				let mut shlist = Vec::with_capacity(12);
				let mut shmax = 0;
				for (idx, &count) in tally.iter().enumerate() {
					let count = count as usize;
					if count != 0 && count >= shmax {
						if count > shmax {
							shmax = count;
							shlist.clear();
						}
						shlist.push(idx);
					}
				}
				shmax = cmp::min(shmax - 1, 5);
				let soicode = ctx.get(c, Stat::card);
				let active =
					match shardSkills[ctx.choose(&shlist).cloned().unwrap_or(0)][shmax..=shmax] {
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
					Skill::tempering => {
						if card::Upped(soicode) {
							2
						} else {
							1
						}
					}
					Skill::destroy => 3,
					Skill::rage => 2,
					Skill::steam => 2,
					Skill::freeze => 2,
					Skill::nymph => 3,
					Skill::mend => 1,
					Skill::endow => 2,
					Skill::luciferin => 3,
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
				ctx.dmg(t, 1);
				ctx.incrAtk(t, 3);
			}
			Self::lightning => {
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
				ctx.set(t, Flag::psionic, false);
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
					if ctx.get_kind(t) == etg::Player {
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
							.filter(|&pr| pr != 0 && ctx.material(pr, 0)),
					);
					if let Some(&pr) = ctx.choose(&candidates) {
						ctx.fx(c, Fx::Looted);
						Skill::steal.proc(ctx, c, pr, data);
						ctx.addskill(c, Event::Turnstart, Skill::salvageoff);
					}
				}
			}
			Self::losecharge | Self::v_losecharge => {
				if ctx.maybeDecrStatus(c, Stat::charges) == 0 {
					if ctx.get_kind(c) == etg::Creature {
						ctx.die(c);
					} else {
						ctx.remove(c);
					}
				}
			}
			Self::luciferin | Self::v_luciferin => {
				let owner = ctx.get_owner(c);
				ctx.dmg(owner, -10);
				for &cr in ctx.get_player(owner).creatures.clone().iter() {
					if cr != 0 {
						let thing = ctx.get_thing(cr);
						if thing.skill.iter().all(|(&k, v)| {
							k == Event::OwnPlay
								|| k == Event::OwnDiscard || v.iter().all(|&sk| sk.passive())
						}) {
							ctx.addskill(cr, Event::OwnAttack, Skill::quanta(etg::Light as i8));
						}
					}
				}
			}
			Self::lycanthropy => {
				ctx.buffhp(c, 5);
				ctx.incrAtk(c, 5);
				ctx.rmskill(c, Event::Cast, Self::lycanthropy);
				ctx.set(c, Flag::nocturnal, true);
			}
			Self::martyr => {
				let dmg = data.dmg;
				if dmg > 0 {
					ctx.incrAtk(c, dmg);
				}
			}
			Self::mend => {
				ctx.dmg(t, -10);
			}
			Self::metamorph => {
				let owner = ctx.get_owner(c);
				let newmark = if ctx.get_kind(t) == etg::Player {
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
				if c != t && ctx.get_kind(t) == etg::Creature {
					ctx.transform(c, ctx.get(t, Stat::card));
					ctx.addskill(c, Event::Play, Skill::mimic);
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
			Self::mitosis | Self::v_mitosis => {
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
				ctx.buffhp(t, 1);
			}
			Self::momentum | Self::v_momentum => {
				ctx.fx(t, Fx::Momentum);
				ctx.incrAtk(t, 1);
				ctx.buffhp(t, 1);
				ctx.set(t, Flag::momentum, true);
			}
			Self::mummy => {
				if data.tgt == c && data.active == Some(Self::rewind) {
					ctx.transform(c, card::As(ctx.get(c, Stat::card), card::Pharaoh));
					data.evade = true;
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
			Self::neuro | Self::v_neuro => {
				if throttle(ctx, c) {
					ctx.poison(t, 1);
					if self == Self::neuro || ctx.get_kind(t) == etg::Player {
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
			Self::nightmare | Self::v_nightmare => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				if !ctx.sanctified(foe) {
					ctx.fx(t, Fx::Nightmare);
					let card = ctx.get(t, Stat::card);
					let copies = 8 - ctx.get_player(foe).hand.len() as i32;
					let dmg = if self == Self::nightmare {
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
				ctx.lobo(t);
				Skill::lycanthropy.proc(ctx, t, 0, data);
			}
			Self::noeatspell => {
				if t == ctx.get_owner(c) {
					ctx.rmskill(c, Event::Prespell, Skill::eatspell);
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
					ctx.transform(c, card::AsShiny(card::Singularity, shiny));
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
					ctx.transform(
						c,
						card::AsShiny(card::AsUpped(card::Singularity, true), shiny),
					);
					ctx.addCrea(owner, c);
				}
			}
			Self::nullspell => {
				if !ctx.hasskill(c, Event::Prespell, Skill::eatspell) {
					ctx.fx(c, Fx::Nullspell);
					ctx.addskill(c, Event::Prespell, Skill::eatspell);
					ctx.addskill(c, Event::Turnstart, Skill::noeatspell);
				}
			}
			Self::nymph => {
				ctx.fx(t, Fx::Nymph);
				let code = ctx.get(t, Stat::card);
				let card = ctx.get_card(code);
				let nymphcode = etg::NymphList[if card.element as i32 == etg::Chroma {
					match ctx.getSkill(t, Event::OwnAttack) {
						&[Skill::pillmat] => *ctx
							.choose(&[etg::Earth, etg::Fire, etg::Water, etg::Air])
							.unwrap() as usize,
						&[Skill::pillspi] => *ctx
							.choose(&[etg::Death, etg::Life, etg::Light, etg::Darkness])
							.unwrap() as usize,
						&[Skill::pillcar] => *ctx
							.choose(&[etg::Entropy, etg::Gravity, etg::Time, etg::Aether])
							.unwrap() as usize,
						_ => ctx.rng_range(1..=12),
					}
				} else {
					card.element as usize
				}];
				let town = ctx.get_owner(t);
				let nymph = ctx.new_thing(card::As(code, nymphcode), town);
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
				if !ctx.sanctified(foe) && !ctx.get_player(foe).hand.is_full() {
					let inst = ctx.new_thing(card::OuijaEssence, foe);
					ctx.fx(inst, Fx::StartPos(c));
					ctx.addCard(foe, inst);
				}
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
					ctx.fx(inst, Fx::StartPos(inst));
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
				for &pid in ctx.players().iter() {
					let pl = ctx.get_player(pid);
					ids.extend(
						once(pid)
							.chain(once(pl.weapon))
							.chain(once(pl.shield))
							.chain(pl.creatures.clone().iter().cloned())
							.chain(pl.permanents.clone().iter().cloned())
							.chain(pl.hand.clone().iter().cloned())
							.filter(|&id| id != 0),
					);
				}
				ctx.shuffle(&mut ids[..]);
				for &id in ids.iter() {
					if ctx.get(id, Flag::cloak) {
						ctx.die(id);
					} else {
						Skill::cseed2.proc(ctx, c, id, data);
					}
				}
			}
			Self::paradox | Self::v_paradox => {
				ctx.fx(t, Fx::Paradox);
				ctx.die(t);
			}
			Self::parallel | Self::v_parallel => {
				ctx.fx(t, Fx::Parallel);
				if self == Self::parallel {
					if card::IsOf(ctx.get(t, Stat::card), card::Chimera) {
						return Skill::chimera.proc(ctx, c, t, data);
					}
				} else if card::IsOf(ctx.get(t, Stat::card), card::v_Chimera) {
					return Skill::v_chimera.proc(ctx, c, t, data);
				}
				let clone = ctx.cloneinst(t);
				let owner = ctx.get_owner(c);
				ctx.fx(clone, Fx::StartPos(t));
				ctx.addCrea(owner, clone);
				if ctx.get(clone, Flag::mutant) {
					let buff = ctx.rng_range(0..25);
					ctx.buffhp(clone, buff / 5);
					ctx.incrAtk(clone, buff % 5);
					if self == Self::parallel {
						ctx.o_mutantactive(clone);
					} else {
						ctx.v_mutantactive(clone);
					}
				}
				if self == Self::v_parallel {
					ctx.set(clone, Stat::casts, 0);
				}
				if ctx.get(clone, Flag::voodoo) {
					let foe = ctx.get_foe(owner);
					ctx.dmg(foe, ctx.get(clone, Stat::maxhp) - ctx.get(clone, Stat::hp));
					if self == Self::parallel {
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
				if !data.patience
					&& ctx.get_kind(t) == etg::Creature
					&& data.attackphase && ctx.get_owner(c) == ctx.get_owner(t)
					&& ctx.get(c, Stat::frozen) == 0
				{
					let floodbuff = data.flood && ctx.getIndex(t) > 4;
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
					data.stasis = true;
					data.patience = true;
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
					let ash = ctx.new_thing(card::As(ctx.get(c, Stat::card), card::Ash), owner);
					ctx.setCrea(owner, index as i32, ash);
				}
			}
			Self::photosynthesis => {
				ctx.fx(c, Fx::Quanta(2, etg::Life as u16));
				ctx.spend(ctx.get_owner(c), etg::Life, -2);
				if ctx.get(c, Stat::cast) > 0 {
					ctx.set(c, Stat::casts, 1);
				}
			}
			Self::pillar => {
				let card = ctx.get_card(ctx.get(c, Stat::card));
				let charges = ctx.get(c, Stat::charges);
				ctx.spend(
					ctx.get_owner(c),
					card.element as i32,
					charges * if card.element > 0 { -1 } else { -3 },
				);
			}
			Self::pillar1 => {
				let card = ctx.get_card(ctx.get(c, Stat::card));
				ctx.spend(
					ctx.get_owner(c),
					card.element as i32,
					if card.element > 0 { -1 } else { -3 },
				);
			}
			Self::pillcar => quadpillarcore(ctx, QUAD_PILLAR_CAR, c, ctx.get(c, Stat::charges)),
			Self::pillcar1 => quadpillarcore(ctx, QUAD_PILLAR_CAR, c, 1),
			Self::pillmat => quadpillarcore(ctx, QUAD_PILLAR_MAT, c, ctx.get(c, Stat::charges)),
			Self::pillmat1 => quadpillarcore(ctx, QUAD_PILLAR_MAT, c, 1),
			Self::pillspi => quadpillarcore(ctx, QUAD_PILLAR_SPI, c, ctx.get(c, Stat::charges)),
			Self::pillspi1 => quadpillarcore(ctx, QUAD_PILLAR_SPI, c, 1),
			Self::plague => {
				ctx.masscc(t, 0, |ctx, cr| {
					ctx.poison(cr, 1);
				});
			}
			Self::platearmor(x) | Self::v_platearmor(x) => {
				ctx.buffhp(t, x as i32);
			}
			Self::poison(amt) => {
				if throttle(ctx, c) {
					ctx.poison(t, amt as i32);
				}
			}
			Self::poisonfoe(amt) => {
				ctx.poison(ctx.get_foe(ctx.get_owner(c)), amt as i32);
			}
			Self::powerdrain => {
				let mut candidates = Vec::with_capacity(23);
				candidates.extend(
					ctx.get_player(ctx.get_owner(c))
						.creatures
						.iter()
						.cloned()
						.filter(|&cr| cr != 0),
				);
				if let Some(&id) = ctx.choose(&candidates) {
					let halfhp = (ctx.truehp(t) + 1) / 2;
					let halfatk = (ctx.trueatk(t) + 1) / 2;
					ctx.dmg(t, halfhp);
					ctx.incrAtk(t, -halfatk);
					ctx.buffhp(id, halfhp);
					ctx.incrAtk(id, halfatk);
				}
			}
			Self::precognition | Self::v_precognition => {
				let owner = ctx.get_owner(c);
				ctx.drawcard(owner);
				ctx.set(owner, Flag::precognition, true);
			}
			Self::predator => {
				let foe = ctx.get_foe(ctx.get_owner(c));
				if ctx.get_player(foe).hand.len() > 4
					&& !ctx.hasskill(c, Event::Turnstart, Skill::predatoroff)
				{
					ctx.addskill(c, Event::Turnstart, Skill::predatoroff);
					ctx.queue_attack(c, 0);
					if !ctx.sanctified(foe) {
						if let Some(card) = ctx.get_player(foe).hand.last().cloned() {
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
						ctx.addskill(pr, Event::Prespell, Skill::protectonce);
						ctx.addskill(pr, Event::Spelldmg, Skill::protectoncedmg);
					}
				}
			}
			Self::protectonce => {
				if data.tgt == c && ctx.get_owner(c) != ctx.get_owner(t) {
					ctx.rmskill(c, Event::Prespell, Skill::protectonce);
					ctx.rmskill(c, Event::Spelldmg, Skill::protectoncedmg);
					data.evade = true;
				}
			}
			Self::protectoncedmg => {
				ctx.rmskill(c, Event::Prespell, Skill::protectonce);
				ctx.rmskill(c, Event::Spelldmg, Skill::protectoncedmg);
				data.evade = true;
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
				if let Some(val) = thing.status.get_mut(&Stat::sosa) {
					*val = 0;
				}
			}
			Self::quanta(e) => {
				ctx.fx(c, Fx::Quanta(1, e as u16));
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
			Self::rage | Self::v_rage => {
				let dmg = if card::Upped(ctx.get(c, Stat::card)) {
					6
				} else {
					5
				};
				ctx.incrAtk(t, dmg);
				ctx.spelldmg(t, dmg);
				if self == Self::rage {
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
				ctx.transform(c, card::As(ctx.get(c, Stat::card), card::Phoenix));
			}
			Self::reducemaxhp => {
				let dmg = data.dmg;
				let maxhp = ctx.get_mut(t, Stat::maxhp);
				*maxhp = cmp::max(*maxhp - dmg, 1);
				let maxhp = *maxhp;
				if maxhp > 500 && ctx.get_kind(t) == etg::Player {
					ctx.set(t, Stat::maxhp, 500);
				}
				let hp = ctx.get_mut(t, Stat::hp);
				if *hp > maxhp {
					*hp = maxhp;
				}
			}
			Self::regen => {
				if throttle(ctx, c) {
					ctx.incrStatus(ctx.get_owner(c), Stat::poison, -1);
				}
			}
			Self::regenerate => {
				ctx.fx(t, Fx::Heal(5));
				ctx.dmg(ctx.get_owner(c), -5);
			}
			Self::regeneratespell => {
				ctx.lobo(t);
				ctx.addskill(t, Event::OwnAttack, Skill::regenerate);
				if ctx.get_kind(t) <= etg::Permanent {
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
					ctx.addskill(t, Event::Predeath, Skill::bounce);
				}
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
				if ctx.get_kind(t) == etg::Spell
					&& ctx.get_card(ctx.get(t, Stat::card)).kind as i32 == etg::Spell
				{
					if let Some(skill) = data.active {
						if let Some(tgting) = skill.targetting() {
							let town = ctx.get_owner(t);
							let mut tgts = Vec::with_capacity(50 * ctx.players_ref().len());
							for &caster in ctx.players().iter() {
								ctx.set_owner(t, caster);
								for &pid in ctx.players().iter() {
									let pl = ctx.get_player(pid);
									tgts.extend(
										once(pl.weapon)
											.chain(once(pl.shield))
											.chain(pl.creatures.iter().cloned())
											.chain(pl.permanents.iter().cloned())
											.chain(pl.hand.iter().cloned())
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
				ctx.set(t, Flag::protectdeck, true);
			}
			Self::sadism => {
				if ctx.get_kind(t) != etg::Player {
					let dmg = data.dmg;
					if dmg > 0 {
						ctx.dmg(ctx.get_owner(c), -dmg);
					}
				}
			}
			Self::salvage => {
				Skill::growth(1, 1).proc(ctx, c, t, data);
				let owner = ctx.get_owner(c);
				if ctx.turn != owner
					&& !data.salvaged && !ctx.hasskill(c, Event::Turnstart, Skill::salvageoff)
				{
					ctx.fx(c, Fx::Salvage);
					data.salvaged = true;
					let inst = ctx.new_thing(ctx.get(t, Stat::card), owner);
					ctx.addCard(owner, inst);
					ctx.fx(inst, Fx::StartPos(t));
					ctx.addskill(c, Event::Turnstart, Skill::salvageoff);
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
						ctx.drawhand(t, ctx.get_player(t).hand.len());
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
								ctx.set_kind(deckid, etg::Spell);
								ctx.set_owner(deckid, town);
							}
						}
					}
				}
				let mut pl = ctx.get_player_mut(ctx.get_owner(c));
				pl.markpower = pl.markpower.saturating_add(1);
			}
			Self::scramble => {
				if ctx.get_kind(t) == etg::Player && !ctx.sanctified(t) {
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
				let num = cmp::min(8 - ctx.get_player(owner).hand.len(), 3);
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
				let r = ctx.rng_range(0..12);
				let owner = ctx.get_owner(c);
				if r == 0 {
					let cap = if self == Self::singularity { 99 } else { 75 };
					for q in ctx.get_player_mut(ctx.get_foe(owner)).quanta.iter_mut() {
						if *q < cap {
							*q += 1;
						}
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
					ctx.set(c, Stat::adrenaline, 1);
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
			Self::siphon | Self::v_siphon => {
				if throttle(ctx, c) {
					let owner = ctx.get_owner(c);
					let foe = ctx.get_foe(owner);
					if !ctx.sanctified(foe) && ctx.spend(foe, etg::Chroma, 1) {
						ctx.fx(c, Fx::Quanta(1, etg::Darkness as u16));
						ctx.spend(owner, etg::Darkness, -1);
					}
				}
			}
			Self::siphonactive => {
				ctx.fx(c, Fx::Siphon);
				let mut cskill: Vec<(Event, Cow<'static, [Skill]>)> = Default::default();
				for (&k, v) in ctx.get_thing(t).skill.iter() {
					cskill.push((
						k,
						v.iter()
							.cloned()
							.filter(|&sk| !sk.passive())
							.collect::<Vec<_>>()
							.into(),
					));
				}
				ctx.get_thing_mut(c).skill = Skills::from(cskill);
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
					data.evade = true;
				}
			}
			Self::skull | Self::v_skull => {
				let (cardskele, cardmalig) = if self == Self::skull {
					(card::Skeleton, card::MalignantCell)
				} else {
					(card::v_Skeleton, card::v_MalignantCell)
				};
				if ctx.get_kind(t) == etg::Creature
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
			Self::skyblitz | Self::v_skyblitz => {
				let owner = ctx.get_owner(c);
				ctx.set_quanta(owner, etg::Air, 0);
				for &cr in ctx.get_player(owner).creatures.clone().iter() {
					if cr != 0 && ctx.get(cr, Flag::airborne) && ctx.material(cr, 0) {
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
				ctx.spend(owner, etg::Light, -1);
			}
			Self::sosa | Self::v_sosa => {
				ctx.fx(t, Fx::Sfx(Sfx::mulligan));
				let upped = card::Upped(ctx.get(c, Stat::card));
				let owner = ctx.get_owner(c);
				let pl = ctx.get_player_mut(owner);
				for (idx, q) in pl.quanta.iter_mut().enumerate() {
					if (idx as i32) + 1 != etg::Death {
						*q = 0;
					}
				}
				if self == Self::sosa {
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
				ctx.fx(c, Fx::Quanta(3, etg::Death as u16));
				ctx.spend(ctx.get_owner(c), etg::Death, -3);
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
				ctx.buffhp(owner, ctx.get_player(owner).quanta(etg::Earth) as i32);
			}
			Self::stasis => {
				if ctx.get_kind(t) == etg::Creature && data.attackphase && !data.stasis {
					ctx.fx(t, Fx::Sfx(Sfx::stasis));
					data.stasis = true;
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
				if kind == etg::Permanent {
					ctx.addPerm(owner, t);
				} else if kind == etg::Weapon {
					ctx.setWeapon(owner, t);
				} else {
					ctx.setShield(owner, t);
				}
			}
			Self::steam | Self::v_steam => {
				ctx.incrStatus(c, Stat::steam, 5);
				ctx.incrAtk(c, 5);
				if !ctx.hasskill(c, Event::Postauto, Skill::decrsteam) {
					ctx.addskill(c, Event::Postauto, Skill::decrsteam);
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
					if ctx.get_kind(t) == etg::Player {
						let weapon = ctx.get_weapon(t);
						if weapon != 0 && ctx.get(weapon, Stat::frozen) != 0 {
							ctx.fx(weapon, Fx::Shatter);
							ctx.destroy(weapon, None);
						}
					}
					ctx.spelldmg(t, 4);
				}
			}
			Self::tempering => {
				ctx.incrAtk(
					t,
					if card::Upped(ctx.get(c, Stat::card)) {
						5
					} else {
						3
					},
				);
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
								ctx.get_card(ctx.get(id, Stat::card)).kind as i32 == etg::Creature
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
							ctx.addskill(cr, Event::Hit, Skill::regen);
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
							.filter(|&pr| pr != 0 && ctx.material(pr, 0)),
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
						card.kind as i32 == etg::Creature && card::AsShiny(code, false) != tcodedull
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
					std::mem::replace(thing.status.entry(Stat::storedpower).or_insert(0), 0);
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
				if ctx.get_player(town).hand.is_full() {
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
			Self::upkeep | Self::v_upkeep => {
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
					&& !data.vindicated
				{
					ctx.set(c, Flag::vindicated, true);
					data.vindicated = true;
					ctx.queue_attack(t, 0);
				}
			}
			Self::virtue => {
				ctx.buffhp(ctx.get_owner(c), data.blocked);
			}
			Self::virusinfect | Self::v_virusinfect => {
				ctx.die(c);
				return Skill::poison(1).proc(ctx, c, t, data);
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
			Self::web | Self::v_web => {
				ctx.fx(t, Fx::Web);
				ctx.set(t, Flag::airborne, false);
			}
			Self::weight => {
				if ctx.get_kind(t) == etg::Creature && ctx.truehp(t) > 5 {
					data.dmg = 0;
				}
			}
			Self::wind => {
				let stored = ctx.get(c, Stat::storedatk);
				ctx.incrAtk(c, stored);
				ctx.set(c, Stat::storedatk, 0);
			}
			Self::wings => {
				if !ctx.get(t, Flag::airborne | Flag::ranged) {
					data.dmg = 0;
				}
			}
			Self::wisdom => {
				ctx.incrAtk(t, 3);
				if ctx.get(t, Flag::immaterial) {
					ctx.set(t, Flag::psionic, true);
				}
			}
			Self::yoink => {
				if ctx.get_kind(t) == etg::Player {
					Skill::foedraw.proc(ctx, c, t, data);
				} else {
					let town = ctx.get_owner(t);
					if !ctx.sanctified(town) {
						ctx.remove(t);
						let owner = ctx.get_owner(c);
						if !ctx.get_player(owner).hand.is_full() {
							ctx.addCard(owner, t);
						}
					}
				}
			}
			Self::v_acceleration(atk) => {
				Skill::growth(atk, -1).proc(ctx, c, 0, data);
			}
			Self::v_accelerationspell(atk) => {
				ctx.lobo(t);
				ctx.addskill(t, Event::OwnAttack, Skill::v_acceleration(atk));
			}
			Self::v_accretion => {
				if ctx.get_kind(t) != etg::Player {
					Skill::v_destroy.proc(ctx, c, t, data);
				}
				ctx.buffhp(c, 15);
				if ctx.truehp(c) > 45 {
					let owner = ctx.get_owner(c);
					let card = ctx.get(c, Stat::card);
					ctx.die(c);
					ctx.transform(c, card::As(card, card::v_BlackHole));
					ctx.addCard(owner, c);
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
			Self::v_blockwithcharge => {
				if ctx.maybeDecrStatus(c, Stat::charges) < 2 {
					ctx.remove(c);
				}
				data.dmg = 0;
			}
			Self::v_boneyard => {
				if !card::IsOf(ctx.get(t, Stat::card), card::v_Skeleton) {
					let owner = ctx.get_owner(c);
					let skele =
						ctx.new_thing(card::As(ctx.get(c, Stat::card), card::v_Skeleton), owner);
					ctx.addCrea(owner, skele);
				}
			}
			Self::v_bravery => {
				let owner = ctx.get_owner(c);
				let foe = ctx.get_foe(owner);
				if !ctx.get(foe, Flag::sanctuary) {
					let n = if ctx.get_player(owner).mark == etg::Fire {
						3
					} else {
						2
					};
					for _ in 0..n {
						if ctx.get_player(owner).hand.is_full()
							|| ctx.get_player(foe).hand.is_full()
						{
							return;
						}
						ctx.drawcard(owner);
						ctx.drawcard(foe);
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
				if ctx.get_kind(t) == etg::Creature && data.dmg > 0 && ctx.rng_ratio(3, 10) {
					ctx.freeze(t, 3);
				}
			}
			Self::v_cseed => {
				if let Some(sk) = ctx.choose(&[
					Skill::v_drainlife(0),
					Skill::v_firebolt(0),
					Skill::v_freeze,
					Skill::v_gpullspell,
					Skill::v_icebolt(0),
					Skill::v_infect,
					Skill::lightning,
					Skill::v_lobotomize,
					Skill::v_parallel,
					Skill::v_rewind,
					Skill::snipe,
					Skill::swave,
				]) {
					return sk.proc(ctx, c, t, data);
				}
			}
			Self::v_deja => {
				ctx.rmskill(c, Event::Cast, Skill::v_deja);
				Skill::v_parallel.proc(ctx, c, c, data);
			}
			Self::v_dessication => {
				let owner = ctx.get_owner(c);
				ctx.masscc(ctx.get_foe(owner), 0, |ctx, cr| {
					let gain = -ctx.dmg(cr, 2);
					ctx.spend(owner, etg::Water, gain);
				});
			}
			Self::v_disfield => {
				if !ctx.get(ctx.get_owner(c), Flag::sanctuary) {
					return Skill::disfield.proc(ctx, c, t, data);
				}
			}
			Self::v_disshield => {
				if !ctx.get(ctx.get_owner(c), Flag::sanctuary) {
					return Skill::disshield.proc(ctx, c, t, data);
				}
			}
			Self::v_dive => {
				ctx.fx(c, Fx::Sfx(Sfx::dive));
				ctx.fx(c, Fx::Dive);
				ctx.incrStatus(c, Stat::dive, ctx.trueatk(c));
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
				ctx.addskill(t, Event::Turnstart, Skill::dshieldoff);
			}
			Self::v_dshieldoff => {
				let owner = ctx.get_owner(c);
				if owner == t {
					ctx.set(c, Flag::immaterial, false);
					ctx.set(c, Flag::psionic, false);
					ctx.rmskill(c, Event::Turnstart, Skill::v_dshieldoff);
				}
			}
			Self::v_empathy => {
				let owner = ctx.get_owner(c);
				let heal = ctx.count_creatures(owner);
				ctx.fx(c, Fx::Heal(heal));
				ctx.dmg(owner, -heal);
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
			Self::v_evolve => {
				ctx.transform(c, card::As(ctx.get(c, Stat::card), card::v_Shrieker));
				ctx.set(c, Flag::burrowed, false);
			}
			Self::v_firebolt(cost) => {
				ctx.spelldmg(
					t,
					3 + 3
						* ((ctx.get_player(ctx.get_owner(c)).quanta(etg::Fire) + cost) as i32 / 10),
				);
			}
			Self::v_firewall => {
				if ctx.get_kind(t) == etg::Creature {
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
					&& ctx.get_kind(t) == etg::Creature
					&& ctx.get(t, Flag::airborne)
					&& !data.freedom && ctx.rng_range(0..4) < ctx.get(c, Stat::charges)
				{
					ctx.fx(t, Fx::Free);
					data.freedom = true;
				}
			}
			Self::v_freeevade => {
				let tgt = data.tgt;
				let tgtowner = ctx.get_owner(tgt);
				if tgt != 0
					&& tgtowner == ctx.get_owner(c)
					&& tgtowner != ctx.get_owner(t)
					&& ctx.get_kind(tgt) == etg::Creature
					&& ctx.get(tgt, Flag::airborne)
					&& ctx.get_card(ctx.get(tgt, Stat::card)).element as i32 == etg::Air
					&& ctx.rng_range(0..4) < ctx.get(c, Stat::charges)
				{
					data.evade = true;
				}
			}
			Self::v_gas => {
				let owner = ctx.get_owner(c);
				let gas =
					ctx.new_thing(card::As(ctx.get(c, Stat::card), card::v_UnstableGas), owner);
				ctx.addPerm(owner, gas);
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
			Self::v_guard => {
				ctx.delay(c, 1);
				ctx.delay(t, 1);
				if !ctx.get(t, Flag::airborne) {
					ctx.dmg(t, ctx.trueatk(c));
				}
			}
			Self::v_hatch => {
				ctx.fx(t, Fx::Hatch);
				if let Some(card) =
					ctx.random_card(card::Upped(ctx.get(c, Stat::card)), |ctx, card| {
						card.kind == etg::Creature as i8
							&& !legacy_banned(card::AsUpped(card.code as i32, false))
					}) {
					ctx.transform(c, card.code as i32);
				}
				if ctx.get(c, Stat::ready) != 0 {
					ctx.set(c, Stat::casts, 0);
					Skill::v_parallel.proc(ctx, c, c, data);
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
					card.kind == etg::Creature as i8 && !legacy_banned(card.code as i32)
				}) {
					ctx.transform(t, card.code as i32);
				}
			}
			Self::v_infect => return Skill::poison(1).proc(ctx, c, t, data),
			Self::v_integrity => {
				const shardSkills: [[Skill; 6]; 12] = [
					[
						Skill::deadalive,
						Skill::v_mutation,
						Skill::v_paradox,
						Skill::v_improve,
						Skill::v_scramble,
						Skill::v_antimatter,
					],
					[
						Skill::v_infect,
						Skill::growth(1, 1),
						Skill::growth(1, 1),
						Skill::poison(1),
						Skill::v_aflatoxin,
						Skill::poison(2),
					],
					[
						Skill::v_devour,
						Skill::v_devour,
						Skill::v_devour,
						Skill::v_devour,
						Skill::v_devour,
						Skill::v_blackhole,
					],
					[
						Skill::v_burrow,
						Skill::v_stoneform,
						Skill::v_guard,
						Skill::v_guard,
						Skill::v_bblood,
						Skill::v_bblood,
					],
					[
						Skill::growth(2, 2),
						Skill::adrenaline,
						Skill::adrenaline,
						Skill::adrenaline,
						Skill::adrenaline,
						Skill::v_mitosis,
					],
					[
						Skill::growth(2, 0),
						Skill::growth(2, 0),
						Skill::v_fiery,
						Skill::v_destroy,
						Skill::v_destroy,
						Skill::v_rage,
					],
					[
						Skill::v_steam,
						Skill::v_steam,
						Skill::v_freeze,
						Skill::v_freeze,
						Skill::v_nymph,
						Skill::v_nymph,
					],
					[
						Skill::v_mend,
						Skill::v_endow,
						Skill::v_endow,
						Skill::v_luciferin,
						Skill::v_luciferin,
						Skill::v_luciferin,
					],
					[
						Skill::v_queen,
						Skill::v_queen,
						Skill::snipe,
						Skill::v_dive,
						Skill::v_gas,
						Skill::v_gas,
					],
					[
						Skill::v_scarab,
						Skill::v_scarab,
						Skill::v_deja,
						Skill::v_deja,
						Skill::v_precognition,
						Skill::v_precognition,
					],
					[
						Skill::vampire,
						Skill::vampire,
						Skill::vampire,
						Skill::vampire,
						Skill::v_liquid,
						Skill::v_steal,
					],
					[
						Skill::v_lobotomize,
						Skill::v_lobotomize,
						Skill::v_lobotomize,
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
				let mut len = ctx.get_player(owner).hand.len();
				while idx < len {
					let code = ctx.get(ctx.get_player(owner).hand[idx], Stat::card);
					if etg::ShardList[1..]
						.iter()
						.any(|&shard| card::IsOf(code, shard))
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
						ctx.get_player_mut(owner).hand.remove(idx);
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
					Skill::v_guard => 1,
					Skill::v_bblood => 2,
					Skill::deadalive => 1,
					Skill::v_mutation => 2,
					Skill::v_paradox => 2,
					Skill::v_improve => 2,
					Skill::v_scramble => -2,
					Skill::v_antimatter => 4,
					Skill::v_infect => 1,
					Skill::growth(1, 1) => -4,
					Skill::poison(_) => -2,
					Skill::v_aflatoxin => 2,
					Skill::v_devour => 3,
					Skill::v_blackhole => 4,
					Skill::growth(2, 2) => 2,
					Skill::adrenaline => 2,
					Skill::v_mitosis => 4,
					Skill::growth(2, 0) => 1,
					Skill::v_fiery => -3,
					Skill::v_destroy => 3,
					Skill::v_rage => 2,
					Skill::v_steam => 2,
					Skill::v_freeze => 2,
					Skill::v_nymph => 4,
					Skill::v_heal => 1,
					Skill::v_endow => 2,
					Skill::v_luciferin => 4,
					Skill::v_queen => 2,
					Skill::snipe => 2,
					Skill::v_dive => 2,
					Skill::v_gas => 2,
					Skill::v_scarab => 2,
					Skill::v_deja => 4,
					Skill::v_neuro => -2,
					Skill::v_precognition => 2,
					Skill::v_siphon => -1,
					Skill::vampire => -2,
					Skill::v_liquid => 2,
					Skill::v_steal => 3,
					Skill::v_lobotomize => 2,
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
			Self::v_liquid => {
				ctx.fx(t, Fx::Liquid);
				ctx.lobo(t);
				ctx.setSkill(t, Event::Hit, &[Skill::vampire]);
				ctx.poison(t, 1);
			}
			Self::v_lobotomize => {
				ctx.fx(t, Fx::Sfx(Sfx::lobo));
				ctx.fx(t, Fx::Lobotomize);
				ctx.lobo(t);
				ctx.get_thing_mut(t).flag.0 &= !(Flag::momentum | Flag::psionic | Flag::mutant);
				ctx.set(t, Stat::casts, 0);
			}
			Self::v_lycanthropy => {
				ctx.buffhp(c, 5);
				ctx.incrAtk(c, 5);
				ctx.rmskill(c, Event::Cast, Self::v_lycanthropy);
			}
			Self::v_mend => {
				ctx.dmg(t, -5);
			}
			Self::v_mitosisspell => {
				ctx.lobo(t);
				let card = ctx.get_card(ctx.get(t, Stat::card));
				ctx.setSkill(t, Event::Cast, &[Skill::mitosis]);
				ctx.set(t, Stat::castele, card.costele as i32);
				ctx.set(t, Stat::cast, card.cost as i32);
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
			Self::v_nova => {
				let owner = ctx.get_owner(c);
				for i in 1..13 {
					ctx.spend(owner, i, -1);
				}
				ctx.incrStatus(owner, Stat::nova, 1);
				if ctx.get(owner, Stat::nova) >= 3 {
					let shiny = card::Shiny(ctx.get(c, Stat::card));
					ctx.transform(c, card::AsShiny(card::v_Singularity, shiny));
					ctx.addCrea(owner, c);
				}
			}
			Self::v_nova2 => {
				let owner = ctx.get_owner(c);
				for i in 1..13 {
					ctx.spend(owner, i, -2);
				}
				ctx.incrStatus(owner, Stat::nova2, 1);
				if ctx.get(owner, Stat::nova2) >= 2 {
					let shiny = card::Shiny(ctx.get(c, Stat::card));
					ctx.transform(
						c,
						card::AsShiny(card::AsUpped(card::v_Singularity, true), shiny),
					);
					ctx.addCrea(owner, c);
				}
			}
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
				let nymph = ctx.new_thing(card::As(code, nymphcode), town);
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
			Self::v_phoenix => {
				let index = data.index;
				let owner = ctx.get_owner(c);
				if ctx.get_player(owner).creatures[index as usize] == 0 {
					let ash = ctx.new_thing(card::As(ctx.get(c, Stat::card), card::v_Ash), owner);
					ctx.setCrea(owner, index as i32, ash);
				}
			}
			Self::v_plague => {
				ctx.masscc(ctx.get_foe(ctx.get_owner(c)), 0, |ctx, cr| {
					ctx.poison(cr, 1);
				});
			}
			Self::v_queen => {
				let owner = ctx.get_owner(c);
				let inst = ctx.new_thing(card::As(ctx.get(c, Stat::card), card::v_Firefly), owner);
				ctx.addCrea(owner, inst);
			}
			Self::v_readiness => {
				ctx.fx(t, Fx::Ready);
				ctx.set(t, Stat::cast, 0);
				if ctx.get_card(ctx.get(t, Stat::card)).element as i32 == etg::Time
					&& ctx.get(t, Stat::ready) == 0
				{
					ctx.set(t, Stat::ready, 1);
					ctx.set(t, Stat::casts, 2);
				}
			}
			Self::v_rebirth => {
				ctx.transform(c, card::As(ctx.get(c, Stat::card), card::v_Phoenix));
			}
			Self::v_regenerate => {
				if ctx.get(c, Stat::delayed) == 0 {
					ctx.dmg(ctx.get_owner(c), -5);
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
			Self::v_scarab => {
				let owner = ctx.get_owner(c);
				let inst = ctx.new_thing(card::As(ctx.get(c, Stat::card), card::v_Scarab), owner);
				ctx.addCrea(owner, inst);
			}
			Self::v_scramble => {
				if ctx.get_kind(t) == etg::Player && !ctx.sanctified(t) {
					let mut n = 0;
					while n > -9 && ctx.spend(t, etg::Chroma, 1) {
						n -= 1;
					}
					ctx.spend(t, etg::Chroma, n);
				}
			}
			Self::v_serendipity => {
				let owner = ctx.get_owner(c);
				let num = cmp::min(8 - ctx.get_player(owner).hand.len(), 3);
				let mut anyentro = false;
				let ccard = ctx.get(c, Stat::card);
				for i in (0..num).rev() {
					if let Some(card) = ctx.random_card(card::Upped(ccard), |ctx, card| {
						card.rarity != 15
							&& card.rarity != 20 && !card::IsOf(card.code as i32, card::v_Relic)
							&& !card::IsOf(card.code as i32, card::v_Miracle)
							&& !etg::ShardList[1..]
								.iter()
								.any(|&shard| !card::IsOf(card.code as i32, shard))
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
				if !ctx.get(foe, Flag::sanctuary) {
					ctx.set(foe, Stat::casts, 0);
				}
			}
			Self::v_slow => {
				if ctx.get_kind(t) == etg::Creature {
					ctx.delay(t, 2);
				}
			}
			Self::v_solar => {
				let owner = ctx.get_owner(c);
				if !ctx.get(owner, Flag::sanctuary) {
					ctx.spend(owner, etg::Light, -1);
				}
			}
			Self::v_soulcatch => {
				ctx.spend(
					ctx.get_owner(c),
					etg::Death,
					if card::Upped(ctx.get(c, Stat::card)) {
						-3
					} else {
						-2
					},
				);
			}
			Self::v_sskin => {
				let owner = ctx.get_owner(c);
				let earth = ctx.get_player(owner).quanta(etg::Earth) as i32;
				let cost = ctx.get_card(ctx.get(c, Stat::card)).cost as i32;
				ctx.buffhp(owner, earth - cost);
			}
			Self::v_steal => {
				let kind = ctx.get_kind(t);
				let owner = ctx.get_owner(c);
				let card = ctx.get(t, Stat::card);
				if ctx.get(t, Flag::stackable) {
					ctx.destroy(t, None);
					if kind == etg::Shield {
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
					if kind == etg::Permanent {
						ctx.addPerm(owner, t);
					} else if kind == etg::Weapon {
						ctx.setWeapon(owner, t);
					} else {
						ctx.setShield(owner, t);
					}
				}
			}
			Self::v_storm2 => {
				return Skill::storm(2).proc(ctx, c, ctx.get_foe(ctx.get_owner(c)), data)
			}
			Self::v_storm3 => {
				return Skill::storm(3).proc(ctx, c, ctx.get_foe(ctx.get_owner(c)), data)
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
				if ctx.get_kind(c) == etg::Creature && data.dmg > 0 && ctx.rng_ratio(3, 4) {
					ctx.poison(t, 1);
				}
			}
			Self::v_unburrow => {
				ctx.set(c, Flag::burrowed, false);
				ctx.setSkill(c, Event::Cast, &[Skill::burrow]);
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
			Self::v_wisdom => {
				ctx.incrAtk(t, 4);
				if ctx.get(t, Flag::immaterial) {
					ctx.set(t, Flag::psionic, true);
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
			| Self::v_hammer
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
						.filter(|&&pr| pr != 0 && ctx.get(pr, Flag::cloak))
						.count() as i32
			}
			Self::disc => {
				let mark = ctx.get_player(ctx.get_owner(c)).mark;
				(mark == etg::Entropy || mark == etg::Aether) as i32
			}
			Self::hammer | Self::v_hammer => {
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

impl<'tgt> Tgt<'tgt> {
	pub fn full_check(self, ctx: &Game, c: i32, t: i32) -> bool {
		let kind = ctx.get_kind(t);
		(if kind == etg::Player {
			!ctx.get(t, Flag::out)
		} else {
			let owner = ctx.get_owner(t);
			ctx.getIndex(t) != -1
				&& (owner == ctx.turn || !ctx.is_cloaked(owner) || ctx.get(t, Flag::cloak))
		}) && self.check(ctx, c, t)
	}

	pub fn check(self, ctx: &Game, c: i32, t: i32) -> bool {
		match self {
			Tgt::own => ctx.get_owner(c) == ctx.get_owner(t),
			Tgt::foe => ctx.get_owner(c) != ctx.get_owner(t),
			Tgt::notself => c != t,
			Tgt::all => true,
			Tgt::card => c != t && ctx.get_kind(t) == etg::Spell,
			Tgt::pill => ctx.material(t, etg::Permanent) && ctx.get(t, Flag::pillar),
			Tgt::weap => {
				let tkind = ctx.get_kind(t);
				ctx.material(t, 0)
					&& (tkind == etg::Weapon
						|| (tkind != etg::Spell && {
							let card = ctx.get(t, Stat::card);
							card != 0 && ctx.get_card(card).kind as i32 == etg::Weapon
						}))
			}
			Tgt::shie => {
				let tkind = ctx.get_kind(t);
				ctx.material(t, 0)
					&& (tkind == etg::Shield
						|| (tkind != etg::Spell && {
							let card = ctx.get(t, Stat::card);
							card != 0 && ctx.get_card(card).kind as i32 == etg::Shield
						}))
			}
			Tgt::playerweap => ctx.get_kind(t) == etg::Weapon,
			Tgt::perm => ctx.material(t, etg::Permanent),
			Tgt::nonstack => !ctx.get(t, Flag::stackable),
			Tgt::permstack => ctx.material(t, etg::Permanent) && ctx.get(t, Flag::stackable),
			Tgt::crea => ctx.material(t, etg::Creature),
			Tgt::creacrea => ctx.material(t, etg::Creature) && ctx.get_kind(t) == etg::Creature,
			Tgt::play => ctx.get_kind(t) == etg::Player,
			Tgt::notplay => ctx.get_kind(t) != etg::Player,
			Tgt::sing => {
				ctx.material(t, etg::Creature)
					&& ctx
						.getSkill(t, Event::Cast)
						.iter()
						.all(|&s| s != Skill::sing)
			}
			Tgt::butterfly => {
				let tkind = ctx.get_kind(t);
				(tkind == etg::Creature || tkind == etg::Weapon)
					&& !ctx.get(t, Flag::immaterial | Flag::burrowed)
					&& (ctx.trueatk(t) < 3 || (tkind == etg::Creature && ctx.truehp(t) < 3))
			}
			Tgt::v_butterfly => ctx.material(t, etg::Creature) && ctx.trueatk(t) < 3,
			Tgt::devour => ctx.material(t, etg::Creature) && ctx.truehp(t) < ctx.truehp(c),
			Tgt::paradox => ctx.material(t, etg::Creature) && ctx.truehp(t) < ctx.trueatk(t),
			Tgt::notskele => {
				ctx.material(t, etg::Creature)
					&& !card::IsOf(ctx.get(t, Stat::card), card::Skeleton)
			}
			Tgt::forceplay => {
				ctx.get_kind(t) == etg::Spell
					|| (ctx.material(t, 0)
						&& ctx
							.getSkill(t, Event::Cast)
							.first()
							.map(|&s| s != Skill::forceplay)
							.unwrap_or(false))
			}
			Tgt::airbornecrea => ctx.material(t, etg::Creature) && ctx.get(t, Flag::airborne),
			Tgt::golem => {
				let tkind = ctx.get_kind(t);
				(tkind == etg::Weapon || tkind == etg::Creature) && ctx.get(t, Flag::golem)
			}
			Tgt::groundcrea => ctx.material(t, etg::Creature) && !ctx.get(t, Flag::airborne),
			Tgt::wisdom => {
				let tkind = ctx.get_kind(t);
				(tkind == etg::Creature || tkind == etg::Weapon) && !ctx.get(t, Flag::burrowed)
			}
			Tgt::quinttog => ctx.get_kind(t) == etg::Creature && !ctx.get(t, Flag::burrowed),
			Tgt::And(terms) => terms.iter().all(|term| term.check(ctx, c, t)),
			Tgt::Or(terms) => terms.iter().any(|term| term.check(ctx, c, t)),
		}
	}
}

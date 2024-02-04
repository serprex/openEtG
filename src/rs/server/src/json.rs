#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

use std::borrow::Cow;
use std::collections::HashSet;

use fxhash::FxHashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::cardpool::Cardpool;
use crate::users::{Leaderboard, UserData, UserObject};

#[derive(Deserialize, Clone)]
#[serde(tag = "z")]
pub enum AuthMessage {
	modadd {
		m: String,
	},
	modrm {
		m: String,
	},
	modresetpass {
		m: String,
	},
	codesmithadd {
		m: String,
	},
	codesmithrm {
		m: String,
	},
	modguest {
		m: String,
	},
	modmute {
		m: String,
	},
	modclear,
	modmotd {
		m: String,
	},
	inituser {
		e: u8,
	},
	loginoriginal,
	initoriginal {
		e: u8,
		name: String,
	},
	logout,
	delete,
	altcreate {
		e: u8,
		name: String,
		flags: HashSet<String>,
	},
	altdelete {
		name: String,
	},
	setarena {
		d: String,
		#[serde(default)]
		r#mod: bool,
		lv: u8,
		hp: u16,
		draw: u8,
		mark: u8,
	},
	arenainfo,
	modarena {
		aname: String,
		won: bool,
		lv: u8,
	},
	foearena {
		lv: u8,
	},
	stat {
		#[serde(default)]
		set: String,
		stats: Vec<Value>,
		players: Vec<Value>,
	},
	setgold {
		t: String,
		g: i32,
	},
	addpool {
		t: String,
		pool: String,
		bound: bool,
	},
	codecreate {
		t: String,
	},
	codesubmit {
		code: String,
	},
	codesubmit2 {
		code: String,
		card: i16,
	},
	foewant {
		f: String,
		#[serde(default)]
		set: String,
		#[serde(default)]
		deck: String,
		deckcheck: bool,
	},
	canceltrade {
		f: String,
	},
	reloadtrade {
		f: String,
	},
	offertrade {
		f: String,
		cards: String,
		g: u16,
		foralt: Option<String>,
		forcards: Option<String>,
		forg: Option<u16>,
	},
	oracle,
	passchange {
		p: String,
	},
	challrecv {
		f: String,
		#[serde(default)]
		trade: bool,
	},
	chat {
		to: Option<String>,
		msg: String,
	},
	bzcancel {
		c: i16,
	},
	bzbid {
		p: i16,
		q: u16,
		c: i16,
	},
	booster {
		pack: u8,
		bulk: u8,
		element: u8,
	},
	r#move {
		id: i64,
		prehash: u32,
		hash: u32,
		cmd: GamesMoveCmd,
	},
	reloadmoves {
		id: i64,
	},
	updateorig {
		deck: Option<String>,
	},
	origadd {
		pool: Option<String>,
		rmpool: Option<String>,
		electrum: Option<i32>,
		fg: Option<i16>,
		oracle: Option<u32>,
	},
	roll {
		#[serde(rename = "A")]
		rolls: u8,
		#[serde(rename = "X")]
		sides: u32,
	},
	upgrade {
		card: i16,
	},
	downgrade {
		card: i16,
	},
	polish {
		card: i16,
	},
	unpolish {
		card: i16,
	},
	uppillar {
		c: i16,
	},
	shpillar {
		c: i16,
	},
	upshall,
	addgold {
		g: i16,
	},
	addloss {
		#[serde(default)]
		pvp: bool,
		#[serde(default)]
		l: Option<u8>,
		#[serde(default)]
		g: Option<i16>,
		#[serde(default)]
		c: Option<i16>,
		#[serde(default)]
		bound: bool,
	},
	addwin {
		pvp: bool,
	},
	setstreak {
		l: u8,
		n: u16,
	},
	addcards {
		c: String,
		#[serde(default)]
		bound: bool,
	},
	rmcard {
		c: i16,
		#[serde(default)]
		bound: bool,
	},
	donedaily {
		#[serde(default)]
		c: i16,
		daily: u8,
	},
	changeqeck {
		name: String,
		number: u8,
	},
	setdeck {
		name: String,
		d: Option<String>,
	},
	rmdeck {
		name: String,
	},
	setquest {
		quest: String,
	},
}

#[derive(Deserialize, Clone)]
#[serde(tag = "x")]
pub enum UserMessage {
	a {
		u: String,
		a: String,
		#[serde(default)]
		uname: String,
		#[serde(flatten)]
		msg: AuthMessage,
	},
	login {
		u: String,
		p: Option<String>,
		a: Option<String>,
	},
	konglogin {
		u: u64,
		g: String,
	},
	guestchat {
		u: String,
		msg: String,
	},
	motd,
	r#mod,
	codesmith,
	librarywant {
		f: String,
		#[serde(default)]
		a: String,
	},
	arenatop {
		lv: u8,
	},
	leaderboard {
		flags: HashSet<String>,
		category: Leaderboard,
	},
	chatus {
		hide: Option<bool>,
		afk: Option<bool>,
	},
	who,
	bzread,
}

#[derive(Serialize, Clone)]
pub struct ArenaInfo<'a> {
	pub day: u32,
	pub draw: i32,
	pub mark: i32,
	pub hp: i32,
	pub win: i32,
	pub loss: i32,
	pub card: i32,
	pub deck: &'a str,
	pub rank: i32,
	pub bestrank: i32,
}

#[derive(Serialize, Clone)]
pub struct Alt<'a> {
	pub name: &'a str,
	pub data: &'a UserData,
}

#[derive(Serialize, Clone)]
#[serde(tag = "x")]
pub enum WsResponse<'a> {
	altadd(Alt<'a>),
	arenainfo {
		#[serde(rename = "A")]
		a1: Option<ArenaInfo<'a>>,
		#[serde(rename = "B")]
		a2: Option<ArenaInfo<'a>>,
	},
	arenatop {
		lv: u8,
		top: &'a [(String, i32, i32, i32, u32, i32, String)],
	},
	boostergive {
		cards: &'a Cardpool,
		accountbound: bool,
		packtype: u8,
		g: i32,
	},
	bzbid {
		add: &'a FxHashMap<i16, Vec<BzBid<'a>>>,
		rm: &'a FxHashMap<i16, Vec<BzBid<'a>>>,
		g: i32,
		pool: &'a Cardpool,
	},
	#[serde(rename = "bzgive")]
	bzgivec {
		msg: &'a str,
		c: &'a str,
	},
	#[serde(rename = "bzgive")]
	bzgiveg {
		msg: &'a str,
		g: i32,
	},
	bzread {
		bz: &'a FxHashMap<i16, Vec<BzBid<'a>>>,
	},
	challenge {
		f: &'a str,
		set: &'a str,
		deckcheck: bool,
	},
	chat {
		mode: u8,
		msg: &'a str,
	},
	#[serde(rename = "chat")]
	chatu {
		mode: u8,
		msg: &'a str,
		u: &'a str,
	},
	#[serde(rename = "chat")]
	chatguest {
		guest: bool,
		msg: &'a str,
		u: &'a str,
	},
	clear,
	codecard {
		r#type: &'a str,
	},
	codecode {
		card: i16,
	},
	codedone {
		card: i16,
	},
	codegold {
		g: i32,
	},
	foearena {
		seed: u32,
		name: &'a str,
		hp: i32,
		mark: i32,
		draw: i32,
		deck: &'a str,
		rank: i64,
		lv: u8,
	},
	librarygive {
		pool: &'a Cardpool,
		bound: &'a Cardpool,
		gold: i32,
		pvpwins: i32,
		pvplosses: i32,
		aiwins: i32,
		ailosses: i32,
	},
	login(&'a UserObject),
	#[serde(rename = "login")]
	loginfail {
		err: &'a str,
	},
	r#move {
		cmd: GamesMoveCmd,
		hash: u32,
	},
	mute {
		m: &'a str,
	},
	offertrade {
		f: &'a str,
		a: &'a str,
		c: &'a str,
		g: i32,
		flags: Option<&'a HashSet<String>>,
	},
	originaldata(&'a LegacyUser),
	#[serde(rename = "originaldata")]
	originaldataempty,
	oracle {
		c: i16,
		bound: bool,
		mage: u8,
		dg: u8,
		day: u32,
	},
	passchange {
		auth: &'a str,
	},
	pvpgive {
		id: i64,
		data: &'a GamesData,
	},
	reloadmoves {
		moves: &'a [GamesMoveCmd],
	},
	roll {
		u: &'a str,
		#[serde(rename = "A")]
		rolls: u8,
		#[serde(rename = "X")]
		sides: u32,
		sum: u64,
	},
	tradecanceled {
		u: &'a str,
	},
	tradedone {
		alt: &'a str,
		oldcards: &'a str,
		newcards: &'a str,
		g: i32,
	},
	leaderboard {
		flags: HashSet<String>,
		category: Leaderboard,
		top: &'a [(&'a str, &'a str, i32)],
	},
}

#[derive(Serialize, Clone)]
pub struct BzBid<'a> {
	pub u: Cow<'a, str>,
	pub q: u16,
	pub p: i16,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LegacyUser {
	pub pool: Cardpool,
	pub deck: String,
	pub electrum: i32,
	#[serde(default)]
	pub oracle: u32,
	#[serde(default)]
	pub fg: Option<u16>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GamesData {
	pub set: String,
	pub seed: u32,
	pub players: Vec<GamesDataPlayer>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GamesDataPlayer {
	pub idx: u8,
	pub user: String,
	pub name: String,
	pub deck: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GamesMove {
	pub cmd: GamesMoveCmd,
	pub hash: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
#[serde(tag = "x")]
pub enum GamesMoveCmd {
	end {
		#[serde(default)]
		t: i32,
	},
	cast {
		c: i32,
		#[serde(default)]
		t: i32,
	},
	accept,
	mulligan,
	foe {
		t: i32,
	},
	resign {
		c: i32,
	},
}

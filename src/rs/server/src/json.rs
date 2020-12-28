#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

use std::borrow::Cow;

use fxhash::FxHashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::cardpool::Cardpool;
use crate::users::UserObject;

#[derive(Deserialize, Clone)]
#[serde(tag = "x")]
pub enum UserMessage {
	modadd {
		u: String,
		a: String,
		m: String,
	},
	modrm {
		u: String,
		a: String,
		m: String,
	},
	codesmithadd {
		u: String,
		a: String,
		m: String,
	},
	codesmithrm {
		u: String,
		a: String,
		m: String,
	},
	modguest {
		u: String,
		a: String,
		m: String,
	},
	modmute {
		u: String,
		a: String,
		m: String,
	},
	modclear {
		u: String,
		a: String,
	},
	modmotd {
		u: String,
		a: String,
		m: String,
	},
	inituser {
		u: String,
		a: String,
		e: u8,
	},
	loginoriginal {
		u: String,
		a: String,
	},
	initoriginal {
		u: String,
		a: String,
		e: u8,
		name: String,
	},
	logout {
		u: String,
		a: String,
	},
	delete {
		u: String,
		a: String,
	},
	setarena {
		u: String,
		a: String,
		d: String,
		#[serde(default)]
		r#mod: bool,
		lv: u8,
		hp: u16,
		draw: u8,
		mark: u8,
	},
	arenainfo {
		u: String,
		a: String,
	},
	modarena {
		u: String,
		a: String,
		aname: String,
		won: bool,
		lv: u8,
	},
	foearena {
		u: String,
		a: String,
		lv: u8,
	},
	stat {
		u: String,
		a: String,
		#[serde(default)]
		set: String,
		stats: Vec<Value>,
		players: Vec<Value>,
	},
	setgold {
		u: String,
		a: String,
		t: String,
		g: i32,
	},
	addpool {
		u: String,
		a: String,
		t: String,
		pool: String,
		bound: bool,
	},
	codecreate {
		u: String,
		a: String,
		t: String,
	},
	codesubmit {
		u: String,
		a: String,
		code: String,
	},
	codesubmit2 {
		u: String,
		a: String,
		code: String,
		card: u16,
	},
	foewant {
		u: String,
		a: String,
		f: String,
		#[serde(default)]
		set: String,
		#[serde(default)]
		deck: String,
		deckcheck: bool,
	},
	canceltrade {
		u: String,
		a: String,
		f: String,
	},
	reloadtrade {
		u: String,
		a: String,
		f: String,
	},
	offertrade {
		u: String,
		a: String,
		f: String,
		forcards: Option<String>,
		forg: Option<u16>,
		cards: String,
		g: u16,
	},
	passchange {
		u: String,
		a: String,
		p: String,
	},
	challrecv {
		u: String,
		a: String,
		f: String,
		#[serde(default)]
		trade: bool,
	},
	chat {
		u: String,
		a: String,
		to: Option<String>,
		msg: String,
	},
	bzcancel {
		u: String,
		a: String,
		c: u16,
	},
	bzbid {
		u: String,
		a: String,
		price: i16,
		cards: String,
	},
	booster {
		u: String,
		a: String,
		pack: u8,
		bulk: u8,
		element: u8,
	},
	r#move {
		u: String,
		a: String,
		id: i64,
		prehash: i32,
		hash: i32,
		cmd: GamesMoveCmd,
	},
	reloadmoves {
		u: String,
		a: String,
		id: i64,
	},
	updateorig {
		u: String,
		a: String,
		deck: Option<String>,
	},
	origadd {
		u: String,
		a: String,
		pool: Option<String>,
		rmpool: Option<String>,
		electrum: Option<i16>,
	},
	origimport {
		u: String,
		a: String,
		name: String,
		pass: String,
	},
	roll {
		u: String,
		a: String,
		#[serde(rename = "A")]
		rolls: u8,
		#[serde(rename = "X")]
		sides: u32,
	},
	// noauth
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
	},
	arenatop {
		lv: u8,
	},
	wealthtop,
	chatus {
		hide: Option<bool>,
		afk: Option<bool>,
	},
	who,
	bzread,
	// usercmd
	upgrade {
		u: String,
		a: String,
		card: u16,
	},
	downgrade {
		u: String,
		a: String,
		card: u16,
	},
	polish {
		u: String,
		a: String,
		card: u16,
	},
	unpolish {
		u: String,
		a: String,
		card: u16,
	},
	uppillar {
		u: String,
		a: String,
		c: u16,
	},
	shpillar {
		u: String,
		a: String,
		c: u16,
	},
	upshall {
		u: String,
		a: String,
	},
	addgold {
		u: String,
		a: String,
		g: i16,
	},
	addloss {
		u: String,
		a: String,
		pvp: bool,
		l: Option<u8>,
		g: Option<i16>,
	},
	addwin {
		u: String,
		a: String,
		pvp: bool,
	},
	setstreak {
		u: String,
		a: String,
		l: u8,
		n: u16,
	},
	addcards {
		u: String,
		a: String,
		c: String,
	},
	addboundcards {
		u: String,
		a: String,
		c: String,
	},
	donedaily {
		u: String,
		a: String,
		#[serde(default)]
		c: u16,
		daily: u8,
	},
	changeqeck {
		u: String,
		a: String,
		name: String,
		number: u8,
	},
	setdeck {
		u: String,
		a: String,
		name: String,
		d: Option<String>,
	},
	rmdeck {
		u: String,
		a: String,
		name: String,
	},
	setquest {
		u: String,
		a: String,
		quest: String,
	},
}

impl UserMessage {
	pub fn get_ua(&self) -> Option<(&str, &str)> {
		match *self {
			UserMessage::modadd { ref u, ref a, .. }
			| UserMessage::modrm { ref u, ref a, .. }
			| UserMessage::codesmithadd { ref u, ref a, .. }
			| UserMessage::codesmithrm { ref u, ref a, .. }
			| UserMessage::modguest { ref u, ref a, .. }
			| UserMessage::modmute { ref u, ref a, .. }
			| UserMessage::modclear { ref u, ref a }
			| UserMessage::modmotd { ref u, ref a, .. }
			| UserMessage::inituser { ref u, ref a, .. }
			| UserMessage::loginoriginal { ref u, ref a }
			| UserMessage::initoriginal { ref u, ref a, .. }
			| UserMessage::logout { ref u, ref a }
			| UserMessage::delete { ref u, ref a }
			| UserMessage::setarena { ref u, ref a, .. }
			| UserMessage::arenainfo { ref u, ref a }
			| UserMessage::modarena { ref u, ref a, .. }
			| UserMessage::foearena { ref u, ref a, .. }
			| UserMessage::stat { ref u, ref a, .. }
			| UserMessage::setgold { ref u, ref a, .. }
			| UserMessage::addpool { ref u, ref a, .. }
			| UserMessage::codecreate { ref u, ref a, .. }
			| UserMessage::codesubmit { ref u, ref a, .. }
			| UserMessage::codesubmit2 { ref u, ref a, .. }
			| UserMessage::foewant { ref u, ref a, .. }
			| UserMessage::canceltrade { ref u, ref a, .. }
			| UserMessage::reloadtrade { ref u, ref a, .. }
			| UserMessage::offertrade { ref u, ref a, .. }
			| UserMessage::passchange { ref u, ref a, .. }
			| UserMessage::challrecv { ref u, ref a, .. }
			| UserMessage::chat { ref u, ref a, .. }
			| UserMessage::bzcancel { ref u, ref a, .. }
			| UserMessage::bzbid { ref u, ref a, .. }
			| UserMessage::booster { ref u, ref a, .. }
			| UserMessage::r#move { ref u, ref a, .. }
			| UserMessage::reloadmoves { ref u, ref a, .. }
			| UserMessage::updateorig { ref u, ref a, .. }
			| UserMessage::origadd { ref u, ref a, .. }
			| UserMessage::origimport { ref u, ref a, .. }
			| UserMessage::roll { ref u, ref a, .. }
			| UserMessage::upgrade { ref u, ref a, .. }
			| UserMessage::downgrade { ref u, ref a, .. }
			| UserMessage::polish { ref u, ref a, .. }
			| UserMessage::unpolish { ref u, ref a, .. }
			| UserMessage::uppillar { ref u, ref a, .. }
			| UserMessage::shpillar { ref u, ref a, .. }
			| UserMessage::upshall { ref u, ref a, .. }
			| UserMessage::addgold { ref u, ref a, .. }
			| UserMessage::addloss { ref u, ref a, .. }
			| UserMessage::addwin { ref u, ref a, .. }
			| UserMessage::setstreak { ref u, ref a, .. }
			| UserMessage::addcards { ref u, ref a, .. }
			| UserMessage::addboundcards { ref u, ref a, .. }
			| UserMessage::donedaily { ref u, ref a, .. }
			| UserMessage::changeqeck { ref u, ref a, .. }
			| UserMessage::setdeck { ref u, ref a, .. }
			| UserMessage::rmdeck { ref u, ref a, .. }
			| UserMessage::setquest { ref u, ref a, .. } => Some((u.as_str(), a.as_str())),
			_ => None,
		}
	}
}

#[derive(Serialize, Clone)]
#[serde(tag = "x")]
pub enum WsResponse<'a> {
	arenatop {
		lv: u8,
		top: &'a [[Value; 6]],
	},
	boostergive {
		cards: &'a Cardpool,
		accountbound: bool,
		packtype: u8,
	},
	bzbid {
		add: &'a FxHashMap<u16, Vec<BzBid<'a>>>,
		rm: &'a FxHashMap<u16, Vec<BzBid<'a>>>,
		g: i32,
		pool: &'a Cardpool,
	},
	bzread {
		bz: &'a FxHashMap<u16, Vec<Value>>,
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
	clear,
	codecard {
		r#type: &'a str,
	},
	codecode {
		card: i32,
	},
	codedone {
		card: u16,
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
		hash: i32,
	},
	mute {
		m: &'a str,
	},
	offertrade {
		f: &'a str,
		c: &'a str,
		g: i32,
	},
	originaldata(&'a LegacyUser),
	#[serde(rename = "originaldata")]
	originaldataempty,
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
	setorigpool {
		pool: &'a Cardpool,
	},
	tradecanceled {
		u: &'a str,
	},
	tradedone {
		oldcards: &'a str,
		newcards: &'a str,
		g: i32,
	},
	wealthtop {
		top: &'a [Value],
	},
}

#[derive(Serialize, Clone)]
pub struct BzBid<'a> {
	pub u: Cow<'a, str>,
	pub q: i32,
	pub p: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LegacyUser {
	pub pool: Cardpool,
	pub deck: String,
	pub electrum: i32,
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
	pub hash: i32,
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

#![allow(non_snake_case)]

use std::collections::BTreeMap;
use std::fmt::Write;
use std::fs;

use serde::Serialize;
use serde_json::Value;

#[derive(Default, Serialize)]
struct Enums {
	Event: BTreeMap<u16, String>,
	EventId: BTreeMap<String, u16>,
	Flag: BTreeMap<u16, String>,
	FlagId: BTreeMap<String, u16>,
	Fx: BTreeMap<u16, String>,
	Skill: BTreeMap<u16, String>,
	SkillParams: BTreeMap<u16, u16>,
	Stat: BTreeMap<u16, String>,
	StatId: BTreeMap<String, u16>,
}

fn subsource<'a, 'b>(source: &'a str, prefix: &'b str) -> &'a str {
	let prefixidx = source.find(prefix).expect("failed to find prefix");
	let length = source[prefixidx..]
		.find("\n}\n")
		.expect("failed to find } after prefix");
	&source[prefixidx + prefix.len()..prefixidx + length]
}

struct Card {
	code: u16,
	name: String,
	kind: u8,
	ele: u8,
	rarity: i8,
	attack: i8,
	health: i8,
	cost: i8,
	costele: u8,
	cast: i8,
	castele: u8,
	status: String,
	flag: String,
	skill: String,
}

fn parseCost(s: &str, ele: u8) -> Option<(i8, u8)> {
	if let Some(colonidx) = s.find(':') {
		let cost = s[..colonidx]
			.parse::<i8>()
			.expect("invalid cost in cost:ele");
		let costele = s[colonidx + 1..]
			.parse::<u8>()
			.expect("invalid ele in cost:ele");
		Some((cost, costele))
	} else {
		s.parse::<i8>()
			.ok()
			.map(|val| (val, if val == 0 { 0 } else { ele }))
	}
}

fn parseCostValue(value: &Value, ele: u8) -> Option<(i8, u8)> {
	if let Some(num) = value.as_i64() {
		Some((num as i8, ele))
	} else {
		let s = value
			.as_str()
			.expect("non-numerical potential costs must be strings");
		parseCost(s, ele)
	}
}

const WEAPON: u8 = 0;
const SHIELD: u8 = 1;
const SPELL: u8 = 3;
const CREATURE: u8 = 4;

fn process_cards(set: &'static str, path: &'static str, source: &mut String, enums: &mut Enums) {
	let cards_json = fs::read_to_string(path).expect("failed to read Cards.json");
	let cards_data = serde_json::from_str::<Vec<Vec<Vec<Value>>>>(&cards_json)
		.expect("failed to parse Cards.json");
	let mut cards: Vec<Card> = Vec::new();
	for (kind, data0) in cards_data.into_iter().enumerate() {
		let kind = kind as u8;
		for (ele, data1) in data0.into_iter().skip(1).enumerate() {
			let ele = ele as u8;
			for data in data1.into_iter() {
				let data = data.as_array().expect("data not an array");
				let name = data[0].as_str().expect("name not a string");
				let code = data[1].as_u64().expect("code not an integer") as u16;
				let (cost, costele) = parseCostValue(&data[2], ele).expect("cost not a cost");
				let rarity = if set == "Open" {
					&data[3]
				} else {
					data.last().unwrap()
				}
				.as_i64()
				.expect("rarity not an integer") as i8;
				let upped = (code - 1000) % 4000 > 1999;
				let (attack, health) = if kind == WEAPON || kind == CREATURE || kind == SHIELD {
					let a = if kind != SHIELD {
						data[4 + (set == "Open") as usize]
							.as_i64()
							.expect("attack not an integer") as i8
					} else {
						0
					};
					let h = data[5 - (kind == SHIELD) as usize + (set == "Open") as usize]
						.as_i64()
						.expect("health not an integer") as i8;
					(a, h)
				} else {
					(0, 0)
				};
				let mut cast = 0;
				let mut castele = 0;
				let mut statstr = String::from("&[");
				let mut flagstr = String::from("&0");
				if kind != SPELL {
					let mut stat = Vec::new();
					let mut flag = Vec::new();
					let status = data[data.len() - 1 - (set == "Orig") as usize]
						.as_str()
						.expect("status not a string");
					if !status.is_empty() {
						for st in status.split("+") {
							let mut split = st.splitn(2, '=');
							if enums.FlagId.contains_key(st) {
								flag.push(String::from(st));
							} else {
								let key = split.next().unwrap();
								assert!(enums.StatId.contains_key(key));
								let val = split.next().unwrap_or("1");
								stat.push((String::from(key), val));
							}
						}
						for st in stat {
							write!(statstr, "(Stat::{},{}),", st.0, st.1).ok();
						}
					}
					if !flag.is_empty() {
						let lastch = flagstr.len() - 1;
						unsafe { flagstr.as_mut_vec()[lastch] = b'(' };
						for fl in flag {
							write!(flagstr, "Flag::{}|", fl).ok();
						}
						let lastch = flagstr.len() - 1;
						unsafe { flagstr.as_mut_vec()[lastch] = b')' };
					}
				}
				statstr.push(']');

				let mut skillstr = String::from("&[");
				let skill = data[3 + (set == "Open") as usize]
					.as_str()
					.expect("skill not a string");
				if !skill.is_empty() {
					for sk in skill.split("+") {
						let (event, skill) = if sk.contains('=') {
							let mut split = sk.splitn(2, "=");
							let mut event = split.next().unwrap();
							if let Some((c, ce)) = parseCost(event, ele) {
								event = "cast";
								cast = c;
								castele = ce;
							}
							(event, split.next().unwrap())
						} else if kind == SPELL {
							("cast", sk)
						} else {
							("ownattack", sk)
						};
						let mut event = Vec::from(event.as_bytes());
						let mut skill = Vec::from(if skill == "static" {
							b"r#static"
						} else {
							skill.as_bytes()
						});
						event[0] -= b'a' - b'A';
						if event.starts_with(b"Own") {
							event[3] -= b'a' - b'A';
						}
						if skill == b"static" {
							skill.insert(0, b'r');
							skill.insert(1, b'#');
						} else {
							let mut idx = 0;
							loop {
								let mut replaced = false;
								while idx < skill.len() {
									let ch = skill[idx];
									if ch == b' ' {
										skill[idx] = if replaced { b',' } else { b'(' };
										replaced = true;
									} else if ch == b',' {
										idx += 1;
										break;
									}
									idx += 1;
								}
								if replaced {
									skill.insert(idx - (idx < skill.len()) as usize, b')');
									idx += 1;
								}
								if idx < skill.len() {
									skill.splice(idx..idx, b"Skill::".iter().cloned());
									idx += "Skill::".len();
									continue;
								} else {
									break;
								}
							}
						}
						write!(
							skillstr,
							"(Event::{},&[Skill::{}]),",
							unsafe { std::str::from_utf8_unchecked(&event) },
							unsafe { std::str::from_utf8_unchecked(&skill) }
						)
						.ok();
					}
				}
				skillstr.push(']');

				let card = Card {
					code,
					name: String::from(name),
					kind,
					ele,
					rarity,
					attack,
					health,
					cost,
					costele,
					cast,
					castele,
					status: statstr,
					flag: flagstr,
					skill: skillstr,
				};
				cards.push(card);
				if !upped && !name.starts_with("52") {
					source.push_str("pub const ");
					if set == "Orig" {
						source.push_str("v_");
					}
					for ch in name.bytes() {
						let ch = ch as char;
						if ch.is_ascii_alphanumeric() {
							source.push(ch);
						}
					}
					write!(source, ":i32={};", code).ok();
				}
			}
		}
	}
	cards.sort_by(|a, b| a.code.cmp(&b.code));
	write!(
		source,
		"\npub const {}Set:Cards=Cards{{set:CardSet::{},data:&[",
		set,
		if set == "Open" { "Open" } else { "Original" }
	)
	.ok();
	for card in cards.iter() {
		write!(source, "Card{{code:{},name:r#\"{}\"#,kind:Kind::{},element:{},rarity:{},attack:{},health:{},cost:{},costele:{},cast:{},castele:{},flag:{},status:{},skill:{}}},\n",
			   card.code, card.name, ["Weapon","Shield","Permanent","Spell","Creature"][card.kind as usize],
			   card.ele, card.rarity, card.attack, card.health, card.cost, card.costele, card.cast, card.castele,
			   card.flag, card.status, card.skill
		).ok();
	}
	source.push_str("]};\n");
}

fn main() {
	println!("cargo:rerun-if-changed=../Cards.json");
	println!("cargo:rerun-if-changed=../vanilla/Cards.json");
	println!("cargo:rerun-if-changed=./src/game.rs");
	println!("cargo:rerun-if-changed=./src/skill.rs");

	let gamers = fs::read_to_string("src/game.rs").expect("failed to read game.rs");
	let skillrs = fs::read_to_string("src/skill.rs").expect("failed to read skill.rs");

	let mut enums = Enums::default();
	let mut source = String::from("#![no_std]\n#![allow(non_upper_case_globals)]\nuse crate::card::{Card,CardSet,Cards};use crate::game::{Flag,Fx,Kind,Stat};use crate::skill::{Event,Skill};\n");

	let skillevent = subsource(&skillrs, "impl Event {\n");
	let mut eventid = 1;
	for line in skillevent.lines() {
		if let Some(endname) = line.find(": Event = Event") {
			if let Some(startname) = line.find("pub const ") {
				let mut name = String::from(&line[startname + "pub const ".len()..endname]);
				unsafe { name.as_mut_vec()[0] += b'a' - b'A' };
				let id = eventid;
				eventid += 1;
				let mut ownname = String::from("own");
				ownname.push_str(&name);
				enums.Event.insert(id, name.clone());
				enums.Event.insert(id | 128, ownname.clone());
				enums.EventId.insert(name, id);
				enums.EventId.insert(ownname, id | 128);
			}
		}
	}

	source.push_str("pub fn id_skill(s:Skill)->i32{match s{\n");
	let skillskill = subsource(&skillrs, "pub enum Skill {\n");
	let mut skillid = 1;
	for line in skillskill.lines() {
		let line = line.trim();
		if let Some(end) = line.rfind(",") {
			let start = if line.starts_with("r#") { 2 } else { 0 };
			let line = &line[start..end];
			let end = end - start;
			let id = skillid;
			skillid += 1;
			let skillend = line.find("(");
			let name = &line[..skillend.unwrap_or(end)];
			enums.Skill.insert(id, String::from(name));
			source.push_str("Skill::");
			if name == "static" {
				source.push_str("r#");
			}
			source.push_str(name);
			if let Some(skillend) = skillend {
				enums.SkillParams.insert(
					id,
					line[skillend..].bytes().filter(|&c| c == b',').count() as u16 + 1,
				);
				source.push_str("(..)")
			}
			write!(source, "=>{},\n", id).ok();
		}
	}
	source.push_str("}}\n");

	source.push_str("pub fn id_stat(s:Stat)->i32{match s{\n");
	let gamestat = subsource(&gamers, "pub enum Stat {\n");
	let mut stat_source = String::from("pub fn stat_id(s:i32)->Option<Stat>{Some(match s{\n");
	let mut statid = 1;
	for line in gamestat.lines() {
		if let Some(end) = line.rfind(",") {
			let start = if line.starts_with("r#") { 2 } else { 0 };
			let name = line[start..end].trim();
			let id = statid;
			statid += 1;
			enums.Stat.insert(id, String::from(name));
			enums.StatId.insert(String::from(name), id);
			write!(source, "Stat::{}=>{},\n", name, id).ok();
			write!(stat_source, "{}=>Stat::{},\n", id, name).ok();
		}
	}
	source.push_str("}}\n");
	source.push_str(&stat_source);
	source.push_str("_=>return None})}\n");

	source.push_str("pub fn id_flag(f:u64)->i32{match f{\n");
	let gameflag = subsource(&gamers, "impl Flag {");
	let mut flag_source = String::from("pub fn flag_id(f:i32)->Option<u64>{Some(match f{");
	for line in gameflag.lines() {
		let line = line.trim();
		if line.starts_with("pub const ") {
			if let Some(colonidx) = line.find(": u64 = 1 << ") {
				let name = &line["pub const ".len()..colonidx];
				let id = statid;
				statid += 1;
				enums.Flag.insert(id, String::from(name));
				enums.FlagId.insert(String::from(name), id);
				write!(source, "Flag::{}=>{},\n", name, id).ok();
				write!(flag_source, "{}=>Flag::{},\n", id, name).ok();
			}
		}
	}
	source.push_str("_=>0}}\n");
	source.push_str(&flag_source);
	source.push_str("_=>return None})}\n");

	source.push_str("pub fn id_fx(s:Fx)->i32{match s{\n");
	let gamefx = subsource(&gamers, "pub enum Fx {");
	let mut fxid = 1;
	for line in gamefx.lines() {
		let line = line.trim();
		if let Some(end) = line.rfind(",") {
			let id = fxid;
			fxid += 1;
			let fxend = line.find("(");
			let name = &line[..fxend.unwrap_or(end)];
			enums.Fx.insert(id, String::from(name));
			write!(source, "Fx::{}", name).ok();
			if fxend.is_some() {
				source.push_str("(..)");
			}
			write!(source, "=>{},\n", id).ok();
		}
	}
	source.push_str("}}\n");

	process_cards("Open", "../Cards.json", &mut source, &mut enums);
	process_cards("Orig", "../vanilla/Cards.json", &mut source, &mut enums);

	fs::write(
		"../enum.json",
		&serde_json::to_string(&enums).expect("failed to serialize enums"),
	)
	.expect("Failed to write enum.json");
	fs::write("src/generated.rs", &source).expect("failed to write generated.rs");
}

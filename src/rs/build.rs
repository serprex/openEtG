#![allow(non_snake_case)]

use std::collections::BTreeMap;
use std::fmt::Write;
use std::fs;
use std::str::FromStr;

use serde::Serialize;

#[derive(Default, Serialize)]
struct Enums {
	FlagId: BTreeMap<String, u16>,
	Fx: BTreeMap<u16, String>,
	StatId: BTreeMap<String, u16>,
}

fn subsource<'a, 'b>(source: &'a str, prefix: &'b str) -> &'a str {
	let prefixidx = source.find(prefix).expect("failed to find prefix");
	let length = source[prefixidx..].find("\n}\n").expect("failed to find } after prefix");
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
		let cost = s[..colonidx].parse::<i8>().expect("invalid cost in cost:ele");
		let costele = s[colonidx + 1..].parse::<u8>().expect("invalid ele in cost:ele");
		Some((cost, costele))
	} else {
		s.parse::<i8>().ok().map(|val| (val, if val == 0 { 0 } else { ele }))
	}
}

const SPELL: u8 = 3;

fn parse<F: FromStr + Default>(s: &str) -> F {
	if s.is_empty() {
		F::default()
	} else if let Ok(x) = FromStr::from_str(s) {
		x
	} else {
		panic!("failed to parse {}", s)
	}
}

fn process_cards(set: &'static str, path: &'static str, source: &mut String, enums: &mut Enums) {
	let mut cards: Vec<Card> = Vec::new();
	let cards_json = fs::read_to_string(path).expect("failed to read cards.csv");
	for row in cards_json.split('\n') {
		if row.is_empty() {
			continue;
		}
		let values = row.split('|').collect::<Vec<&str>>();
		if values.len() != 10 {
			panic!("rows should have 10 values: {}", row);
		}
		let code = parse::<u16>(values[0]);
		let name = values[1];
		let ele = parse::<u8>(values[2]);
		let kind = parse::<u8>(values[3]);
		let rarity = parse::<i8>(values[4]);
		let (cost, costele) = parseCost(values[5], ele).expect("cost not a cost");
		let upped = (code - 1000) % 4000 > 1999;
		let attack = parse::<i8>(values[6]);
		let health = parse::<i8>(values[7]);
		let mut cast = 0;
		let mut castele = 0;
		let mut statstr = String::from("&[");
		let mut flagstr = String::from("&0");
		let mut stat = Vec::new();
		let mut flag = Vec::new();
		let status = values[9];
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
		statstr.push(']');

		let mut skillstr = String::from("&[");
		let skill = values[8];
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
				let mut skill = Vec::from(skill.as_bytes());
				if skill.starts_with(b"static ") {
					skill.splice(0..0, b"r#".iter().cloned());
				}
				event[0] -= b'a' - b'A';
				if event.starts_with(b"Own") {
					event[3] -= b'a' - b'A';
				}
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
			} else if name.starts_with('5') {
				source.push('_');
			}
			for ch in name.bytes() {
				let ch = ch as char;
				if ch.is_ascii_alphanumeric() {
					source.push(ch);
				}
			}
			write!(source, ":i16={};", code).ok();
		}
	}
	cards.sort_unstable_by(|a, b| a.code.cmp(&b.code));
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
	println!("cargo:rerun-if-changed=../cards.csv");
	println!("cargo:rerun-if-changed=../vanilla/cards.csv");
	println!("cargo:rerun-if-changed=./src/game.rs");
	println!("cargo:rerun-if-changed=./src/skill.rs");

	let gamers = fs::read_to_string("src/game.rs").expect("failed to read game.rs");

	let mut enums = Enums::default();
	let mut source = String::from("#![no_std]\n#![allow(non_upper_case_globals)]\nuse crate::card::{Card,CardSet,Cards};use crate::game::{Flag,Fx,Kind,Stat};use crate::skill::{Event,Skill};\n");

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
				enums.FlagId.insert(String::from(name), id);
				write!(source, "Flag::{}=>{},\n", name, id).ok();
				write!(flag_source, "{}=>Flag::{},\n", id, name).ok();
			}
		}
	}
	source.push_str("_=>0}}\n");
	source.push_str(&flag_source);
	source.push_str("_=>return None})}\n");

	source.push_str("pub fn id_fx(s:Fx)->i16{match s{\n");
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

	process_cards("Open", "../cards.csv", &mut source, &mut enums);
	process_cards("Orig", "../vanilla/cards.csv", &mut source, &mut enums);

	fs::write("../enum.json", &serde_json::to_string(&enums).expect("failed to serialize enums"))
		.expect("Failed to write enum.json");
	fs::write("src/generated.rs", &source).expect("failed to write generated.rs");
}

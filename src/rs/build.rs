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
	nameidx: u16,
	namelen: u8,
	kind: u8,
	ele: u8,
	rarity: i8,
	attack: i8,
	health: i8,
	cost: i8,
	costele: u8,
	cast: i8,
	castele: u8,
	status: u8,
	statuslen: u8,
	flag: u8,
	skillidx: u16,
	skilllen: u8,
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

fn populate_names<'a, 'b>(csv: &'a str, names: &'b mut Vec<&'a str>)
where
	'a: 'b,
{
	for row in csv.split('\n') {
		if row.is_empty() {
			continue;
		}
		let mut values = row.split('|');
		values.next();
		names.push(values.next().expect("failed to peek name"));
	}
}

fn create_namemap<'a, 'b>(names: &'b [&'a str]) -> (String, BTreeMap<&'a str, u16>)
where
	'a: 'b,
{
	let mut namestr = String::new();
	let mut namemap = BTreeMap::new();

	for name in names.iter().cloned() {
		if namemap.contains_key(name) {
			continue;
		} else if let Some(idx) = namestr.find(name) {
			namemap.insert(name, idx as u16);
		} else {
			namemap.insert(name, namestr.len() as u16);
			namestr.push_str(name);
		}
	}
	(namestr, namemap)
}

fn process_cards(
	set: &'static str,
	csv: &str,
	source: &mut String,
	enums: &mut Enums,
	flagmap: &mut BTreeMap<String, u8>,
	statmap: &mut BTreeMap<String, u8>,
	statcount: &mut u8,
	skillmap: &mut BTreeMap<String, u16>,
	skillcount: &mut u16,
	namemap: &BTreeMap<&str, u16>,
) {
	let mut cards: Vec<Card> = Vec::new();
	for row in csv.split('\n') {
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
		let mut statstr = String::new();
		let mut flagstr = String::from("0");
		let flagidx;
		let statidx;
		let statlen;
		let skillidx;
		let mut skilllen = 0u8;
		let mut stat = Vec::new();
		let mut flag = Vec::new();
		let status = values[9];
		if !status.is_empty() {
			for st in status.split("+") {
				if enums.FlagId.contains_key(st) {
					flag.push(st);
				} else {
					let mut split = st.splitn(2, '=');
					let key = split.next().unwrap();
					assert!(enums.StatId.contains_key(key));
					let val = split.next().unwrap_or("1");
					stat.push((key, val));
				}
			}
			stat.sort_unstable();
			statlen = stat.len() as u8;
			for st in stat {
				write!(statstr, "(Stat::{},{}),", st.0, st.1).ok();
			}
		} else {
			statlen = 0;
		}
		if let Some(idx) = statmap.get(statstr.as_str()) {
			statidx = *idx;
		} else {
			statidx = *statcount;
			statmap.insert(statstr, statidx);
			*statcount += statlen;
		}
		if !flag.is_empty() {
			flag.sort_unstable();
			flagstr.clear();
			for fl in flag {
				write!(flagstr, "Flag::{}|", fl).ok();
			}
			flagstr.truncate(flagstr.len() - 1);
		}
		let newflagidx = flagmap.len() as u8;
		flagidx = *flagmap.entry(flagstr).or_insert(newflagidx);

		let mut skillstr = String::new();
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
				skilllen += 1;
				write!(
					skillstr,
					"(Event::{},&[Skill::{}]),",
					unsafe { std::str::from_utf8_unchecked(&event) },
					unsafe { std::str::from_utf8_unchecked(&skill) }
				)
				.ok();
			}
		}
		if let Some(idx) = skillmap.get(skillstr.as_str()) {
			skillidx = *idx;
		} else {
			skillidx = *skillcount;
			skillmap.insert(skillstr, skillidx);
			*skillcount += skilllen as u16;
		}

		let card = Card {
			code,
			nameidx: *namemap.get(name).expect("missing name"),
			namelen: name.len() as u8,
			kind,
			ele,
			rarity,
			attack,
			health,
			cost,
			costele,
			cast,
			castele,
			status: statidx,
			statuslen: statlen,
			flag: flagidx,
			skillidx,
			skilllen,
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
		write!(source, "Card{{code:{},nameidx:{},namelen:{},kind:Kind::{},element:{},rarity:{},attack:{},health:{},cost:{},costele:{},cast:{},castele:{},flagidx:{},statidx:{},statlen:{},skillidx:{},skilllen:{}}},\n",
			   card.code, card.nameidx, card.namelen, ["Weapon","Shield","Permanent","Spell","Creature"][card.kind as usize],
			   card.ele, card.rarity, card.attack, card.health, card.cost, card.costele, card.cast, card.castele,
			   card.flag, card.status, card.statuslen, card.skillidx, card.skilllen,
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
	let mut source = String::from(
		"#![no_std]\n#![allow(non_upper_case_globals)]\nuse crate::card::{Card,CardSet,Cards};use crate::game::{Flag,Fx,Kind,Stat};use crate::skill::{Event,Skill};\n",
	);

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
			if let Some(colonidx) = line.find(": u64 = 1 <<") {
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

	let opencsv = fs::read_to_string("../cards.csv").expect("failed to read cards.csv");
	let origcsv = fs::read_to_string("../vanilla/cards.csv").expect("failed to read cards.csv");
	let mut flagmap = BTreeMap::new();
	flagmap.insert(String::from("0"), 0);
	let mut statmap = BTreeMap::new();
	let mut statcount = 0;
	statmap.insert(String::new(), 0);
	let mut skillmap = BTreeMap::new();
	let mut skillcount = 0;
	skillmap.insert(String::new(), 0);
	let mut names = Vec::new();
	populate_names(opencsv.as_str(), &mut names);
	populate_names(origcsv.as_str(), &mut names);
	names.sort_unstable_by_key(|name| (!name.len(), *name));
	names.dedup();
	let (namestr, namemap) = create_namemap(&names);
	process_cards(
		"Open",
		opencsv.as_str(),
		&mut source,
		&mut enums,
		&mut flagmap,
		&mut statmap,
		&mut statcount,
		&mut skillmap,
		&mut skillcount,
		&namemap,
	);
	process_cards(
		"Orig",
		origcsv.as_str(),
		&mut source,
		&mut enums,
		&mut flagmap,
		&mut statmap,
		&mut statcount,
		&mut skillmap,
		&mut skillcount,
		&namemap,
	);

	write!(source, "pub const FlagTable:[u64;{}]=[", flagmap.len()).ok();
	let mut flagkeys: Vec<_> = flagmap.keys().collect();
	flagkeys.sort_unstable_by_key(|k| flagmap.get(k.as_str()).cloned().expect("bad flag"));
	for k in flagkeys.iter() {
		write!(source, "{},", k).ok();
	}
	write!(source, "];\n").ok();

	write!(source, "pub const StatTable:[(Stat,i16);{}]=[", statcount).ok();
	let mut statkeys: Vec<_> = statmap.keys().collect();
	statkeys.sort_unstable_by_key(|k| statmap.get(k.as_str()).cloned().expect("bad stat"));
	for k in statkeys.iter() {
		write!(source, "{}", k).ok();
	}
	write!(source, "];\n").ok();

	write!(source, "pub const SkillTable:[(Event,&[Skill]);{}]=[", skillcount).ok();
	let mut skillkeys: Vec<_> = skillmap.keys().collect();
	skillkeys.sort_unstable_by_key(|k| skillmap.get(k.as_str()).cloned().expect("bad skill"));
	for k in skillkeys.iter() {
		write!(source, "{}", k).ok();
	}
	write!(source, "];\n").ok();

	write!(source, "pub const NameTable:&'static str=\"{}\";", namestr).ok();

	fs::write("../enum.json", &serde_json::to_string(&enums).expect("failed to serialize enums"))
		.expect("Failed to write enum.json");
	fs::write("src/generated.rs", &source).expect("failed to write generated.rs");
}

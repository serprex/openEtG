#![allow(non_upper_case_globals)]
#![allow(non_snake_case)]
use std::default::Default;
use std::hash::{Hash, Hasher};

use fxhash::FxHasher;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// AdrenalineTable is a bitpacked 2d array
// [[0,0,0,0],[1,1,1],[2,2,2],[3,3,3],[3,2],[4,2],[4,2],[5,3],[6,3],[3],[4],[4],[4],[5],[5],[5]]
#[cfg_attr(rustfmt, rustfmt_skip)]
const AdrenalineTable: [u16; 16] = [
	4, 3|1<<3|1<<6|1<<9, 3|2<<3|2<<6|2<<9, 3|3<<3|3<<6|3<<9,
	2|3<<3|2<<6, 2|4<<3|2<<6, 2|4<<3|2<<6, 2|5<<3|3<<6, 2|6<<3|3<<6,
	1|3<<3, 1|4<<3, 1|4<<3, 1|4<<3, 1|5<<3, 1|5<<3, 1|5<<3,
];
pub fn countAdrenaline(x: i32) -> i32 {
	let x = x.abs();
	if x > 15 {
		1
	} else {
		(AdrenalineTable[x as usize] as i32 & 7) + 1
	}
}
pub fn calcAdrenaline(y: i32, dmg: i32) -> i32 {
	if y < 2 {
		dmg
	} else {
		let row = AdrenalineTable[dmg.abs() as usize] as i32;
		if y - 2 >= (row & 7) {
			0
		} else {
			let admg = (row >> ((y - 1) * 3)) & 7;
			if dmg > 0 {
				admg
			} else {
				-admg
			}
		}
	}
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn getAdrenalRow(x: i32) -> Vec<i8> {
	let mut v = Vec::new();
	let mut cell = AdrenalineTable[x.abs() as usize];
	for _ in 0..(cell & 7) {
		cell >>= 3;
		let dmg = (cell & 7) as i8;
		v.push(if x < 0 { -dmg } else { dmg });
	}
	v
}

pub fn hash<T: Hash>(obj: &T) -> i32 {
	let mut hasher: FxHasher = Default::default();
	obj.hash(&mut hasher);
	let h64 = hasher.finish();
	let h32 = (h64 >> 32) as u32 ^ h64 as u32;
	h32 as i32
}

pub const Weapon: i32 = 1;
pub const Shield: i32 = 2;
pub const Permanent: i32 = 3;
pub const Spell: i32 = 4;
pub const Creature: i32 = 5;
pub const Player: i32 = 6;

pub const Chroma: i32 = 0;
pub const Entropy: i32 = 1;
pub const Death: i32 = 2;
pub const Gravity: i32 = 3;
pub const Earth: i32 = 4;
pub const Life: i32 = 5;
pub const Fire: i32 = 6;
pub const Water: i32 = 7;
pub const Light: i32 = 8;
pub const Air: i32 = 9;
pub const Time: i32 = 10;
pub const Darkness: i32 = 11;
pub const Aether: i32 = 12;

pub const PillarList: &[i32] = &[
	5002, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200,
];
pub const NymphList: &[i32] = &[
	0, 5120, 5220, 5320, 5420, 5520, 5620, 5720, 5820, 5920, 6020, 6120, 6220,
];
pub const AlchemyList: &[i32] = &[
	0, 5111, 5212, 5311, 5413, 5511, 5611, 5712, 5811, 5910, 6011, 6110, 6209,
];
pub const ShardList: &[i32] = &[
	0, 5130, 5230, 5330, 5430, 5530, 5630, 5730, 5830, 5930, 6030, 6130, 6230,
];

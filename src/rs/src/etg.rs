#![no_std]
#![allow(non_upper_case_globals)]
#![allow(non_snake_case)]

use alloc::vec::Vec;
use core::default::Default;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg_attr(rustfmt, rustfmt_skip)]
const AdrenalineTable: [u16; 16] = [
	5,
	4 | 1 << 6 | 1 << 9 | 1 << 12,
	4 | 2 << 6 | 2 << 9 | 2 << 12,
	4 | 3 << 6 | 3 << 9 | 3 << 12,
	3 | 3 << 6 | 2 << 9,
	3 | 4 << 6 | 2 << 9,
	3 | 4 << 6 | 2 << 9,
	3 | 5 << 6 | 3 << 9,
	3 | 6 << 6 | 3 << 9,
	2 | 3 << 6,
	2 | 4 << 6,
	2 | 4 << 6,
	2 | 4 << 6,
	2 | 5 << 6,
	2 | 5 << 6,
	2 | 5 << 6,
];

pub fn countAdrenaline(x: i32) -> i32 {
	let x = x.abs() as usize;
	if x > 15 {
		1
	} else {
		(AdrenalineTable[x] as i32) & 7
	}
}

pub fn calcAdrenaline(y: i32, dmg: i32) -> i32 {
	if y < 2 {
		dmg
	} else if y > 5 {
		0
	} else {
		let absdmg = dmg.abs() as usize;
		if absdmg > 15 {
			0
		} else {
			let admg = ((AdrenalineTable[absdmg] as u32) >> (y * 3) & 7) as i32;
			if dmg < 0 {
				-admg
			} else {
				admg
			}
		}
	}
}

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

pub const PillarList: &[u16] = &[
	5002, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200,
];
pub const NymphList: &[u16] = &[
	0, 5120, 5220, 5320, 5420, 5520, 5620, 5720, 5820, 5920, 6020, 6120, 6220,
];
pub const AlchemyList: &[u16] = &[
	0, 5111, 5212, 5311, 5413, 5511, 5611, 5712, 5811, 5910, 6011, 6110, 6209,
];
pub const ShardList: &[u16] = &[
	0, 5130, 5230, 5330, 5430, 5530, 5630, 5730, 5830, 5930, 6030, 6130, 6230,
];

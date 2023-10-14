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

pub fn countAdrenaline(x: i16) -> i16 {
	let x = x.abs() as usize;
	if x > 15 {
		1
	} else {
		(AdrenalineTable[x] as i16) & 7
	}
}

pub fn calcAdrenaline(y: i16, dmg: i16) -> i16 {
	if y < 2 {
		dmg
	} else if y > 5 {
		0
	} else {
		let absdmg = dmg.abs() as usize;
		if absdmg > 15 {
			0
		} else {
			let admg = ((AdrenalineTable[absdmg] as u32) >> (y * 3) & 7) as i16;
			if dmg < 0 {
				-admg
			} else {
				admg
			}
		}
	}
}

pub const Chroma: i16 = 0;
pub const Entropy: i16 = 1;
pub const Death: i16 = 2;
pub const Gravity: i16 = 3;
pub const Earth: i16 = 4;
pub const Life: i16 = 5;
pub const Fire: i16 = 6;
pub const Water: i16 = 7;
pub const Light: i16 = 8;
pub const Air: i16 = 9;
pub const Time: i16 = 10;
pub const Darkness: i16 = 11;
pub const Aether: i16 = 12;

pub const PillarList: &[i16] = &[
	5002, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200,
];
pub const NymphList: &[i16] = &[
	0, 5120, 5220, 5320, 5420, 5520, 5620, 5720, 5820, 5920, 6020, 6120, 6220,
];
pub const AlchemyList: &[i16] = &[
	0, 5111, 5212, 5311, 5413, 5511, 5611, 5712, 5811, 5910, 6011, 6110, 6209,
];
pub const ShardList: &[i16] = &[
	0, 5130, 5230, 5330, 5430, 5530, 5630, 5730, 5830, 5930, 6030, 6130, 6230,
];

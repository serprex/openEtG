#![allow(non_upper_case_globals)]
#![allow(non_snake_case)]
use std::default::Default;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg_attr(rustfmt, rustfmt_skip)]
const AdrenalineTable: [i8; 80] = [
	4, 0, 0, 0, 0,
	3, 1, 1, 1, 0,
	3, 2, 2, 2, 0,
	3, 3, 3, 3, 0,
	2, 3, 2, 0, 0,
	2, 4, 2, 0, 0,
	2, 4, 2, 0, 0,
	2, 5, 3, 0, 0,
	2, 6, 3, 0, 0,
	1, 3, 0, 0, 0,
	1, 4, 0, 0, 0,
	1, 4, 0, 0, 0,
	1, 4, 0, 0, 0,
	1, 5, 0, 0, 0,
	1, 5, 0, 0, 0,
	1, 5, 0, 0, 0,
];

pub fn countAdrenaline(x: i32) -> i32 {
	let x = x.abs() as usize;
	if x > 15 {
		1
	} else {
		AdrenalineTable[x * 5] as i32 + 1
	}
}

pub fn calcAdrenaline(y: i32, dmg: i32) -> i32 {
	if y < 2 {
		dmg
	} else if y > 5 {
		0
	} else {
		let absdmg = dmg.abs();
		if absdmg > 15 {
			0
		} else {
			let admg = AdrenalineTable[(absdmg * 5 + y - 1) as usize] as i32;
			if dmg < 0 {
				-admg
			} else {
				admg
			}
		}
	}
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn getAdrenalRow(x: i32) -> Vec<i8> {
	let xabs = x.abs() as usize;
	if xabs > 15 {
		Vec::new()
	} else {
		let mut v = Vec::<i8>::with_capacity(4);
		let vp = v.as_mut_ptr();
		let len = AdrenalineTable[xabs * 5] as usize;
		unsafe {
			v.set_len(len);
			std::ptr::copy_nonoverlapping(
				AdrenalineTable.as_ptr().offset(xabs as isize * 5 + 1),
				vp,
				4,
			);
			if x < 0 {
				let vp = vp.cast::<u32>();
				*vp = (!*vp) + 0x01010101;
			}
		}
		v
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

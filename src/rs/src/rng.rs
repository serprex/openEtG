#![no_std]

use core::cell::Cell;
use core::ops;

#[derive(Clone)]
pub struct Pcg32(Cell<u64>);

impl From<u32> for Pcg32 {
	fn from(seed: u32) -> Self {
		Pcg32(Cell::new(seed as u64 | (seed as u64) << 32))
	}
}

impl Pcg32 {
	pub fn next32(&self) -> u32 {
		const MUL: u64 = 6364136223846793005;
		const INC: u64 = 11634580027462260723;

		// We advance the state first (to get away from the input value,
		// in case it has low Hamming Weight).
		let state = self.0.get().wrapping_mul(MUL).wrapping_add(INC);
		self.0.set(state);

		// Use PCG output function with to_le to generate x:
		let xorshifted = (((state >> 18) ^ state) >> 27) as u32;
		let rot = (state >> 59) as u32;
		xorshifted.rotate_right(rot)
	}

	pub fn upto(&self, n: u32) -> u32 {
		let max = u32::MAX - u32::MAX % n;
		loop {
			let r = self.next32();
			if r > max {
				continue;
			}
			return r % n;
		}
	}

	pub fn choose<'a, 'b, T>(&'a self, a: &'b [T]) -> Option<&'b T> {
		if a.is_empty() {
			return None;
		}
		let i = self.upto(a.len() as u32);
		return Some(unsafe { a.get_unchecked(i as usize) });
	}

	pub fn shuffle<T>(&self, a: &mut [T]) {
		let al = a.len() as u32;
		for i in 0..al - 1 {
			let j = self.upto(al - i);
			a.swap(i as usize, i as usize + j as usize)
		}
	}

	pub fn choose_iter<'a, 'b, T>(&'a self, a: impl IntoIterator<Item = &'b T>) -> Option<&'b T> {
		let mut r = None;
		let mut n = 0;
		for x in a {
			n += 1;
			if self.upto(n) == 0 {
				r = Some(x)
			}
		}
		r
	}
}

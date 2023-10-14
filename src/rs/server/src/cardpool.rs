use std::cmp;
use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::etgutil;

#[derive(Clone, Default, Debug)]
pub struct Cardpool(pub HashMap<i16, u16>);

impl From<&Cardpool> for String {
	fn from(pool: &Cardpool) -> String {
		let mut ascii = Vec::with_capacity(pool.0.len() * 5);
		for (&code, &count) in pool.0.iter() {
			let mut count = count;
			while count > 0 {
				let amt = cmp::min(count, 1023);
				ascii.extend(&etgutil::encode_count(amt as u32));
				ascii.extend(&etgutil::encode_code(code));
				count -= amt;
			}
		}
		unsafe { String::from_utf8_unchecked(ascii) }
	}
}

impl From<&str> for Cardpool {
	fn from(code: &str) -> Cardpool {
		let mut pool = HashMap::<i16, u16>::new();
		for chunk in code.as_bytes().chunks_exact(5) {
			let count = etgutil::decode_count(&chunk[..2]);
			let code = etgutil::decode_code(&chunk[2..]);
			let c = pool.entry(code).or_insert(0);
			*c = c.saturating_add(count);
		}
		Cardpool(pool)
	}
}

impl Serialize for Cardpool {
	fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
	where
		S: Serializer,
	{
		serializer.serialize_str(String::from(self).as_str())
	}
}

impl<'de> Deserialize<'de> for Cardpool {
	fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
	where
		D: Deserializer<'de>,
	{
		Ok(Cardpool::from(String::deserialize(deserializer)?.as_str()))
	}
}

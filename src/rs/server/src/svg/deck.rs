use std::fmt::Write;

use fxhash::FxHashMap;

use etg::card;

use super::card_name;
use crate::etgutil::{decode_code, parse_digit32};

pub fn css_class(byte: u8) -> &'static str {
	match byte {
		b'A' => "stroke:#da2;stroke-width:.5",
		b'B' => "stroke:#000;stroke-width:.5",
		b'a' => "fill:#986",
		b'b' => "fill:#a59",
		b'c' => "fill:#768",
		b'd' => "fill:#963",
		b'e' => "fill:#654",
		b'f' => "fill:#480",
		b'g' => "fill:#a31",
		b'h' => "fill:#248",
		b'i' => "fill:#776",
		b'j' => "fill:#38d",
		b'k' => "fill:#a80",
		b'l' => "fill:#333",
		b'm' => "fill:#49b",
		b'n' => "fill:#dcb",
		b'o' => "fill:#dbc",
		b'p' => "fill:#bac",
		b'q' => "fill:#ca9",
		b'r' => "fill:#ba9",
		b's' => "fill:#ac7",
		b't' => "fill:#da8",
		b'u' => "fill:#8ac",
		b'v' => "fill:#ccb",
		b'w' => "fill:#9be",
		b'x' => "fill:#ed8",
		b'y' => "fill:#999",
		b'z' => "fill:#ade",
		_ => "",
	}
}

pub fn deck(deck: &str) -> String {
	let mut classes = [false; 256];
	let mut paths: FxHashMap<(u8, u8), String> = Default::default();
	let mut textml = String::new();
	let mut y = 0;
	let mut x = 16;
	let mut mark: i32 = -1;
	for chunk in deck.as_bytes().chunks_exact(5) {
		let code = decode_code(&chunk[2..]);
		let set = if code < 5000 {
			card::OrigSet
		} else {
			card::OpenSet
		};
		if let Some(card) = set.try_get(code) {
			let count = parse_digit32(chunk[0]) * 32 + parse_digit32(chunk[1]);
			let upped = card::Upped(code);
			let shiny = card::Shiny(code);
			let elech = 97u8 + card.element as u8 + if upped { 13 } else { 0 };
			let elecls = (if shiny { b'A' } else { b'B' }, elech);
			classes[elech as usize] = true;
			classes[if shiny { b'A' } else { b'B' } as usize] = true;
			let path = paths.entry(elecls).or_insert(String::new());
			for _ in 0..count {
				write!(path, "M {} {}h100v16h-100", x, y).ok();
				textml.push_str("<text clip-path='polygon(0 0,96px 0,96px 14px,0 14px)' ");
				write!(textml, "x='{}' y='{}'", x + 2, y + 13).ok();
				if !upped {
					textml.push_str(" fill='#fff'");
				}
				textml.push('>');
				textml.push_str(card_name(card));
				textml.push_str("</text>");
				y += 16;
				if y == 160 {
					y = 0;
					x += 100;
				}
			}
		} else if code >= 9010 && code <= 9022 {
			mark = code - 9010;
		}
	}
	if mark != -1 {
		classes[b'a' as usize + mark as usize] = true;
	}
	let mut result = String::from("<svg xmlns='http://www.w3.org/2000/svg' height='160' width='");
	write!(result, "{}", if y == 0 { x } else { x + 100 }).ok();
	result.push_str("'><style type='text/css'><![CDATA[text{font:12px sans-serif}");
	for (idx, &k) in classes.iter().enumerate() {
		if k {
			let ch = idx as u8;
			result.push('.');
			result.push(ch as char);
			result.push('{');
			result.push_str(css_class(ch));
			result.push('}');
		}
	}
	result.push_str("]]></style>");
	for (&(c1, c2), v) in paths.iter() {
		result.push_str("<path class='");
		result.push(c1 as char);
		result.push(' ');
		result.push(c2 as char);
		result.push_str("' d='");
		result.push_str(v);
		result.push_str("'/>");
	}
	result.push_str(&textml);
	if mark != -1 {
		result.push_str("<path class='");
		result.push((b'a' + mark as u8) as char);
		result.push_str("' d='M0 0h16v160H0'/>");
	}
	result.push_str("</svg>");
	result
}

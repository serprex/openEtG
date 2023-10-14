use std::fmt::Write;

use etg::card;

use crate::etgutil::encode_code;

pub fn eleup_str(element: i8, upped: bool) -> &'static str {
	match element + if upped { 13 } else { 0 } {
		0 => "#986",
		1 => "#a59",
		2 => "#768",
		3 => "#963",
		4 => "#654",
		5 => "#480",
		6 => "#a31",
		7 => "#248",
		8 => "#776",
		9 => "#38d",
		10 => "#a80",
		11 => "#333",
		12 => "#49b",
		13 => "#dcb",
		14 => "#dbc",
		15 => "#bac",
		16 => "#ca9",
		17 => "#ba9",
		18 => "#ac7",
		19 => "#da8",
		20 => "#8ac",
		21 => "#ccb",
		22 => "#9be",
		23 => "#ed8",
		24 => "#999",
		25 => "#ade",
		_ => "",
	}
}

pub fn card(code: i16) -> Option<String> {
	let cards = if card::AsShiny(code, false) < 5000 {
		card::OrigSet
	} else {
		card::OpenSet
	};
	let card = cards.try_get(code & 0x3fff)?;
	let upped = card::Upped(code);
	let shiny = card::Shiny(code);
	let mut result = String::new();
	result.push_str(concat!("<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' height='256' width='160'><style type='text/css'><![CDATA[text{font:12px sans-serif}",
			include_str!("../../../../../assets/atlas.css"),
					"]]></style><rect x='0' y='0' width='160' height='256' fill='"));
	result.push_str(eleup_str(card.element, upped));
	result.push_str("'/><text x='2' y='15'");
	if !upped {
		result.push_str(" fill='#fff'");
	}
	result.push('>');
	result.push_str(card.name);
	result.push_str(
			"</text><foreignObject width='160' height='256'><p xmlns='http://www.w3.org/1999/xhtml' style='font:10px sans-serif;white-space:pre-wrap;color:#"
			);
	result.push_str(if upped { "000" } else { "fff" });
	result.push_str(";position:absolute;left:2px;top:150px;right:2px;height:106px;margin:0'><img ");
	if shiny {
		result.push_str("class='shiny' ");
	}
	result.push_str("src='/Cards/");
	result.push_str(unsafe {
		std::str::from_utf8_unchecked(&encode_code(
			code + if card::AsShiny(code, false) < 5000 {
				4000
			} else {
				0
			},
		))
	});
	result.push_str(".webp' style='position:absolute;top:-130px;left:0px'/>");
	let mut text = etg::text::rawCardText(cards, card).replace('&', "&amp;");
	let colons = text.rmatch_indices(':').map(|m| m.0).collect::<Vec<_>>();
	for colon_idx in colons {
		let start = if matches!(text.as_bytes().get(colon_idx - 1), Some(b'0'..=b'9')) {
			if matches!(text.as_bytes().get(colon_idx - 2), Some(b'0'..=b'9')) {
				colon_idx - 2
			} else {
				colon_idx - 1
			}
		} else {
			continue;
		};
		let end = if matches!(text.as_bytes().get(colon_idx + 1), Some(b'0'..=b'9')) {
			if matches!(text.as_bytes().get(colon_idx + 2), Some(b'0'..=b'2')) {
				colon_idx + 2
			} else {
				colon_idx + 1
			}
		} else {
			continue;
		};
		let num = text[start..colon_idx].parse::<i8>().unwrap();
		let ele = text[colon_idx + 1..=end].parse::<i8>().unwrap();
		let end = if text.as_bytes().get(end + 1) == Some(&b' ') {
			end + 1
		} else {
			end
		};
		match num {
			0 => text.replace_range(start..=end, "0"),
			1 | 2 | 3 => text.replace_range(
				start..=end,
				&format!("<span class='ico te{}'></span>", ele).repeat(num as usize),
			),
			_ => text.replace_range(
				start..=end,
				&format!("{}<span class='ico te{}'></span>", num, ele),
			),
		}
	}
	result.push_str(&text);
	if card.rarity != 0 {
		write!(
			result,
			"<span class='ico r{}' style='position:absolute;right:2px;top:-112px'></span>",
			card.rarity
		)
		.ok();
	}
	if card.cost != 0 {
		write!(
			result,
			"<span style='position:absolute;right:2px;top:-150px'>{}<span class='ico ce{}'></span></span>",
			card.cost,
			card.costele,
		)
		.ok();
	}
	write!(result, "<span class='ico t{}' style='position:absolute;right:2px;top:-130px'></span></p></foreignObject></svg>", card.kind as i32).ok();
	Some(result)
}

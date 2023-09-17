mod card;
mod deck;

pub use card::card;
pub use deck::deck;

use crate::generated::CARD_STRINGS;
use etg::card::Card;

pub fn card_info(card: &'static Card) -> &'static str {
	let code = card.code;
	CARD_STRINGS[CARD_STRINGS
		.binary_search_by(|c| c.0.cmp(&code))
		.unwrap_or(0)]
	.1
}

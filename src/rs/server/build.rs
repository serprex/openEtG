use std::fs;

use serde::Deserialize;
use serde_json;

#[derive(Deserialize)]
struct Decks {
	mage: Vec<Vec<String>>,
	demigod: Vec<Vec<String>>,
}

fn main() {
	println!("cargo:rerun-if-changed=../../Decks.json");
	let decks_json = fs::read_to_string("../../Decks.json").expect("failed to read Decks.json");
	let decks_data = serde_json::from_str::<Decks>(&decks_json)
		.expect("failed to parse Decks.json");
	fs::write(
		"src/generated.rs",
		format!("pub const MAGE_COUNT:u8={};\npub const DG_COUNT:u8={};\n", decks_data.mage.len(), decks_data.demigod.len()),
	).expect("failed to write generated.rs");
}

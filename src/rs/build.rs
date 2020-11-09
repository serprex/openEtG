use std::process::Command;

fn main() {
	println!("cargo:rerun-if-changed=../Cards.json");
	println!("cargo:rerun-if-changed=../vanilla/Cards.json");
	println!("cargo:rerun-if-changed=../../scripts/mkrs.js");
	println!("cargo:rerun-if-changed=./src/game.rs");
	println!("cargo:rerun-if-changed=./src/skill.rs");
	assert!(Command::new("npm")
		.args(&["run", "build-mkrs"])
		.status()
		.expect("npm run build-mkrs failed")
		.success());
}

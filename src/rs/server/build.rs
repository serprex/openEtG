use std::process::Command;

fn main() {
	println!("cargo:rerun-if-changed=../Cards.json");
	println!("cargo:rerun-if-changed=../vanilla/Cards.json");
	println!("cargo:rerun-if-changed=../../scripts/mkrs-server.js");
	assert!(Command::new("npm")
		.args(&["run", "build-mkrs-server"])
		.status()
		.expect("npm run build-mkrs-server failed")
		.success());
}

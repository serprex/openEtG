extern crate etg;
extern crate rand;
extern crate rand_pcg;
extern crate rayon;

use std::env::args;
use std::iter::repeat;
use std::sync::Mutex;
use std::time::SystemTime;

use etg::aisearch;
use etg::card;
use etg::etg::*;
use etg::game::{CardSet, Game, Phase};

use rand::{Rng, SeedableRng};
use rayon::prelude::*;

fn main() {
	let seed = args()
		.nth(1)
		.and_then(|arg| arg.parse().ok())
		.unwrap_or_else(|| {
			SystemTime::now()
				.duration_since(SystemTime::UNIX_EPOCH)
				.unwrap()
				.as_secs()
		});
	println!("seed = {}", seed);
	let rng = Mutex::new(rand_pcg::Pcg32::seed_from_u64(seed));
	(0..usize::MAX).into_par_iter().for_each(|_| {
		let seed = rng.lock().unwrap().gen();
		let (set, pillar, sose) = if seed & 1 == 1 {
			(CardSet::Open, card::QuantumPillar, card::ShardofSerendipity)
		} else {
			(
				CardSet::Original,
				card::v_QuantumPillar,
				card::v_ShardofSerendipity,
			)
		};
		println!("{}", seed);
		let mut game = Game::new(seed, set);
		let players = [game.new_player(), game.new_player()];
		for &p in players.iter() {
			game.set_leader(p, p);
		}
		for &p in players.iter() {
			game.init_player(
				p,
				100,
				100,
				Chroma,
				1,
				1,
				1,
				repeat(pillar)
					.take(12)
					.chain(repeat(sose).take(6))
					.chain(repeat(card::AsUpped(sose, true)).take(6))
					.collect(),
			);
		}
		while game.phase != Phase::End {
			let cmd = aisearch::search(&game);
			game.r#move(cmd);
		}
	});
}

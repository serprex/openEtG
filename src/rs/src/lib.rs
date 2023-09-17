#![cfg_attr(target_arch = "wasm32", no_std)]
#![allow(unused)]

#[macro_use]
extern crate alloc;
extern crate core;

pub mod aieval;
pub mod aisearch;
pub mod card;
pub mod deckgen;
pub mod etg;
pub mod game;
#[rustfmt::skip]
pub mod generated;
pub mod skill;
pub mod text;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
extern "C" {
	#[wasm_bindgen(js_namespace = console)]
	fn log(s: &str);

	#[wasm_bindgen(js_namespace = Date)]
	fn now() -> f64;
}

#[cfg(not(target_arch = "wasm32"))]
pub fn log(s: &str) {
	println!("{}", s);
}

#[cfg(not(target_arch = "wasm32"))]
pub fn now() -> f64 {
	0.0
}

pub fn set_panic_hook() {
	#[cfg(target_arch = "wasm32")]
	#[cfg(feature = "console_error_panic_hook")]
	console_error_panic_hook::set_once();
}

#[cfg(test)]
mod test {
	use crate::card::{self, CardSet};
	use crate::etg;
	use crate::game::{Flag, Game, GameMove, Kind, Stat};
	use crate::skill::{Event, ProcData, Skill};

	#[test]
	fn upped_alignment_and_spell_skill() {
		for set in [card::OpenSet, card::OrigSet].iter() {
			for card in set.data.iter() {
				let un = set.get(card::AsUpped(card.code as i32, false));
				let up = set.get(card::AsUpped(card.code as i32, true));
				if card.kind == Kind::Spell {
					assert!(card.skill.iter().any(|&(k, v)| k == Event::Cast));
				}
			}
		}
	}

	fn setup(set: CardSet) -> (Game, i32, i32) {
		let mut ctx = Game::new(1728, set);
		let players = [ctx.new_player(), ctx.new_player()];
		for &p in players.iter() {
			ctx.set_leader(p, p);
		}
		for &p in players.iter() {
			ctx.init_player(
				p,
				100,
				100,
				etg::Entropy,
				1,
				1,
				1,
				core::iter::repeat(if set == CardSet::Open {
					card::AmethystPillar
				} else {
					card::v_AmethystPillar
				})
				.take(30)
				.collect(),
			);
		}
		ctx.r#move(GameMove::Accept);
		ctx.r#move(GameMove::Accept);
		(ctx, players[0], players[1])
	}

	fn init_deck(ctx: &mut Game, id: i32, deck: &[i32]) {
		let mut newdeck = Vec::new();
		for &code in deck.iter() {
			newdeck.push(ctx.new_thing(code, id));
		}
		let mut deck = ctx.get_player_mut(id).deck_mut();
		deck.clear();
		deck.extend_from_slice(&newdeck);
	}

	fn attack_foe(ctx: &mut Game, id: i32) {
		ctx.attack(
			id,
			&ProcData {
				tgt: ctx.get_foe(ctx.get_owner(id)),
				..Default::default()
			},
		)
	}

	#[test]
	fn adrenaline() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let dev = ctx.new_thing(card::Devourer, p1);
		let frog = ctx.new_thing(card::HornedFrog, p1);
		let dragon = ctx.new_thing(card::AsUpped(card::CrimsonDragon, true), p1);
		ctx.set(dev, Stat::adrenaline, 1);
		ctx.set(frog, Stat::adrenaline, 1);
		ctx.set(dragon, Stat::adrenaline, 1);
		ctx.addCrea(p1, dev);
		ctx.addCrea(p1, frog);
		ctx.addCrea(p1, dragon);
		ctx.set_quanta(p2, etg::Life, 3);
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get(p2, Stat::hp), 68);
		assert_eq!(ctx.get_player(p1).quanta(etg::Darkness), 2);
		assert_eq!(ctx.get_player(p2).quanta(etg::Life), 1);
	}

	#[test]
	fn aflatoxin() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let dev = ctx.new_thing(card::Devourer, p1);
		ctx.addCrea(p1, dev);
		Skill::aflatoxin.proc(&mut ctx, p1, dev, &mut ProcData::default());
		assert_eq!(ctx.get(dev, Stat::poison), 2);
		ctx.die(dev);
		let c0 = ctx.get_player(p1).creatures[0];
		assert_ne!(c0, 0);
		assert_ne!(c0, dev);
		assert_eq!(ctx.get(c0, Stat::card), card::MalignantCell);
		let phoenix = ctx.new_thing(card::Phoenix, p1);
		ctx.addCrea(p1, phoenix);
		Skill::aflatoxin.proc(&mut ctx, p1, phoenix, &mut ProcData::default());
		ctx.die(phoenix);
		let c1 = ctx.get_player(p1).creatures[1];
		assert_eq!(ctx.get(c1, Stat::card), card::MalignantCell);
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get(p2, Stat::hp), 98);
		let c3 = ctx.get_player(p1).creatures[3];
		assert_eq!(ctx.get(c3, Stat::card), card::MalignantCell);
	}

	#[test]
	fn bonewall() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		ctx.set_quanta(p1, etg::Death, 8);
		let bw = ctx.new_thing(card::BoneWall, p1);
		ctx.addCard(p1, bw);
		ctx.r#move(GameMove::Cast(bw, 0));
		assert_eq!(ctx.get_shield(p1), bw);
		assert_eq!(ctx.get(bw, Stat::charges), 7);
		for _ in 0..3 {
			let dragon = ctx.new_thing(card::CrimsonDragon, p2);
			ctx.addCrea(p2, dragon);
		}
		let spite = ctx.new_thing(card::Spite, p1);
		ctx.setWeapon(p1, spite);
		ctx.r#move(GameMove::End(0));
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get_shield(p1), bw);
		assert_eq!(ctx.get(bw, Stat::charges), 6);
		let dragon = ctx.get_player(p2).creatures[0];
		ctx.die(dragon);
		assert_eq!(ctx.get(bw, Stat::charges), 8);
		assert_eq!(ctx.get_shield(p1), bw);
		assert_eq!(ctx.get(p1, Stat::hp), 100);
		assert_eq!(ctx.get(p2, Stat::hp), 98);
	}

	#[test]
	fn boneyard() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let dev = ctx.new_thing(card::Devourer, p1);
		let boneyard = ctx.new_thing(card::Boneyard, p1);
		ctx.addCrea(p1, dev);
		ctx.addPerm(p1, boneyard);
		ctx.die(dev);
		let c0 = ctx.get_player(p1).creatures[0];
		assert!(c0 != 0);
		assert_eq!(ctx.get(c0, Stat::card), card::Skeleton);
	}

	#[test]
	fn bounce() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let dev = ctx.new_thing(card::Devourer, p1);
		ctx.addCrea(p1, dev);
		Skill::ren.proc(&mut ctx, dev, dev, &mut ProcData::default());
		println!("? {}", ctx.hasskill(dev, Event::Predeath, Skill::bounce));
		Skill::acceleration.proc(&mut ctx, dev, dev, &mut ProcData::default());
		println!("? {}", ctx.hasskill(dev, Event::Predeath, Skill::bounce));
		ctx.set_quanta(p2, etg::Light, 2);
		attack_foe(&mut ctx, dev);
		attack_foe(&mut ctx, dev);
		assert_eq!(ctx.get_player(p1).hand_last(), Some(dev));
		assert_eq!(ctx.get(dev, Stat::atk), 4);
		assert_eq!(ctx.get(dev, Stat::hp), 2);
		assert_eq!(ctx.get(dev, Stat::maxhp), 2);
		assert!(ctx.hasskill(dev, Event::OwnAttack, Skill::growth(2, -1)));
		ctx.play(dev, 0, true);
		Skill::ren.proc(&mut ctx, dev, dev, &mut ProcData::default());
		Skill::pacify.proc(&mut ctx, dev, dev, &mut ProcData::default());
		Skill::equalize.proc(&mut ctx, dev, dev, &mut ProcData::default());
		assert_eq!(ctx.get_player(p1).hand_last(), Some(dev));
		assert_eq!(ctx.get(dev, Stat::atk), 0);
		assert_eq!(ctx.get(dev, Stat::hp), 0);
		assert_eq!(ctx.get(dev, Stat::maxhp), 0);
	}

	#[test]
	fn deckout() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		ctx.get_player_mut(p2).deck_mut().clear();
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.winner, p1);
	}

	#[test]
	fn destroy() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		ctx.set_quanta(p1, etg::Death, 10);
		ctx.get_player_mut(p1).hand = [0; 8];
		for &code in &[
			card::AmethystPillar,
			card::AmethystPillar,
			card::SoulCatcher,
			card::Shield,
			card::Dagger,
		] {
			let card = ctx.new_thing(code, p1);
			ctx.addCard(p1, card);
			ctx.play(card, 0, true);
		}
		let pillars = ctx.get_player(p1).permanents[0];
		assert_eq!(ctx.get(pillars, Stat::charges), 2);
		Skill::destroy.proc(&mut ctx, p2, pillars, &mut ProcData::default());
		assert_eq!(ctx.get_player(p1).permanents[0], pillars);
		assert_eq!(ctx.get(pillars, Stat::charges), 1);
		Skill::destroy.proc(&mut ctx, p2, pillars, &mut ProcData::default());
		assert_eq!(ctx.get_player(p1).permanents[0], 0);
		let soul = ctx.get_player(p1).permanents[1];
		assert_eq!(ctx.get(soul, Stat::card), card::SoulCatcher,);
		Skill::destroy.proc(&mut ctx, p2, soul, &mut ProcData::default());
		assert_eq!(ctx.get_player(p1).permanents[1], 0);
		let shield = ctx.get_shield(p1);
		assert_eq!(ctx.get(shield, Stat::card), card::Shield);
		Skill::destroy.proc(&mut ctx, p2, shield, &mut ProcData::default());
		assert_eq!(ctx.get_shield(p1), 0);
		let weapon = ctx.get_weapon(p1);
		assert_eq!(ctx.get(weapon, Stat::card), card::Dagger);
		Skill::destroy.proc(&mut ctx, p2, weapon, &mut ProcData::default());
		assert_eq!(ctx.get_weapon(p1), 0);
		let bw = ctx.new_thing(card::BoneWall, p1);
		ctx.addCard(p1, bw);
		ctx.play(bw, 0, true);
		assert_eq!(ctx.get_shield(p1), bw);
		assert_eq!(ctx.get(bw, Stat::charges), 7);
		Skill::destroy.proc(&mut ctx, p2, bw, &mut ProcData::default());
		assert_eq!(ctx.get(bw, Stat::charges), 6);
		for _ in 0..6 {
			Skill::destroy.proc(&mut ctx, p2, bw, &mut ProcData::default());
		}
		assert_eq!(ctx.get_shield(p1), 0);
	}

	#[test]
	fn devourer() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let dev = ctx.new_thing(card::Devourer, p1);
		ctx.addCrea(p1, dev);
		ctx.set_quanta(p2, etg::Light, 1);
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get_player(p2).quanta(etg::Light), 0);
		assert_eq!(ctx.get_player(p1).quanta(etg::Darkness), 1);
	}

	#[test]
	fn disarm() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let monk = ctx.new_thing(card::Monk, p1);
		let dagger = ctx.new_thing(card::Dagger, p2);
		ctx.addCrea(p1, monk);
		ctx.setWeapon(p2, dagger);
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get_weapon(p2), 0);
		assert_eq!(ctx.get_player(p2).hand_last(), Some(dagger));
	}

	#[test]
	fn earthquake() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		for _ in 0..5 {
			ctx.play(ctx.get_player(p1).hand[0], 0, true);
		}
		let pillars = ctx.get_player(p1).permanents[0];
		assert!(ctx.get(pillars, Flag::pillar));
		assert_eq!(ctx.get(pillars, Stat::charges), 5);
		Skill::earthquake.proc(&mut ctx, p2, pillars, &mut ProcData::default());
		assert_eq!(ctx.get(pillars, Stat::charges), 2);
		Skill::earthquake.proc(&mut ctx, p2, pillars, &mut ProcData::default());
		assert_eq!(ctx.get_player(p1).permanents[0], 0);
	}

	#[test]
	fn eclipse() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		for _ in 0..2 {
			let vamp = ctx.new_thing(card::AsUpped(card::MinorVampire, true), p1);
			ctx.addCrea(p1, vamp);
		}
		let vagger = ctx.new_thing(card::VampiricStiletto, p1);
		ctx.setWeapon(p1, vagger);
		ctx.set(p1, Stat::hp, 50);
		ctx.r#move(GameMove::End(0));
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get(p2, Stat::hp), 88);
		assert_eq!(ctx.get(p1, Stat::hp), 62);
		for i in 0..2 {
			let nightfall = ctx.new_thing(card::AsUpped(card::Nightfall, i != 0), p1);
			ctx.addPerm(p1, nightfall);
		}
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get(p2, Stat::hp), 72);
		assert_eq!(ctx.get(p1, Stat::hp), 78);
		assert_eq!(ctx.truehp(ctx.get_player(p1).creatures[0]), 4);
	}

	#[test]
	fn gpull() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let dragon = ctx.new_thing(card::ColossalDragon, p2);
		ctx.addCrea(p2, dragon);
		ctx.set(p2, Stat::gpull, dragon);
		let scorp = ctx.new_thing(card::Scorpion, p1);
		ctx.addCrea(p1, scorp);
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get(dragon, Stat::hp), 23);
		assert_eq!(ctx.get(dragon, Stat::poison), 1,);
		ctx.die(dragon);
		assert_eq!(ctx.get(p2, Stat::gpull), 0);
	}

	#[test]
	fn hope() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let hope = ctx.new_thing(card::Hope, p1);
		ctx.setShield(p1, hope);
		for i in 0..4 {
			let photon = ctx.new_thing(card::AsUpped(card::Photon, i != 0), p1);
			ctx.addCrea(p1, photon);
		}
		assert_eq!(ctx.truedr(hope), 3);
	}

	#[test]
	fn lobotomize() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let scorp = ctx.new_thing(card::Scorpion, p1);
		let abom = ctx.new_thing(card::Abomination, p1);
		ctx.addCrea(p1, scorp);
		ctx.addCrea(p1, abom);
		Skill::lobotomize.proc(&mut ctx, scorp, scorp, &mut ProcData::default());
		Skill::lobotomize.proc(&mut ctx, abom, abom, &mut ProcData::default());
		assert!(!ctx.hasskill(scorp, Event::Hit, Skill::poison(1)));
		assert!(ctx.hasskill(abom, Event::Prespell, Skill::abomination));
	}

	#[test]
	fn obsession() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		ctx.get_player_mut(p1).hand = [0; 8];
		for i in 0..8 {
			let card = ctx.new_thing(card::AsUpped(card::GhostofthePast, (i & 1) != 0), p1);
			ctx.addCard(p1, card);
		}
		ctx.r#move(GameMove::End(ctx.get_player(p1).hand[0]));
		assert_eq!(ctx.get_player(p1).hand_len(), 7, "Discarded");
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get(p1, Stat::hp), 90);
		assert_eq!(ctx.get(p2, Stat::hp), 100);
		let card = ctx.new_thing(card::GhostofthePast, p1);
		ctx.addCard(p1, card);
		let shield = ctx.new_thing(card::MirrorShield, p1);
		ctx.setShield(p1, shield);
		ctx.r#move(GameMove::End(ctx.get_player(p1).hand[0]));
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get(p1, Stat::hp), 90);
		assert_eq!(ctx.get(p2, Stat::hp), 87);
		let shield2 = ctx.new_thing(card::MirrorShield, p2);
		ctx.setShield(p2, shield2);
		let card = ctx.new_thing(card::GhostofthePast, p1);
		ctx.addCard(p1, card);
		ctx.r#move(GameMove::End(ctx.get_player(p1).hand[0]));
		assert_eq!(ctx.get(p1, Stat::hp), 90);
		assert_eq!(ctx.get(p2, Stat::hp), 77);
	}

	#[test]
	fn parallel() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let dfly = ctx.new_thing(card::Dragonfly, p1);
		ctx.addCrea(p1, dfly);
		Skill::parallel.proc(&mut ctx, dfly, dfly, &mut ProcData::default());
		let clone = ctx.get_player(p1).creatures[1];
		assert_ne!(dfly, clone);
		assert_eq!(ctx.get(clone, Stat::card), card::Dragonfly,);
		Skill::web.proc(&mut ctx, dfly, dfly, &mut ProcData::default());
		Skill::parallel.proc(&mut ctx, dfly, dfly, &mut ProcData::default());
		let clone2 = ctx.get_player(p1).creatures[2];
		assert!(!ctx.get(dfly, Flag::airborne));
		assert!(ctx.get(clone, Flag::airborne));
		assert!(!ctx.get(clone2, Flag::airborne));
	}

	#[test]
	fn phoenix() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let phoenix = ctx.new_thing(card::Phoenix, p1);
		ctx.addCrea(p1, phoenix);
		Skill::lightning.proc(&mut ctx, p1, phoenix, &mut ProcData::default());
		let ash = ctx.get_player(p1).creatures[0];
		assert_eq!(ctx.get(ash, Stat::card), card::Ash);
	}

	#[test]
	fn plague() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		ctx.set_quanta(p1, etg::Death, 8);
		ctx.get_player_mut(p1).hand = [0; 8];
		let plague = ctx.new_thing(card::Plague, p1);
		ctx.addCard(p1, plague);
		let rustler = ctx.new_thing(card::Rustler, p1);
		ctx.addCrea(p1, rustler);
		ctx.useactive(ctx.get_player(p1).hand[0], p1);
		assert_eq!(ctx.get(rustler, Stat::poison), 1);
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.truehp(p2), 99);
		assert_eq!(ctx.get_player(p1).creatures[0], 0);
	}

	#[test]
	fn purify() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		Skill::poison(3).proc(&mut ctx, p1, p2, &mut ProcData::default());
		assert_eq!(ctx.get(p2, Stat::poison), 3);
		Skill::poison(3).proc(&mut ctx, p1, p2, &mut ProcData::default());
		assert_eq!(ctx.get(p2, Stat::poison), 6);
		Skill::neuroify.proc(&mut ctx, p1, p2, &mut ProcData::default());
		assert_eq!(ctx.get(p2, Stat::poison), 6);
		assert!(ctx.get(p2, Flag::neuro));
		Skill::purify.proc(&mut ctx, p1, p2, &mut ProcData::default());
		assert_eq!(ctx.get(p2, Stat::poison), -2);
		assert!(!ctx.get(p2, Flag::neuro));
		Skill::purify.proc(&mut ctx, p1, p2, &mut ProcData::default());
		assert_eq!(ctx.get(p2, Stat::poison), -4);
		Skill::neuroify.proc(&mut ctx, p1, p2, &mut ProcData::default());
		assert_eq!(ctx.get(p2, Stat::poison), 0);
		assert!(!ctx.get(p2, Flag::neuro));
	}

	#[test]
	fn rustler() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		ctx.set_quanta(p1, etg::Light, 2);
		let rustler = ctx.new_thing(card::Rustler, p1);
		ctx.addCrea(p1, rustler);
		ctx.r#move(GameMove::End(0));
		ctx.r#move(GameMove::End(0));
		ctx.r#move(GameMove::Cast(rustler, 0));
		assert_eq!(ctx.get_player(p1).quanta(etg::Light), 1);
		assert_eq!(ctx.get_player(p1).quanta(etg::Life), 2);
		ctx.r#move(GameMove::Cast(rustler, 0));
		assert_eq!(ctx.get_player(p1).quanta(etg::Light), 0);
		assert_eq!(ctx.get_player(p1).quanta(etg::Life), 4);
		ctx.r#move(GameMove::Cast(rustler, 0));
		assert_eq!(ctx.get_player(p1).quanta(etg::Light), 0);
		assert_eq!(ctx.get_player(p1).quanta(etg::Life), 4);
	}

	#[test]
	fn steal() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let bw = ctx.new_thing(card::BoneWall, p1);
		ctx.setShield(p1, bw);
		ctx.set(bw, Stat::charges, 3);
		Skill::steal.proc(&mut ctx, p2, bw, &mut ProcData::default());
		assert_eq!(ctx.get_shield(p1), bw);
		assert_eq!(ctx.get(bw, Stat::charges), 2);
		let bw2 = ctx.get_shield(p2);
		assert_ne!(bw2, 0);
		assert_eq!(ctx.get(bw2, Stat::charges), 1);
		Skill::steal.proc(&mut ctx, p2, bw, &mut ProcData::default());
		assert_eq!(ctx.get(bw, Stat::charges), 1);
		assert_eq!(ctx.get(ctx.get_shield(p2), Stat::charges), 1);
		Skill::steal.proc(&mut ctx, p2, bw, &mut ProcData::default());
		assert_eq!(ctx.get_shield(p1), 0);
		assert_eq!(ctx.get(ctx.get_shield(p2), Stat::charges), 1);
	}

	#[test]
	fn steam() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let steam = ctx.new_thing(card::SteamMachine, p1);
		ctx.addCrea(p1, steam);
		ctx.set_quanta(p1, etg::Fire, 8);
		ctx.set(steam, Stat::casts, 1);
		assert_eq!(ctx.trueatk(steam), 0);
		ctx.useactive(steam, 0);
		assert_eq!(ctx.trueatk(steam), 5);
		attack_foe(&mut ctx, steam);
		assert_eq!(ctx.trueatk(steam), 4);
		for _ in 0..5 {
			attack_foe(&mut ctx, steam);
		}
		assert_eq!(ctx.trueatk(steam), 0);
	}

	#[test]
	fn timebarrier() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let barrier = ctx.new_thing(card::TimeBarrier, p2);
		ctx.setShield(p2, barrier);
		ctx.r#move(GameMove::End(0));
		assert_eq!(ctx.get(barrier, Stat::charges), 5);
		ctx.get_player_mut(p2).hand = [0; 8];
		Skill::hasten.proc(&mut ctx, p2, 0, &mut ProcData::default());
		assert_eq!(ctx.get(barrier, Stat::charges), 6);
		Skill::hasten.proc(&mut ctx, p2, 0, &mut ProcData::default());
		Skill::hasten.proc(&mut ctx, p2, 0, &mut ProcData::default());
		Skill::hasten.proc(&mut ctx, p2, 0, &mut ProcData::default());
		assert_eq!(ctx.get(barrier, Stat::charges), 9);
		ctx.r#move(GameMove::End(0));
		ctx.r#move(GameMove::End(0));
		Skill::hasten.proc(&mut ctx, p2, 0, &mut ProcData::default());
		assert_eq!(ctx.get(barrier, Stat::charges), 10);
	}

	#[test]
	fn transform_no_sickness() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		ctx.set_quanta(p1, etg::Entropy, 8);
		let pixie = ctx.new_thing(card::Pixie, p1);
		ctx.addCrea(p1, pixie);
		ctx.set(pixie, Stat::casts, 1);
		ctx.transform(pixie, card::MaxwellsDemon);
		assert!(ctx.canactive(pixie));
	}

	#[test]
	fn voodoo() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		let voodoo = ctx.new_thing(card::VoodooDoll, p1);
		ctx.addCrea(p1, voodoo);
		Skill::lightning.proc(&mut ctx, voodoo, voodoo, &mut ProcData::default());
		Skill::poison(1).proc(&mut ctx, voodoo, voodoo, &mut ProcData::default());
		Skill::holylight.proc(&mut ctx, voodoo, voodoo, &mut ProcData::default());
		assert_eq!(ctx.truehp(voodoo), 1);
		assert_eq!(ctx.truehp(p2), 85);
		assert_eq!(ctx.get(voodoo, Stat::poison), 1);
		assert_eq!(ctx.get(p2, Stat::poison), 1);
		Skill::lightning.proc(&mut ctx, voodoo, voodoo, &mut ProcData::default());
		assert_eq!(ctx.truehp(p2), 85);
	}

	#[test]
	fn whim() {
		let (mut ctx, p1, p2) = setup(CardSet::Open);
		ctx.get_player_mut(p1).deck_mut().clear();
		let whim = ctx.new_thing(card::Whim, p1);
		let tstorm = ctx.new_thing(card::Thunderstorm, p1);
		let dfly = ctx.new_thing(card::Dragonfly, p1);
		ctx.set_quanta(p1, etg::Air, 3);
		ctx.addCrea(p1, whim);
		ctx.get_player_mut(p1).deck_mut().push(dfly);
		ctx.addCard(p1, tstorm);
		ctx.set(whim, Stat::casts, 1);
		ctx.useactive(whim, tstorm);
		assert_eq!(ctx.get_player(p1).deck.first(), Some(&tstorm));
		assert_eq!(ctx.get_player(p1).hand_last(), Some(dfly));
	}
}

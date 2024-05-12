#![no_std]

use alloc::vec::Vec;
use core::cmp::Ordering;
use core::iter::once;

use crate::aieval::eval;
use crate::card;
use crate::game::{Flag, Game, GameMove, Kind, Phase, Stat};
use crate::skill::{Event, Skill, Tgt};

fn has_sopa(ctx: &Game, id: i16) -> bool {
	ctx.get_kind(id) == Kind::Permanent
		&& ctx.hasskill(id, Event::Cast, Skill::die)
		&& (ctx.hasskill(id, Event::Attack, Skill::patience) || ctx.get(id, Flag::patience))
}

fn proc_sopa(gclone: &mut Game, turn: i16) {
	for pr in gclone.get_player(turn).permanents {
		if pr != 0 && has_sopa(gclone, pr) && gclone.canactive(pr) {
			gclone.r#move(GameMove::Cast(pr, 0));
		}
	}
}

#[derive(Clone, Copy)]
struct Candidate {
	pub cmd: GameMove,
	pub depth: i32,
	pub score: i32,
}

fn get_worst_card(ctx: &Game) -> (i16, i32) {
	if ctx.full_hand(ctx.turn) {
		ctx.get_player(ctx.turn)
			.hand
			.into_iter()
			.filter(|&card| card != 0)
			.map(|card| {
				let mut clone = ctx.clonegame();
				clone.die(card);
				(card, eval(&clone))
			})
			.max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(Ordering::Equal))
			.unwrap()
	} else {
		(0, eval(ctx))
	}
}

fn lethal(ctx: &Game) -> Option<GameMove> {
	let turn = ctx.turn;
	let foe = ctx.get_foe(turn);
	let foehp = ctx.get(foe, Stat::hp);
	let mut dmgmoves = Vec::new();
	alltgtsforplayer(ctx, turn, &mut |ctx, id| {
		if id == 0 || !ctx.canactive(id) {
			return;
		}
		if let Some(&active) = ctx.getSkill(id, Event::Cast).first() {
			if let Some(tgting) = active.targeting(ctx.cardset()) {
				let mut tgts = Vec::with_capacity(50 * ctx.players().len());
				for plid in 1..=ctx.players_len() {
					let pl = ctx.get_player(plid);
					if plid == turn {
						if (pl.shield != 0 && ctx.get(pl.shield, Flag::reflective))
							|| active == Skill::pandemonium
						{
							if tgting.full_check(ctx, id, turn) {
								tgts.push(turn);
							}
						}
						if matches!(active, Skill::catapult | Skill::golemhit) {
							tgts.extend(
								pl.creatures
									.into_iter()
									.filter(|&t| t != 0 && tgting.full_check(ctx, id, t)),
							);
						} else {
							tgts.extend(pl.creatures.into_iter().filter(|&t| {
								t != 0 && ctx.get(t, Flag::voodoo) && tgting.full_check(ctx, id, t)
							}));
						}
					} else {
						tgts.extend(
							once(turn).chain(pl.hand_iter()).filter(|&t| tgting.full_check(ctx, id, t)),
						)
					}
				}
				if let Some(choice) = tgts
					.iter()
					.map(|&t| {
						let mut gclone = ctx.clone();
						gclone.r#move(GameMove::Cast(id, t));
						(
							id,
							t,
							if gclone.winner == turn {
								i16::MIN
							} else if gclone.winner == 0 {
								gclone.get(foe, Stat::hp)
							} else {
								foehp
							},
						)
					})
					.filter(|candy| candy.2 < foehp)
					.min_by_key(|candy| candy.2)
				{
					dmgmoves.push(choice);
				}
			} else {
				let mut gclone = ctx.clone();
				gclone.r#move(GameMove::Cast(id, 0));
				if gclone.winner == turn {
					dmgmoves.push((id, 0, i16::MIN));
				} else if gclone.winner == 0 {
					let clonefoehp = gclone.get(foe, Stat::hp);
					if clonefoehp < foehp {
						dmgmoves.push((id, 0, clonefoehp));
					}
				}
			}
		}
	});
	dmgmoves.sort_unstable_by_key(|&x| x.2);
	if let Some(&firstmove) = dmgmoves.first() {
		let firstmove = Some(GameMove::Cast(firstmove.0, firstmove.1));
		let mut gclone = ctx.clone();
		for &(c, t, _) in dmgmoves.iter() {
			if gclone.getIndex(c) != -1
				&& gclone.canactive(c)
				&& (if let Some(tgt) =
					gclone.getSkill(c, Event::Cast).first().and_then(|sk| sk.targeting(ctx.cardset()))
				{
					t != 0 && gclone.getIndex(t) != -1 && gclone.can_target(c, t)
				} else {
					t == 0
				}) {
				gclone.r#move(GameMove::Cast(c, t));
				if gclone.winner == turn {
					return firstmove;
				}
			}
		}
		if !gclone.get_player(turn).hand_full() {
			if gclone
				.get_player(turn)
				.creatures
				.into_iter()
				.filter(|&id| id != 0)
				.map(|id| gclone.trueatk(id))
				.sum::<i16>()
				> 0
			{
				proc_sopa(&mut gclone, turn);
			}
			gclone.r#move(GameMove::End(0));
			if gclone.winner == turn {
				return firstmove;
			}
		}
	}
	None
}

fn alltgtsforplayer<F>(ctx: &Game, id: i16, func: &mut F)
where
	F: FnMut(&Game, i16),
{
	let pl = ctx.get_player(id);
	for id in once(id)
		.chain(once(pl.weapon))
		.chain(once(pl.shield))
		.chain(pl.creatures.into_iter())
		.chain(pl.permanents.into_iter())
		.chain(pl.hand_iter())
	{
		if id != 0 {
			func(ctx, id);
		}
	}
}

fn alltgts<F>(ctx: &Game, mut func: F)
where
	F: FnMut(&Game, i16),
{
	alltgtsforplayer(ctx, ctx.turn, &mut func);
	alltgtsforplayer(ctx, ctx.get_foe(ctx.turn), &mut func);
}

fn scantgt(ctx: &Game, depth: i32, candy: &mut Candidate, limit: &mut u32, id: i16, tgt: Tgt) {
	alltgts(ctx, |ctx, t| {
		if tgt.full_check(ctx, id, t) {
			scancore(ctx, depth, candy, limit, GameMove::Cast(id, t));
		}
	});
}

fn scancore(ctx: &Game, depth: i32, candy: &mut Candidate, limit: &mut u32, cmd: GameMove) {
	let mut gclone = ctx.clone();
	let mut blockscan = false;
	if (if let GameMove::Cast(id, 0) = cmd {
		if has_sopa(&gclone, id) {
			let turn = gclone.turn;
			proc_sopa(&mut gclone, turn);
			false
		} else if matches!(
			ctx.getSkill(id, Event::Cast),
			&[Skill::pandemonium]
				| &[Skill::pandemonium2]
				| &[Skill::pandemonium3]
				| &[Skill::cseed]
				| &[Skill::cseed2]
				| &[Skill::mutation]
				| &[Skill::improve]
				| &[Skill::hatch]
				| &[Skill::fickle]
				| &[Skill::tornado]
				| &[Skill::trick]
		) || ctx.hasskill(id, Event::Shield, Skill::randomdr)
			|| ctx.hasskill(id, Event::OwnPlay, Skill::mutant)
		{
			if depth > 0 {
				return;
			}
			blockscan = true;
			true
		} else {
			true
		}
	} else {
		true
	}) {
		gclone.r#move(cmd);
	}
	let score = get_worst_card(&gclone).1;
	if score > candy.score || (score == candy.score && depth < candy.depth) {
		if depth == 0 {
			*candy = Candidate { cmd, depth, score };
		} else {
			candy.depth = depth;
			candy.score = score;
		}
	}
	if *limit > 0 {
		if !blockscan && depth == 0 {
			let mut searchcan = *candy;
			searchcan.cmd = cmd;
			scan(&gclone, depth + 1, &mut searchcan, limit);
			if searchcan.score > candy.score {
				*candy = searchcan;
			}
		} else {
			*limit -= 1;
		}
	}
}

fn scan(ctx: &Game, depth: i32, candy: &mut Candidate, limit: &mut u32) {
	let pl = ctx.get_player(ctx.turn);
	for (id, sk) in pl
		.hand
		.into_iter()
		.filter(|&id| ctx.canactive(id))
		.map(|id| {
			let card = ctx.get_card(ctx.get(id, Stat::card));
			(id, (if card.kind == Kind::Spell { ctx.getSkill(id, Event::Cast).first() } else { None }))
		})
		.chain(
			once(pl.weapon)
				.chain(once(pl.shield))
				.chain(pl.creatures.into_iter())
				.chain(pl.permanents.into_iter())
				.filter(|&id| id != 0 && ctx.canactive(id))
				.map(|id| (id, ctx.getSkill(id, Event::Cast).first())),
		) {
		if let Some(tgt) = sk.and_then(|sk| sk.targeting(ctx.cardset())) {
			scantgt(ctx, depth, candy, limit, id, tgt);
		} else {
			scancore(ctx, depth, candy, limit, GameMove::Cast(id, 0));
		}
	}
}

pub fn search(ctx: &Game) -> GameMove {
	if ctx.phase == Phase::Mulligan {
		let turn = ctx.turn;
		let pl = ctx.get_player(turn);
		return if pl.hand_len() < 6
			|| pl.hand_iter().any(|id| {
				ctx.get(id, Flag::pillar) || {
					let card = ctx.get(id, Stat::card);
					card::IsOf(card, card::Nova)
						|| card::IsOf(card, card::Immolation)
						|| card::IsOf(card, card::GiftofOceanus)
						|| card::IsOf(card, card::QuantumLocket)
				}
			}) || pl.deck.iter().all(|&id| !ctx.get(id, Flag::pillar))
		{
			GameMove::Accept
		} else {
			GameMove::Mulligan
		};
	}
	lethal(ctx).unwrap_or_else(|| {
		let (discard, score) = get_worst_card(ctx);
		let mut candy = Candidate { cmd: GameMove::End(discard), depth: 0, score };
		scan(ctx, 0, &mut candy, &mut 5040);
		candy.cmd
	})
}

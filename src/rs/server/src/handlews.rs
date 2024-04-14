use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::num::NonZeroUsize;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use base64::prelude::*;
use bb8_postgres::tokio_postgres::{
	types::{Json, ToSql},
	Client, GenericClient,
};
use futures::{SinkExt, StreamExt, TryFutureExt};
use fxhash::{FxHashMap, FxHasher64};
use hyper_tungstenite::tungstenite::Message;
use rand::distributions::{Distribution, Uniform};
use rand::{Rng, RngCore};
use ring::pbkdf2;
use serde_json::Value;
use tokio::join;
use tokio::sync::{mpsc, Mutex, MutexGuard, RwLock};
use tokio_stream::wrappers::UnboundedReceiverStream;

use std::net::ToSocketAddrs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio_rustls::{rustls::pki_types::ServerName, TlsConnector};

use crate::cardpool::Cardpool;
use crate::etgutil::{decode_code, encode_code, encode_count, iterraw};
use crate::generated::{DG_COUNT, MAGE_COUNT};
use crate::json::{
	Alt, ArenaInfo, AuthMessage, BzBid, GamesData, GamesDataPlayer, GamesMove, UserMessage, WsResponse,
};
use crate::starters::ORIGINAL_STARTERS;
use crate::users::{self, HashAlgo, Leaderboard, LegacyData, OpenData, UserObject, UserRole, Users};
use crate::{get_day, PgPool, WsStream};

static NEXT_SOCK_ID: AtomicUsize = AtomicUsize::new(1);

const SELL_VALUES: [u8; 5] = [5, 1, 3, 15, 150];

enum BzBidOp<'a> {
	Delete { id: i64, bid: BzBid<'a> },
	Update { id: i64, bid: BzBid<'a>, q: u16 },
	Insert { q: u16, p: i16 },
}

struct BzBidSell {
	u: String,
	code: i16,
	amt: u16,
	p: i16,
}

pub async fn broadcast<T>(socks: &AsyncSocks, val: &T)
where
	T: serde::Serialize,
{
	if let Ok(valstr) = serde_json::to_string(val) {
		let msg = Message::Text(valstr);
		for sock in socks.read().await.values() {
			sock.tx.send(msg.clone()).ok();
		}
	}
}

type WsSender = mpsc::UnboundedSender<Message>;

pub struct Sock {
	tx: WsSender,
	afk: bool,
	hide: bool,
}

pub type AsyncUsers = RwLock<Users>;
pub type AsyncSocks = RwLock<HashMap<NonZeroUsize, Sock>>;

fn sendmsg<T>(tx: &WsSender, val: &T)
where
	T: serde::Serialize,
{
	if let Ok(valstr) = serde_json::to_string(val) {
		tx.send(Message::Text(valstr)).ok();
	}
}

fn wilson(up: f64, total: f64) -> f64 {
	const Z: f64 = 2.326348;
	const Z2: f64 = Z * Z;
	let phat = up / total;
	(phat + Z2 / (2.0 * total) - Z * ((phat * (1.0 - phat) + Z2 / (4.0 * total)) / total).sqrt())
		/ (1.0 + Z2 / total)
}

async fn role_check<'a>(role: UserRole, tx: &'a WsSender, client: &'a Client, userid: i64) -> bool {
	let ret = if let Ok(row) = client
		.query_one(
			"select exists(select * from user_role where user_id = $1 and role_id = $2) res",
			&[&userid, &role],
		)
		.await
	{
		row.get::<usize, bool>(0)
	} else {
		false
	};
	if !ret {
		sendmsg(&tx, &WsResponse::chat { mode: 1, msg: "Insufficient permissions" });
	}
	ret
}

async fn add_role_handler<'a>(
	role: UserRole,
	tx: &'a WsSender,
	client: &'a Client,
	userid: i64,
	m: &'a str,
) {
	if role_check(role, tx, client, userid).await {
		client.execute("insert into user_role (user_id, role_id) select u.id, $2 from users u where u.name = $1 on conflict do nothing", &[&m, &role]).await.ok();
	}
}

async fn rm_role_handler<'a>(
	role: UserRole,
	tx: &'a WsSender,
	client: &'a Client,
	userid: i64,
	m: &'a str,
) {
	if role_check(role, tx, client, userid).await {
		client.execute("delete from user_role ur using users u where ur.user_id = u.id and ur.role_id = $2 and u.name = $1", &[&m, &role]).await.ok();
	}
}

fn update_arena_ranks<C>(
	client: &C,
) -> impl std::future::Future<Output = Result<u64, bb8_postgres::tokio_postgres::error::Error>> + '_
where
	C: GenericClient,
{
	client.execute("with arank as (select user_id, arena_id, \"rank\", (row_number() over (partition by arena_id order by score desc, day desc, \"rank\"))::int realrank from arena) update arena set \"rank\" = realrank, bestrank = least(bestrank, realrank) from arank where arank.arena_id = arena.arena_id and arank.user_id = arena.user_id and arank.realrank <> arank.\"rank\"", &[])
}

async fn login_success(tx: &WsSender, user: &mut UserObject, client: &mut Client) {
	if let Ok(userstr) = serde_json::to_string(&WsResponse::login(user)) {
		tx.send(Message::Text(userstr)).ok();
	}

	if user.id != -1 {
		client
			.execute(
				"update users set auth = $2, salt = $3, iter = $4, algo = $5 where id = $1",
				&[&user.id, &user.auth, &user.salt, &(user.iter as i32), &user.algo],
			)
			.await
			.ok();
	}
}

fn card_val24(rarity: i8, upped: bool, shiny: bool) -> u32 {
	if rarity != 0 || upped || shiny {
		(match rarity {
			0 => 200,
			1 => 33,
			2 => 120,
			3 => 720,
			4 => 6000,
			_ => 0,
		}) * (match (upped, shiny) {
			(false, false) => 1,
			(true, true) => 36,
			_ => 6,
		})
	} else {
		0
	}
}

fn upshpi<F>(user: &mut OpenData, code: i16, f: F)
where
	F: FnOnce(i16) -> i16,
{
	if user.gold >= 50 && !etg::card::Upped(code) && !etg::card::Shiny(code) {
		if let Some(card) = etg::card::OpenSet.try_get(code) {
			if card.rarity == 0 {
				user.gold -= 50;
				let c = user.pool.0.entry(f(code)).or_default();
				*c = c.saturating_add(1);
			}
		}
	}
}

fn transmute_core(pool: &mut Cardpool, oldcode: i16, newcode: i16, oldcopies: u16, newcopies: u16) -> bool {
	if let Some(oldc) = pool.0.get_mut(&oldcode) {
		if *oldc >= oldcopies {
			*oldc -= oldcopies;
			let newc = pool.0.entry(newcode).or_default();
			*newc = newc.saturating_add(newcopies);
			return true;
		}
	}
	false
}

fn transmute(user: &mut OpenData, oldcode: i16, newcode: i16, oldcopies: u16, newcopies: u16) {
	if oldcode != newcode {
		if !transmute_core(&mut user.pool, oldcode, newcode, oldcopies, newcopies) {
			transmute_core(&mut user.accountbound, oldcode, newcode, oldcopies, newcopies);
		}
	}
}

fn canaffordcards(pool: &Cardpool, cards: &str) -> Option<&'static str> {
	let mut foetally = HashMap::<i16, u16>::new();
	for (code, count) in iterraw(cards.as_bytes()) {
		let c = foetally.entry(code).or_default();
		if let Some(newc) = c.checked_add(count) {
			*c = newc;
			if pool.0.get(&code).cloned().unwrap_or(0) < newc {
				return Some("Not enough cards between players");
			}
		} else {
			return Some("Overflow in card totals");
		}
	}
	None
}

fn flagname(flags: &HashSet<String>) -> String {
	let mut flagvec = flags.iter().map(String::as_str).collect::<Vec<_>>();
	flagvec.sort_unstable();
	return flagvec.join("|");
}

fn logerr<T, E>(x: Result<T, E>) -> Result<T, E>
where
	E: std::fmt::Display,
{
	if let Err(ref e) = x {
		println!("Error: {e}");
	}
	x
}

fn leagueid(flags: &HashSet<String>) -> i64 {
	if flags.is_empty() {
		0
	} else {
		let mut flagvec = flags.iter().map(String::as_str).collect::<Vec<_>>();
		flagvec.sort_unstable();
		let mut hasher: FxHasher64 = Default::default();
		flagvec.hash(&mut hasher);
		hasher.finish() as i64
	}
}

async fn ordered_lock<'a, T>(m1: &'a Mutex<T>, m2: &'a Mutex<T>) -> (MutexGuard<'a, T>, MutexGuard<'a, T>) {
	let l1;
	let l2;
	if m1 as *const _ > m2 as *const _ {
		l2 = m2.lock().await;
		l1 = m1.lock().await;
	} else {
		l1 = m1.lock().await;
		l2 = m2.lock().await;
	};
	(l1, l2)
}

pub async fn handle_ws(
	ws: WsStream,
	pgpool: &PgPool,
	users: &AsyncUsers,
	socks: &AsyncSocks,
	tls: &TlsConnector,
) {
	let Some(sockid) = NonZeroUsize::new(NEXT_SOCK_ID.fetch_add(1, Ordering::Relaxed)) else { return };

	let (mut user_ws_tx, mut user_ws_rx) = ws.split();
	let (tx, rx) = mpsc::unbounded_channel();
	let mut rx = UnboundedReceiverStream::new(rx);
	tokio::spawn(async move {
		while let Some(result) = rx.next().await {
			user_ws_tx.send(result).unwrap_or_else(|e| println!("send err {}", e)).await;
		}
	});

	socks.write().await.insert(sockid, Sock { tx: tx.clone(), afk: false, hide: false });

	'msgloop: while let Some(Ok(result)) = user_ws_rx.next().await {
		let Message::Text(msg) = result else { continue };
		if let Ok(msg) = serde_json::from_str::<UserMessage>(&msg) {
			let Ok(mut client) = pgpool.get().await else { continue };

			match msg {
				UserMessage::a { u, a, uname, msg } => {
					let Some((user, userid)) = Users::load_with_auth(users, &*client, &u, &a, sockid).await
					else {
						continue;
					};
					match msg {
						AuthMessage::modadd { m } => {
							add_role_handler(UserRole::Mod, &tx, &client, userid, &m).await;
						}
						AuthMessage::modrm { m } => {
							rm_role_handler(UserRole::Mod, &tx, &client, userid, &m).await;
						}
						AuthMessage::modresetpass { m } => {
							if u == "serprex" {
								let mut wusers = users.write().await;
								if let Some(user) = wusers.load(&*client, &m).await {
									user.lock().await.auth.clear();
								}
							}
						}
						AuthMessage::codesmithadd { m } => {
							add_role_handler(UserRole::Codesmith, &tx, &client, userid, &m).await;
						}
						AuthMessage::codesmithrm { m } => {
							rm_role_handler(UserRole::Codesmith, &tx, &client, userid, &m).await;
						}
						AuthMessage::modguest { m } => {
							if role_check(UserRole::Mod, &tx, &client, userid).await {
								client
									.execute(
										if m == "off" {
											"insert into strings (key, val) values ('GuestsBanned', '') on conflict do nothing"
										} else {
											"delete from strings where key = 'GuestsBanned'"
										},
										&[],
									)
									.await
									.ok();
							}
						}
						AuthMessage::modmute { m } => {
							if role_check(UserRole::Mod, &tx, &client, userid).await {
								broadcast(&socks, &WsResponse::mute { m: &m }).await;
							}
						}
						AuthMessage::modclear => {
							if role_check(UserRole::Mod, &tx, &client, userid).await {
								broadcast(&socks, &WsResponse::clear).await;
							}
						}
						AuthMessage::modmotd { m } => {
							if role_check(UserRole::Mod, &tx, &client, userid).await {
								let mbytes = m.as_bytes();
								let mut nend = 0;
								while nend < mbytes.len()
									&& mbytes[nend] >= b'0' && mbytes[nend] <= b'9'
								{
									nend += 1;
								}
								let mut mstart = nend;
								while mstart < mbytes.len() && mbytes[mstart] == b' ' {
									mstart += 1;
								}
								let (digits, motd) = unsafe {
									(
										std::str::from_utf8_unchecked(&mbytes[..nend]),
										std::str::from_utf8_unchecked(&mbytes[mstart..]),
									)
								};
								if let Ok(id) = digits.parse::<i32>() {
									(if motd.is_empty() {
										client.execute("delete from motd where id = $1", &[&id]).await
									} else {
										client.execute("insert into motd (id, val) values ($1, $2) on conflict (id) do update set val = $2", &[&id, &motd]).await
									}).ok();
								} else {
									sendmsg(
										&tx,
										&WsResponse::chat {
											mode: 1,
											msg: "Invalid format",
										},
									);
								}
							}
						}
						AuthMessage::inituser { e } => {
							if userid == -1 && e > 0 && e < 14 {
								let data = OpenData::new(e as usize);
								let mut user = user.lock().await;
								if let Ok(trx) = client.transaction().await {
									if let Ok(new_row) = logerr(trx.query_one(
										"insert into users (name, auth, salt, iter, algo) values ($1, $2, $3, $4, $5) returning id",
										&[&u, &user.auth, &user.salt, &(user.iter as i32), &user.algo ]).await)
									{
										user.id = new_row.get(0);
										if logerr(trx.execute(
											"insert into user_data (user_id, type_id, name, data) values ($1, 1, $2, $3)",
											&[&user.id, &"", &Json(&data)]).await).is_ok()
											&& trx.commit().await.is_ok()
										{
											user.data.insert(String::new(), data);
											if let Ok(userstr) = serde_json::to_string(&WsResponse::login(&user)) {
												tx.send(Message::Text(userstr)).ok();
											}
										}
									}
								}
							}
						}
						AuthMessage::initoriginal { e, name } => {
							if e > 0 && e < 14 {
								let sid = ORIGINAL_STARTERS[e as usize - 1];
								let userdata = LegacyData {
									pool: Cardpool::from(sid.0),
									deck: String::from(sid.1),
									electrum: 0,
									oracle: 0,
									fg: None,
								};
								if client.execute("insert into user_data (user_id, type_id, name, data) values ($1, 2, $2, $3)", &[&userid, &name, &Json(&userdata)]).await.is_ok() {
									sendmsg(&tx, &WsResponse::originaldata{ name: &name, data: &userdata });
								}
							}
						}
						AuthMessage::logout => {
							users.write().await.evict(&client, &u).await;
						}
						AuthMessage::delete => {
							let params: &[&(dyn ToSql + Sync)] = &[&userid];
							if let Ok(trx) = client.transaction().await {
								if let (Ok(_), Ok(_), Ok(_), true) = join!(
									trx.execute("delete from arena where user_id = $1", params),
									trx.execute("delete from bazaar where user_id = $1", params),
									trx.execute("delete from stats where user_id = $1", params),
									async {
										trx.execute("delete from leaderboard using user_data ud where data_id = ud.id and ud.user_id = $1", &[&userid]).await.is_ok() &&
										trx.execute("delete from user_data where user_id = $1", params).await.is_ok()
									}
								) {
									if trx
										.execute("delete from users where id = $1", params)
										.await
										.is_ok() &&
										trx.commit().await.is_ok()
									{
										users.write().await.remove(&u);
									}
								}
							}
						}
						AuthMessage::altcreate {
							name, e, flags
						} => {
							if e > 0 && e < 14 && !name.is_empty() {
								let mut user = user.lock().await;
								if user.data.contains_key(&name) {
									sendmsg(&tx, &WsResponse::chat { mode: 1, msg: "Alt already exists" });
									continue
								}
								let mut data = OpenData::new(e as usize);
								data.flags = flags;
								if client.execute(
									"insert into user_data (user_id, type_id, name, data) values ($1, 1, $2, $3)",
									&[&userid, &name, &Json(&data)]).await.is_ok()
								{
									sendmsg(&tx, &WsResponse::altadd(Alt{ name: &name, data: &data }));
									user.data.insert(name, data);
								}
							}
						}
						AuthMessage::altdelete {
							name
						} => {
							if let Ok(trx) = client.transaction().await {
								if trx.execute("delete from leaderboard using user_data ud where data_id = ud.id and ud.user_id = $1 and ud.name = $2", &[&userid, &name]).await.is_ok() &&
									trx.execute("delete from user_data where user_id = $1 and name = $2", &[&userid, &name]).await.is_ok() &&
									trx.commit().await.is_ok() {
									user.lock().await.data.remove(&name);
								}
							}
						}
						AuthMessage::setarena {
							d,
							r#mod,
							lv,
							hp,
							draw,
							mark,
						} => {
							let ocard = {
								let user = user.lock().await;
								let Some(userdata) = user.data.get("") else {
									continue
								};
								userdata.ocard as i32
							};
							if ocard != 0 {
								let hp = hp as i32;
								let mark = mark as i32;
								let draw = draw as i32;
								let lv = if lv == 0 { 1i32 } else { 2i32 };
								if r#mod {
									client.execute("update arena set deck = $3, hp = $4, draw = $5, mark = $6 where user_id = $1 and arena_id = $2", &[&userid, &lv, &d, &hp, &draw, &mark]).await.ok();
								} else {
									let oldage = client.query_one("select day from arena where user_id = $1 and arena_id = $2",
																  &[&userid, &lv]).await;
									let today = get_day();
									if let Ok(row) = oldage {
										let age =
											today.saturating_sub(row.get::<usize, i32>(0) as u32);
										if age > 0 {
											let mut user = user.lock().await;
											let Some(userdata) = user.data.get_mut("") else {
												continue
											};
											userdata.gold = userdata.gold.saturating_add(
												age.saturating_mul(25).min(350) as i32,
											);
										}
									}
									if let Ok(trx) = client.transaction().await {
										if trx.execute("insert into arena (user_id, arena_id, day, deck, code, won, loss, hp, draw, mark, score) values ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8, 250) on conflict (user_id, arena_id) do update set day = $3, deck = $4, code = $5, won = 0, loss = 0, hp = $6, draw = $7, mark = $8, score = 250, \"rank\" = -1, bestrank = null",
										&[&userid, &lv, &(today as i32), &d, &ocard, &hp, &draw, &mark]).await.is_ok() {
											if update_arena_ranks(&trx).await.is_ok() {
												trx.commit().await.ok();
											}
										}
									}
								}
							}
						}
						AuthMessage::arenainfo => {
							if let Ok(rows) = client.query(
								"select arena_id, \"day\", draw, mark, hp, won, loss, code, deck, \"rank\", bestrank from arena where user_id = $1",
								&[&userid],
								).await {
								let today = get_day();
								let mut a1 = None;
								let mut a2 = None;
								for row in rows.iter() {
									let arena_id: i32 = row.get(0);
									let day: i32 = row.get(1);
									let draw: i32 = row.get(2);
									let mark: i32 = row.get(3);
									let hp: i32 = row.get(4);
									let win: i32 = row.get(5);
									let loss: i32 = row.get(6);
									let card: i32 = row.get(7);
									let deck: &str = row.get(8);
									let rank: i32 = row.get(9);
									let bestrank: i32 = row.get(10);
									*if arena_id == 1 {
										&mut a1
									} else {
										&mut a2
									} = Some(ArenaInfo {
										day: today.saturating_sub(day as u32),
										draw,
										mark,
										hp,
										win,
										loss,
										card,
										deck,
										rank,
										bestrank,
									});
								}
								sendmsg(&tx, &WsResponse::arenainfo { a1, a2 });
							}
						}
						AuthMessage::modarena { aname, won, lv } => {
							let mut wusers = users.write().await;
							if let Some(auserid) =
								if let Some(other) = wusers.load(&*client, &aname).await {
									let mut other = other.lock().await;
									if let Some(otherdata) = other.data.get_mut("") {
										otherdata.gold += if won { 15 } else { 5 };
										Some(other.id)
									} else {
										None
									}
								} else {
									None
								} {
								if let Ok(trx) = client.transaction().await {
									let alv = if lv == 0 { 1i32 } else { 2i32 };
									if let Ok(row) = trx.query_one("select a.won, a.loss from arena a where a.arena_id = $1 and a.user_id = $2 for update", &[&alv, &auserid]).await {
											let awon = (row.get::<usize, i32>(0) + won as i32 + 1) as f64;
											let mut aloss = (row.get::<usize, i32>(1) + (!won) as i32) as f64;
											if lv != 0 {
												aloss *= (aloss / 2.0).ln_1p();
											}
											let decay = awon + aloss;
											let newscore =
												(wilson(awon, awon + aloss) * (1.0 - decay / (decay + 192.0)) * 1000.0) as i32;
											trx.execute(
												if won {
													"update arena set won = won+1, score = $3 where arena_id = $1 and user_id = $2"
												} else {
													"update arena set loss = loss+1, score = $3 where arena_id = $1 and user_id = $2"
												}, &[&alv, &auserid, &newscore]).await.ok();
											update_arena_ranks(&trx).await.ok();
											trx.commit().await.ok();
										}
								}
							}
						}
						AuthMessage::foearena { lv } => {
							let arenaid = if lv == 0 { 1i32 } else { 2i32 };
							if let Ok(row) = client
								.query_one(
									"select count(*) from arena where arena_id = $1 and user_id <> $2",
									&[&arenaid, &userid],
								)
								.await
							{
								let len = row.get::<usize, i64>(0);
								if len > 0 {
									let (seed, idx) = {
										let mut rng = rand::thread_rng();
										let mut r = rng.gen::<f64>();
										let mut p = 0.05;
										let p0 = 1.0 - p;
										let mut idx = 0;
										while idx + 1 < len && r > p {
											r -= p;
											p *= p0;
											idx += 1;
										}
										(rng.gen::<u32>(), idx)
									};
									if let Ok(row) = client.query_one("select u.name, a.deck, a.hp, a.mark, a.draw, a.code from arena a join users u on u.id = a.user_id where a.arena_id = $1 and a.user_id <> $2 order by a.\"rank\" limit 1 offset $3", &[&arenaid, &userid, &idx]).await {
										let name: &str = row.get(0);
										let mut deck: String = row.get(1);
										let hp: i32 = row.get(2);
										let mark: i32 = row.get(3);
										let draw: i32 = row.get(4);
										let code = row.get::<usize, i32>(5) as i16;
										deck.push_str("05");
										deck.push_str(unsafe { std::str::from_utf8_unchecked(&encode_code(etg::card::AsUpped(code, lv != 0))) });
										sendmsg(&tx, &WsResponse::foearena { seed, name, hp, mark, draw, deck: &deck, rank: idx, lv });
									}
								}
							}
						}
						AuthMessage::stat {
							set,
							stats,
							players,
						} => {
							client.execute("insert into stats (user_id, \"set\", stats, players) values ($1, $2, $3, $4)", &[&userid, &set, &Json(stats), &players]).await.ok();
						}
						AuthMessage::setgold { t, g } => {
							if role_check(UserRole::Codesmith, &tx, &client, userid).await {
								if let Some(tgt) = users.write().await.load(&*client, &t).await {
									let mut tgt = tgt.lock().await;
									if let Some(tgtdata) = tgt.data.get_mut("") {
										sendmsg(
											&tx,
											&WsResponse::chat {
												mode: 1,
												msg: &format!(
													"Set {} from {}$ to {}$",
												t, tgtdata.gold, g
												),
											},
										);
										tgtdata.gold = g;
									}
								}
							}
						}
						AuthMessage::addpool { t, pool, bound } => {
							if role_check(UserRole::Codesmith, &tx, &client, userid).await {
								if let Some(tgt) = users.write().await.load(&*client, &t).await {
									let mut tgt = tgt.lock().await;
									if let Some(tgtdata) = tgt.data.get_mut("") {
										let curpool = if bound {
											&mut tgtdata.accountbound
										} else {
											&mut tgtdata.pool
										};
										for (code, count) in iterraw(pool.as_bytes()) {
											let c = curpool.0.entry(code).or_default();
											*c = c.saturating_add(count);
										}
									}
									sendmsg(
										&tx,
										&WsResponse::chat {
											mode: 1,
											msg: &format!(
												"Added to {}'s {} {}",
												t,
												if bound { "accountbound" } else { "pool" },
												pool
											),
										},
									);
								}
							}
						}
						AuthMessage::codecreate { t } => {
							if t.is_empty() {
								sendmsg(
									&tx,
									&WsResponse::chat {
										mode: 1,
										msg: "No type specified",
									},
								);
							} else {
								if role_check(UserRole::Codesmith, &tx, &client, userid).await {
									use rand::distributions::Alphanumeric;
									let mut codebin = [0u8; 8];
									let code = {
										let mut rng = rand::thread_rng();
										for i in 0..8 {
											codebin[i] = rng.sample(Alphanumeric)
										}
										unsafe { std::str::from_utf8_unchecked(&codebin[..]) }
									};
									if client
										.execute("insert into codes values ($1, $2)", &[&code, &t])
										.await
										.is_ok()
									{
										sendmsg(
											&tx,
											&WsResponse::chat {
												mode: 1,
												msg: &format!("{} {}", t, code),
											},
										);
									} else {
										sendmsg(
											&tx,
											&WsResponse::chat {
												mode: 1,
												msg: "Failed to create code",
											},
										);
									}
								}
							}
						}
						AuthMessage::codesubmit { code } => {
							if let Ok(trx) = client.transaction().await {
								if let Ok(row) = trx
									.query_one(
										"select val from codes where code = $1 for update",
										&[&code],
									)
									.await
								{
									let val: &str = row.get(0);
									if val.starts_with('G') {
										if let Ok(g) = val[1..].parse::<i32>() {
											if trx
												.execute(
													"delete from codes where code = $1",
													&[&code],
												)
												.await
												.is_ok()
											{
												if trx.commit().await.is_ok() {
													let mut user = user.lock().await;
													if let Some(userdata) = user.data.get_mut("") {
														userdata.gold =
															userdata.gold.saturating_add(g);
													}
													sendmsg(&tx, &WsResponse::codegold { g });
												}
											}
										} else {
											sendmsg(
												&tx,
												&WsResponse::chat {
													mode: 1,
													msg: &format!(
														"Unknown gold code type: {}",
														val
													),
												},
											);
										}
									} else if val.starts_with('C') {
										let ccode = decode_code(val[1..].as_bytes());
										if etg::card::OpenSet.try_get(ccode).is_some() {
											if trx
												.execute(
													"delete from codes where code = $1",
													&[&code],
												)
												.await
												.is_ok() && trx.commit().await.is_ok() {
													let mut user = user.lock().await;
													if let Some(userdata) = user.data.get_mut("") {
														let c = userdata
															.pool
															.0
															.entry(ccode)
															.or_default();
														*c = c.saturating_add(1);
														sendmsg(
															&tx,
															&WsResponse::codecode { card: ccode },
														);
													}
											}
										} else {
											sendmsg(
												&tx,
												&WsResponse::chat {
													mode: 1,
													msg: &format!(
														"Unknown card code type: {}",
														val
													),
												},
											);
										}
									} else {
										let shiny = val.starts_with('!');
										let mut startidx = shiny as usize;
										let upped = val[startidx..].starts_with("upped");
										if upped {
											startidx += 5;
										}
										if matches!(
											&val[startidx..],
											"mark" | "pillar" | "rare" | "shard" | "nymph"
										) {
											sendmsg(&tx, &WsResponse::codecard { r#type: &val });
										} else {
											sendmsg(
												&tx,
												&WsResponse::chat {
													mode: 1,
													msg: &format!("Unknown code type: {}", val),
												},
											);
										}
									}
								} else {
									sendmsg(
										&tx,
										&WsResponse::chat {
											mode: 1,
											msg: "Code does not exist",
										},
									);
								}
							}
						}
						AuthMessage::codesubmit2 { code, card } => {
							if let Ok(trx) = client.transaction().await {
								if let Ok(row) = trx
									.query_one(
										"select val from codes where code = $1 for update",
										&[&code],
									)
									.await
								{
									let val: &str = row.get(0);
									let shiny = val.starts_with('!');
									let mut startidx = shiny as usize;
									let upped = val[startidx..].starts_with("upped");
									if shiny != etg::card::Shiny(card)
										|| upped != etg::card::Upped(card)
									{
										sendmsg(
											&tx,
											&WsResponse::chat {
												mode: 1,
												msg: "Invalid uppedness/shininess",
											},
										);
									} else {
										if upped {
											startidx += 5;
										}
										if let Some(cardcard) =
											etg::card::OpenSet.try_get(card)
										{
											if let Some(rarity) = match &val[startidx..] {
												"mark" => Some(-1),
												"pillar" => Some(0),
												"rare" => Some(3),
												"shard" => Some(3),
												"nymph" => Some(4),
												_ => None,
											} {
												if cardcard.rarity == rarity {
													if trx
														.execute(
															"delete from codes where code = $1",
															&[&code],
														)
														.await
														.is_ok()
													{
														if trx.commit().await.is_ok() {
															let mut user = user.lock().await;
														if let Some(userdata) = user.data.get_mut("") {
															let c = userdata
																.pool
																.0
																.entry(card)
																.or_default();
															*c = c.saturating_add(1);
															sendmsg(
																&tx,
																&WsResponse::codedone { card },
															);
														}
														}
													}
												} else {
													sendmsg(
														&tx,
														&WsResponse::chat {
															mode: 1,
															msg: "Invalid rarity",
														},
													);
												}
											} else {
												sendmsg(
													&tx,
													&WsResponse::chat {
														mode: 1,
														msg: &format!("Unknown code type: {}", val),
													},
												);
											}
										} else {
											sendmsg(
												&tx,
												&WsResponse::chat {
													mode: 1,
													msg: &format!("Unknown card {}", card),
												},
											);
										}
									}
								} else {
									sendmsg(
										&tx,
										&WsResponse::chat {
											mode: 1,
											msg: "Code does not exist",
										},
									);
								}
							}
						}
						AuthMessage::foewant {
							f,
							set,
							deck,
							deckcheck,
						} => {
							if u != f {
								let deck = {
									let user = user.lock().await;
									match &set[..] {
										"Original" => deck,
										_ => {
											let Some(userdata) = user.data.get(&uname) else {
												continue
											};
											userdata.decks
											.get(&userdata.selecteddeck)
											.cloned()
											.unwrap_or(String::new())
										}
									}
								};
								if let Some((foesockid, foeuser)) = users.read().await.get(&f) {
									if let Some(foesock) = socks.read().await.get(&foesockid) {
											let foeuserid = foeuser.lock().await.id;
											if let Ok(trx) = client.transaction().await {
												trx.execute("delete from match_request mr1 where user_id = $1 and accepted", &[&userid]).await.ok();
												if let Ok(pending_request_maybe) = trx
													.query_opt(
														"select mr1.game_id, games.data \
															from match_request mr1 \
															join match_request mr2 on mr1.game_id = mr2.game_id \
															join games on games.id = mr1.game_id \
															where mr1.user_id = $1 and mr2.user_id = $2 and not mr1.accepted and mr2.accepted",
														&[&userid, &foeuserid],
													)
													.await
												{
													if let Some(pending_request) =
														pending_request_maybe
													{
														let gameid: i64 = pending_request.get(0);
														if trx.execute("update match_request set accepted = true where game_id = $1 and user_id = $2", &[&gameid, &userid]).await.is_ok() {
															let Json(mut gamedata) = pending_request.get::<usize, Json<GamesData>>(1);
															gamedata.seed = rand::thread_rng().gen();
															gamedata.players[1].deck = deck;
															if gamedata.seed & 1 != 0 {
																gamedata.players.reverse();
															}
															if trx.execute("update games set data = $2, expire_at = now() + interval '1 hour' where id = $1", &[&gameid, &Json(&gamedata)]).await.is_ok() && trx.commit().await.is_ok() {
																if let Ok(pvpgive) = serde_json::to_string(&WsResponse::pvpgive {
																	id: gameid,
																	data: &gamedata,
																}) {
																	let pvpgive = Message::Text(pvpgive);
																	tx.send(pvpgive.clone()).ok();
																	foesock.tx.send(pvpgive).ok();
																}
															}
														}
													} else {
														let game = GamesData {
															set: set.clone(),
															seed: 0,
															players: vec![
																GamesDataPlayer {
																	idx: 1,
																	user: u.clone(),
																	name: u.clone(),
																	deck: deck,
																},
																GamesDataPlayer {
																	idx: 2,
																	user: f.clone(),
																	name: f.clone(),
																	deck: String::new(),
																},
															],
														};
														if let Ok(new_game) = trx.query_one("insert into games (data, moves, expire_at) values ($1,'{}',now() + interval '1 hour') returning id", &[&Json(&game)]).await {
															let gameid: i64 = new_game.get(0);
															if trx.execute(
																"insert into match_request (game_id, user_id, accepted) values ($1,$2,true),($1,$3,false)",
																&[&gameid, &userid, &foeuserid]).await.is_ok() && trx.commit().await.is_ok()
															{
																sendmsg(&foesock.tx, &WsResponse::challenge {
																	f: &u,
																	set: &set,
																	deckcheck,
																});
															}
														}
													}
												}
											}
										}
									}
							}
						}
						AuthMessage::r#move {
							id,
							hash,
							prehash,
							cmd,
						} => {
							if let Ok(trx) = client.transaction().await {
								if let (Ok(moves), Ok(urows)) = (
									trx.query_one(
										"select g.moves from games g join match_request mr on mr.game_id = g.id join users u on u.id = mr.user_id where g.id = $1 and u.id = $2 for update",
										&[&id, &userid]).await,
										trx.query(
											"select u.id, u.name from match_request mr join users u on mr.user_id = u.id where mr.game_id = $1",
											&[&id]).await,
											) {
									if urows.iter().all(|row| row.get::<usize, i64>(0) != userid) {
										sendmsg(&tx, &WsResponse::chat {
											mode: 1,
											msg: "You aren't in that match",
										});
										continue 'msgloop;
									}
									let movelist: Vec<Json<GamesMove>> = moves.get(0);
									if movelist.last().map(|m| m.0.hash != prehash).unwrap_or(false) {
										sendmsg(&tx, &WsResponse::reloadmoves {
											moves: &movelist.iter().map(|m| m.0.cmd).collect::<Vec<_>>(),
										});
									} else {
										if trx.execute(
											"update games set moves = array_append(moves, $2), expire_at = now() + interval '1 hour' where id = $1",
											&[&id, &Json(GamesMove { cmd, hash })]).await.is_ok() && trx.commit().await.is_ok() {
											if let Ok(movejson) = serde_json::to_string(&WsResponse::r#move { cmd, hash }) {
												let rusers = users.read().await;
												let rsocks = socks.read().await;
												for row in urows.iter() {
													let uid: i64 = row.get(0);
													if uid != userid {
														let name: &str = row.get(1);
														if let Some(ref sockid) = rusers.get_sockid(name) {
															if let Some(sock) = rsocks.get(sockid) {
																sock.tx.send(Message::Text(movejson.clone())).ok();
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
						AuthMessage::reloadmoves { id } => {
							if let Ok(moves) = client.query_one("select g.moves from games g join match_request mr on mr.game_id = g.id join users u on u.id = mr.user_id where g.id = $1 and u.id = $2", &[&id, &userid]).await {
								let movelist: Vec<Json<GamesMove>> = moves.get(0);
								sendmsg(&tx, &WsResponse::reloadmoves {
									moves: &movelist.iter().map(|m| m.0.cmd).collect::<Vec<_>>(),
								});
							}
						}
						AuthMessage::updateorig { deck } => {
							let mut wuser = user.lock().await;
							if let Some(data) = wuser.legacy.get_mut(&uname) {
								data.deck = deck;
							}
						}
						AuthMessage::origadd {
							pool,
							rmpool,
							electrum,
							oracle,
							fg,
						} => {
							let mut wuser = user.lock().await;
							if let Some(data) = wuser.legacy.get_mut(&uname) {
								if let Some(electrum) = electrum {
									data.electrum = data.electrum.saturating_add(electrum);
									if electrum > 0 {
										logerr(client.execute(
											concat!(
												"insert into leaderboard (data_id, league_id, category, val) values ((select id from user_data where user_id = $1 and name = $2), 1, 'Wealth', $3) ",
												"on conflict (data_id, league_id, category) do update set val = greatest(excluded.val, leaderboard.val)"), &[&userid, &uname, &(data.electrum as i32)]).await).ok();
									}
								}
								if let Some(pool) = pool {
									for (code, count) in iterraw(pool.as_bytes()) {
										let c = data.pool.0.entry(code).or_default();
										*c = c.saturating_add(count);
									}
								}
								if let Some(rmpool) = rmpool {
									for (code, count) in iterraw(rmpool.as_bytes()) {
										let c = data.pool.0.entry(code).or_default();
										*c = c.saturating_sub(count);
									}
								}
								if let Some(fg) = fg {
									if fg == -1 {
										data.fg = None;
									} else {
										data.fg = Some(fg as u16);
									}
								}
								if let Some(oracle) = oracle {
									data.oracle = oracle;
								}
							}
						}
						AuthMessage::canceltrade { f } => {
							if u != f {
								if let Some((foesockid, foeuser)) = users.read().await.get(&f) {
									if let Some(foesock) = socks.read().await.get(&foesockid) {
											sendmsg(
												&foesock.tx,
												&WsResponse::tradecanceled { u: &u },
											);
											sendmsg(
												&foesock.tx,
												&WsResponse::chatu {
													u: &u,
													mode: 1,
													msg: "has canceled the trade",
												},
											);
											let foeuserid = foeuser.lock().await.id;
											client.execute(
												"delete from trade_request where (user_id = $1 and for_user_id = $2) or (user_id = $2 and for_user_id = $1)",
												&[&userid, &foeuserid]).await.ok();
										}
								}
							}
						}
						AuthMessage::reloadtrade { f } => {
							if u != f {
								if let Some((_, foeuser)) = users.read().await.get(&f) {
									let foeuserid = foeuser.lock().await.id;
									if let Ok(trade) = client.query_one(
										"select alt, cards, g from trade_request where user_id = $2 and for_user_id = $1", &[&userid, &foeuserid]).await {
										sendmsg(&tx, &WsResponse::offertrade {
											f: &f,
											a: trade.get(0),
											c: trade.get(1),
											g: trade.get(2),
											flags: None,
										});
									}
								}
							}
						}
						AuthMessage::offertrade {
							f,
							foralt,
							forcards,
							forg,
							cards,
							g,
						} => {
							if u != f {
								if let Some((foesockid, foeuser)) = users.read().await.get(&f) {
									if let Some(foesock) = socks.read().await.get(&foesockid) {
										let (mut user, mut foeuser) =
											ordered_lock(&user, &foeuser).await;
										let foeid = foeuser.id;
										if let Ok(trx) = client.transaction().await {
											let g32 = g as i32;
											let forg32 = forg.map(|g| g as i32);
											if let (Some(ref forcardsref), Some(forg32), Some(ref foraltref)) = (&forcards, forg32, &foralt) {
												let (Some(userdata), Some(foedata)) = (
													user.data.get_mut(&uname), foeuser.data.get_mut(foraltref)
												) else {
													continue
												};
												if userdata.flags != foedata.flags || userdata.flags.contains("no-trade") {
													let err = format!(
														"Incompatible flags: {} <> {}",
														flagname(&userdata.flags),
														flagname(&foedata.flags),
													);
													sendmsg(&tx, &WsResponse::tradecanceled {
														u: &f,
													});
													sendmsg(&tx, &WsResponse::chat {
														mode: 1,
														msg: &err,
													});
													sendmsg(&foesock.tx, &WsResponse::tradecanceled {
														u: &u,
													});
													sendmsg(&foesock.tx, &WsResponse::chat {
														mode: 1,
														msg: &err,
													});
													if trx.execute(
														"delete from trade_request where (user_id = $1 and for_user_id = $2) or (user_id = $2 and for_user_id = $1)",
														&[&userid, &foeid]).await.is_ok() {
														trx.commit().await.ok();
													}
													continue
												}
												if let Ok(rows) = trx.execute(
													"delete from trade_request where user_id = $2 and for_user_id = $1 and alt = $4 and foralt = $3 and cards = $7 and g = $8 and forcards = $5 and forg = $6",
													&[&userid, &foeid, &uname, foraltref, &cards, &g32, forcardsref, &forg32]).await {
													if rows > 0 {
														if trx.execute("delete from trade_request where (user_id = $1 and for_user_id = $2) or (user_id = $2 and for_user_id = $1)", &[&userid, &foeid]).await.is_ok() && trx.commit().await.is_ok() {
															let p1gdelta = forg32 - g32;
															let p2gdelta = -p1gdelta;
															let mut err: Option<&'static str> = None;
															if userdata.gold < -p1gdelta || foedata.gold < -p2gdelta {
																err = Some("Not enough gold between players");
															}
															if err.is_none() {
																err = canaffordcards(&userdata.pool, &cards)
															}
															if err.is_none() {
																err = canaffordcards(&foedata.pool, forcardsref);
															}
															if let Some(err) = err {
																sendmsg(&tx, &WsResponse::tradecanceled {
																	u: &f,
																});
																sendmsg(&tx, &WsResponse::chat {
																	mode: 1,
																	msg: err,
																});
																sendmsg(&foesock.tx, &WsResponse::tradecanceled {
																	u: &u,
																});
																sendmsg(&foesock.tx, &WsResponse::chat {
																	mode: 1,
																	msg: err,
																});
															} else {
																sendmsg(&tx, &WsResponse::tradedone{
																	alt: &uname,
																	oldcards: &cards,
																	newcards: forcardsref,
																	g: p1gdelta,
																});
																sendmsg(&foesock.tx, &WsResponse::tradedone {
																	alt: foraltref,
																	oldcards: forcardsref,
																	newcards: &cards,
																	g: p2gdelta,
																});
																userdata.gold = userdata.gold.saturating_add(p1gdelta);
																foedata.gold = foedata.gold.saturating_add(p2gdelta);
																for (code, count) in iterraw(cards.as_bytes()) {
																	let foec = foedata.pool.0.entry(code).or_default();
																	let userc = userdata.pool.0.entry(code).or_default();
																	*userc -= count;
																	*foec = foec.saturating_add(count);
																}
																for (code, count) in iterraw(forcardsref.as_bytes()) {
																	let foec = foedata.pool.0.entry(code).or_default();
																	let userc = userdata.pool.0.entry(code).or_default();
																	*foec -= count;
																	*userc = userc.saturating_add(count);
																}
															}
														}
														continue 'msgloop;
													}
												}
											}
											let params: &[&(dyn ToSql + Sync)] = &[
												&userid,
												&foeuser.id,
												&uname,
												&cards,
												&g32,
												&foralt,
												&forcards,
												&forg32,
											];
											if trx.execute(
												"insert into trade_request (user_id, for_user_id, alt, cards, g, foralt, forcards, forg, expire_at) \
													values ($1, $2, $3, $4, $5, $6, $7, $8, now() + interval '1 hour') \
													on conflict (user_id, for_user_id) do update set user_id = $1, for_user_id = $2, alt = $3, cards = $4, g = $5, foralt = $6, forcards = $7, forg = $8, expire_at = now() + interval '1 hour'",
													params).await.is_ok() && trx.commit().await.is_ok() {
												let flags = user.data.get(&uname).map(|data| &data.flags);
												sendmsg(&foesock.tx, &WsResponse::offertrade {
													f: &u,
													a: &uname,
													c: &cards,
													g: g32,
													flags,
												});
											}
										}
									}
								}
							}
						}
						AuthMessage::oracle => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								let today = get_day();
								let oracle = userdata.oracle;
								if oracle < today {
									if userdata.ostreakday != today - 1 {
										userdata.ostreak = 0;
									}
									userdata.ostreakday = 0;
									userdata.ostreakday2 = today;
									userdata.oracle = today;
									let card = {
										let rng = etg::rng::Pcg32::from(rand::thread_rng().next_u32());
										let ocardnymph = (rng.next32() & 31) == 0;
										let Some(card) = etg::card::OpenSet.random_card(&rng, false, |card| {
											(card.rarity != 4) ^ ocardnymph && (card.flag & etg::game::Flag::pillar) == 0
										}) else { continue };
										userdata.dailymage = rng.upto(MAGE_COUNT as u32) as u8;
										userdata.dailydg = rng.upto(DG_COUNT as u32) as u8;
										card
									};
									let ccode =
										if card.rarity == 4 { etg::card::AsShiny(card.code, true) } else { card.code };
									let bound = card.rarity > 2;
									let curpool =
										if bound { &mut userdata.accountbound } else { &mut userdata.pool };
									let c = curpool.0.entry(ccode).or_default();
									*c = c.saturating_add(1);
									userdata.ocard = ccode;
									userdata.daily = 128;
									sendmsg(
										&tx,
										&WsResponse::oracle {
											c: ccode,
											bound,
											mage: userdata.dailymage,
											dg: userdata.dailydg,
											day: today,
										},
									);

									let mut wealth: i32 = userdata.gold;
									let mut wealth24: u32 = 0;
									if let Ok(bids) =
										client.query("select code, q, p from bazaar where user_id = $1", &[&userid]).await
									{
										for bid in bids.iter() {
											let code = bid.get::<usize, i32>(0) as i16;
											let q: i32 = bid.get(1);
											let p: i32 = bid.get(2);
											if p < 0 {
												if let Some(card) = etg::card::OpenSet.try_get(code) {
													let upped = etg::card::Upped(code);
													let shiny = etg::card::Shiny(code);
													wealth24 += card_val24(card.rarity, upped, shiny) * q as u32;
												}
											} else {
												wealth += p * q;
											}
										}
									}
									for (&code, &count) in userdata.pool.0.iter() {
										if let Some(card) = etg::card::OpenSet.try_get(code) {
											wealth24 += card_val24(card.rarity, etg::card::Upped(code), etg::card::Shiny(code)) * count as u32;
										}
									}
									let wealth = wealth.saturating_add((wealth24 / 24) as i32);
									let leagueid = leagueid(&userdata.flags);
									client.execute(
										concat!(
											"insert into leaderboard (data_id, league_id, category, val) values ((select id from user_data where user_id = $1 and name = $2), $3, 'Wealth', $4) ",
											"on conflict (data_id, league_id, category) do update set val = greatest(excluded.val, leaderboard.val)"), &[&userid, &uname, &leagueid, &wealth]).await.ok();
								}
							}
						}
						AuthMessage::passchange { p } => {
							let mut user = user.lock().await;
							if p.is_empty() {
								user.auth = String::new();
							} else {
								user.initsalt();
								let mut keybuf = [0u8; 64];
								pbkdf2::derive(
									pbkdf2::PBKDF2_HMAC_SHA512,
									unsafe { core::num::NonZeroU32::new_unchecked(user.iter) },
									&user.salt,
									p.as_bytes(),
									&mut keybuf,
								);
								user.auth.clear();
								BASE64_STANDARD_NO_PAD.encode_string(&keybuf[..], &mut user.auth);
							}
							if client.execute(
								"update users set auth = $2, salt = $3, iter = $4, algo = $5 where id = $1",
								&[&userid, &user.auth, &user.salt, &(user.iter as i32), &user.algo],
							).await.is_ok() {
								sendmsg(&tx, &WsResponse::passchange { auth: &user.auth });
							}
						}
						AuthMessage::challrecv { f, trade } => {
							if let Some(foesockid) = users.read().await.get_sockid(&f) {
								if let Some(foesock) = socks.read().await.get(&foesockid) {
									sendmsg(
										&foesock.tx,
										&WsResponse::chat {
											mode: 1,
											msg: &format!(
												"Sent a {} request to {}!",
												if trade { "trade" } else { "PvP" },
												u
											),
										},
									);
								}
							}
						}
						AuthMessage::chat { to, msg } => {
							if let Some(to) = to {
								let mut sent = false;
								if let Some(tosockid) = users.read().await.get_sockid(&to) {
									if let Some(sock) = socks.read().await.get(&tosockid) {
										if serde_json::to_string(&WsResponse::chatu {
											mode: 2,
											u: &u,
											msg: &msg,
										})
										.ok()
										.and_then(|msgstr| sock.tx.send(Message::Text(msgstr)).ok())
										.is_some()
										{
											sent = true;
											let mut tou = String::from("To ");
											tou.push_str(&to);
											sendmsg(
												&tx,
												&WsResponse::chatu {
													mode: 2,
													u: &tou,
													msg: &msg,
												},
											);
										}
									}
								}
								if !sent {
									sendmsg(
										&tx,
										&WsResponse::chat {
											mode: 1,
											msg: &format!(
												"{} isn't here right now.\nFailed to deliver: {}",
												to, msg
											),
										},
									);
								}
							} else {
								broadcast(
									&socks,
									&WsResponse::chatu {
										mode: 0,
										u: &u,
										msg: &msg,
									},
								)
								.await;
							}
						}
						AuthMessage::roll { rolls, sides } => {
							let mut sum = 0u64;
							if sides > 0 {
								let range = Uniform::from(1..=sides as u64);
								let mut rng = rand::thread_rng();
								for _ in 0..rolls {
									sum = sum.saturating_add(range.sample(&mut rng));
								}
							}
							broadcast(
								&socks,
								&WsResponse::roll {
									u: &u,
									rolls,
									sides,
									sum,
								},
							)
							.await;
						}
						AuthMessage::booster {
							pack,
							bulk,
							element,
						} => {
							const PACKS: [(u8, u8, &'static [u16], f64); 4] = [
								(10, 15, &[], 0.03448275862068971),
								(6, 25, &[3], 0.06841339155749637),
								(5, 80, &[1, 3], 0.017472777918460383),
								(1, 250, &[0, 0, 0], 0.0),
							];
							let mut user = user.lock().await;
							let Some(userdata) = user.data.get_mut(&uname) else {
								continue
							};
							if let Some(&(amount, cost, rares, bumprate)) = PACKS.get(pack as usize)
							{
								let mut amount = amount as u16;
								let mut cost = cost as i32;
								let bound = userdata
									.freepacks
									.and_then(|fp| fp.get(pack as usize).cloned())
									.unwrap_or(0) != 0;
								if !bound && bulk > 0 {
									amount *= bulk as u16;
									cost *= bulk as i32;
								}
								if bound || userdata.gold >= cost {
									let mut newcards: Cardpool = Default::default();
									let mut rarity: usize = 1;
									let rng = etg::rng::Pcg32::from(rand::thread_rng().next_u32());
									for i in 0..amount {
										while rarity - 1 < rares.len() && i == rares[rarity - 1] * bulk as u16 {
											rarity += 1;
										}
										let code = if rarity == 4 {
											etg::etg::NymphList[if element > 0 && element < 13 {
												element as usize
											} else {
												1 + rng.upto(13) as usize
											}]
										} else {
											let notfromele = rng.upto(3) == 0;
											let bumprarity =
												rarity + ((rng.next32() as f64 / u32::MAX as f64) < bumprate) as usize;
											if (element > 0 || bumprarity < 3) && element < 13 {
												etg::card::OpenSet.random_card(
													&rng,
													false,
													|card| {
														(card.element == element as i8)
															!= notfromele && card.rarity as usize
															== bumprarity
													},
												)
											} else {
												etg::card::OpenSet.random_card(
													&rng,
													false,
													|card| card.rarity as usize == bumprarity,
												)
											}
											.unwrap()
											.code
										};
										let c = newcards.0.entry(code).or_default();
										*c = c.saturating_add(1);
									}
									let curpool = if bound {
										let freepacks = userdata.freepacks.as_mut().unwrap();
										freepacks[pack as usize] -= 1;
										if freepacks.iter().all(|&x| x == 0) {
											userdata.freepacks = None;
										}
										&mut userdata.accountbound
									} else {
										userdata.gold -= cost;
										&mut userdata.pool
									};
									for (&code, &count) in newcards.0.iter() {
										let c = curpool.0.entry(code).or_default();
										*c = c.saturating_add(count);
									}
									sendmsg(
										&tx,
										&WsResponse::boostergive {
											cards: &newcards,
											accountbound: bound,
											packtype: pack,
											g: userdata.gold,
										},
									);
								}
							}
						}
						AuthMessage::bzbid { p, q: mut count, c: code } => {
							if p > 999 || p < -999 || count > 999 {
								continue;
							}
							if let Some(card) = etg::card::OpenSet.try_get(code) {
								let sellval = SELL_VALUES[card.rarity as usize] as i32
									* match (etg::card::Upped(code), etg::card::Shiny(code)) {
										(false, false) => 1,
										(true, true) => 36,
										_ => 6,
									};
								let mut add: FxHashMap<i16, Vec<BzBid>> = Default::default();
								let mut rm: FxHashMap<i16, Vec<BzBid>> = Default::default();
								if let Ok(trx) = client.transaction().await {
									if trx
										.execute("lock bazaar in row exclusive mode", &[])
										.await
										.is_ok()
									{
										let mut user = user.lock().await;
										let Some(userdata) = user.data.get_mut("") else {
											continue
										};
										let mut sells: Vec<BzBidSell> = Vec::new();
										let mut codecount = if p > 0 {
											0
										} else {
											userdata.pool.0.get(&code).cloned().unwrap_or(0)
										};
										if p > 0 {
											if p as i32 <= sellval {
												continue;
											}
										} else if codecount < count {
											continue;
										} else if -(p as i32) <= sellval {
											userdata.gold += sellval * count as i32;
											let c = userdata.pool.0.entry(code).or_default();
											*c = c.saturating_sub(count);
											continue;
										}
										if let Ok(bids) = trx.query("select b.id, u.name u, b.p, b.q from bazaar b join users u on b.user_id = u.id where b.code = $1 order by b.p desc", &[&(code as i32)]).await {
											let mut ops: Vec<BzBidOp> = Vec::new();
											for bid in bids.iter() {
												let id: i64 = bid.get(0);
												let bu: &str = bid.get(1);
												let bp = bid.get::<usize, i32>(2) as i16;
												let bq = bid.get::<usize, i32>(3) as u16;
												let amt = bq.min(count);
												let mut happened = 0;
												if p > 0 {
													if bp < 0 && -bp <= p {
														happened = amt as i32;
													}
												} else if bp > 0 && bp >= -p {
													happened = -(amt as i32);
												}
												let cost = bp.abs() as i32 * happened;
												if happened != 0 && if p > 0 {
													userdata.gold >= cost
												} else {
													codecount as i32 >= happened
												} {
													userdata.gold -= cost;
													let c = userdata.pool.0.entry(code).or_default();
													if happened > 0 {
														*c = c.saturating_add(happened as u16);
														codecount = codecount.saturating_add(happened as u16);
													} else {
														*c = c.saturating_sub((-happened) as u16);
														codecount = codecount.saturating_sub((-happened) as u16);
													}
													sells.push(BzBidSell { u: String::from(bu), code, amt: amt as u16, p: bp });
													if bq > count {
														ops.push(BzBidOp::Update {
															id,
															bid: BzBid { u: Cow::from(String::from(bu)), q: bq, p: bp },
															q: bq - count,
														});
														count = 0;
													} else {
														ops.push(BzBidOp::Delete {
															id,
															bid: BzBid { u: Cow::from(String::from(bu)), q: bq, p: bp },
														});
														count -= bq as u16;
													}
													if count == 0 {
														break
													}
												}
											}
											if count > 0 {
												let mut bidmade = false;
												if p > 0 {
													if userdata.gold >= p as i32 * count as i32 {
														userdata.gold -= p as i32 * count as i32;
														bidmade = true;
													}
												} else if codecount >= count {
													let c = userdata.pool.0.entry(code).or_default();
													if let Some(newc) = c.checked_sub(count as u16) {
														*c = newc;
														bidmade = true;
														#[allow(unused_assignments)] {
															codecount -= count;
														}
													}
												}
												if bidmade {
													let mut hadmerge = false;
													for bid in bids.iter() {
														let id: i64 = bid.get(0);
														let bu: &str = bid.get(1);
														let bp = bid.get::<usize, i32>(2) as i16;
														let bq = bid.get::<usize, i32>(3) as u16;
														if bu == u && bp == p {
															if let Some(newq) = bq.checked_add(count) {
																ops.push(BzBidOp::Update {
																	id,
																	bid: BzBid { u: Cow::from(u.as_str()), q: bq, p: bp },
																	q: newq
																});
																hadmerge = true;
																break;
															}
														}
													}
													if !hadmerge {
														ops.push(BzBidOp::Insert { q: count, p });
													}
												}
											}
											for op in ops.into_iter() {
												if match op {
													BzBidOp::Delete { id, bid } => {
														rm.entry(code).or_default().push(bid);
														trx.execute(
															"delete from bazaar where id = $1",
															&[&id]
															).await
													}
													BzBidOp::Insert { q, p } => {
														add.entry(code).or_default().push(BzBid {
															u: Cow::from(u.as_str()), q, p,
														});
														trx.execute(
															"insert into bazaar (user_id, code, q, p) values ($1, $2, $3, $4)",
															&[&userid, &(code as i32), &(q as i32), &(p as i32)]
														).await
													}
													BzBidOp::Update { id, bid, q } => {
														add.entry(code).or_default().push(BzBid {
															u: bid.u.clone(), q, p: bid.p
														});
														rm.entry(code).or_default().push(bid);
														trx.execute(
															"update bazaar set q = $2 where id = $1",
															&[&id, &(q as i32)]
														).await
													}
												}.is_err() {
													continue 'msgloop;
												}
											}
										}
										sendmsg(
											&tx,
											&WsResponse::bzbid {
												rm: &rm,
												add: &add,
												g: userdata.gold,
												pool: &userdata.pool,
											},
										);
										drop(user);
										let mut wusers = users.write().await;
										let rsocks = socks.read().await;
										for sell in sells {
											{
												if let Some(seller) = wusers.load(&trx, &sell.u).await {
													let mut seller = seller.lock().await;
													if let Some(sellerdata) = seller.data.get_mut("") {
													if sell.p > 0 {
														let c = sellerdata
															.pool
															.0
															.entry(sell.code)
															.or_default();
														let newc = (*c as i32) + (sell.amt as i32);
														*c = if newc < 0 {
															0
														} else if newc > 0xffff {
															0xffff
														} else {
															newc as u16
														};
													} else {
														sellerdata.gold = sellerdata
															.gold
															.saturating_add(sell.amt as i32 * -sell.p as i32);
													}
													}
												}
											}
											if let Some(selltx) = if sell.u == u {
												Some(tx.clone())
											} else {
												wusers.get_sockid(&sell.u)
													.and_then(|sockid| rsocks.get(&sockid))
													.map(|sock| sock.tx.clone())
											} {
												if let Some(card) =
													etg::card::OpenSet.try_get(sell.code)
												{
													if sell.p > 0 {
														let ecount = encode_count(sell.amt as u32);
														let ecode = encode_code(sell.code);
														let givec = [
															ecount[0], ecount[1], ecode[0], ecode[1],
															ecode[2],
														];
														sendmsg(
															&selltx,
															&WsResponse::bzgivec {
																msg: &format!(
																	"{} sold you {} of {} @ {}",
																	u, sell.amt, card.name, sell.p
																),
																c: unsafe {
																	std::str::from_utf8_unchecked(
																		&givec[..],
																	)
																},
															},
														)
													} else {
														sendmsg(
															&selltx,
															&WsResponse::bzgiveg {
																msg: &format!(
																	"{} bought {} of {} @ {} from you.",
																	u, sell.amt, card.name, -sell.p
																),
																g: sell.amt as i32 * -sell.p as i32,
															},
														)
													}
												}
											}
										}
										trx.commit().await.ok();
									}
								}
							}
						}
						AuthMessage::bzcancel { c } => {
							let mut user = user.lock().await;
							let Some(userdata) = user.data.get_mut("") else {
								continue
							};
							if let Ok(bids) = client.query(
								"delete from bazaar where user_id = $1 and code = $2 returning q, p",
								&[&userid, &(c as i32)]).await
							{
								let mut rm: FxHashMap<i16, Vec<BzBid>> = Default::default();
								for bid in bids.iter() {
									let q = bid.get::<usize, i32>(0) as u16;
									let p = bid.get::<usize, i32>(1) as i16;
									if p > 0 {
										userdata.gold += p as i32 * q as i32;
									} else {
										let c = userdata.pool.0.entry(c).or_default();
										*c = c.saturating_add(q)
									}
									rm.entry(c).or_default().push(BzBid { u: Cow::from(u.as_str()), q, p });
								}
								sendmsg(&tx, &WsResponse::bzbid {
									add: &Default::default(),
									rm: &rm,
									g: userdata.gold,
									pool: &userdata.pool,
								});
							}
						}
						AuthMessage::addgold { g } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								userdata.gold = userdata.gold.saturating_add(g as i32);
							}
						}
						AuthMessage::addloss { pvp, l, g, c, bound } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								if pvp {
									userdata.pvplosses = userdata.pvplosses.saturating_add(1);
								} else {
									userdata.ailosses = userdata.ailosses.saturating_add(1);
								}
								if let Some(l) = l {
									if userdata.streak.len() > l as usize {
										userdata.streak[l as usize] = 0;
									}
								}
								if let Some(g) = g {
									userdata.gold = userdata.gold.saturating_add(g as i32);
								}
								if let Some(q) = c.and_then(|c| if bound { &mut userdata.accountbound } else { &mut userdata.pool }.0.get_mut(&c)) {
									*q = q.saturating_sub(1);
								}
							}
						}
						AuthMessage::addwin { pvp } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								if pvp {
									userdata.pvpwins = userdata.pvpwins.saturating_add(1);
									userdata.pvplosses = userdata.pvplosses.saturating_sub(1);
								} else {
									userdata.aiwins = userdata.aiwins.saturating_add(1);
									userdata.ailosses = userdata.ailosses.saturating_sub(1);
								}
							}
						}
						AuthMessage::setstreak { l, n } => {
							let category = match l {
								0 => Leaderboard::Streak0,
								1 => Leaderboard::Streak1,
								2 => Leaderboard::Streak2,
								3 => Leaderboard::Streak3,
								4 => Leaderboard::Streak4,
								5 => Leaderboard::Streak5,
								_ => continue,
							};
							let leagueid = {
								let mut user = user.lock().await;
								let Some(userdata) = user.data.get_mut(&uname) else { continue };
								userdata.streak.resize(l as usize + 1, 0);
								userdata.streak[l as usize] = n;
								leagueid(&userdata.flags)
							};
							client.execute(
								concat!(
									"insert into leaderboard (data_id, league_id, category, val) values ((select id from user_data where user_id = $1 and name = $2), $3, $4, $5) ",
									"on conflict (data_id, league_id, category) do update set val = greatest(excluded.val, leaderboard.val)"), &[&userid, &uname, &leagueid, &category, &(n as i32)]).await.ok();
						}
						AuthMessage::addcards { c, bound } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								for (code, count) in iterraw(c.as_bytes()) {
									let q = if bound { &mut userdata.accountbound } else { &mut userdata.pool }.0.entry(code).or_default();
									*q = q.saturating_add(count);
								}
							}
						}
						AuthMessage::rmcard { c, bound } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								let q = if bound { &mut userdata.accountbound } else { &mut userdata.pool }.0.entry(c).or_default();
								*q = q.saturating_sub(1);
							}
						}
						AuthMessage::donedaily { daily, c } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
							if (daily < 3 || daily == 5) && userdata.ostreakday == 0 {
								userdata.gold =
									userdata.gold.saturating_add(match userdata.ostreak % 5 {
										0 => 15,
										1 => 25,
										2 => 77,
										3 => 100,
										4 => 250,
										_ => unreachable!(),
									});
									userdata.ostreak = userdata.ostreak.saturating_add(1);
									userdata.ostreakday = userdata.ostreakday2;
									userdata.ostreakday2 = 0;
								}
								if daily == 6 && (userdata.daily & 64) == 0 && c != 0 {
									let c = userdata.pool.0.entry(c).or_default();
									*c = c.saturating_add(1);
									let leagueid = leagueid(&userdata.flags);
									client.execute(
										concat!(
											"insert into leaderboard (data_id, league_id, category, val) values ((select id from user_data where user_id = $1 and name = $2), $3, 'Colosseum', 1) ",
											"on conflict (data_id, league_id, category) do update set val = leaderboard.val + 1"), &[&userid, &uname, &leagueid]).await.ok();
								}
								userdata.daily |= 1 << daily;
							}
						}
						AuthMessage::changeqeck { number, name } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								if (number as usize) < userdata.qecks.len() {
									userdata.qecks[number as usize] = name;
								}
							}
						}
						AuthMessage::setdeck { name, d } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								if let Some(d) = d {
									userdata.decks.insert(name.clone(), d);
								}
								userdata.selecteddeck = name;
							}
						}
						AuthMessage::rmdeck { name } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								userdata.decks.remove(&name);
							}
						}
						AuthMessage::setquest { quest } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								userdata.quests.insert(quest, 1);
							}
						}
						AuthMessage::upgrade { card } => {
							if let Some(carddata) = etg::card::OpenSet.try_get(card) {
								let copies = if carddata.rarity != -1
									&& !(carddata.rarity == 4 && etg::card::Shiny(card))
								{
									6
								} else {
									1
								};
								let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								transmute(
									userdata,
									card,
									etg::card::AsUpped(card, true),
									copies,
									1,
								);
							}
							}
						}
						AuthMessage::downgrade { card } => {
							if let Some(carddata) = etg::card::OpenSet.try_get(card) {
								let copies = if carddata.rarity != -1
									&& !(carddata.rarity == 4 && etg::card::Shiny(card))
								{
									6
								} else {
									1
								};
								let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								transmute(
									userdata,
									card,
									etg::card::AsUpped(card, false),
									1,
									copies,
								);
							}
							}
						}
						AuthMessage::polish { card } => {
							if let Some(carddata) = etg::card::OpenSet.try_get(card) {
								let copies = if carddata.rarity != -1 { 6 } else { 2 };
								let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								transmute(
									userdata,
									card,
									etg::card::AsShiny(card, true),
									copies,
									1,
								);
							}
							}
						}
						AuthMessage::unpolish { card } => {
							if let Some(carddata) = etg::card::OpenSet.try_get(card) {
								let copies = if carddata.rarity != -1 { 6 } else { 2 };
								let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								transmute(
									userdata,
									card,
									etg::card::AsShiny(card, false),
									1,
									copies,
								);
							}
							}
						}
						AuthMessage::uppillar { c } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
							upshpi(userdata, c, |code| etg::card::AsUpped(code, true));
							}
						}
						AuthMessage::shpillar { c } => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
							upshpi(userdata, c, |code| etg::card::AsShiny(code, true));
							}
						}
						AuthMessage::upshall => {
							let mut user = user.lock().await;
							if let Some(userdata) = user.data.get_mut(&uname) {
								let mut base = userdata
									.pool
									.0
									.keys()
									.map(|&code| etg::card::AsShiny(
											etg::card::AsUpped(code, false),
											false,
										))
									.collect::<Vec<i16>>();
								base.sort_unstable();
								base.dedup();
								let convert =
									|pool: &mut Cardpool, oldcode: i16, oldamt: u16, newcode: i16| {
										if pool.0.get(&newcode).cloned() == Some(u16::max_value())
											|| pool
												.0
												.get(&oldcode)
												.cloned()
												.map(|oldc| oldc < oldamt)
												.unwrap_or(true)
										{
											false
										} else {
											*pool.0.entry(newcode).or_default() += 1;
											*pool.0.get_mut(&oldcode).unwrap() -= oldamt;
											true
										}
									};
								for &code in base.iter() {
									if let Some(card) = etg::card::OpenSet.try_get(code) {
										if card.rarity > 0 {
											let upcode = etg::card::AsUpped(code, true);
											let shcode = etg::card::AsShiny(code, true);
											let uhcode = etg::card::AsShiny(upcode, true);
											let mut un =
												userdata.pool.0.get(&code).cloned().unwrap_or(0)
													as i32 + userdata
													.accountbound
													.0
													.get(&code)
													.cloned()
													.unwrap_or(0) as i32;
											let mut up =
												userdata.pool.0.get(&upcode).cloned().unwrap_or(0)
													as i32 + userdata
													.accountbound
													.0
													.get(&upcode)
													.cloned()
													.unwrap_or(0) as i32;
											let mut sh =
												userdata.pool.0.get(&shcode).cloned().unwrap_or(0)
													as i32 + userdata
													.accountbound
													.0
													.get(&shcode)
													.cloned()
													.unwrap_or(0) as i32;
											while un >= 12
												&& up < 6 && convert(
												&mut userdata.pool,
												code,
												6,
												upcode,
											) {
												un -= 6;
												up += 1;
											}
											if card.rarity < 4 {
												while un >= 12
													&& sh < 6 && convert(
													&mut userdata.pool,
													code,
													6,
													shcode,
												) {
													un -= 6;
													sh += 1;
												}
												while un >= 42 && convert(&mut userdata.pool, code, 36, uhcode)
												{
													un -= 36;
												}
											}
										}
									}
								}
							}
						}
					}
				}
				UserMessage::guestchat { u, msg } => {
					if let Ok(None) =
						client.query_opt("select 1 from strings where key = 'GuestBanned'", &[]).await
					{
						let mut guestname = String::from("Guest_");
						guestname.push_str(&u);
						broadcast(&socks, &WsResponse::chatguest { guest: true, u: &guestname, msg: &msg })
							.await;
					}
				}
				UserMessage::login { u, a, p } => {
					if u.is_empty() {
						sendmsg(&tx, &WsResponse::loginfail { err: "No name" });
					} else if u.starts_with("Kong:") {
						sendmsg(
							&tx,
							&WsResponse::loginfail {
								err: "'Kong:' prefix reserved for Kongregate accounts",
							},
						);
					} else {
						let mut wusers = users.write().await;
						let user = if let Some(user) = wusers.load(&*client, &u).await {
							user
						} else {
							let user = Arc::new(Mutex::new(UserObject {
								name: u.clone(),
								id: -1,
								auth: String::new(),
								salt: Vec::new(),
								iter: 0,
								algo: users::HASH_ALGO,
								data: Default::default(),
								legacy: Default::default(),
							}));
							wusers.insert(u.clone(), sockid.get(), user.clone());
							user
						};
						let mut user = user.lock().await;
						let password = p.as_ref();
						let auth = a.as_ref();

						if if let Some(authstr) = auth {
							authstr == &user.auth
						} else if let Some(psw) = password {
							let mut keybuf = [0u8; 64];
							if user.salt.is_empty() {
								user.initsalt();
							}
							pbkdf2::derive(
								pbkdf2::Algorithm::from(user.algo),
								unsafe { core::num::NonZeroU32::new_unchecked(user.iter) },
								&user.salt,
								psw.as_bytes(),
								&mut keybuf,
							);
							if user.auth.is_empty() {
								user.auth = BASE64_STANDARD_NO_PAD.encode(&keybuf[..]);
								true
							} else {
								let mut realkeybuf = [0u8; 64];
								BASE64_STANDARD_NO_PAD
									.decode_slice_unchecked(user.auth.as_bytes(), &mut realkeybuf)
									.ok();
								keybuf == realkeybuf
							}
						} else {
							user.auth.is_empty()
						} {
							wusers.set_sockid(&u, sockid.get());
							login_success(&tx, &mut user, &mut client).await;
						} else {
							sendmsg(&tx, &WsResponse::loginfail { err: "Authentication failed" });
						}
					}
				}
				UserMessage::konglogin { u, g } => {
					if let Ok(row) =
						client.query_one("select val from strings where key = 'kongapi'", &[]).await
					{
						let key: &str = row.get(0);

						if let Some(addr) = ("api.kongregate.com", 443)
							.to_socket_addrs()
							.ok()
							.and_then(|mut addr| addr.next())
						{
							if let Ok(stream) = TcpStream::connect(&addr).await {
								if let Ok(kong) = ServerName::try_from("api.kongregate.com") {
									if let Ok(mut socket) = tls.connect(kong, stream).await {
										socket.write_all(format!("GET /api/authenticate.json?user_id={}&game_auth_token={}&api_key={} HTTP/1.0\r\nHost: api.kongregate.com\r\n\r\n", u, g, key).as_bytes()).await.expect("failed write");
										let mut output = Vec::<u8>::new();
										if socket.read_to_end(&mut output).await.is_ok() {
											if let Some(pos) =
												(1..output.len()).into_iter().rev().find(|&idx| {
													output[idx - 1] == b'\n' && output[idx] == b'{'
												}) {
												if let Ok(Value::Object(body)) =
													serde_json::from_slice::<Value>(&output[pos..])
												{
													let success = body
														.get("success")
														.and_then(|v| v.as_bool())
														.unwrap_or(false);
													if success {
														let mut name = String::from("Kong:");
														name.push_str(
															body.get("username")
																.and_then(|v| v.as_str())
																.unwrap_or(""),
														);
														let mut wusers = users.write().await;
														if let Some(user) =
															wusers.load(&*client, &name).await
														{
															let mut user = user.lock().await;
															user.auth = g.clone();
															login_success(&tx, &mut user, &mut client)
																.await;
															wusers.set_sockid(&name, sockid.get());
														} else {
															let mut newuser = UserObject {
																name: name.clone(),
																id: -1,
																auth: g.clone(),
																salt: Vec::new(),
																iter: 0,
																algo: HashAlgo::Sha512,
																data: Default::default(),
																legacy: Default::default(),
															};
															login_success(&tx, &mut newuser, &mut client)
																.await;
															wusers.insert(
																name,
																sockid.get(),
																Arc::new(Mutex::new(newuser)),
															);
														}
													} else {
														sendmsg(
															&tx,
															&WsResponse::loginfail {
																err: &format!(
																	"{}: {}",
																	body["error"],
																	body["error_description"]
																),
															},
														);
													}
												} else {
													sendmsg(
														&tx,
														&WsResponse::loginfail {
															err: "Failed to parse Kongregate's response",
														},
													);
												}
											} else {
												sendmsg(
													&tx,
													&WsResponse::loginfail {
														err: "Kongregate's response wasn't json",
													},
												);
											}
										} else {
											sendmsg(
												&tx,
												&WsResponse::loginfail {
													err: "Kongregate refused request",
												},
											);
										}
									} else {
										sendmsg(
											&tx,
											&WsResponse::loginfail {
												err: "Kongregate failed tls handshake",
											},
										);
									}
								} else {
									sendmsg(
										&tx,
										&WsResponse::loginfail {
											err: "Failed to connect to api.kongregate.com",
										},
									);
								}
							} else {
								sendmsg(
									&tx,
									&WsResponse::loginfail {
										err: "Failed to resolve to api.kongregate.com",
									},
								);
							}
						} else {
							sendmsg(
								&tx,
								&WsResponse::loginfail { err: "Failed to resolve api.kongregate.com" },
							);
						}
					} else {
						sendmsg(&tx, &WsResponse::loginfail { err: "Global error: no kong api in db" });
					}
				}
				UserMessage::r#mod | UserMessage::codesmith => {
					let role = if let UserMessage::codesmith { .. } = msg {
						UserRole::Codesmith
					} else {
						UserRole::Mod
					};
					if let Ok(rows) = client.query("select u.name from user_role ur join users u on u.id = ur.user_id where ur.role_id = $1 order by u.name", &[&role]).await {
						let mut msgmsg = String::new();
						for (idx, row) in rows.iter().enumerate() {
							if idx != 0 {
								msgmsg.push_str(", ");
							}
							msgmsg.push_str(row.get(0))
						}
						sendmsg(&tx, &WsResponse::chat { mode: 1, msg: &msgmsg });
					}
				}
				UserMessage::motd => {
					if let Ok(rows) = client.query("select id, val from motd order by id", &[]).await {
						for row in rows.iter() {
							let msgmsg =
								format!("motd {} {}", row.get::<usize, i32>(0), row.get::<usize, &str>(1));
							sendmsg(&tx, &WsResponse::chat { mode: 1, msg: &msgmsg });
						}
					}
				}
				UserMessage::librarywant { f, a } => {
					if let Some(user) = users.write().await.load(&*client, &f).await {
						let user = user.lock().await;
						if let Some(userdata) = user.data.get(&a) {
							let mut gold = userdata.gold;
							let mut pool = None;
							if a == "" {
								if let Ok(bids) = client
									.query("select code, q, p from bazaar where user_id = $1", &[&user.id])
										.await
										{
											if bids.len() > 0 {
												let mut bidpool = userdata.pool.clone();
												for bid in bids.iter() {
													let code = bid.get::<usize, i32>(0) as i16;
													let q: i32 = bid.get(1);
													let p: i32 = bid.get(2);
													if p < 0 {
														let amt = bidpool.0.entry(code).or_insert(0);
														*amt = amt.saturating_add(q as u16);
													} else {
														gold += p * q;
													}
												}
												pool = Some(bidpool);
											}
										}
							}
							sendmsg(
								&tx,
								&WsResponse::librarygive {
									pool: if let Some(ref pool) = pool { pool } else { &userdata.pool },
									bound: &userdata.accountbound,
									gold,
									pvpwins: userdata.pvpwins,
									pvplosses: userdata.pvplosses,
									aiwins: userdata.aiwins,
									ailosses: userdata.ailosses,
								},
							);
						} else {
							sendmsg(&tx, &WsResponse::chat { mode: 1, msg: "User does not have data" });
						}
					} else {
						sendmsg(&tx, &WsResponse::chat { mode: 1, msg: "User does not exist" });
					}
				}
				UserMessage::arenatop { lv } => {
					if let Ok(rows) = client.query("select u.name, a.score, a.won, a.loss, a.day, a.code, a.deck from arena a join users u on u.id = a.user_id where a.arena_id = $1 order by a.\"rank\" limit 30", &[if lv == 0 { &1i32 } else { &2i32 }]).await {
						let today = get_day();
						let mut top = Vec::with_capacity(rows.len());
						for row in rows {
							top.push((row.get::<usize, String>(0), row.get::<usize, i32>(1), row.get::<usize, i32>(2), row.get::<usize, i32>(3), today.saturating_sub(row.get::<usize, i32>(4) as u32), row.get::<usize, i32>(5), row.get::<usize, String>(6)));
						}
						sendmsg(&tx, &WsResponse::arenatop { lv, top: &top });
					}
				}
				UserMessage::leaderboard { flags, category } => {
					let leagueid = leagueid(&flags);
					if let Ok(rows) = client
						.query(concat!(
								"select u.name, ud.name, val ",
								"from leaderboard l ",
								"join user_data ud on l.data_id = ud.id ",
								"join users u on ud.user_id = u.id ",
								"where league_id = $1 and category = $2 ",
								"order by val desc limit 99"), &[&leagueid, &category])
						.await
					{
						let mut top = Vec::with_capacity(rows.len());
						for row in rows.iter() {
							top.push((row.get::<usize, &str>(0), row.get::<usize, &str>(1), row.get::<usize, i32>(2)));
						}
						sendmsg(&tx, &WsResponse::leaderboard { flags, category, top: &top });
					}
				}
				UserMessage::legacyboard => {
					if let Ok(rows) = logerr(client
						.query(concat!(
								"select u.name, ud.name, val ",
								"from leaderboard l ",
								"join user_data ud on l.data_id = ud.id ",
								"join users u on ud.user_id = u.id ",
								"where league_id = 1 and category = 'Wealth' ",
								"order by val desc limit 99"), &[])
						.await)
					{
						let mut top = Vec::with_capacity(rows.len());
						for row in rows.iter() {
							top.push((row.get::<usize, &str>(0), row.get::<usize, &str>(1), row.get::<usize, i32>(2)));
						}
						sendmsg(&tx, &WsResponse::legacyboard { top: &top });
					}
				}
				UserMessage::bzread => {
					let mut bz: FxHashMap<i16, Vec<_>> = Default::default();
					if let Ok(bids) = client.query("select u.name, b.code, b.q, b.p from bazaar b join users u on b.user_id = u.id", &[]).await {
						for bid in bids.iter() {
							let name: String = bid.get(0);
							let code = bid.get::<usize, i32>(1) as i16;
							let q = bid.get::<usize, i32>(2) as u16;
							let p = bid.get::<usize, i32>(3) as i16;
							bz.entry(code).or_default().push(BzBid {
								u: Cow::Owned(name), q, p
							});
						}
					}
					sendmsg(&tx, &WsResponse::bzread { bz: &bz });
				}
				UserMessage::chatus { hide, afk } => {
					if let Some(sock) = socks.write().await.get_mut(&sockid) {
						if let Some(hide) = hide {
							sock.hide = hide;
						}
						if let Some(afk) = afk {
							sock.afk = afk;
						}
					}
				}
				UserMessage::who => {
					let mut res = String::new();
					{
						let rusers = users.read().await;
						let rsocks = socks.read().await;
						for (name, id) in rusers.iter_name_sockid() {
							if let Some(sock) = rsocks.get(&id) {
								if !sock.hide {
									if !res.is_empty() {
										res.push_str(", ");
									}
									res.push_str(name);
									if sock.afk {
										res.push_str(" (afk)");
									}
								}
							}
						}
					}
					sendmsg(&tx, &WsResponse::chat { mode: 1, msg: &res });
				}
			}
		} else {
			println!("failed to parse {}", msg);
		}
	}

	socks.write().await.remove(&sockid);
}

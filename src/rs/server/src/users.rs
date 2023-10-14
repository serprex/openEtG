use std::collections::HashMap;
use std::sync::Arc;

use bb8_postgres::tokio_postgres::types::{FromSql, ToSql};
use bb8_postgres::tokio_postgres::{types::Json, Client, GenericClient};
use ring::pbkdf2;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use crate::cardpool::Cardpool;
use crate::handlews::{AsyncSocks, AsyncUserSocks};

#[derive(Clone, Copy, Debug, ToSql, FromSql)]
#[postgres(name = "userrole")]
pub enum UserRole {
	Codesmith,
	Mod,
}

#[derive(Clone, Copy, Debug, ToSql, FromSql)]
#[postgres(name = "pbkdf2algo")]
pub enum HashAlgo {
	#[postgres(name = "SHA1")]
	Sha1,
	#[postgres(name = "SHA512")]
	Sha512,
}

impl From<HashAlgo> for pbkdf2::Algorithm {
	fn from(algo: HashAlgo) -> pbkdf2::Algorithm {
		match algo {
			HashAlgo::Sha1 => pbkdf2::PBKDF2_HMAC_SHA1,
			HashAlgo::Sha512 => pbkdf2::PBKDF2_HMAC_SHA512,
		}
	}
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct UserData {
	#[serde(default)]
	pub accountbound: Cardpool,
	#[serde(default)]
	pub ailosses: i32,
	#[serde(default)]
	pub aiwins: i32,
	#[serde(default)]
	pub daily: u8,
	#[serde(default)]
	pub dailydg: u8,
	#[serde(default)]
	pub dailymage: u8,
	#[serde(default)]
	pub decks: HashMap<String, String>,
	#[serde(default)]
	pub gold: i32,
	#[serde(default)]
	pub ocard: i16,
	#[serde(default)]
	pub oracle: u32,
	#[serde(default)]
	pub ostreak: u32,
	#[serde(default)]
	pub ostreakday: u32,
	#[serde(default)]
	pub ostreakday2: u32,
	#[serde(default)]
	pub pool: Cardpool,
	#[serde(default)]
	pub pvplosses: i32,
	#[serde(default)]
	pub pvpwins: i32,
	#[serde(default)]
	pub qecks: [String; 10],
	#[serde(default)]
	pub quests: HashMap<String, u8>,
	#[serde(default)]
	#[serde(rename = "selectedDeck")]
	pub selecteddeck: String,
	#[serde(default)]
	pub streak: Vec<Option<u16>>,
	#[serde(default)]
	pub freepacks: Option<[u8; 3]>,
}

#[derive(Serialize)]
pub struct UserObject {
	pub name: String,
	#[serde(skip)]
	pub id: i64,
	pub auth: String,
	#[serde(skip)]
	pub salt: Vec<u8>,
	#[serde(skip)]
	pub iter: u32,
	#[serde(skip)]
	pub algo: HashAlgo,
	#[serde(flatten)]
	pub data: UserData,
}

pub const HASH_ITER: u32 = 99999;
pub const HASH_ALGO: HashAlgo = HashAlgo::Sha512;

impl UserObject {
	pub fn initsalt(&mut self) {
		let mut saltbin = [0u8; 16];
		getrandom::getrandom(&mut saltbin).expect("Where, O entropy, is your sting?");
		self.salt = Vec::from(&saltbin[..]);
		self.iter = HASH_ITER;
		self.algo = HASH_ALGO;
	}
}

pub type User = Arc<Mutex<UserObject>>;

#[derive(Default)]
pub struct Users(HashMap<String, (bool, User)>);

impl Users {
	pub async fn load<GC>(&mut self, client: &GC, name: &str) -> Option<User>
	where
		GC: GenericClient,
	{
		if let Some(&mut (ref mut gc, ref user)) = self.0.get_mut(name) {
			*gc = false;
			Some(user.clone())
		} else {
			if let Some(row) = client.query_opt("select u.id, u.auth, u.salt, u.iter, u.algo, ud.data from user_data ud join users u on u.id = ud.user_id where u.name = $1 and ud.type_id = 1", &[&name]).await.expect("Connection failed while loading user") {
				let Json(userdata) = row.try_get::<usize, Json<UserData>>(5).expect("Invalid json for user");
				let namestr = name.to_string();
				let userarc = Arc::new(Mutex::new(UserObject {
					name: namestr.clone(),
					id: row.get::<usize, i64>(0),
					auth: row.get::<usize, String>(1),
					salt: row.get::<usize, Vec<u8>>(2),
					iter: row.get::<usize, i32>(3) as u32,
					algo: row.get::<usize, HashAlgo>(4),
					data: userdata,
				}));
				self.insert(namestr, userarc.clone());
				Some(userarc)
			} else {
				None
			}
		}
	}

	pub fn insert(&mut self, name: String, user: User) {
		self.0.insert(name, (false, user));
	}

	pub fn remove(&mut self, name: &str) {
		self.0.remove(name);
	}

	pub async fn evict(&mut self, client: &Client, name: &str) {
		if let Some((_, user)) = self.0.remove(name) {
			let user = user.lock().await;
			client
				.query(
					"update user_data set data = $2 where user_id = $1 and type_id = 1",
					&[&user.id, &Json(&user.data)],
				)
				.await
				.ok();
		}
	}

	pub async fn saveall(&mut self, client: &Client) -> bool {
		let mut queries = Vec::new();
		for &(_, ref user) in self.0.values() {
			queries.push(async move {
				let user = user.lock().await;
				client
					.execute(
						"update user_data set data = $2 where user_id = $1 and type_id = 1",
						&[&user.id, &Json(&user.data)],
					)
					.await
			});
		}
		futures::future::join_all(queries)
			.await
			.into_iter()
			.all(|x| x.is_ok())
	}

	pub async fn store(&mut self, client: &Client, usersocks: AsyncUserSocks, socks: AsyncSocks) {
		if self.saveall(client).await {
			let mut usersocks = usersocks.write().await;
			let socks = socks.read().await;
			usersocks.retain(|_, v| socks.contains_key(v));
			self.0.retain(|_, &mut (ref mut gc, _)| {
				if *gc {
					false
				} else {
					*gc = true;
					true
				}
			});
		}
	}
}

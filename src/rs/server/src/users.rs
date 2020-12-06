use std::collections::{HashMap, HashSet};
use std::str::FromStr;
use std::sync::Arc;

use bb8_postgres::tokio_postgres::{types::Json, Client, GenericClient};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use crate::cardpool::Cardpool;
use crate::handlews::{AsyncSocks, AsyncUserSocks};
use crate::ignore;

#[derive(Clone, Copy)]
pub enum HashAlgo {
	Sha1,
	Sha512,
}

impl FromStr for HashAlgo {
	type Err = std::convert::Infallible;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		Ok(match s {
			"SHA512" => HashAlgo::Sha512,
			_ => HashAlgo::Sha1,
		})
	}
}

impl HashAlgo {
	pub fn as_str(self) -> &'static str {
		match self {
			HashAlgo::Sha1 => "SHA1",
			HashAlgo::Sha512 => "SHA512",
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
	pub ocard: u16,
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
	pub salt: String,
	#[serde(skip)]
	pub iter: i32,
	#[serde(skip)]
	pub algo: HashAlgo,
	#[serde(flatten)]
	pub data: UserData,
}

pub const HASH_ITER: i32 = 99999;
pub const HASH_ALGO: HashAlgo = HashAlgo::Sha512;

impl UserObject {
	pub fn initsalt(&mut self) {
		let mut saltstr = [0u8; 20];
		let mut saltbin = [0u8; 15];
		getrandom::getrandom(&mut saltbin).expect("Where, O entropy, is your sting?");
		base64::encode_config_slice(&saltbin, base64::STANDARD, &mut saltstr);
		self.salt = String::from(unsafe { std::str::from_utf8_unchecked(&saltstr) });
		self.iter = HASH_ITER;
		self.algo = HASH_ALGO;
	}
}

pub type User = Arc<Mutex<UserObject>>;

#[derive(Default)]
pub struct Users {
	gc: HashSet<String>,
	data: HashMap<String, User>,
}

impl Users {
	pub async fn load<GC>(&mut self, client: &GC, name: &str) -> Option<User>
	where
		GC: GenericClient,
	{
		if let Some(user) = self.data.get(name) {
			self.gc.remove(name);
			Some(user.clone())
		} else {
			if let Some(row) = client.query_opt("select u.id, u.auth, u.salt, u.iter, u.algo, ud.data from user_data ud join users u on u.id = ud.user_id where u.name = $1 and ud.type_id = 1", &[&name]).await.expect("Connection failed while loading user") {
				let Json(userdata) = row.try_get::<usize, Json<UserData>>(5).expect("Invalid json for user");
				let namestr = name.to_string();
				let userarc = Arc::new(Mutex::new(UserObject {
					name: namestr.clone(),
					id: row.get::<usize, i64>(0),
					auth: row.get::<usize, String>(1),
					salt: row.get::<usize, String>(2),
					iter: row.get::<usize, i32>(3),
					algo: HashAlgo::from_str(&row.get::<usize, String>(4)).unwrap(),
					data: userdata,
				}));
				self.data.insert(namestr, userarc.clone());
				Some(userarc)
			} else {
				None
			}
		}
	}

	pub fn insert(&mut self, name: String, user: User) {
		self.data.insert(name, user);
	}

	pub fn remove(&mut self, name: &str) {
		self.gc.remove(name);
		self.data.remove(name);
	}

	pub async fn evict(&mut self, client: &Client, name: &str) {
		if let Some(user) = self.data.remove(name) {
			let user = user.lock().await;
			ignore(
				client
					.query(
						"update user_data set data = $2 where user_id = $1 and type_id = 1",
						&[&user.id, &Json(&user.data)],
					)
					.await,
			);
		}
	}

	pub async fn saveall(&mut self, client: &Client) -> bool {
		let mut queries = Vec::new();
		for user in self.data.values() {
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
			let Users {
				ref mut data,
				ref mut gc,
			} = self;
			data.retain(|k, _| {
				if gc.remove(k) {
					false
				} else {
					gc.insert(String::from(k));
					true
				}
			});
		}
	}
}

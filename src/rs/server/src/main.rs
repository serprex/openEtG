mod cardpool;
mod etgutil;
#[rustfmt::skip]
mod generated;
mod handleget;
mod handlews;
mod json;
mod svg;
mod users;

use std::sync::Arc;
use std::time::{Duration, SystemTime};

use bb8_postgres::{bb8::Pool, tokio_postgres, PostgresConnectionManager};
use httpdate::HttpDate;
use warp::filters::header;
use warp::ws::Ws;
use warp::Filter;

use crate::handleget::{AcceptEncoding, AsyncCache};
use crate::handlews::{AsyncSocks, AsyncUserSocks, AsyncUsers};

pub type PgPool = Arc<Pool<PostgresConnectionManager<tokio_postgres::NoTls>>>;

pub fn get_day() -> u32 {
	match SystemTime::now().duration_since(SystemTime::UNIX_EPOCH) {
		Ok(n) => (n.as_secs() / 86400) as u32,
		Err(_) => 0,
	}
}

use serde::Deserialize;
#[derive(Deserialize)]
struct ConfigRaw {
	listen: u16,
	pg: String,
	certs: Option<String>,
}

struct Config {
	listen: u16,
	pg: tokio_postgres::config::Config,
	certs: Option<String>,
}

impl From<ConfigRaw> for Config {
	fn from(config: ConfigRaw) -> Config {
		Config {
			listen: config.listen,
			pg: config
				.pg
				.as_str()
				.parse::<tokio_postgres::config::Config>()
				.expect("Failed to parse connection config"),
			certs: config.certs,
		}
	}
}

#[tokio::main]
async fn main() {
	let _sigpipestream = signal(SignalKind::pipe()).expect("Failed to setup pipe handler");
	let (listenport, pgpool) = {
		let configjson = tokio::fs::read("../../../config.json")
			.await
			.expect("Failed to load config.json");
		let configraw =
			serde_json::from_slice::<ConfigRaw>(&configjson).expect("Failed to parse config.json");
		let Config { listen, pg, certs } = Config::from(configraw);
		if certs.is_some() {
			panic!("HTTPS cert support isn't implemented");
		}
		(
			listen,
			Arc::new(
				Pool::builder()
					.build(PostgresConnectionManager::new(pg, tokio_postgres::NoTls))
					.await
					.expect("Failed to create connection pool"),
			),
		)
	};

	let (closetx, mut closerx) = tokio::sync::watch::channel(());

	let users = AsyncUsers::default();
	let usersocks = AsyncUserSocks::default();
	let socks = AsyncSocks::default();
	let cache = AsyncCache::default();
	let wsusers = users.clone();
	let wspgpool = pgpool.clone();
	let gcusers = users.clone();
	let gcusersocks = usersocks.clone();
	let gcsocks = socks.clone();
	let gcpgpool = pgpool.clone();
	let mut gccloserx = closerx.clone();
	let sigintusers = users.clone();
	let sigintpgpool = pgpool.clone();

	let mut interval = tokio::time::interval(Duration::new(300, 0));
	tokio::spawn(async move {
		loop {
			tokio::select! {
				_ = interval.tick() => (),
				msg = gccloserx.changed() => {
					if msg.is_ok() {
						continue;
					} else {
						break;
					}
				}
			}
			if let Ok(client) = gcpgpool.get().await {
				let mut users = gcusers.write().await;
				let _ = tokio::join!(users
					.store(&client, gcusersocks.clone(), gcsocks.clone()),
					client.execute("delete from trade_request where expire_at < now()", &[]),
					client.execute(
						"with expiredids (id) as (select id from games where expire_at < now()) \
						, requests as (delete from match_request mr where exists (select * from expiredids eg where eg.id = mr.game_id)) \
						delete from games g where exists (select * from expiredids eg where eg.id = g.id)", &[]),
				);
			}
		}
	});

	let ws = warp::path::path("ws")
		.and(warp::path::end())
		.and(warp::ws())
		.map(move |ws: Ws| {
			let pgpool = wspgpool.clone();
			let users = wsusers.clone();
			let usersocks = usersocks.clone();
			let socks = socks.clone();
			ws.on_upgrade(move |socket| {
				handlews::handle_ws(socket, pgpool, users, usersocks, socks)
			})
		});
	let full = warp::path::full()
		.and(header::optional::<HttpDate>("if-modified-since"))
		.and(header::optional::<AcceptEncoding>("accept-encoding"))
		.and(warp::any().map(move || pgpool.clone()))
		.and(warp::any().map(move || users.clone()))
		.and(warp::any().map(move || cache.clone()))
		.then(handleget::handle_get);
	let (_, server) = warp::serve(ws.or(full))
		.bind_with_graceful_shutdown(([0, 0, 0, 0], listenport), async move {
			while closerx.changed().await.is_ok() {}
		});
	let serverloop = tokio::spawn(server);

	use tokio::signal::unix::{signal, SignalKind};
	let mut sigintstream = signal(SignalKind::interrupt()).expect("Failed to setup signal handler");
	sigintstream.recv().await;
	drop(closetx);
	println!("Shutting down");
	serverloop.await.ok();
	if let Ok(client) = sigintpgpool.get().await {
		if !sigintusers.write().await.saveall(&client).await {
			println!("Error while saving users");
		}
	} else {
		println!("Failed to connect");
	}
	drop(sigintpgpool);
}
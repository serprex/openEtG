mod cardpool;
mod etgutil;
#[rustfmt::skip]
mod generated;
mod handleget;
mod handlews;
mod json;
mod starters;
mod svg;
mod users;

use std::future::IntoFuture;
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use axum::{
	extract::{ws::WebSocketUpgrade, FromRequestParts, Request},
	http,
	response::Response,
	routing::any_service,
};
use std::net::Ipv4Addr;

use bb8_postgres::{bb8::Pool, tokio_postgres, PostgresConnectionManager};

use crate::handleget::AsyncCache;
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
		let configjson = tokio::fs::read("../../../config.json").await.expect("Failed to load config.json");
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

	let (closetx, closerx) = tokio::sync::watch::channel(());

	let users = AsyncUsers::default();
	let usersocks = AsyncUserSocks::default();
	let socks = AsyncSocks::default();
	let cache = AsyncCache::default();
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

	let service = tower::service_fn(move |req: Request| {
		let pgpool = pgpool.clone();
		let users = users.clone();
		let usersocks = usersocks.clone();
		let socks = socks.clone();
		let cache = cache.clone();
		let (mut parts, _) = req.into_parts();
		async move {
			Result::<Response, std::convert::Infallible>::Ok(if parts.method == http::Method::GET {
				if let Ok(wsup) = WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
					wsup.on_upgrade(move |socket| {
						handlews::handle_ws(socket, pgpool, users, usersocks, socks)
					})
				} else {
					handleget::handle_get(
						parts.uri.path(),
						parts
							.headers
							.get("if-modified-since")
							.and_then(|hv| hv.to_str().ok())
							.and_then(|hv| hv.parse().ok()),
						parts
							.headers
							.get("accept-encoding")
							.and_then(|hv| hv.to_str().ok())
							.and_then(|hv| hv.parse().ok()),
						pgpool,
						users,
						cache,
					)
					.await
				}
			} else {
				http::Response::new(axum::body::Body::empty())
			})
		}
	});

	let listener = tokio::net::TcpListener::bind((Ipv4Addr::new(0, 0, 0, 0), listenport)).await.unwrap();
	let server = axum::serve(listener, any_service(service)).into_future();
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

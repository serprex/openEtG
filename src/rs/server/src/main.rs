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

use std::future::Future;
use std::net::Ipv4Addr;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use http_body_util::Full;
use hyper_tungstenite::{
	hyper::{
		self,
		body::{Bytes, Incoming},
		Request, Response,
	},
	WebSocketStream,
};
use hyper_util::rt::TokioIo;
use tokio::signal::unix::{signal, SignalKind};
use tokio_rustls::{
	rustls::{ClientConfig, RootCertStore},
	TlsConnector,
};

use bb8_postgres::{bb8::Pool, tokio_postgres, PostgresConnectionManager};

use crate::handleget::AsyncCache;
use crate::handlews::{AsyncSocks, AsyncUserSocks, AsyncUsers};

pub type PgPool = Arc<Pool<PostgresConnectionManager<tokio_postgres::NoTls>>>;
pub type WsStream = WebSocketStream<TokioIo<hyper::upgrade::Upgraded>>;

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

type Error = Box<dyn std::error::Error + Send + Sync + 'static>;

#[derive(Clone)]
struct Server {
	pub users: AsyncUsers,
	pub usersocks: AsyncUserSocks,
	pub socks: AsyncSocks,
	pub cache: AsyncCache,
	pub pgpool: PgPool,
	pub tls: TlsConnector,
}

impl hyper::service::Service<Request<Incoming>> for Server {
	type Response = Response<Full<Bytes>>;
	type Error = Error;
	type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

	fn call(&self, mut req: Request<Incoming>) -> Self::Future {
		let pgpool = self.pgpool.clone();
		let users = self.users.clone();
		let usersocks = self.usersocks.clone();
		let socks = self.socks.clone();
		let cache = self.cache.clone();
		let tls = self.tls.clone();
		Box::pin(async move {
			if hyper_tungstenite::is_upgrade_request(&req) {
				if let Ok((response, socket)) = hyper_tungstenite::upgrade(&mut req, None) {
					tokio::spawn(async move {
						if let Ok(ws) = socket.await {
							handlews::handle_ws(ws, pgpool, users, usersocks, socks, tls).await
						}
					});

					Ok(response)
				} else {
					Ok(Default::default())
				}
			} else {
				Ok(handleget::handle_get(
					req.uri().path(),
					req.headers()
						.get("if-modified-since")
						.and_then(|hv| hv.to_str().ok())
						.and_then(|hv| hv.parse().ok()),
					req.headers()
						.get("accept-encoding")
						.and_then(|hv| hv.to_str().ok())
						.and_then(|hv| hv.parse().ok()),
					pgpool,
					users,
					cache,
				)
				.await)
			}
		})
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
	let tlsconfig = ClientConfig::builder()
		.with_root_certificates(RootCertStore {
			roots: webpki_roots::TLS_SERVER_ROOTS.iter().cloned().collect(),
		})
		.with_no_client_auth();
	let tls = TlsConnector::from(Arc::new(tlsconfig));

	let mut interval = tokio::time::interval(Duration::new(300, 0));
	tokio::spawn(async move {
		loop {
			tokio::select! {
				biased;
				msg = gccloserx.changed() => {
					if msg.is_ok() {
						continue;
					} else {
						break;
					}
				}
				_ = interval.tick() => (),
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

	let mut sigintstream = signal(SignalKind::interrupt()).expect("Failed to setup signal handler");
	let listener = tokio::net::TcpListener::bind((Ipv4Addr::new(0, 0, 0, 0), listenport)).await.unwrap();
	let server = Server { pgpool, users, usersocks, socks, cache, tls };
	let mut http = hyper::server::conn::http1::Builder::new();
	http.keep_alive(true);

	loop {
		tokio::select! {
			biased;
			_ = sigintstream.recv() => break,
			accepted = listener.accept() => {
				if let Ok((stream, _)) = accepted {
					let connection = http.serve_connection(TokioIo::new(stream), server.clone()).with_upgrades();
					tokio::spawn(async move {
						if let Err(err) = connection.await {
							println!("Error serving HTTP connection: {err:?}");
						}
					});
				}
			}
		}
	}

	drop(closetx);
	println!("Shutting down");
	if let Ok(client) = sigintpgpool.get().await {
		if !sigintusers.write().await.saveall(&client).await {
			println!("Error while saving users");
		}
	} else {
		println!("Failed to connect");
	}
	drop(sigintpgpool);
}

#![allow(non_camel_case_types)]

use std::collections::{BTreeMap, HashMap};
use std::convert::{Infallible, TryFrom};
use std::fmt::Write;
use std::sync::Arc;
use std::time::SystemTime;

use tokio::sync::RwLock;
use warp::http::{self, response, HeaderValue, Response};
use warp::hyper::body::Bytes;
use warp::path::FullPath;

use etg::card;

use crate::etgutil::{decode_code, encode_code};
use crate::handlews::AsyncUsers;
use crate::http_date::HttpDate;
use crate::{svg, PgPool};

#[derive(Clone, Copy)]
pub enum Encoding {
	br,
	gzip,
	identity,
}

impl std::str::FromStr for Encoding {
	type Err = ();

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		Ok(match s {
			"br" => Encoding::br,
			"gzip" => Encoding::gzip,
			"identity" => Encoding::identity,
			_ => return Err(()),
		})
	}
}

pub struct AcceptEncoding(pub Encoding);

impl std::str::FromStr for AcceptEncoding {
	type Err = Infallible;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		let mut result = Encoding::identity;
		for code in s.split(',') {
			match code.trim() {
				"br" => return Ok(AcceptEncoding(Encoding::br)),
				"gzip" => result = Encoding::gzip,
				_ => (),
			}
		}
		Ok(AcceptEncoding(result))
	}
}

#[derive(Default)]
pub struct Cache {
	br: HashMap<String, CachedResponse>,
	gzip: HashMap<String, CachedResponse>,
	identity: HashMap<String, CachedResponse>,
}

impl Cache {
	pub fn get_map(&self, encoding: Encoding) -> &HashMap<String, CachedResponse> {
		match encoding {
			Encoding::br => &self.br,
			Encoding::gzip => &self.gzip,
			Encoding::identity => &self.identity,
		}
	}

	pub fn get_map_mut(&mut self, encoding: Encoding) -> &mut HashMap<String, CachedResponse> {
		match encoding {
			Encoding::br => &mut self.br,
			Encoding::gzip => &mut self.gzip,
			Encoding::identity => &mut self.identity,
		}
	}

	pub fn remove(&mut self, path: &str) {
		self.br.remove(path);
		self.gzip.remove(path);
		self.identity.remove(path);
	}
}

pub type AsyncCache = Arc<RwLock<Cache>>;

pub async fn compress_and_cache(
	cache: &AsyncCache,
	encoding: Encoding,
	path: String,
	resp: PlainResponse,
) -> CachedResponse {
	use async_compression::tokio_02::write::{BrotliEncoder, GzipEncoder};
	use tokio::io::AsyncWriteExt;
	let encoding = match resp.kind {
		ContentType::ApplicationOgg | ContentType::ImageWebp => Encoding::identity,
		_ => encoding,
	};
	match match encoding {
		Encoding::br => {
			let mut encoder = BrotliEncoder::new(Vec::new());
			if encoder.write_all(&resp.content).await.is_ok() {
				if encoder.shutdown().await.is_ok() {
					Ok(encoder.into_inner())
				} else {
					Err(resp.content)
				}
			} else {
				Err(resp.content)
			}
		}
		Encoding::gzip => {
			let mut encoder = GzipEncoder::new(Vec::new());
			if encoder.write_all(&resp.content).await.is_ok() {
				if encoder.shutdown().await.is_ok() {
					Ok(encoder.into_inner())
				} else {
					Err(resp.content)
				}
			} else {
				Err(resp.content)
			}
		}
		Encoding::identity => Ok(resp.content),
	} {
		Ok(compressed) => {
			let cached_resp = CachedResponse {
				encoding: encoding,
				cache: resp.cache,
				kind: resp.kind,
				mtime: SystemTime::now(),
				content: Bytes::from(compressed),
				file: resp.file,
			};
			let mut wcache = cache.write().await;
			wcache
				.get_map_mut(encoding)
				.insert(path, cached_resp.clone());
			cached_resp
		}
		Err(content) => CachedResponse {
			encoding: Encoding::identity,
			cache: resp.cache,
			kind: resp.kind,
			mtime: SystemTime::UNIX_EPOCH,
			content: Bytes::from(content),
			file: resp.file,
		},
	}
}

#[derive(Clone, Copy)]
pub enum CacheControl {
	NoStore,
	NoCache,
	Immutable,
}

#[derive(Clone, Copy)]
pub enum ContentType {
	ApplicationJavascript,
	ApplicationJson,
	ApplicationOctetStream,
	ApplicationOgg,
	ApplicationWasm,
	ImageSvgXml,
	ImageWebp,
	TextCss,
	TextHtml,
	TextPlain,
}

#[derive(Clone)]
pub struct PlainResponse {
	pub cache: CacheControl,
	pub kind: ContentType,
	pub mtime: Option<SystemTime>,
	pub file: Option<String>,
	pub content: Vec<u8>,
}

#[derive(Clone)]
pub struct CachedResponse {
	pub encoding: Encoding,
	pub cache: CacheControl,
	pub kind: ContentType,
	pub mtime: SystemTime,
	pub file: Option<String>,
	pub content: Bytes,
}

impl TryFrom<CachedResponse> for Response<Bytes> {
	type Error = http::Error;

	fn try_from(x: CachedResponse) -> Result<Self, Self::Error> {
		Response::builder()
			.header(
				"content-encoding",
				HeaderValue::from_static(match x.encoding {
					Encoding::br => "br",
					Encoding::gzip => "gzip",
					Encoding::identity => "identity",
				}),
			)
			.header(
				"cache-control",
				HeaderValue::from_static(match x.cache {
					CacheControl::NoStore => "no-store",
					CacheControl::NoCache => "no-cache",
					CacheControl::Immutable => "immutable",
				}),
			)
			.header(
				"content-type",
				HeaderValue::from_static(match x.kind {
					ContentType::ApplicationJavascript => "application/javascript",
					ContentType::ApplicationJson => "application/json",
					ContentType::ApplicationOctetStream => "application/octet-stream",
					ContentType::ApplicationOgg => "application/ogg",
					ContentType::ApplicationWasm => "application/wasm",
					ContentType::ImageSvgXml => "image/svg+xml",
					ContentType::ImageWebp => "image/webp",
					ContentType::TextCss => "text/css",
					ContentType::TextHtml => "text/html",
					ContentType::TextPlain => "text/plain",
				}),
			)
			.body(x.content.clone())
	}
}

async fn handle_get_core(
	path: FullPath,
	ims: Option<HttpDate>,
	accept: Option<AcceptEncoding>,
	pgpool: PgPool,
	users: AsyncUsers,
	cache: AsyncCache,
) -> Result<Response<Bytes>, http::Error> {
	let accept = accept.map(|x| x.0).unwrap_or(Encoding::identity);
	let path = path.as_str();
	let path = if path == "/" { "/index.html" } else { path };
	if path.contains("..") || !path.starts_with('/') {
		return response::Builder::new().status(403).body(Bytes::new());
	}
	let invalidate = if let Some(ims) = ims.map(SystemTime::from) {
		let rcache = cache.read().await;
		if let Some(cached) = rcache.get_map(accept).get(path) {
			let stale = cached
				.file
				.as_ref()
				.and_then(|file| std::fs::metadata(file).ok())
				.and_then(|md| md.modified().ok())
				.map(|md| md > cached.mtime)
				.unwrap_or(false);
			if stale {
				true
			} else {
				return if cached.mtime <= ims {
					response::Builder::new().status(304).body(Bytes::new())
				} else {
					Response::<Bytes>::try_from(cached.clone())
				};
			}
		} else {
			false
		}
	} else {
		false
	};
	if invalidate {
		cache.write().await.remove(path);
	}
	let res: PlainResponse = if path.len() == "/Cards/".len() + ".webp".len() + 3
		&& path.starts_with("/Cards/")
		&& path.ends_with(".webp")
	{
		let mut uppath = String::from("../../..");
		uppath.push_str(&path);
		if let Ok(md) = std::fs::metadata(&uppath) {
			let data = tokio::fs::read(&uppath).await.unwrap_or(Vec::new());
			PlainResponse {
				kind: ContentType::ImageWebp,
				cache: CacheControl::NoCache,
				mtime: md.modified().ok(),
				content: data,
				file: Some(String::from(uppath)),
			}
		} else if let Ok(code) =
			i32::from_str_radix(&path["/Cards/".len()..path.len() - ".webp".len()], 32)
		{
			if card::Shiny(code) {
				let mut newpath = b"/Cards/".to_vec();
				newpath.extend_from_slice(&encode_code(card::AsShiny(code, false)));
				newpath.extend_from_slice(b".webp");
				let newpath = unsafe { String::from_utf8_unchecked(newpath) };
				return response::Builder::new()
					.status(302)
					.header("location", newpath)
					.body(Bytes::new());
			} else {
				let unupped = card::AsUpped(code, false);
				if unupped != code {
					let mut newpath = b"/Cards/".to_vec();
					newpath.extend_from_slice(&encode_code(unupped));
					newpath.extend_from_slice(b".webp");
					let newpath = unsafe { String::from_utf8_unchecked(newpath) };
					return response::Builder::new()
						.status(302)
						.header("location", &newpath)
						.body(Bytes::new());
				} else {
					return response::Builder::new().status(404).body(Bytes::new());
				}
			}
		} else {
			return response::Builder::new().status(404).body(Bytes::new());
		}
	} else if path.starts_with("/assets/") {
		let mut uppath = String::from("../../..");
		uppath.push_str(&path);
		let data = tokio::fs::read(&uppath).await.unwrap_or(Vec::new());
		PlainResponse {
			kind: if path.ends_with(".css") {
				ContentType::TextCss
			} else {
				ContentType::ImageWebp
			},
			cache: CacheControl::NoCache,
			content: data,
			mtime: None,
			file: Some(String::from(uppath)),
		}
	} else if path == "/manifest.json" {
		let data = tokio::fs::read("../../../manifest.json")
			.await
			.unwrap_or(Vec::new());
		PlainResponse {
			kind: ContentType::ApplicationJavascript,
			cache: CacheControl::NoCache,
			content: data,
			mtime: None,
			file: Some(String::from("../../../manifest.json")),
		}
	} else if path == "/ui.css" {
		let data = tokio::fs::read("../../../ui.css")
			.await
			.unwrap_or(Vec::new());
		PlainResponse {
			kind: ContentType::TextCss,
			cache: CacheControl::NoCache,
			content: data,
			mtime: None,
			file: Some(String::from("../../../ui.css")),
		}
	} else if path.starts_with("/sound/") {
		let mut uppath = String::from("../../../bundle");
		uppath.push_str(&path);
		let data = tokio::fs::read(&uppath).await.unwrap_or(Vec::new());
		PlainResponse {
			kind: ContentType::ApplicationOgg,
			cache: CacheControl::NoCache,
			content: data,
			mtime: None,
			file: Some(String::from(uppath)),
		}
	} else if path.ends_with(".js")
		|| path.ends_with(".htm")
		|| path.ends_with(".html")
		|| path.ends_with(".wasm")
		|| path.ends_with(".js.map")
	{
		let mut uppath = String::from("../../../bundle");
		uppath.push_str(&path);
		let data = tokio::fs::read(&uppath).await.unwrap_or(Vec::new());
		let cache = if path.starts_with("/hash/") {
			CacheControl::Immutable
		} else {
			CacheControl::NoCache
		};
		PlainResponse {
			cache: cache,
			kind: if path.ends_with(".js") {
				ContentType::ApplicationJavascript
			} else if path.ends_with(".htm") || path.ends_with(".html") {
				ContentType::TextHtml
			} else if path.ends_with(".wasm") {
				ContentType::ApplicationWasm
			} else {
				ContentType::ApplicationOctetStream
			},
			content: data,
			mtime: None,
			file: if matches!(cache, CacheControl::Immutable) {
				None
			} else {
				Some(String::from(uppath))
			},
		}
	} else if path.starts_with("/card/") && path.len() >= "/card/".len() + 3 {
		let code = decode_code(path["/card/".len().."/card/".len() + 3].as_bytes());
		if let Some(content) = svg::card(code) {
			PlainResponse {
				cache: CacheControl::NoCache,
				kind: ContentType::ImageSvgXml,
				content: Vec::<u8>::from(content),
				mtime: None,
				file: None,
			}
		} else {
			return response::Builder::new().status(400).body(Bytes::new());
		}
	} else if path.starts_with("/deck/") {
		if path.ends_with(".svg") {
			let deck = &path["/deck/".len()..path.len() - 4];
			if deck.len() % 5 != 0 {
				return response::Builder::new().status(400).body(Bytes::new());
			}
			PlainResponse {
				cache: CacheControl::NoCache,
				kind: ContentType::ImageSvgXml,
				content: Vec::<u8>::from(svg::deck(deck)),
				mtime: None,
				file: None,
			}
		} else {
			let mut newpath = String::from("/deck.htm#");
			newpath.push_str(&path["/deck/".len()..]);
			return response::Builder::new()
				.status(302)
				.header("location", newpath)
				.body(Bytes::new());
		}
	} else if path.starts_with("/collection/") {
		let name = &path["/collection/".len()..];
		if let Ok(client) = pgpool.get().await {
			if let Some(user) = users.write().await.load(&*client, name).await {
				let user = user.lock().await;
				let pool = &user.data.pool;
				let bound = &user.data.accountbound;
				let mut cards: BTreeMap<u16, [u16; 8]> = BTreeMap::new();
				for i in 0..2 {
					let (cards0, counts) = if i == 0 { (0, pool) } else { (4, bound) };
					for (&code, &count) in counts.0.iter() {
						let code = code as i32;
						let row = cards
							.entry(card::AsUpped(card::AsShiny(code, false), false) as u16)
							.or_default();
						row[cards0
							| if card::Shiny(code) { 2 } else { 0 }
							| card::Upped(code) as usize] = count;
					}
				}
				let mut userdata = String::new();
				for (&code, row) in cards.iter() {
					if let Some(card) = card::OpenSet.try_get(code as i32) {
						write!(
							userdata,
							"{},{},{},{},{},{},{},{},{},{},{},{},{}\n",
							code,
							svg::card_name(card),
							row[0],
							row[1],
							row[2],
							row[3],
							row[4],
							row[5],
							row[6],
							row[7],
							card.element,
							card.rarity,
							card.kind
						)
						.ok();
					}
				}
				PlainResponse {
					cache: CacheControl::NoStore,
					kind: ContentType::TextPlain,
					content: Vec::<u8>::from(userdata),
					mtime: None,
					file: None,
				}
			} else {
				return response::Builder::new().status(404).body(Bytes::new());
			}
		} else {
			return response::Builder::new().status(503).body(Bytes::new());
		}
	} else if path.starts_with("/speed/") {
		if let Ok(seed) = path["/speed/".len()..].parse() {
			use rand::{Rng, SeedableRng};
			use rand_pcg::Pcg32;

			let mut rng = Pcg32::seed_from_u64(seed);
			let mut eles = [false; 12];
			let mut codes = [0u16; 42];
			for i in 0..6 {
				let mut ele = rng.gen_range(0..12 - i);
				for idx in 0..12 {
					if !eles[idx] {
						if ele == 0 {
							eles[idx] = true;
							let ele = (idx + 1) as i8;
							for j in 0..7 {
								let ij = i * 7 + j;
								codes[ij] = card::OpenSet
									.random_card(&mut rng, false, |card| {
										card.element == ele
											&& !card.status.iter().any(|&(k, v)| {
												k == etg::game::Stat::pillar && v != 0
											}) && !codes[..ij].iter().any(|&code| code == card.code)
									})
									.unwrap()
									.code;
							}
							break;
						} else {
							ele -= 1;
						}
					}
				}
			}
			let mut deck = Vec::with_capacity(5 * 43);
			for &code in codes.iter() {
				deck.extend(&b"01"[..]);
				deck.extend(&encode_code(code as i32));
			}
			deck.extend(&b"01"[..]);
			deck.extend(&encode_code(rng.gen_range(9010..9022)));
			PlainResponse {
				cache: CacheControl::NoCache,
				kind: ContentType::ImageSvgXml,
				content: Vec::<u8>::from(svg::deck(unsafe {
					std::str::from_utf8_unchecked(&deck)
				})),
				mtime: None,
				file: None,
			}
		} else {
			return response::Builder::new().status(400).body(Bytes::new());
		}
	} else if path == "/speed" {
		use rand::RngCore;
		let mut newpath = String::from("/speed/");
		write!(newpath, "{}", rand::thread_rng().next_u32()).ok();
		return response::Builder::new()
			.status(302)
			.header("location", newpath)
			.body(Bytes::new());
	} else {
		return response::Builder::new().status(404).body(Bytes::new());
	};
	Response::<Bytes>::try_from(compress_and_cache(&cache, accept, path.to_string(), res).await)
}

pub async fn handle_get(
	path: FullPath,
	ims: Option<HttpDate>,
	accept: Option<AcceptEncoding>,
	pgpool: PgPool,
	users: AsyncUsers,
	cache: AsyncCache,
) -> Result<Response<Bytes>, std::convert::Infallible> {
	Ok(handle_get_core(path, ims, accept, pgpool, users, cache)
		.await
		.unwrap())
}

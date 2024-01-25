#![allow(non_camel_case_types)]

use std::collections::{BTreeMap, HashMap};
use std::convert::Infallible;
use std::fmt::Write;
use std::sync::RwLock;
use std::time::SystemTime;

use http_body_util::Full;
use httpdate::HttpDate;
use hyper::body::Bytes;
use hyper::http::{self, header, response, HeaderValue, Response};

use etg::card;

use crate::etgutil::{decode_code, encode_code};
use crate::handlews::AsyncUsers;
use crate::{svg, PgPool};

#[derive(Clone, Copy)]
pub enum Encoding {
	br,
	identity,
}
pub struct AcceptEncoding(pub Encoding);

impl std::str::FromStr for AcceptEncoding {
	type Err = Infallible;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		Ok(AcceptEncoding(if s.split(',').any(|code| code.trim() == "br") {
			Encoding::br
		} else {
			Encoding::identity
		}))
	}
}

#[derive(Default)]
pub struct Cache {
	br: HashMap<String, CachedResponse>,
	identity: HashMap<String, CachedResponse>,
}

impl Cache {
	pub fn get_map(&self, encoding: Encoding) -> &HashMap<String, CachedResponse> {
		match encoding {
			Encoding::br => &self.br,
			Encoding::identity => &self.identity,
		}
	}

	pub fn get_map_mut(&mut self, encoding: Encoding) -> &mut HashMap<String, CachedResponse> {
		match encoding {
			Encoding::br => &mut self.br,
			Encoding::identity => &mut self.identity,
		}
	}

	pub fn remove(&mut self, path: &str) {
		self.br.remove(path);
		self.identity.remove(path);
	}
}

pub type AsyncCache = RwLock<Cache>;

pub async fn compress_and_cache(
	cache: &AsyncCache,
	encoding: Encoding,
	path: String,
	resp: PlainResponse,
) -> CachedResponse {
	use std::io::Write;
	match match encoding {
		Encoding::br => {
			let mut brwriter =
				brotli::CompressorWriter::new(Vec::with_capacity(resp.content.len()), 4096, 9, 18);
			if brwriter.write_all(&resp.content).is_ok() {
				Ok(brwriter.into_inner())
			} else {
				Err(resp.content)
			}
		}
		Encoding::identity => Ok(resp.content),
	} {
		Ok(compressed) => {
			let mtime = resp.mtime.unwrap_or_else(SystemTime::now);
			let cached_resp = CachedResponse {
				encoding,
				cache: resp.cache,
				kind: resp.kind,
				mtime: mtime.duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
				mtimestring: Some(HttpDate::from(mtime).to_string()),
				content: Bytes::from(compressed.into_boxed_slice()),
				file: resp.file,
			};
			cache
				.write()
				.unwrap_or_else(|e| e.into_inner())
				.get_map_mut(encoding)
				.insert(path, cached_resp.clone());
			cached_resp
		}
		Err(content) => CachedResponse {
			encoding: Encoding::identity,
			cache: resp.cache,
			kind: resp.kind,
			mtime: 0,
			mtimestring: None,
			content: Bytes::from(content.into_boxed_slice()),
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
	ImageIcon,
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
	pub mtime: u64,
	pub mtimestring: Option<String>,
	pub file: Option<String>,
	pub content: Bytes,
}

impl CachedResponse {
	fn response(&self) -> Result<Response<Bytes>, http::Error> {
		let mut builder = Response::builder()
			.header(
				header::CONTENT_ENCODING,
				HeaderValue::from_static(match self.encoding {
					Encoding::br => "br",
					Encoding::identity => "identity",
				}),
			)
			.header(
				header::CACHE_CONTROL,
				HeaderValue::from_static(match self.cache {
					CacheControl::NoStore => "no-store",
					CacheControl::NoCache => "no-cache",
					CacheControl::Immutable => "immutable",
				}),
			)
			.header(
				header::CONTENT_TYPE,
				HeaderValue::from_static(match self.kind {
					ContentType::ApplicationJavascript => "application/javascript",
					ContentType::ApplicationJson => "application/json",
					ContentType::ApplicationOctetStream => "application/octet-stream",
					ContentType::ApplicationOgg => "application/ogg",
					ContentType::ApplicationWasm => "application/wasm",
					ContentType::ImageIcon => "image/x-icon",
					ContentType::ImageSvgXml => "image/svg+xml",
					ContentType::ImageWebp => "image/webp",
					ContentType::TextCss => "text/css",
					ContentType::TextHtml => "text/html",
					ContentType::TextPlain => "text/plain; charset=utf-8",
				}),
			);
		if let Some(ref mtimestring) = self.mtimestring {
			builder = builder.header(header::LAST_MODIFIED, mtimestring);
		}
		builder.body(self.content.clone())
	}
}

async fn handle_get_core(
	uri: &http::Uri,
	ims: Option<HttpDate>,
	accept: Option<AcceptEncoding>,
	pgpool: &PgPool,
	users: &AsyncUsers,
	cache: &AsyncCache,
) -> Result<Response<Bytes>, http::Error> {
	let path = uri.path();
	let path = if path == "/" { "/index.html" } else { path };
	if path.contains("..") || !path.starts_with('/') {
		return response::Builder::new().status(403).body(Bytes::new());
	}
	let accept = if path.ends_with(".webp") || path.ends_with(".ogg") {
		Encoding::identity
	} else {
		accept.map(|x| x.0).unwrap_or(Encoding::identity)
	};
	let invalidate = {
		let rcache = cache.read().unwrap_or_else(|e| e.into_inner());
		if let Some(cached) = rcache.get_map(accept).get(path) {
			if cached
				.file
				.as_ref()
				.and_then(|file| std::fs::metadata(file).ok())
				.and_then(|md| md.modified().ok())
				.and_then(|md| md.duration_since(SystemTime::UNIX_EPOCH).ok())
				.map(|md| md.as_secs().saturating_sub(12) > cached.mtime)
				.unwrap_or(false)
			{
				true
			} else {
				return if ims
					.and_then(|ims| SystemTime::from(ims).duration_since(SystemTime::UNIX_EPOCH).ok())
					.map(|ims| cached.mtime <= ims.as_secs().saturating_add(12))
					.unwrap_or(false)
				{
					response::Builder::new().status(304).body(Bytes::new())
				} else {
					cached.response()
				};
			}
		} else {
			false
		}
	};
	if invalidate {
		cache.write().unwrap_or_else(|e| e.into_inner()).remove(path);
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
				file: Some(uppath),
			}
		} else if let Ok(code) = i16::from_str_radix(&path["/Cards/".len()..path.len() - ".webp".len()], 32)
		{
			if card::Shiny(code as i16) {
				let mut newpath = b"/Cards/".to_vec();
				newpath.extend_from_slice(&encode_code(card::AsShiny(code, false)));
				newpath.extend_from_slice(b".webp");
				let newpath = unsafe { String::from_utf8_unchecked(newpath) };
				return response::Builder::new()
					.status(302)
					.header(header::LOCATION, newpath)
					.body(Bytes::new());
			} else if card::Upped(code as i16) {
				let mut newpath = b"/Cards/".to_vec();
				newpath.extend_from_slice(&encode_code(card::AsUpped(code, false)));
				newpath.extend_from_slice(b".webp");
				let newpath = unsafe { String::from_utf8_unchecked(newpath) };
				return response::Builder::new()
					.status(302)
					.header(header::LOCATION, newpath)
					.body(Bytes::new());
			} else {
				return response::Builder::new().status(404).body(Bytes::new());
			}
		} else {
			return response::Builder::new().status(404).body(Bytes::new());
		}
	} else if path.starts_with("/assets/") {
		let mut uppath = String::from("../../..");
		uppath.push_str(&path);
		let data = tokio::fs::read(&uppath).await.unwrap_or(Vec::new());
		let mtime = tokio::fs::metadata(&uppath).await.ok().and_then(|md| md.modified().ok());
		PlainResponse {
			kind: if path.ends_with(".css") { ContentType::TextCss } else { ContentType::ImageWebp },
			cache: CacheControl::NoCache,
			content: data,
			mtime,
			file: Some(uppath),
		}
	} else if path.starts_with("/sound/") {
		let mut uppath = String::from("../../..");
		uppath.push_str(&path);
		let data = tokio::fs::read(&uppath).await.unwrap_or(Vec::new());
		let mtime = tokio::fs::metadata(&uppath).await.ok().and_then(|md| md.modified().ok());
		PlainResponse {
			kind: ContentType::ApplicationOgg,
			cache: CacheControl::NoCache,
			content: data,
			mtime,
			file: Some(uppath),
		}
	} else if path.ends_with(".js")
		|| path.ends_with(".json")
		|| path.ends_with(".css")
		|| path.ends_with(".htm")
		|| path.ends_with(".html")
		|| path.ends_with(".wasm")
		|| path.ends_with(".js.map")
		|| path.ends_with(".ico")
		|| path.ends_with(".webp")
	{
		let mut uppath = String::from("../../../bundle");
		uppath.push_str(&path);
		let data = tokio::fs::read(&uppath).await.unwrap_or(Vec::new());
		let cache =
			if path.starts_with("/hash/") { CacheControl::Immutable } else { CacheControl::NoCache };
		let mtime = if matches!(cache, CacheControl::Immutable) {
			None
		} else {
			tokio::fs::metadata(&uppath).await.ok().and_then(|md| md.modified().ok())
		};
		PlainResponse {
			cache,
			kind: if path.ends_with(".js") {
				ContentType::ApplicationJavascript
			} else if path.ends_with(".json") {
				ContentType::ApplicationJson
			} else if path.ends_with(".css") {
				ContentType::TextCss
			} else if path.ends_with(".htm") || path.ends_with(".html") {
				ContentType::TextHtml
			} else if path.ends_with(".wasm") {
				ContentType::ApplicationWasm
			} else if path.ends_with(".ico") {
				ContentType::ImageIcon
			} else if path.ends_with(".ico") {
				ContentType::ImageWebp
			} else {
				ContentType::ApplicationOctetStream
			},
			content: data,
			mtime,
			file: if matches!(cache, CacheControl::Immutable) { None } else { Some(uppath) },
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
				.header(header::LOCATION, newpath)
				.body(Bytes::new());
		}
	} else if path.starts_with("/collection/") {
		let name = &path["/collection/".len()..];
		let alt = uri.query().unwrap_or("");
		if let Ok(client) = pgpool.get().await {
			if let Some(user) = users.write().await.load(&*client, name).await {
				let user = user.lock().await;
				let Some(userdata) = user.data.get(alt) else {
					return response::Builder::new().status(404).body(Bytes::new());
				};
				let pool = &userdata.pool;
				let bound = &userdata.accountbound;
				let mut cards: BTreeMap<i16, [u16; 8]> = BTreeMap::new();
				for i in 0..2 {
					let (cards0, counts) = if i == 0 { (0, pool) } else { (4, bound) };
					for (&code, &count) in counts.0.iter() {
						let row =
							cards.entry(card::AsUpped(card::AsShiny(code, false), false)).or_default();
						row[cards0 | if card::Shiny(code) { 2 } else { 0 } | card::Upped(code) as usize] =
							count;
					}
				}
				let mut userdata = String::new();
				for (&code, row) in cards.iter() {
					if let Some(card) = card::OpenSet.try_get(code as i16) {
						write!(
							userdata,
							"{},{},{},{},{},{},{},{},{},{},{},{},{}\n",
							code,
							card.name,
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
							card.kind as i32
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
			let mut codes = [0i16; 84];
			for i in 0..12 {
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
											&& (card.flag & etg::game::Flag::pillar) == 0
											&& !codes[i * 7..ij].iter().any(|&code| code == card.code)
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
				deck.extend(&encode_code(code));
			}
			deck.extend(&b"01"[..]);
			deck.extend(&encode_code(rng.gen_range(9010..9022)));
			PlainResponse {
				cache: CacheControl::NoCache,
				kind: ContentType::ImageSvgXml,
				content: Vec::<u8>::from(svg::deck(unsafe { std::str::from_utf8_unchecked(&deck) })),
				mtime: None,
				file: None,
			}
		} else {
			return response::Builder::new().status(400).body(Bytes::new());
		}
	} else if path == "/speed" {
		use rand::RngCore;
		return response::Builder::new()
			.status(302)
			.header(header::LOCATION, format!("/speed/{}", rand::thread_rng().next_u32()))
			.body(Bytes::new());
	} else {
		return response::Builder::new().status(404).body(Bytes::new());
	};
	compress_and_cache(cache, accept, path.to_string(), res).await.response()
}

pub async fn handle_get(
	uri: &http::Uri,
	ims: Option<HttpDate>,
	accept: Option<AcceptEncoding>,
	pgpool: &PgPool,
	users: &AsyncUsers,
	cache: &AsyncCache,
) -> Response<Full<Bytes>> {
	let (head, body) = handle_get_core(uri, ims, accept, pgpool, users, cache).await.unwrap().into_parts();
	Response::from_parts(head, Full::<Bytes>::from(body))
}

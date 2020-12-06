use std::time::SystemTime;
use time::PrimitiveDateTime;

#[derive(Clone, Copy)]
pub struct HttpDate(PrimitiveDateTime);

impl std::str::FromStr for HttpDate {
	type Err = time::ParseError;

	fn from_str(s: &str) -> Result<HttpDate, Self::Err> {
		PrimitiveDateTime::parse(s, "%a, %d %b %Y %T GMT")
			.or_else(|_| PrimitiveDateTime::parse(s, "%A, %d-%b-%y %T GMT"))
			.or_else(|_| PrimitiveDateTime::parse(s, "%c"))
			.map(HttpDate)
	}
}

impl From<HttpDate> for SystemTime {
	fn from(http: HttpDate) -> SystemTime {
		SystemTime::from(http.0)
	}
}

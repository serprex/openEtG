pub fn parse_digit32(byte: u8) -> i16 {
	match byte {
		b'0'..=b'9' => (byte - b'0') as i16,
		b'a'..=b'v' => (byte - b'a') as i16 + 10,
		_ => 32,
	}
}

#[inline(always)]
pub fn decode_code(code: &[u8]) -> i16 {
	parse_digit32(code[0]) * 1024 + parse_digit32(code[1]) * 32 + parse_digit32(code[2])
}

#[inline(always)]
pub fn decode_count(code: &[u8]) -> u16 {
	(parse_digit32(code[0]) * 32 + parse_digit32(code[1])) as u16
}

pub fn digit32(n: i16) -> u8 {
	let n32 = n as u8 % 32;
	(if n32 < 10 { b'0' } else { b'a' - 10 }) + n32
}

pub fn encode_code(code: i16) -> [u8; 3] {
	[digit32(code / 1024), digit32(code / 32), digit32(code)]
}

pub fn encode_count(count: u32) -> [u8; 2] {
	if count >= 1023 {
		[b'v', b'v']
	} else {
		[digit32((count / 32) as i16), digit32(count as i16)]
	}
}

pub fn iterraw<'a>(deck: &'a [u8]) -> impl Iterator<Item = (i16, u16)> + 'a {
	deck.chunks_exact(5)
		.map(|chunk| (decode_code(&chunk[2..]), decode_count(&chunk[..2])))
}

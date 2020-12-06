pub fn parse_digit32(byte: u8) -> i32 {
	match byte {
		b'0'..=b'9' => (byte - b'0') as i32,
		b'a'..=b'v' => (byte - b'a') as i32 + 10,
		_ => 32,
	}
}

#[inline(always)]
pub fn decode_code(code: &[u8]) -> i32 {
	parse_digit32(code[0]) * 1024 + parse_digit32(code[1]) * 32 + parse_digit32(code[2])
}

#[inline(always)]
pub fn decode_count(code: &[u8]) -> u32 {
	(parse_digit32(code[0]) * 32 + parse_digit32(code[1])) as u32
}

pub fn digit32(n: i32) -> u8 {
	b"0123456789abcdefghijklmnopqrstuv"[n as usize % 32]
}

pub fn encode_code(code: i32) -> [u8; 3] {
	[digit32(code / 1024), digit32(code / 32), digit32(code)]
}

pub fn encode_count(count: u32) -> [u8; 2] {
	if count >= 1023 {
		[b'v', b'v']
	} else {
		[digit32((count / 32) as i32), digit32(count as i32)]
	}
}

pub fn iterraw<'a>(deck: &'a [u8]) -> impl Iterator<Item = (i32, u32)> + 'a {
	deck.chunks_exact(5)
		.map(|chunk| (decode_code(&chunk[2..]), decode_count(&chunk[..2])))
}

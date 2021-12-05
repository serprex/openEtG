import enums from './enum.json' assert { type: 'json' };

export function randint() {
	return (Math.random() * 0x100000000) | 0;
}
export function upto(x) {
	return (Math.random() * x) | 0;
}
export function choose(x) {
	return x[upto(x.length)];
}
export function shuffle(array) {
	let counter = array.length;
	while (counter) {
		const index = upto(counter--),
			temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}
	return array;
}
export function randomcard(Cards, upped, filter) {
	const keys = Cards.filter(upped, filter);
	return keys && choose(keys);
}
export function parseInput(data, key, value, limit) {
	const val = parseInt(value, 10);
	if (val === 0 || val > 0) data[key] = limit ? Math.min(val, limit) : val;
}
export function* chain(...args) {
	for (const arg of args) {
		yield* arg;
	}
}
export function decodeSkillName(cell) {
	const skid = cell & 0xffff,
		n = enums.Skill[skid],
		c = enums.SkillParams[skid] ?? 0;
	return c === 0
		? n
		: c === 1
		? `${n} ${cell >> 16}`
		: `${n} ${(((cell >> 16) & 0xff) << 24) >> 24} ${cell >> 24}`;
}
export function read_skill(raw) {
	const skills = new Map();
	let idx = 0;
	while (idx < raw.length) {
		const ev = enums.Event[raw[idx] & 255],
			lastidx = idx + (raw[idx] >>> 8),
			name = [];
		while (idx++ < lastidx) {
			name.push(decodeSkillName(raw[idx]));
		}
		if (name.length) skills.set(ev, name);
	}
	return skills;
}
export function read_status(raw) {
	const status = new Map();
	for (let i = 0; i < raw.length; i += 2) {
		status.set(enums.Stat[raw[i]] ?? enums.Flag[raw[i]], raw[i + 1]);
	}
	return status;
}

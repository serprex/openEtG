export function* iterSplit(src, str) {
	let i = 0;
	while (true) {
		const j = src.indexOf(str, i);
		yield src.slice(i, ~j ? j : src.length);
		if (j === -1) return;
		i = j + str.length;
	}
}
export function randint() {
	return (Math.random() * 0x100000000) | 0;
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

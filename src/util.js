export function* iterSplit(src, str) {
	let i = 0;
	while (true) {
		const j = src.indexOf(str, i);
		yield src.slice(i, ~j ? j : src.length);
		if (j == -1) return;
		i = j + str.length;
	}
}
export function place(array, item) {
	for (let i = 0; i < array.length; i++)
		if (!array[i]) return (array[i] = item);
}
export function hashString(str) {
	let hash = 5381;
	for (let i = 0; i < str.length; i++)
		hash = (hash * 33 + str.charCodeAt(i)) & 0x7fffffff;
	return hash;
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

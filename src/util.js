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

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
export function parseInput(data, key, value, limit) {
	const val = parseInt(value, 10);
	if (val === 0 || val > 0) data[key] = limit ? Math.min(val, limit) : val;
}
export function* chain(...args) {
	for (const arg of args) {
		yield* arg;
	}
}

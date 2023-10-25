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
export function* chain(...args) {
	for (const arg of args) {
		yield* arg;
	}
}

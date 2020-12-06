export const rng = Math.random;

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

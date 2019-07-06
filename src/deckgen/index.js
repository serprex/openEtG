import duo from './duo.js';
import bow from './bow.js';

export default function deckgen(uprate, markpower, maxRarity) {
	const r = Math.random() * 13,
		f = r < 12 ? duo : bow;
	return f(uprate, markpower, maxRarity);
}

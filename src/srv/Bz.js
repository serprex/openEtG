import db from './db.js';
let Bz = null;

export function load() {
	return new Promise((resolve, reject) => {
		if (Bz) return resolve(Bz);
		db.get('Bazaar', (err, bzjson) =>
			resolve((Bz = bzjson ? JSON.parse(bzjson) : {})),
		);
	});
}

export function store() {
	if (Bz) db.set('Bazaar', JSON.stringify(Bz));
}

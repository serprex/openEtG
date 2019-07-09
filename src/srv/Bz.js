import db from './db.js';
let Bz = null;

export async function load() {
	if (Bz) return Bz;
	const bzjson = await db.get('Bazaar');
	return (Bz = bzjson ? JSON.parse(bzjson) : {});
}

export function store() {
	if (Bz) db.set('Bazaar', JSON.stringify(Bz));
}

import db from './db.js';
let Bz = null,
	Bzp = null;

async function _load() {
	const bzjson = await db.get('Bazaar');
	return (Bz = bzjson ? JSON.parse(bzjson) : {});
}
export async function load() {
	if (Bz) return Bz;
	if (Bzp) return Bzp;
	return _load();
}

export function store() {
	if (Bz) db.set('Bazaar', JSON.stringify(Bz));
}

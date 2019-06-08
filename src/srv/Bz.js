const db = require('./db');
let Bz = null;

exports.load = function() {
	return new Promise((resolve, reject) => {
		if (Bz) return resolve(Bz);
		db.get('Bazaar', (err, bzjson) =>
			resolve((Bz = bzjson ? JSON.parse(bzjson) : {})),
		);
	});
};

exports.store = function() {
	if (Bz) db.set('Bazaar', JSON.stringify(Bz));
};

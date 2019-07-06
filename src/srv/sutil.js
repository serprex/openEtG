import crypto from 'crypto';

export function mkTask(cb) {
	const params = {};
	let cbCount = 1;
	function cbCheck() {
		if (!--cbCount) cb(params);
	}
	return param => {
		if (param === undefined) {
			cbCheck();
		} else {
			cbCount++;
			return (err, res) => {
				params[param] = res;
				if (err) {
					if (!params.err) params.err = {};
					params.err[param] = err;
				}
				cbCheck();
			};
		}
	};
}
export function initsalt(user) {
	if (!user.salt) {
		user.salt = crypto.pseudoRandomBytes(15).toString('base64');
		user.iter = 99999;
		user.algo = 'SHA512';
	}
}
export function getDay() {
	return Math.floor(Date.now() / 86400000);
}
export function parseJSON(x) {
	try {
		return JSON.parse(x);
	} catch (e) {
		return null;
	}
}

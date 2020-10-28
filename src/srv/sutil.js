import crypto from 'crypto';

const hash_iter = 99999,
	hash_algo = 'SHA512';

export function initsalt(user) {
	if (!user.salt) {
		user.salt = crypto.pseudoRandomBytes(15).toString('base64');
		user.iter = hash_iter;
		user.algo = hash_algo;
	}
}

export function needsRehash(user) {
	return user.iter < hash_iter || user.algo !== hash_algo;
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

export function sockEmit(socket, event, data) {
	if (socket.readyState === 1) {
		if (!data) data = {};
		data.x = event;
		socket.send(JSON.stringify(data));
	}
}

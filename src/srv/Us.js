import db from './db.js';

const usergc = new Set();
const userps = new Map();
export const users = new Map();
export const socks = new Map();
export async function storeUsers() {
	const margs = [];
	for (const [u, user] of users) {
		if (user.pool || user.accountbound) {
			margs.push(u, JSON.stringify(user));
		}
	}
	if (margs.length > 0) return db.hmset('Users', margs);
}
const usergcloop = setInterval(() => {
	storeUsers().then(() => {
		// Clear inactive users
		for (const u of users.keys()) {
			if (usergc.delete(u)) {
				users.delete(u);
			} else {
				usergc.add(u);
			}
		}
	});
}, 300000);
export function stop() {
	clearInterval(usergcloop);
	storeUsers()
		.then(() => db.quit())
		.catch(e => console.error(e.message));
}
async function _load(name) {
	const userstr = await db.hget('Users', name);
	userps.delete(name);
	if (userstr) {
		const user = JSON.parse(userstr);
		users.set(name, user);
		if (!user.streak) user.streak = [];
		return user;
	} else {
		throw new Error('User not found');
	}
}
export async function load(name) {
	const userck = users.get(name);
	if (userck) {
		usergc.delete(name);
		return userck;
	} else {
		const userpck = userps.get(name);
		if (userpck) return userpck;
		const p = _load(name);
		userps.set(name, p);
		return p;
	}
}

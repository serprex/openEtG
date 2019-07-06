import db from './db.js';

const usergc = new Set();
export const users = new Map();
export const socks = new Map();
export function storeUsers() {
	const margs = ['Users'];
	for (const [u, user] of users) {
		if (user.pool || user.accountbound) {
			margs.push(u, JSON.stringify(user));
		}
	}
	if (margs.length > 1) db.send_command('hmset', margs);
}
const usergcloop = setInterval(() => {
	storeUsers();
	// Clear inactive users
	for (const u of users.keys()) {
		if (usergc.delete(u)) {
			users.delete(u);
		} else {
			usergc.add(u);
		}
	}
}, 300000);
export function stop() {
	clearInterval(usergcloop);
	storeUsers();
	db.quit();
}
export function load(name) {
	return new Promise((resolve, reject) => {
		const userck = users.get(name);
		if (userck) {
			usergc.delete(name);
			resolve(userck);
		} else {
			db.hget('Users', name, (err, userstr) => {
				if (userstr) {
					const user = JSON.parse(userstr);
					users.set(name, user);
					if (!user.streak) user.streak = [];
					resolve(user);
				} else {
					reject(err);
				}
			});
		}
	});
}

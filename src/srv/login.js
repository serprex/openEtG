import crypto from 'crypto';
import util from 'util';
import * as sutil from './sutil.js';
import * as pg from './pg.js';
import * as Us from './Us.js';
import * as etg from '../etg.js';
import aiDecks from '../Decks.json';
import * as etgutil from '../etgutil.js';
import RngMock from '../RngMock.js';
import * as userutil from '../userutil.js';
const pbkdf2 = util.promisify(crypto.pbkdf2);

export default function login(sockEmit) {
	async function loginRespond(socket, user, pass, authkey) {
		sutil.initsalt(user);
		let key;
		if (authkey) {
			key = authkey;
		} else if (pass) {
			try {
				key = (
					await pbkdf2(pass, user.salt, user.iter, 64, user.algo || 'SHA1')
				).toString('base64');
			} catch (err) {
				sockEmit(socket, 'login', { err: err.message });
				return;
			}
		} else {
			key = '';
		}
		if (user.auth !== key) {
			if (user.auth) {
				sockEmit(socket, 'login', { err: 'Incorrect password' });
				return;
			} else {
				user.auth = key;
			}
		} else if (!authkey && sutil.needsRehash(user)) {
			user.auth = user.salt = '';
			return loginRespond(socket, user, pass);
		}
		if (socket.readyState === 1) {
			const day = sutil.getDay();
			if (user.oracle < day) {
				if (user.ostreakday !== day - 1) {
					user.ostreak = 0;
				}
				user.ostreakday = 0;
				user.ostreakday2 = day;
				user.oracle = day;
				const ocardnymph = Math.random() < 0.03;
				const card = RngMock.randomcard(
					false,
					x => !x.getStatus('pillar') && (x.rarity !== 5) ^ ocardnymph,
				);
				const ccode = etgutil.asShiny(card.code, card.rarity === 5);
				if (card.rarity > 1) {
					user.accountbound = etgutil.addcard(user.accountbound, ccode);
				} else {
					user.pool = etgutil.addcard(user.pool, ccode);
				}
				user.ocard = ccode;
				user.daily = 0;
				user.dailymage = Math.floor(Math.random() * aiDecks.mage.length);
				user.dailydg = Math.floor(Math.random() * aiDecks.demigod.length);
			}
			Us.socks.set(user.name, socket);
			socket.send(
				JSON.stringify({
					...user,
					x: 'login',
					salt: undefined,
					iter: undefined,
					algo: undefined,
				}),
			);
			if (!user.daily) user.daily = 128;
			const update = await pg.pool.query({
				text: `update users set wealth = $2, auth = $3, salt = $4, iter = $5, algo = $6 where name = $1`,
				values: [
					user.name,
					user.gold + Math.round(userutil.calcWealth(user.pool)),
					user.auth,
					user.salt,
					user.iter,
					user.algo,
				],
			});
			if (update.rowCount === 0) {
				const new_user = await pg.pool.query({
					text: `insert into users (name, auth, salt, iter, algo, wealth) values ($1, $2, $3, $4, $5, 0) returning id`,
					values: [user.name, user.auth, user.salt, user.iter, user.algo],
				});
				await pg.pool.query({
					text: `insert into user_data (user_id, type_id, name, data) values ($1, 1, 'Main', $2)`,
					values: [
						new_user.rows[0].id,
						JSON.stringify({
							...user,
							auth: undefined,
							salt: undefined,
							iter: undefined,
							algo: undefined,
						}),
					],
				});
			}
		}
	}
	async function loginAuth(data) {
		const name = (data.u ?? '').trim();
		if (!name.length) {
			sockEmit(this, 'login', { err: 'No name' });
			return;
		} else {
			const auth = await pg.pool.query({
				text: 'select id, auth, salt, iter, algo from users where name = $1',
				values: [data.u],
			});
			let user;
			try {
				user = await Us.load(name);
			} catch {
				user = { name, gold: 0 };
				Us.users.set(name, user);
			}
			return loginRespond(this, user, data.p, data.a);
		}
	}
	return loginAuth;
}

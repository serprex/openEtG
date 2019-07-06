import crypto from 'crypto';
import * as sutil from './sutil.js';
import db from './db.js';
import * as Us from './Us.js';
import * as etg from '../etg.js';
import aiDecks from '../Decks.json';
import * as etgutil from '../etgutil.js';
import RngMock from '../RngMock.js';
import * as userutil from '../userutil.js';

export default function login(sockEmit) {
	function loginRespond(socket, user, pass, authkey) {
		function postHash(err, key) {
			if (err) {
				sockEmit(socket, 'login', { err: err.message });
				return;
			}
			key = key.toString('base64');
			if (user.auth != key) {
				if (user.auth) {
					sockEmit(socket, 'login', { err: 'Incorrect password' });
					return;
				} else {
					user.auth = key;
				}
			} else if (!authkey && !user.algo) {
				user.auth = user.salt = '';
				return loginRespond(socket, user, pass);
			}
			if (socket.readyState == 1) {
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
						x => x.type != etg.Pillar && (x.rarity != 5) ^ ocardnymph,
					);
					const ccode = etgutil.asShiny(card.code, card.rarity == 5);
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
				db.zadd(
					'wealth',
					user.gold + userutil.calcWealth(user.pool),
					user.name,
				);
			}
		}
		sutil.initsalt(user);
		if (authkey) {
			postHash(null, authkey);
		} else if (pass) {
			crypto.pbkdf2(
				pass,
				user.salt,
				user.iter,
				64,
				user.algo || 'SHA1',
				postHash,
			);
		} else postHash(null, '');
	}
	function loginAuth(data) {
		const name = (data.u || '').trim();
		if (!name.length) {
			sockEmit(this, 'login', { err: 'No name' });
			return;
		} else {
			Us.load(name)
				.then(user => loginRespond(this, user, data.p, data.a))
				.catch(() => {
					const user = { name, gold: 0 };
					Us.users.set(name, user);
					return loginRespond(this, user, data.p, data.a);
				});
		}
	}
	return loginAuth;
}

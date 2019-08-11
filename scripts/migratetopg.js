import * as pg from '../src/srv/pg.js';
import db from '../src/srv/db.js';

pg.trx(async sql => {
	console.log('Users, UserData, Arena');
	const userNameToId = new Map(),
		userNameToWealth = new Map(),
		userNameToA1Score = new Map(),
		userNameToA2Score = new Map(),
		[users, a1score, a2score, wealth] = await Promise.all([
			db.hgetall('Users'),
			db.zrange('arena', 0, -1, 'withscores'),
			db.zrange('arena1', 0, -1, 'withscores'),
			db.zrange('wealth', 0, -1, 'withscores'),
		]);
	for (let i = 0; i < wealth.length; i += 2) {
		userNameToWealth.set(wealth[i], wealth[i + 1] | 0);
	}
	for (let i = 0; i < a1score.length; i += 2) {
		userNameToA1Score.set(a1score[i], a1score[i + 1] | 0);
	}
	for (let i = 0; i < a2score.length; i += 2) {
		userNameToA2Score.set(a2score[i], a2score[i + 1] | 0);
	}
	for (const user in users) {
		const datastr = users[user],
			data = JSON.parse(datastr);
		const result = await sql.query({
			text: `insert into users (name, auth, salt, iter, algo, wealth) values ($1, $2, $3, $4, $5, $6) returning id`,
			values: [
				user,
				data.auth ?? '',
				data.salt ?? '',
				data.iter ?? 0,
				data.algo ?? 'SHA1',
				userNameToWealth.get(user) | 0,
			],
		});
		delete data.auth;
		delete data.salt;
		delete data.iter;
		delete data.algo;
		const userId = result.rows[0].id;
		userNameToId.set(user, userId);

		await sql.query({
			text: `insert into user_data (user_id, type_id, name, data) values ($1, 1, 'Main', $2)`,
			values: [userId, data],
		});
		const arenas = await Promise.all([
			db.hgetall(`A:${user}`),
			db.hgetall(`B:${user}`),
		]);
		let aid = 1;
		for (const a of arenas) {
			const score = (aid === 1 ? userNameToA1Score : userNameToA2Score).get(
				user,
			);
			if (a.day && score !== undefined) {
				await sql.query({
					text: `insert into arena (user_id, arena_id, code, deck, day, draw, hp, mark, won, loss, score) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
					values: [
						userId,
						aid,
						a.card,
						a.deck,
						a.day,
						a.draw,
						a.hp,
						a.mark,
						a.win,
						a.loss,
						score,
					],
				});
			}
			aid++;
		}
	}

	console.log('UserRole');
	const urs = [];
	const [mods, csmiths] = await Promise.all([
		db.smembers('Mods'),
		db.smembers('Codesmiths'),
	]);
	for (let i = 0; i < mods.length; i++) {
		urs.push(`(${userNameToId.get(mods[i])},2)`);
	}
	for (let i = 0; i < csmiths.length; i++) {
		urs.push(`(${userNameToId.get(csmiths[i])},1)`);
	}
	if (urs.length) {
		await sql.query(`insert into user_role values ${urs.join()}`);
	}

	console.log('Motd');
	const ms = await db.zrange('Motd', 0, -1, 'withscores'),
		msv = [];
	for (let i = 0; i < ms.length; i += 2) {
		[ms[i], ms[i + 1]] = [ms[i + 1], ms[i]];
		msv.push(`($${msv.length * 2 + 1},$${msv.length * 2 + 2})`);
	}
	if (msv.length) {
		await sql.query({
			text: `insert into motd values ${msv.join()} on conflict do nothing`,
			values: ms,
		});
	}

	console.log('Bazaar');
	const bzstr = await db.get('Bazaar');
	if (bzstr) {
		const bz = JSON.parse(bzstr);
		for (const code in bz) {
			for (const bid of bz[code]) {
				if (userNameToId.has(bid.u)) {
					await sql.query({
						text: `insert into bazaar (user_id, code, q, p) values ($1, $2, $3, $4)`,
						values: [userNameToId.get(bid.u), code, bid.q, bid.p],
					});
				}
			}
		}
	}

	console.log('CodeHash');
	const ch = await db.hgetall('CodeHash');
	for (const code in ch) {
		await sql.query({
			text: `insert into codes values ($1, $2)`,
			values: [code, ch[code]],
		});
	}

	console.log('kongapi, GuestsBanned');
	const [kongapi, GuestsBanned] = await db.mget('kongapi', 'GuestsBanned');
	if (kongapi) {
		await sql.query({
			text: `insert into strings (key, val) values ('kongapi', $1)`,
			values: [kongapi],
		});
	}
	if (GuestsBanned) {
		await sql.query({
			text: `insert into strings (key, val) values ('GuestsBanned', $2)`,
			values: [GuestsBanned],
		});
	}
})
	.catch(e => console.log(e))
	.finally(() => {
		pg.pool.end();
		db.disconnect();
	});

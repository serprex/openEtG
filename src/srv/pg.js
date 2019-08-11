import config from '../../config.json';
import pg from 'pg';

export const pool = new pg.Pool(config.pg);
export async function trx(f) {
	const client = await pool.connect();
	await client.query('begin');
	try {
		const res = await f(client);
		await client.query('commit');
		return res;
	} catch (err) {
		await client.query('rollback');
		throw err;
	} finally {
		client.release();
	}
}

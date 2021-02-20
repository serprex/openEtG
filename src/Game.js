import * as etg from './etg.js';
import * as etgutil from './etgutil.js';
import OriginalCards from './vanilla/Cards.js';
import OpenCards from './Cards.js';
import Player from './Player.js';
import Thing from './Thing.js';
import enums from './enum.json';
const etgwasm = import('./rs/pkg/etg_bg.wasm').then(() =>
	import('./rs/pkg/etg.js'),
);

export default async function CreateGame(data) {
	return new Game(data, await etgwasm);
}
export class Game {
	constructor(data, Wasm) {
		this.wasm = Wasm;
		this.data = data;
		this.game = new Wasm.Game(
			data.seed,
			Wasm.CardSet[data.set] ?? Wasm.CardSet.Open,
		);
		this.cache = new Map([[this.id, this]]);
		this.replay = [];
		const players = [];
		const playersByIdx = new Map();
		for (let i = 0; i < data.players.length; i++) {
			const id = this.game.new_player(),
				pdata = data.players[i];
			players.push(id);
			playersByIdx.set(pdata.idx, id);
			this.cache.set(id, new Player(this, id));
		}
		for (let i = 0; i < players.length; i++) {
			const pdata = data.players[i];
			this.game.set_leader(
				players[i],
				playersByIdx.get(pdata.leader ?? pdata.idx),
			);
		}
		for (let i = 0; i < players.length; i++) {
			let dp = data.players[i],
				mark = 0;
			const deck = [];
			for (const code of etgutil.iterdeck(dp.deck)) {
				let idx;
				if (this.Cards.Codes[code]) {
					deck.push(code);
				} else if (~(idx = etgutil.fromTrueMark(code))) {
					mark = idx;
				}
			}
			this.game.init_player(
				players[i],
				dp.hp ?? 100,
				dp.maxhp ?? dp.hp ?? 100,
				mark,
				dp.drawpower ?? 1,
				dp.deckpower ?? (dp.drawpower > 1 ? 2 : 1),
				dp.markpower ?? 1,
				deck,
			);
		}
	}

	get phase() {
		return this.game.phase;
	}

	get players() {
		return this.game.get_players();
	}

	get Cards() {
		return this.data?.set === 'Original' ? OriginalCards : OpenCards;
	}

	hash() {
		return this.game.hash();
	}

	clone() {
		const obj = Object.create(Game.prototype);
		obj.wasm = this.wasm;
		obj.data = this.data;
		obj.game = this.game.clonegame();
		obj.cache = new Map([[this.id, obj]]);
		obj.replay = this.replay.slice();
		for (const id of this.players) {
			obj.cache.set(id, new Player(obj, id));
		}
		return obj;
	}
	byId(id) {
		if (!id) return null;
		let inst = this.cache.get(id);
		if (!inst) {
			inst = new Thing(this, id);
			this.cache.set(id, inst);
		}
		return inst;
	}
	byUser(name) {
		const pldata = this.data.players;
		for (let i = 0; i < pldata.length; i++) {
			if (pldata[i].user === name) {
				return this.byId(this.players[i]);
			}
		}
		return null;
	}
	playerDataByIdx(idx) {
		const pldata = this.data.players;
		for (let i = 0; i < pldata.length; i++) {
			if (pldata[i].idx === idx) {
				return pldata;
			}
		}
		return null;
	}
	get(id, key) {
		return this.game.get_stat(id, enums.StatId[key] ?? enums.FlagId[key]);
	}
	get_owner(id) {
		return this.game.get_owner(id);
	}
	get_kind(id) {
		return this.game.get_kind(id);
	}
	getIndex(id) {
		return this.game.getIndex(id);
	}
	full_hand(id) {
		return this.game.full_hand(id);
	}
	empty_hand(id) {
		return this.game.empty_hand(id);
	}
	has_id(id) {
		return this.game.has_id(id | 0);
	}
	get_creatures(id) {
		return this.game.get_creatures(id);
	}
	get_permanents(id) {
		return this.game.get_permanents(id);
	}
	get_hand(id) {
		return this.game.get_hand(id);
	}
	get_quanta(id) {
		return new Uint8Array([0, ...this.game.get_quanta(id)]);
	}
	get_foe(id) {
		return this.game.get_foe(id);
	}
	is_flooding(id) {
		return this.game.is_flooding(id);
	}
	aiSearch() {
		const cmd = this.game.aisearch();
		return {
			x: ['end', 'cast', 'accept', 'mulligan', 'foe', 'resign'][cmd.x],
			c: cmd.c,
			t: cmd.t,
		};
	}
	countPlies() {
		if (!this.replay) return -1;
		let plies = 0;
		for (const { x } of this.replay) {
			if (x === 'end') plies++;
		}
		return plies;
	}
	next(cmd, fx = true) {
		if (this.replay) this.replay.push(cmd);
		return this.game.next(
			this.wasm.GameMoveType[cmd.x],
			cmd.c | 0,
			cmd.t | 0,
			fx,
		);
	}
	withMoves(moves) {
		const newgame = new Game(this.data, this.wasm);
		for (const move of moves) {
			newgame.next(move, false);
		}
		return newgame;
	}
	expectedDamage(samples) {
		return this.game.expected_damage(samples);
	}
	requiresTarget(c) {
		return this.game.requires_target(c);
	}
	canTarget(c, t) {
		return this.game.can_target(c, t);
	}
}

function defineProp(key) {
	Object.defineProperty(Game.prototype, key, {
		get() {
			return this.game[key];
		},
	});
}
defineProp('turn');
defineProp('winner');
defineProp('time');
defineProp('duration');

Game.prototype.id = 0;

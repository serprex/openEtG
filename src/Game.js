import * as etg from './etg.js';
import * as etgutil from './etgutil.js';
import OriginalCards from './vanilla/Cards.js';
import OpenCards from './Cards.js';
import Thing from './Thing.js';
import enums from './enum.json' assert { type: 'json' };
import { randint } from './util.js';
import * as wasm from './rs/pkg/etg.js';

export default class Game {
	constructor(data) {
		this.data = data;
		this.game = new wasm.Game(
			data.seed,
			wasm.CardSet[data.set] ?? wasm.CardSet.Open,
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
		}
		for (let i = 0; i < players.length; i++) {
			const pdata = data.players[i];
			this.game.set_leader(
				players[i],
				playersByIdx.get(pdata.leader ?? pdata.idx),
			);
		}
		for (let i = 0; i < players.length; i++) {
			let mark = 0;
			const dp = data.players[i],
				deck = [];
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
		obj.data = this.data;
		obj.game = this.game.clonegame();
		obj.cache = new Map([[this.id, obj]]);
		obj.replay = this.replay.slice();
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
	get_quanta(id, ele) {
		return this.game.get_quanta(id, ele);
	}
	get_foe(id) {
		return this.game.get_foe(id);
	}
	aiSearch() {
		const cmd = this.game.aisearch();
		return {
			x: wasm.GameMoveType[cmd.x],
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
		return this.game.next(wasm.GameMoveType[cmd.x], cmd.c | 0, cmd.t | 0, fx);
	}
	withMoves(moves) {
		const newgame = new Game(this.data);
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
	replayJson() {
		return (
			this.replay &&
			JSON.stringify({
				date: this.time,
				seed: this.data.seed,
				set: this.data.set,
				players: this.data.players,
				moves: this.replay,
			})
		);
	}
}

function defineProp(key) {
	Object.defineProperty(Game.prototype, key, {
		get() {
			return this.game[key];
		},
	});
}
defineProp('phase');
defineProp('turn');
defineProp('winner');
defineProp('time');
defineProp('duration');

Game.prototype.id = 0;

import { iterdeck, fromTrueMark } from './etgutil.js';
import OriginalCards from './vanilla/Cards.js';
import OpenCards from './Cards.js';
import enums from './enum.json' assert { type: 'json' };
import * as wasm from './rs/pkg/etg.js';

const GameMoveType = ['end', 'cast', 'accept', 'mulligan', 'foe', 'resign'];

export default class Game {
	constructor(data) {
		this.game = new wasm.Game(
			data.seed,
			wasm.CardSet[data.set] ?? wasm.CardSet.Open,
			data.players.length,
		);
		this.data = data;
		this.replay = [];
		this.start = performance.now() | 0;
		this.duration = 0;
		const playersByIdx = new Map();
		for (let i = 0; i < data.players.length; i++) {
			playersByIdx.set(data.players[i].idx, i + 1);
		}
		for (let i = 0; i < data.players.length; i++) {
			const pdata = data.players[i];
			this.set_leader(i + 1, playersByIdx.get(pdata.leader ?? pdata.idx));
		}
		for (let i = 0; i < data.players.length; i++) {
			let mark = 0;
			const dp = data.players[i],
				deck = [];
			for (const code of iterdeck(dp.deck)) {
				let idx;
				if (this.Cards.Codes[code]) {
					deck.push(code);
				} else if (~(idx = fromTrueMark(code))) {
					mark = idx;
				}
			}
			this.init_player(
				i + 1,
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

	get Cards() {
		return this.data?.set === 'Original' ? OriginalCards : OpenCards;
	}

	getCard(id) {
		return this.Cards.Codes[this.get(id, 'card')];
	}

	clone() {
		const obj = Object.create(Game.prototype);
		obj.game = this.clonegame();
		obj.data = this.data;
		obj.replay = null;
		obj.start = this.start;
		obj.duration = this.duration;
		return obj;
	}

	userId(name) {
		const pldata = this.data.players;
		for (let i = 0; i < pldata.length; i++) {
			if (pldata[i].user === name) {
				return i + 1;
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
		return this.get_stat(id, enums.StatId[key] ?? enums.FlagId[key]);
	}
	aiSearch() {
		const cmd = this.aisearch();
		return {
			x: GameMoveType[cmd[0]],
			c: cmd[1],
			t: cmd[2],
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
	nextClone(cmd, fx = true) {
		const game = this.clone();
		if (this.replay) game.replay = [...this.replay, cmd];
		return [game, game.nextCmd(cmd, fx)];
	}
	nextCmd(cmd, fx = true) {
		const res = this.next(
			GameMoveType.indexOf(cmd.x),
			cmd.c | 0,
			cmd.t | 0,
			fx,
		);
		if (this.duration === 0 && this.winner !== 0)
			this.duration = (performance.now() | 0) - this.start;
		return res;
	}
	withMoves(moves) {
		const newgame = new Game(this.data);
		for (const move of moves) {
			newgame.next(move, false);
		}
		return newgame;
	}
	replayJson() {
		return (
			this.replay &&
			JSON.stringify({
				date: Date.now(),
				seed: this.data.seed,
				set: this.data.set,
				players: this.data.players,
				moves: this.replay,
			})
		);
	}
	tgtToPos(id, p1id) {
		const pos = this.tgt_to_pos(id, p1id);
		return pos === 0 ? null : { x: pos & 4095, y: pos >> 12 };
	}
}

for (const k of Object.getOwnPropertyNames(wasm.Game.prototype)) {
	const descriptor = Object.getOwnPropertyDescriptor(wasm.Game.prototype, k);
	if (typeof descriptor.value === 'function' && k !== 'constructor') {
		Game.prototype[k] = function (...args) {
			return this.game[k](...args);
		};
	} else if (descriptor.get) {
		Object.defineProperty(Game.prototype, k, {
			get() {
				return this.game[k];
			},
		});
	}
}

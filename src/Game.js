import * as etg from './etg.js';
import * as etgutil from './etgutil.js';
import OriginalCards from './vanilla/Cards.js';
import OpenCards from './Cards.js';
import enums from './enum.json' assert { type: 'json' };
import { randint, decodeSkillName, read_skill, read_status } from './util.js';
import * as wasm from './rs/pkg/etg.js';

const infoskipkeys = new Set(['casts', 'gpull', 'hp', 'maxhp']);

export default class Game {
	constructor(data) {
		this.game = new wasm.Game(
			data.seed,
			wasm.CardSet[data.set] ?? wasm.CardSet.Open,
		);
		this.data = data;
		this.replay = [];
		const players = [];
		const playersByIdx = new Map();
		for (let i = 0; i < data.players.length; i++) {
			const id = this.new_player(),
				pdata = data.players[i];
			players.push(id);
			playersByIdx.set(pdata.idx, id);
		}
		for (let i = 0; i < players.length; i++) {
			const pdata = data.players[i];
			this.set_leader(players[i], playersByIdx.get(pdata.leader ?? pdata.idx));
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
			this.init_player(
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
		obj.replay = this.replay.slice();
		return obj;
	}

	userId(name) {
		const pldata = this.data.players;
		for (let i = 0; i < pldata.length; i++) {
			if (pldata[i].user === name) {
				return this.player_idx(i);
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
	nextCmd(cmd, fx = true) {
		if (this.replay) this.replay.push(cmd);
		return this.next(wasm.GameMoveType[cmd.x], cmd.c | 0, cmd.t | 0, fx);
	}
	withMoves(moves) {
		const newgame = new Game(this.data);
		for (const move of moves) {
			newgame.next(move, false);
		}
		return newgame;
	}
	expectedDamage(samples) {
		return this.expected_damage(samples);
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
	statusesOf(id) {
		return read_status(this.get_stats(id));
	}
	skillsOf(id) {
		return read_skill(this.get_skills(id));
	}
	getSkill(id, k) {
		const name = Array.from(
			this.get_one_skill(id, enums.EventId[k]),
			decodeSkillName,
		);
		if (name.length) return name;
	}
	info(id) {
		if (this.get_kind(id) == wasm.Kind.Player) {
			const info = [
				`${this.get(id, 'hp')}/${this.get(id, 'maxhp')} ${this.deck_length(
					id,
				)}cards`,
			];
			for (const [k, v] of this.statusesOf(id)) {
				if (v && !infoskipkeys.has(k)) info.push(v === true ? k : v + k);
			}
			info.push(this.get_drawpower(id) + 'drawpower');
			if (this.get(id, 'casts') === 0) info.push('silenced');
			if (this.get(id, 'gpull')) info.push('gpull');
			return info.join('\n');
		} else {
			return wasm.thingText(this.game, id);
		}
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

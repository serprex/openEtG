import Thing from './Thing.js';

function plinfocore(info, key, val) {
	if (val === true) info.push(key);
	else if (val) info.push(val + key);
}
const infoskipkeys = new Set(['casts', 'gpull', 'hp', 'maxhp']);

export default class Player extends Thing {
	constructor(game, id) {
		super(game, id);
	}
	toString() {
		return this.data.name ?? 'p' + this.id;
	}
	get ownerId() {
		return this.id;
	}
	get owner() {
		return this;
	}
	get foeId() {
		return this.game.get_foe(this.id);
	}
	get foe() {
		return this.game.byId(this.foeId);
	}
	get leader() {
		return this.game.game.get_leader(this.id);
	}
	get weaponId() {
		return this.game.game.get_weapon(this.id);
	}
	get shieldId() {
		return this.game.game.get_shield(this.id);
	}
	get weapon() {
		return this.game.byId(this.game.game.get_weapon(this.id));
	}
	get shield() {
		return this.game.byId(this.game.game.get_shield(this.id));
	}
	get creatureIds() {
		return this.game.get_creatures(this.id);
	}
	get permanentIds() {
		return this.game.get_permanents(this.id);
	}
	get handIds() {
		return this.game.get_hand(this.id);
	}
	get deck_length() {
		return this.game.game.deck_length(this.id);
	}
	get data() {
		return this.game.data.players[this.getIndex()];
	}
	get quanta() {
		return this.game.get_quanta(this.id);
	}
	get mark() {
		return this.game.game.get_mark(this.id);
	}
	get drawpower() {
		return this.game.game.get_drawpower(this.id);
	}
	get deckpower() {
		return this.game.game.get_deckpower(this.id);
	}
	get markpower() {
		return this.game.game.get_markpower(this.id);
	}
	isCloaked() {
		return this.game.game.is_cloaked(this.id);
	}
	canspend(qtype, x) {
		return this.game.game.canspend(qtype, x);
	}
	countcreatures() {
		return this.game.game.count_creatures(this.id);
	}
	countpermanents() {
		return this.game.game.count_permanents(this.id);
	}
	info() {
		const info = [`${this.hp}/${this.maxhp} ${this.deck_length}cards`];
		for (const [k, v] of this.status) {
			if (!infoskipkeys.has(k) || !v)
				plinfocore(info, k, this.game.get(this.id, k));
		}
		info.push(this.drawpower + 'drawpower');
		if (this.casts === 0) info.push('silenced');
		if (this.gpull) info.push('gpull');
		return info.join('\n');
	}
}

for (const key of ['maxhp', 'hp', 'atk', 'gpull', 'shardgolem', 'out']) {
	Object.defineProperty(Player.prototype, key, {
		get() {
			return this.game.get(this.id, key);
		},
	});
}

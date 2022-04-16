function* iterSplit(src, str) {
	let i = 0;
	while (true) {
		const j = src.indexOf(str, i);
		yield src.slice(i, ~j ? j : src.length);
		if (j === -1) return;
		i = j + str.length;
	}
}

function readCost(coststr, defaultElement) {
	if (!coststr) return new Int8Array([0, 0]);
	if (typeof coststr === 'number')
		return new Int8Array([coststr, defaultElement]);
	const cidx = coststr.indexOf(':'),
		cost = +(~cidx ? coststr.substr(0, cidx) : coststr);
	return isNaN(cost)
		? null
		: new Int8Array([cost, ~cidx ? +coststr.substr(cidx + 1) : defaultElement]);
}

export default class Card {
	constructor(Cards, type, info) {
		this.Cards = Cards;
		this.type = type;
		this.element = info.E;
		this.name = info.Name;
		this.code = info.Code;
		this.rarity = info.R | 0;
		this.attack = info.Attack | 0;
		this.health = info.Health | 0;
		[this.cost, this.costele] = readCost(info.Cost, this.element);
		this.cast = 0;
		this.castele = 0;
		if (info.Skill) {
			if (this.type === 4) {
				this.active = new Map([['cast', [info.Skill]]]);
				this.cast = this.cost;
				this.castele = this.costele;
			} else {
				this.active = new Map();
				for (const active of iterSplit(info.Skill, '+')) {
					const eqidx = active.indexOf('='),
						a0 = ~eqidx ? active.substr(0, eqidx) : 'ownattack',
						cast = readCost(a0, this.element),
						key = cast ? 'cast' : a0,
						curval = this.active.get(key),
						name = active.substr(eqidx + 1);
					if (curval === undefined) {
						this.active.set(key, [name]);
					} else {
						curval.push(name);
					}
					if (cast) {
						[this.cast, this.castele] = cast;
					}
				}
			}
		} else this.active = new Map();

		this.status = new Map();
		if (info.Status) {
			for (const status of iterSplit(info.Status, '+')) {
				const eqidx = status.indexOf('=');
				this.status.set(
					~eqidx ? status.substr(0, eqidx) : status,
					+(eqidx === -1 || status.substr(eqidx + 1)),
				);
			}
		}
	}

	get shiny() {
		return !!(this.code & 16384);
	}

	get upped() {
		return ((this.code & 0x3fff) - 1000) % 4000 > 1999;
	}
}
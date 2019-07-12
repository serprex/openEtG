import { hashString } from './util.js';

export function hashArray(a) {
	let r = a.length * 108;
	for (let i = 0; i < a.length; i++) {
		r = ((r * 63) ^ hash(a[i])) & 0x7fffffff;
	}
	return r;
}

function hash(obj) {
	if (!obj) return 0;
	if (typeof obj === 'number') return obj & 0x7fffffff;
	if (typeof obj === 'string') return hashString(obj);
	if (obj instanceof Array) return hashArray(obj);
	if (obj.hashCode) return obj.hashCode();
	return -1;
}

function update(o, path, idx, f) {
	if (idx === path.length) {
		return f(o);
	}
	const p = path[idx];
	if (o instanceof iMap) {
		return o.set(p, update(o.data.get(p), path, idx + 1, f));
	} else if (o instanceof Array) {
		const no = o.slice();
		no[p] = update(o[p], path, idx + 1, f);
		return no;
	} else if (o instanceof Map) {
		const nm = new Map(o);
		nm.set(p, update(o.get(p), path, idx + 1, f));
		return nm;
	} else {
		return {
			...o,
			[p]: update(o[p], path, idx + 1, f),
		};
	}
}

class iMap {
	constructor(args) {
		this.data = new Map();
		this.hash = null;
		for (const k in args) {
			this.data.set(k, args[k]);
		}
	}

	clone() {
		const newMap = Object.create(iMap.prototype);
		newMap.data = new Map(this.data);
		newMap.hash = null;
		return newMap;
	}

	get size() {
		return this.data.size;
	}

	hashCode() {
		if (this.hash === null) {
			let r = 69105;
			for (const [k, v] of this.data) {
				r ^= hash(k) ^ (hash(v) * 929);
			}
			this.hash = r;
		}
		return this.hash;
	}

	has(k) {
		return this.data.has(k);
	}

	get(k, def) {
		return this.data.has(k) ? this.data.get(k) : def;
	}

	set(k, v) {
		const a = this.clone();
		a.data.set(k, v);
		return a;
	}

	delete(k) {
		const a = this.clone();
		a.data.delete(k);
		return a;
	}

	update(k, f) {
		return this.set(k, f(this.data.get(k)));
	}

	updateIn(path, f) {
		return update(this, path, 0, f);
	}

	setIn(path, val) {
		return this.updateIn(path, () => val);
	}

	filter(f) {
		const data = new Map();
		for (const [k, v] of this.data) {
			if (f(v, k)) data.set(k, v);
		}
		const a = Object.create(iMap.prototype);
		a.data = data;
		a.hash = null;
		return a;
	}

	[Symbol.iterator]() {
		return this.data[Symbol.iterator]();
	}
}

export { iMap as Map };

import { hashString } from './util.js';

export function hashArray() {
	let r = (this.length ?? this.size) * 108;
	for (const x of this) {
		r = ((r * 63) ^ hash(x)) & 0x7fffffff;
	}
	return r;
}

function hashMap() {
	let r = 69105;
	for (const [k, v] of this) {
		r ^= hash(k) ^ (hash(v) * 929);
	}
	return r;
}

const hashCache = new WeakMap();
const hashFunc = new Map([
	[Array, hashArray],
	[Uint8Array, hashArray],
	[Int8Array, hashArray],
	[Uint16Array, hashArray],
	[Int16Array, hashArray],
	[Int32Array, hashArray],
	[Uint32Array, hashArray],
	[Set, hashArray],
	[Map, hashMap],
]);
export function registerHashFunc(type, func) {
	hashFunc.set(type, func);
}

export function hash(obj) {
	if (!obj) return 0;
	if (typeof obj === 'number') return obj & 0x7fffffff;
	if (typeof obj === 'string') return hashString(obj);
	if (typeof obj === 'boolean') return +obj;
	const hashCode = hashCache.get(obj);
	if (hashCode !== undefined) hashCode;
	const func = hashFunc.get(obj.constructor);
	if (func !== undefined) {
		const hash = func.call(obj);
		hashCache.set(obj, hash);
		return hash;
	}
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
		this.data = new Map(args);
		this.hash = null;
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
		return update(this, path, 0, () => val);
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
registerHashFunc(iMap, hashMap);

export const emptyMap = new iMap();

export { iMap as Map };

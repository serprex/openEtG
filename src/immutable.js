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

function _update(o, path, idx, f) {
	if (idx === path.length) {
		return f(o);
	}
	const p = path[idx];
	if (o instanceof Map) {
		const nm = new Map(o);
		nm.set(p, _update(o.get(p), path, idx + 1, f));
		return nm;
	} else if (o instanceof Array) {
		const no = o.slice();
		no[p] = _update(o[p], path, idx + 1, f);
		return no;
	} else {
		return {
			...o,
			[p]: _update(o[p], path, idx + 1, f),
		};
	}
}

function _delete(map, k) {
	const newMap = new Map(map);
	newMap.delete(k);
	return newMap;
}
export { _delete as delete };

export function update(map, k, f) {
	return new Map(map).set(k, f(map.get(k)));
}

export function updateIn(map, path, f) {
	return _update(map, path, 0, f);
}

export function setIn(map, path, val) {
	return _update(map, path, 0, () => val);
}

export const emptyMap = new Map();

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'rolldown';
import { transformAsync } from '@solidjs/compiler';

const pages = [
	'index.html',
	'kong.html',
	'aivai.html',
	'artcredit.html',
	'deck.html',
	'mosaic.html',
	'soi.html',
	'vanilla/boltcalc.html',
	'vanilla/evadecalc.html',
];

const scriptRe = /<script\s+type="module"\s+src="([^"]+)"\s*><\/script>/;

const input = {};
for (const page of pages) {
	const src = (await readFile(page, 'utf8')).match(scriptRe);
	if (!src) throw new Error(`no module script in ${page}`);
	input[page] = resolve(dirname(page), src[1]);
}

const solid = {
	name: 'solid',
	transform: {
		filter: { id: /\.jsx$/ },
		async handler(code, id) {
			const out = await transformAsync(code, {
				filename: id,
				sourceMap: true,
			});
			return { code: out.code, map: out.map, moduleType: 'js' };
		},
	},
};

const initWasm = async (imports, url) => {
	const response = await fetch(url);
	const type = response.headers.get('Content-Type') ?? '';
	const { instance } =
		(
			'instantiateStreaming' in WebAssembly &&
			type.startsWith('application/wasm')
		) ?
			await WebAssembly.instantiateStreaming(response, imports)
		:	await WebAssembly.instantiate(await response.arrayBuffer(), imports);
	return instance.exports;
};

const wasm = {
	name: 'wasm',
	load: {
		filter: { id: /\.wasm$/ },
		async handler(id) {
			const source = await readFile(id);
			const ref = this.emitFile({ type: 'asset', name: 'etg.wasm', source });
			const mod = await WebAssembly.compile(source);
			const groups = new Map();
			for (const { module, name } of WebAssembly.Module.imports(mod)) {
				let names = groups.get(module);
				if (!names) groups.set(module, (names = []));
				names.push(name);
			}
			const lines = [],
				fields = [];
			let i = 0;
			for (const [from, names] of groups) {
				const ns = `__wasmImport_${i++}`;
				lines.push(`import * as ${ns} from ${JSON.stringify(from)};`);
				const props = names.map(
					name => `${JSON.stringify(name)}: ${ns}[${JSON.stringify(name)}]`,
				);
				fields.push(`${JSON.stringify(from)}: { ${props.join(', ')} }`);
			}
			lines.push(
				`const __wasm = await (${initWasm})({ ${fields.join(', ')} }, import.meta.ROLLUP_FILE_URL_${ref});`,
			);
			for (const { name } of WebAssembly.Module.exports(mod)) {
				lines.push(
					`const __x_${name} = __wasm[${JSON.stringify(name)}];`,
					`export { __x_${name} as ${name} };`,
				);
			}
			return lines.join('\n');
		},
	},
};

const workerRe =
	/new URL\(\s*'(\.[^']+\.worker\.js)'\s*,\s*import\.meta\.url\s*\)/;

const worker = {
	name: 'worker',
	transform: {
		filter: { code: /\.worker\.js/ },
		handler(code, id) {
			const url = code.match(workerRe);
			if (!url) return null;
			const ref = this.emitFile({
				type: 'chunk',
				id: resolve(dirname(id), url[1]),
			});
			return {
				code: code.replace(url[0], `import.meta.ROLLUP_FILE_URL_${ref}`),
				map: { mappings: '' },
				moduleType: 'js',
			};
		},
	},
};

// entry chunk plus every chunk it pulls in, so nothing waits on a waterfall
const tags = (bundle, entry) => {
	const seen = new Set([entry.fileName]),
		queue = [entry];
	for (const chunk of queue) {
		for (const dep of chunk.imports ?? []) {
			if (!seen.has(dep)) {
				seen.add(dep);
				const next = bundle[dep];
				if (next?.type === 'chunk') queue.push(next);
			}
		}
	}
	seen.delete(entry.fileName);
	return [
		`<script type="module" crossorigin src="/${entry.fileName}"></script>`,
		...[...seen].map(
			f => `<link rel="modulepreload" crossorigin href="/${f}">`,
		),
	].join('\n');
};

const html = {
	name: 'html',
	buildStart() {
		for (const page of pages) this.addWatchFile(resolve(page));
	},
	async generateBundle(_options, bundle) {
		const entries = new Map();
		for (const chunk of Object.values(bundle)) {
			if (chunk.type === 'chunk' && chunk.isEntry)
				entries.set(chunk.name, chunk);
		}
		for (const page of pages) {
			const source = await readFile(page, 'utf8');
			this.emitFile({
				type: 'asset',
				fileName: page,
				source: source.replace(scriptRe, tags(bundle, entries.get(page))),
			});
		}
	},
};

// served from bundle/ as-is; their urls point at /assets & /sound, so don't hash them
const copyStatic = {
	name: 'copy-static',
	async generateBundle() {
		for (const name of [
			'favicon.ico',
			'whale144.webp',
			'manifest.json',
			'ui.css',
		]) {
			this.emitFile({
				type: 'asset',
				fileName: name,
				source: await readFile(name),
			});
		}
	},
};

export default defineConfig({
	input,
	platform: 'browser',
	output: {
		dir: 'bundle',
		format: 'esm',
		cleanDir: true,
		minify: true,
		sourcemap: true,
		entryFileNames: 'hash/[hash].js',
		chunkFileNames: 'hash/[hash].js',
		assetFileNames: 'hash/[hash][extname]',
	},
	plugins: [solid, wasm, worker, html, copyStatic],
});

import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import solid from '@solidjs/vite-plugin';
import wasm from 'vite-plugin-wasm';

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

// served from bundle/ as-is; their urls point at /assets & /sound, so don't hash them
const copyStatic = {
	name: 'copy-static',
	enforce: 'post',
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

const hashNames = {
	entryFileNames: 'hash/[hash].js',
	chunkFileNames: 'hash/[hash].js',
	assetFileNames: 'hash/[hash][extname]',
};

export default defineConfig({
	// root doubles as the public dir so /ui.css & /assets/* survive untouched
	publicDir: '.',
	build: {
		outDir: 'bundle',
		emptyOutDir: true,
		copyPublicDir: false,
		target: 'esnext',
		sourcemap: true,
		assetsInlineLimit: 0,
		rollupOptions: {
			input: pages,
			output: hashNames,
		},
	},
	worker: {
		format: 'es',
		plugins: () => [wasm()],
		rollupOptions: { output: hashNames },
	},
	plugins: [wasm(), solid(), copyStatic],
});

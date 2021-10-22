export default import('./rs/pkg/etg_bg.wasm').then(() =>
	import('./rs/pkg/etg.js'),
);

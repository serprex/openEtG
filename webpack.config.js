import { URL } from 'url';
import HtmlPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';

export default {
	experiments: {
		asyncWebAssembly: true,
		topLevelAwait: true,
		backCompat: false,
	},
	devtool: 'source-map',
	entry: {
		aivai: './src/ui/aivai.js',
		art: './src/ui/art.js',
		deck: './src/ui/deck.jsx',
		main: './src/ui/main.jsx',
		mosaic: './src/ui/mosaic.js',
		soi: './src/ui/soi.jsx',
		vboltcalc: './src/vanilla/ui/boltcalc.js',
		vevadecalc: './src/vanilla/ui/evadecalc.js',
	},
	output: {
		clean: true,
		path: new URL('./bundle', import.meta.url).pathname,
		filename: 'hash/[contenthash].js',
		chunkFilename: 'hash/[contenthash].js',
		webassemblyModuleFilename: 'hash/[hash].wasm',
		sourceMapFilename: '[name].js.map',
		hashFunction: 'sha512',
		hashDigestLength: 16,
	},
	optimization: {
		chunkIds: 'deterministic',
		splitChunks: {
			chunks: 'all',
			minSize: 0,
		},
	},
	performance: {
		hints: false,
	},
	module: {
		rules: [
			{
				test: /\.m?js$/,
				exclude: /node_modules/,
				type: 'javascript/auto',
				resolve: {
					fullySpecified: false,
				},
			},
			{
				test: /\.m?jsx$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['solid'],
						plugins: [
							[
								'@babel/plugin-syntax-import-attributes',
								{ deprecatedAssertSyntax: true },
							],
						],
					},
				},
			},
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: ['favicon.ico', 'whale144.webp', 'manifest.json', 'ui.css'],
		}),
		new HtmlPlugin({
			chunks: ['main'],
			filename: 'index.html',
			template: 'index.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['main'],
			filename: 'kong.html',
			template: 'kong.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['art'],
			filename: 'artcredit.htm',
			template: 'artcredit.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['aivai'],
			filename: 'aivai.htm',
			template: 'aivai.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['deck'],
			filename: 'deck.htm',
			template: 'deck.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['mosaic'],
			filename: 'mosaic.htm',
			template: 'mosaic.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['soi'],
			filename: 'soi.htm',
			template: 'soi.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['vboltcalc'],
			filename: 'vanilla/boltcalc.htm',
			template: 'vanilla/boltcalc.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['vevadecalc'],
			filename: 'vanilla/evadecalc.htm',
			template: 'vanilla/evadecalc.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
	],
};

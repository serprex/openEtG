const path = require('path'),
	HtmlPlugin = require('html-webpack-plugin');

module.exports = {
	experiments: { asyncWebAssembly: true },
	devtool: 'source-map',
	entry: {
		aivai: './src/ui/aivai.js',
		art: './src/ui/art.js',
		deck: './src/ui/deck.js',
		main: './src/ui/main.js',
		mosaic: './src/ui/mosaic.js',
		vboltcalc: './src/vanilla/ui/boltcalc.js',
		vdeckinfo: './src/vanilla/ui/deckinfo.js',
		vevadecalc: './src/vanilla/ui/evadecalc.js',
		vnamegame: './src/vanilla/ui/namegame.js',
		vspeed: './src/vanilla/ui/speed.js',
	},
	output: {
		path: path.resolve(__dirname, 'bundle'),
		filename: '[name].js',
		chunkFilename: '[name].js',
		sourceMapFilename: '[name].js.map',
	},
	optimization: {
		splitChunks: {
			chunks: 'all',
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
				}
			},
			{
				test: /\.m?jsx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							[
								'@babel/preset-react',
								{
									runtime: 'automatic',
									useSpread: true,
								}
							],
							[
								'@babel/preset-env',
								{
									bugfixes: true,
									useBuiltIns: 'usage',
									corejs: 3,
									targets: {
										browsers: [
											'last 2 firefox version',
											'last 2 chrome version',
											'last 1 ios version',
											'last 1 and_chr version',
											'last 1 edge version',
										],
									},
								},
							],
						],
						plugins: [
							'@babel/plugin-proposal-class-properties',
						],
					},
				},
			},
			{
				test: /\.worker\.js$/,
				exclude: /node_modules/,
				use: { loader: 'worker-loader' },
			},
		],
	},
	plugins: [
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
			chunks: ['vboltcalc'],
			filename: 'vanilla/boltcalc.htm',
			template: 'vanilla/boltcalc.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['vdeckinfo'],
			filename: 'vanilla/deckinfo.htm',
			template: 'vanilla/deckinfo.ejs',
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
		new HtmlPlugin({
			chunks: ['vnamegame'],
			filename: 'vanilla/namegame.htm',
			template: 'vanilla/namegame.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['vspeed'],
			filename: 'vanilla/speed.htm',
			template: 'vanilla/speed.ejs',
			inject: true,
			scriptLoading: 'defer',
		}),
	],
};

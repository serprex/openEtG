const HtmlPlugin = require('html-webpack-plugin');

module.exports = {
	devtool: 'source-map',
	entry: {
		aivai: './src/ui/aivai.js',
		art: './src/ui/art.js',
		deck: './src/ui/deck.js',
		main: './src/ui/main.js',
		mosaic: './src/ui/mosaic.js',
		vdeckinfo: './src/vanilla/ui/deckinfo.js',
		vnamegame: './src/vanilla/ui/namegame.js',
		vspeed: './src/vanilla/ui/speed.js',
	},
	output: {
		path: __dirname,
		publicPath: '/',
		filename: 'bundle/[name].js',
		chunkFilename: 'bundle/[name].js',
		sourceMapFilename: 'bundle/[name].js.map',
	},
	optimization: {
		splitChunks: {
			chunks: 'all',
		},
	},
	module: {
		rules: [
			{
				test: /\.m?js$/,
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
									useBuiltIns: 'usage',
									corejs: 3,
									targets: {
										browsers: [
											'last 1 firefox version',
											'last 1 chrome version',
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
		],
	},
	plugins: [
		new HtmlPlugin({
			chunks: ['main'],
			filename: 'index.html',
			template: 'index.ejs',
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['main'],
			filename: 'kong.html',
			template: 'kong.ejs',
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['art'],
			filename: 'artcredit.htm',
			template: 'artcredit.ejs',
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['aivai'],
			filename: 'aivai.htm',
			template: 'aivai.ejs',
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['deck'],
			filename: 'deck.htm',
			template: 'deck.ejs',
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['mosaic'],
			filename: 'mosaic.htm',
			template: 'mosaic.ejs',
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['vdeckinfo'],
			filename: 'vanilla/deckinfo.htm',
			template: 'vanilla/deckinfo.ejs',
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['vnamegame'],
			filename: 'vanilla/namegame.htm',
			template: 'vanilla/namegame.ejs',
			scriptLoading: 'defer',
		}),
		new HtmlPlugin({
			chunks: ['vspeed'],
			filename: 'vanilla/speed.htm',
			template: 'vanilla/speed.ejs',
			scriptLoading: 'defer',
		}),
	],
};

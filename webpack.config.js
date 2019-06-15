module.exports = {
	entry: {
		aivai: ['babel-polyfill', './src/aivai.js'],
		art: ['babel-polyfill', './src/ui/art.js'],
		cia: ['babel-polyfill', './src/ui/vanilla/ui/cia.js'],
		main: ['babel-polyfill', './src/ui/main.js'],
		mosaic: ['babel-polyfill', './src/ui/mosaic.js'],
		vanilla: ['babel-polyfill', './src/vanilla/ui/main.js'],
		vaivai: ['babel-polyfill', './src/vanilla/ui/aivai.js'],
		vdeckinfo: ['babel-polyfill', './src/vanilla/ui/deckinfo.js'],
		vnamegame: ['babel-polyfill', './src/vanilla/ui/namegame.js'],
		vspeed: ['babel-polyfill', './src/vanilla/ui/speed.js'],
	},
	output: {
		path: __dirname,
		filename: 'bundle.[name].js',
		sourceMapFilename: 'bundle.[name].js.map',
	},
	devtool: 'cheap-source-map',
	optimization: {
		splitChunks: {
			chunks: 'all',
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					priority: -10,
				},
				commons: {
					name: 'commons',
					chunks: 'initial',
					minChunks: 2,
				},
			},
		},
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					query: {
						presets: ["@babel/preset-react", [
							"@babel/preset-env", {
								// useBuiltIns: 'usage',
								targets: {
									browsers: [
										"firefox esr",
										"last 2 chrome version",
										"last 1 ios version",
										"last 1 and_chr version",
										"last 1 edge version",
									],
								},
							},
						]],
						plugins: [
							"@babel/plugin-transform-react-jsx",
							"@babel/plugin-proposal-class-properties",
							"@babel/plugin-proposal-object-rest-spread",
						],
					},
				},
			},
		],
	},
};

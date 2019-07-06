module.exports = {
	entry: {
		aivai: './src/aivai.js',
		art: './src/ui/art.js',
		cia: './src/vanilla/ui/cia.js',
		main: './src/ui/main.js',
		mosaic: './src/ui/mosaic.js',
		vanilla: './src/vanilla/ui/main.js',
		vaivai: './src/vanilla/ui/aivai.js',
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
						presets: [
							'@babel/preset-react',
							[
								'@babel/preset-env',
								{
									useBuiltIns: 'usage',
									corejs: 3,
									targets: {
										browsers: [
											'firefox esr',
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
							'@babel/plugin-syntax-dynamic-import',
							'@babel/plugin-transform-react-jsx',
							'@babel/plugin-proposal-class-properties',
							'@babel/plugin-proposal-object-rest-spread',
						],
					},
				},
			},
		],
	},
};

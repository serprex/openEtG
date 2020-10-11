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
};

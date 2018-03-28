module.exports = {
	entry: {
		main: './ui.main.js',
		art: './ui.art.js',
		mosaic: './ui.mosaic.js',
	},
	output: {
		path: __dirname,
		filename: 'bundle.[name].js',
		sourceMapFilename: 'bundle.[name].js.map',
	},
	devtool: 'cheap-source-map',
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					query: {
						presets: ["@babel/preset-env", "@babel/preset-react"],
						plugins: [
							"@babel/plugin-transform-react-jsx"
						]
					}
				},
			},
		],
	},
};

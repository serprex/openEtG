module.exports = {
	entry: './ui.main.js',
	output: {
		path: __dirname,
		filename: 'bundle.js',
		sourceMapFilename: 'bundle.js.map',
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				}
			},
		],
	},
};
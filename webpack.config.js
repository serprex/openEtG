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
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					query: {
						presets: ["env", "react"],
						plugins: [
							["transform-react-jsx", { pragma: "h" }]
						]
					}
				},
			},
		],
	},
};

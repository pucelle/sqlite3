const path = require('path')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')


module.exports = {
	entry: ['./src/worker/index.ts'],
	mode: 'development',
	target: 'node',

	externals: {
		'better-sqlite3': 'better-sqlite3',
	},

	plugins: [
		new ForkTsCheckerWebpackPlugin()
	],

	output: {
		filename: 'worker/index.js',
		path: path.resolve(__dirname, 'out/'),
	},

	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},

	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: [{
					loader: 'ts-loader',
					options: {
						transpileOnly: true,
						experimentalWatchApi: true,
					},
				}],
				exclude: /node_modules/
			},
		],
	},

	optimization: {
		//usedExports: true
	},
}
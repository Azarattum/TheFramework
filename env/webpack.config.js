const Path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const CleanPlugin = require("clean-webpack-plugin").CleanWebpackPlugin;

const prod = process.argv.indexOf("production") !== -1;

module.exports = {
	entry: "./src/index.ts",
	mode: prod ? "production" : "development",
	devtool: prod ? undefined : "source-map",
	plugins: [new CleanPlugin()],
	module: {
		rules: [
			{
				test: /service\.ts$/,
				use: [
					{
						loader: "./env/service.loader.js"
					},
					{
						loader: "comlink-loader",
						options: {
							singleton: true
						}
					}
				],
				include: Path.resolve(__dirname, "../src"),
				exclude: /node_modules/
			},
			{
				test: /\.ts$/,
				use: [
					{
						loader: "ts-loader",
						options: {
							transpileOnly: true,
							experimentalWatchApi: true
						}
					}
				],
				include: Path.resolve(__dirname, "../src"),
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: [".ts", ".js"]
	},
	output: {
		filename: "bundle.js",
		path: Path.resolve(__dirname, "../dist"),
		devtoolModuleFilenameTemplate: "[absolute-resource-path]"
	},
	optimization: {
		concatenateModules: false,
		usedExports: false,
		minimize: prod ? true : false,
		minimizer: prod
			? [
					new TerserPlugin({
						terserOptions: {
							mangle: true,
							sourceMap: false,
							keep_classnames: true
						},
						extractComments: false
					})
			  ]
			: []
	}
};

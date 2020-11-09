const Path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const WebpackCleanupPlugin = require("webpack-cleanup-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxPlugin = require("workbox-webpack-plugin");

//Register use of data binding templates for the index page
const handler = {
	get: (object, property) => {
		if (
			property == Symbol.toPrimitive ||
			property == "toJSON" ||
			property == "toString"
		) {
			return () =>
				`<placeholder ${object._}><!--"placeholders __postfix_${object._}="--></placeholder>`;
		}
		const newObject = {
			_: (object._ ? object._ + "." : "") + property
		};
		return new Proxy(newObject, handler);
	}
};
const data = new Proxy({ _: "" }, handler);

const prod = process.argv.indexOf("-p") !== -1;

module.exports = {
	entry: "./src/index.ts",
	mode: prod ? "production" : "development",
	devtool: prod ? undefined : "eval-source-map",
	plugins: [
		new HtmlWebpackPlugin({
			template: "./src/index.pug",
			minify: prod,
			data: data
		}),
		prod ? new WorkboxPlugin.GenerateSW() : () => {},
		prod ? new WebpackCleanupPlugin() : () => {}
	],
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
			},
			{
				test: /\.pug$/,
				use: ["./env/view.loader.js", "pug-loader"],
				include: Path.resolve(__dirname, "../src"),
				exclude: /node_modules/
			},
			{
				test: /\.scss$/,
				use: ["style-loader", "css-loader", "sass-loader"],
				include: Path.resolve(__dirname, "../src"),
				exclude: /node_modules/
			},
			{
				test: /\.(vsh|fsh)$/,
				loader: "ts-shader-loader"
			}
		]
	},
	resolve: {
		extensions: [".ts", ".js"]
	},
	output: {
		filename: "bundle.js",
		pathinfo: false,
		path: Path.resolve(__dirname, "../dist")
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 60000,
			maxSize: 240000,
			minChunks: 1,
			maxAsyncRequests: 6,
			maxInitialRequests: 4,
			automaticNameDelimiter: "~",
			automaticNameMaxLength: 30,
			cacheGroups: {
				vendors: {
					test: /[\\/]node_modules[\\/]/,
					priority: -10
				},
				default: {
					minChunks: 2,
					priority: -20,
					reuseExistingChunk: true
				}
			}
		},
		concatenateModules: false,
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
	},
	target: "web"
};

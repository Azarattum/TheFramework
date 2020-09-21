/** Custom typings */
declare module "worker-loader!*" {
	class WebpackWorker extends Worker {
		public constructor();
	}

	export default WebpackWorker;
}

declare module "*.vsh" {
	const string: string;

	export default string;
}

declare module "*.fsh" {
	const string: string;

	export default string;
}

declare module "*.pug" {
	const value: (locals?: {}) => string;
	export default value;
}

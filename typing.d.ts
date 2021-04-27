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
	const value: (locals?: obj) => string;
	export default value;
}

/**
 * Arbitrary function type
 */
type func = (...args: any[]) => any;

/**
 * Arbitrary object type
 */
type obj = Record<any, any>;

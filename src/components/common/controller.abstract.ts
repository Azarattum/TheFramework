/* eslint @typescript-eslint/explicit-function-return-type: 0 */

/**
 * Event-driven controller generic type builder
 */
export default function Controller<T extends string>() {
	/**
	 * Abstract of the controller class
	 */
	abstract class Controller {
		/**Component type */
		public type: string = "Controllers";
		/**Controller name */
		public name: string;
		/**Callbacks storage */
		private callbacks: { [type: string]: Function[] } = {};

		/**
		 * Creates controller class
		 */
		protected constructor(name: string) {
			this.name = name;
		}

		/**
		 * Closes the controller
		 */
		public close(): void {
			//Close the controller
			this.callbacks = {};
		}

		/**
		 * Listens to a specified event in the controller
		 * @param type Event type
		 * @param callback Callback function
		 */
		public on(type: T, callback: Function): void {
			if (!(type in this.callbacks)) this.callbacks[type] = [];
			this.callbacks[type].push(callback);
		}

		/**
		 * Calls all the registered event listeners in the controller
		 * @param type Event type
		 * @param args Arguments to pass to callbacks
		 */
		protected emit(type: T, ...args: any[]): void {
			if (this.callbacks[type]) {
				this.callbacks[type].forEach(x => x.call(x, ...args));
			}
		}

		/**
		 * Exposes function to be used in global window scope.
		 * Either a custom function can be provided or a method
		 * of current service class (the names must match)
		 * @param name Name of the exposed function (in the scope of service)
		 * @param func Exposed function
		 */
		protected expose(name: string, func: Function | null = null): void {
			if (!(globalThis as any)[this.name]) {
				(globalThis as any)[this.name] = {};
			}

			if (func) {
				(globalThis as any)[this.name][name] = func;
			} else {
				if (typeof (this as any)[name] != "function") {
					throw new Error("The function to expose not found!");
				}
				(globalThis as any)[this.name][name] = (...args: any[]) => {
					((this as any)[name] as Function).call(this, ...args);
				};
			}
		}
	}

	//Return controller with specific typings
	return Controller;
}

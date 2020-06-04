/* eslint @typescript-eslint/explicit-function-return-type: 0 */
import { IComponent } from "./manager.class";
import Exposer from "./exposer.class";

/**
 * Event-driven service generic type builder
 */
export default function Service<T extends string>() {
	/**
	 * Abstract of the service class
	 */
	abstract class Service implements IComponent {
		/**Component type */
		public static type: string = "Services";
		/**Service name */
		public name: string;
		/**Callbacks storage */
		private callbacks: { [type: string]: Function[] } = {};
		/**Exposer object */
		private exposer: Exposer;
		/**Relation reference */
		private relation: object | null;

		/**
		 * Creates service class
		 */
		public constructor(exposer: Exposer, relation?: object) {
			this.name = this.constructor.name;
			this.exposer = exposer;
			this.relation = relation || null;
		}

		/**
		 * Closes the service
		 */
		public close(): void {
			//Close the service
			this.callbacks = {};
		}

		/**
		 * Listens to a specified event in the service
		 * @param type Event type
		 * @param callback Callback function
		 */
		public on(type: T, callback: Function): void {
			if (!(type in this.callbacks)) this.callbacks[type] = [];
			this.callbacks[type].push(callback);
		}

		/**
		 * Calls all the registered event listeners in the service
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
			const exposed =
				func || ((this as any)[name] as Function).bind(this);

			this.exposer.expose(this.name, name, exposed, this.relation);
		}
	}

	//Return service with specific typings
	return Service;
}

/* eslint @typescript-eslint/explicit-function-return-type: 0 */
import { IComponent } from "./manager.class";
import Exposer from "./exposer.class";
import Binding from "./binding.class";
import Utils from "./utils.class";

/**
 * Event-driven controller generic type builder
 */
export default function Controller<T extends string>() {
	/**
	 * Abstract of the controller class
	 */
	abstract class Controller implements IComponent {
		/**Component type */
		public static type: string = "Controllers";
		/**Controller universal unique id */
		public readonly uuid: string;
		/**Controller name */
		public readonly name: string;
		/**Callbacks storage */
		private callbacks: { [type: string]: Function[] } = {};
		/**Whether to escape html in data binding */
		public safe: boolean = true;
		/**Exposer object */
		private exposer: Exposer;
		/**Relation reference */
		private relation: object | null;
		/**Placeholders list */
		private binding: Binding | null;

		/**
		 * Creates controller class
		 */
		public constructor(exposer: Exposer, relation?: object) {
			this.uuid = Utils.generateID();
			this.name = this.constructor.name;
			this.exposer = exposer;
			this.relation = relation || null;
			this.binding = null;
		}

		/**
		 * All relational objects (html elements) for this controller class
		 */
		public static get relations(): object[] {
			return Array.from(
				document.querySelectorAll(
					`[controller=${this.name.toLowerCase()}]`
				)
			);
		}

		/**
		 * Initializes data binding for the controller
		 */
		protected bind(): void {
			this.binding = new Binding(this.container);
			this.binding.bind();
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
			const exposed =
				func || ((this as any)[name] as Function).bind(this);

			this.exposer.expose(
				this.name.toLowerCase(),
				name,
				exposed,
				this.relation
			);
		}

		/**
		 * The container associated with current controller
		 */
		protected get container(): HTMLElement {
			if (this.relation instanceof HTMLElement) {
				return this.relation;
			}

			throw new Error(`Container ${this.name} not found!`);
		}

		/**
		 * Binded to the controller data
		 */
		protected get data(): Record<string, any> {
			if (!this.binding) {
				throw new Error("Use this.bind() to bind your data first!");
			}

			const handler = {
				get: (object: any, property: any): any => {
					const path =
						(object.__origin ? object.__origin + "." : "") +
						property;

					const data = object[property];
					//Continue searching
					if (typeof data == "object") {
						return new Proxy({ ...data, __origin: path }, handler);
					}
					if (data === undefined) {
						return new Proxy({ ...data, __origin: path }, handler);
					}

					return data;
				},
				set: (object: any, property: string, value: any) => {
					if (!this.binding) return false;
					const path =
						(object.__origin ? object.__origin + "." : "") +
						property;

					object[property] = value;
					this.binding.set(path, value, !this.safe);

					return true;
				}
			};

			//Assign root object to data
			const data: any = this.binding.get();
			data.__origin = "";
			return new Proxy(data, handler);
		}
	}

	//Return controller with specific typings
	return Controller;
}

/**
 * Sets property to element by selector within the container
 * @param selector HTML element selector
 */
export function element(selector: string): Function {
	return function(target: any, key: string): void {
		const original = target.initialize;
		target.initialize = function(...args: any[]): any {
			Object.defineProperty(this, key, {
				get: () => {
					const element = this.container.querySelector(
						selector
					) as HTMLElement | null;

					if (!element) {
						throw new Error(
							`Element "${selector}" does not exist!`
						);
					}

					return element;
				}
			});

			return original.bind(this)(...args);
		};
	};
}

/**
 * Sets property to all elements by selector within the container
 * @param selector HTML element selector
 */
export function elements(selector: string): Function {
	return function(target: any, key: string): void {
		const original = target.initialize;
		target.initialize = function(...args: any[]): any {
			Object.defineProperty(this, key, {
				get: () => {
					return this.container.querySelectorAll(
						selector
					) as HTMLElement | null;
				}
			});

			return original.bind(this)(...args);
		};
	};
}

if (typeof globalThis === "undefined") {
	(window as any).globalThis = window;
}
/**
 * Smart controller shortcut to the nearest controller property in DOM
 */
(globalThis as any).Controller = new Proxy(
	{},
	{
		get: (obj: {}, prop: string) => {
			if (!event) return;
			let node = event.target as HTMLElement | null;
			let element: HTMLElement | null = null;
			let controller = null;
			//Search for the nearest node with conroller
			while (
				controller == null ||
				(globalThis as any)[controller] == undefined ||
				(globalThis as any)[controller][prop] == undefined
			) {
				if (!node) return;
				controller = node.getAttribute("controller");
				if (controller) {
					controller = controller.toLowerCase();
				}

				element = node;
				node = node.parentElement;
			}

			if (!element) return;

			//Trying to return exposed controller's function
			return (globalThis as any)[controller][prop].bind(element);
		}
	}
);

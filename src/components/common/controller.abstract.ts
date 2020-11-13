/* eslint @typescript-eslint/explicit-function-return-type: 0 */
import { IComponent, IComponentOptions } from "./component.interface";
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
		/**Exposer object */
		private exposer: Exposer;
		/**Relation reference */
		private relation: object | null;
		/**Placeholders list */
		private binding: Binding | null;

		/**
		 * Creates controller class
		 */
		public constructor({ exposer, relation }: IComponentOptions) {
			this.uuid = Utils.generateID();
			this.name = this.constructor.name;
			this.exposer = exposer;
			this.relation = relation || null;
			this.binding = relation ? new Binding(this.container) : null;
		}

		/**
		 * All relational objects (html elements) for this controller class
		 */
		public static get relations(): object[] | null {
			return Array.from(
				document.querySelectorAll(
					`[controller=${this.name.toLowerCase()}]`
				)
			);
		}

		/**
		 * Closes the controller
		 */
		public close(): void {
			//Close the controller
			this.callbacks = {};
			this.binding?.close();
			this.exposer.close(this.name.toLowerCase(), this.relation);
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
				throw new Error(
					"The controller is not associated with any container!"
				);
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
						return this.binding?.get(path);
					}

					return data;
				},
				set: (object: any, property: string, value: any) => {
					if (!this.binding) return false;
					const path =
						(object.__origin ? object.__origin + "." : "") +
						property;

					this.binding?.set(path, value);

					return true;
				}
			};

			//Assign root object to data
			const data: any = this.binding?.get();
			data.__origin = "";
			return new Proxy(data, handler);
		}
	}

	//Return controller with specific typings
	return Controller;
}

/**
 * Sets property to element by selector within the container.
 * The default selector `.<property-name>` (class matches the property)
 * is used when `@element`, `@element()`. Custom selector can be
 * specified with `@element("<selector>")`.
 * @param selector HTML query element selector
 */
export function element(...args: any[]): any {
	let selector: string | null = null;
	const decorator = function(target: any, key: string): void {
		selector = selector ? selector : `.${key}`;
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

	if (args.length == 0 || (args.length == 1 && typeof args[0] === "string")) {
		selector = args.length ? args[0] : null;
		return decorator;
	} else if (args.length === 3) {
		return decorator(args[0], args[1]);
	}
}

/**
 * Sets property to all elements by selector within the container.
 * The default selector `.<property-name>` (class matches the property)
 * is used when `@elements`, `@elements()`. Custom selector can be
 * specified with `@elements("<selector>")`.
 * @param selector HTML query element selector
 */
export function elements(...args: any[]): any {
	let selector: string | null = null;
	const decorator = function(target: any, key: string): void {
		selector = selector ? selector : `.${key}`;
		const original = target.initialize;
		target.initialize = function(...args: any[]): any {
			Object.defineProperty(this, key, {
				get: () => {
					return [
						...this.container.querySelectorAll(selector)
					] as Node[];
				}
			});

			return original.bind(this)(...args);
		};
	};

	if (args.length == 0 || (args.length == 1 && typeof args[0] === "string")) {
		selector = args.length ? args[0] : null;
		return decorator;
	} else if (args.length === 3) {
		return decorator(args[0], args[1]);
	}
}

/**
 * Binds class property to data with a corresponding path.
 * 2-way data binding maintains property's type while
 * converting all its data to strings for DOM.
 * Decorator called as `@bind`, `@bind()` binds with respect to property name.
 * Custom bind path can be specified with `@bind("<path>")`.
 * @param path Path to the data (same as `this.data.<path>`)
 */
export function bind(...args: any[]): any {
	let path: string | null = null;
	const decorator = function(target: any, key: string): void {
		if (!path) path = key.toLowerCase();
		let debounce = -1;
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		let update: (name?: string, value?: any) => void = () => {};

		//Proxy for objects handler
		const handler: ProxyHandler<any> = {
			get: function(target, prop, receiver) {
				const result = Reflect.get(target, prop, receiver);
				clearTimeout(debounce);
				update();
				return result;
			},
			set: function(target, prop, value) {
				const result = Reflect.set(target, prop, value);
				if (debounce == -1) {
					update(`${path}.${prop.toString()}`, value);
				}
				return result;
			}
		};

		let object = target[key];
		let proxy =
			typeof object == "object" ? new Proxy(object, handler) : object;

		const getter = () => {
			return proxy;
		};
		const setter = (value: any) => {
			object = value;
			if (typeof value == "object") {
				proxy = new Proxy(object, handler);
			} else {
				proxy = object;
			}
			clearTimeout(debounce);
			update();
		};

		//Redefine getter and setter for this property
		Object.defineProperty(target, key, { get: getter, set: setter });

		//Hook onto controller's initialize method to do more stuff
		const original = target.initialize;
		target.initialize = function(...args: any[]): any {
			//Update hook
			const setValue = (
				name: string = path || key.toLowerCase(),
				value: any = object
			) => {
				this.binding?.set(name, value);
				debounce = -1;
			};
			update = (name?: string, value?: any) => {
				debounce = setTimeout(() => {
					setValue(name, value);
				});
			};
			if (proxy == null && this.binding) {
				setTimeout(() => {
					//Update proxy value
					object = this.binding?.get(path);
					proxy =
						typeof object == "object"
							? new Proxy(object, handler)
							: object;
				});
			} else {
				setValue();
			}

			//Data-set hook
			setTimeout(() => {
				if (!this.binding) return;

				const realSet = this.binding.set.bind(this.binding);
				const hook = (name: string, value?: any, mode?: number) => {
					//Hook only for the path
					if (name === path) {
						//Fetch value for default update
						if (value === undefined) {
							value = this.binding.get(path);
						}

						//Update proxy value
						object = Utils.convertTo(object, value);
						proxy =
							typeof object == "object"
								? new Proxy(object, handler)
								: object;
					}
					return realSet(name, value, mode);
				};
				this.binding.set = hook;
			});

			return original.bind(this)(...args);
		};
	};

	if (args.length == 0 || (args.length == 1 && typeof args[0] === "string")) {
		path = args.length ? args[0]?.toLowerCase() : null;
		return decorator;
	} else if (args.length === 3) {
		return decorator(args[0], args[1]);
	}
}

if (typeof globalThis === "undefined") {
	(window as any).globalThis = window;
}
/**
 * Smart controller shortcut to the nearest controller property in DOM
 */
(globalThis as any).ctrl = new Proxy(
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

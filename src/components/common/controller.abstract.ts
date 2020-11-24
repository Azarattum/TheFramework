/* eslint @typescript-eslint/explicit-function-return-type: 0 */
import { IComponent, IComponentOptions } from "./component.interface";
import Exposer from "./exposer.class";
import Binding from "./binding.class";
import Utils, { LogType } from "./utils.class";

/**
 * Event-driven controller generic type builder
 */
export default function Controller<T extends string>(
	type: Relation = Relation.Default
) {
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
			this.binding =
				this.relation && type === Relation.Binding
					? new Binding(this.container)
					: null;
		}

		/**
		 * All relational objects (html elements) for this controller class
		 */
		public static get relations(): object[] | null {
			if (type === Relation.None) return null;

			return Array.from(
				document.querySelectorAll(
					`[controller~=${this.name.toLowerCase()}]`
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
			if (type !== Relation.Binding || !this.binding) {
				throw new Error(
					`Data binding is disabled on ${this.name} controller. Use ` +
						`'class ${this.name} extends Controller(Relation.Binding)' ` +
						"in class declaration to enable it."
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
 * Configurations of controller's relation
 */
export enum Relation {
	/**Controller not being related to any DOM elements */
	None,
	/**Controller is related to DOM, but data-binding is disabled */
	Default,
	/**Controller is related to DOM with data-binding enabled */
	Binding
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
		const original = target.initialize || Function();
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
		const original = target.initialize || Function();
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
		const debounces: Map<any, number> = new Map();
		const updates: Map<
			any,
			(name?: string, value?: any) => void
		> = new Map();

		//Proxy for objects handler
		const handler: ProxyHandler<any> = {
			get: function(target, prop, receiver) {
				const result = Reflect.get(target, prop, receiver);
				clearTimeout(debounces.get(this));
				updates.get(this)?.();
				return result;
			},
			set: function(target, prop, value) {
				const result = Reflect.set(target, prop, value);
				if (debounces.get(this) === undefined) {
					updates.get(this)?.(`${path}.${prop.toString()}`, value);
				}
				return result;
			}
		};

		const objects: Map<any, any> = new Map();
		const proxies: Map<any, any> = new Map();

		const getter = function(this: any) {
			return proxies.get(this);
		};
		const setter = function(this: any, value: any) {
			objects.set(this, value);
			if (typeof value == "object" && value !== null) {
				proxies.set(
					this,
					new Proxy(value, {
						set: handler.set?.bind(this),
						get: handler.get?.bind(this)
					})
				);
			} else {
				proxies.set(this, value);
			}
			clearTimeout(debounces.get(this));
			updates.get(this)?.();
		};

		//Redefine getter and setter for this property
		Object.defineProperty(target, key, { get: getter, set: setter });

		//Hook onto controller's initialize method to do more stuff
		const original = target.initialize || Function();
		target.initialize = function(this: any, ...args: any[]): any {
			if (!this.binding) {
				Utils.log(
					`Trying to bind property '${key}' on a non binding ${this.name} controller!`,
					LogType.WARNING
				);
				return original.bind(this)(...args);
			}

			//Update hook
			const setValue = (
				name: string = path || key.toLowerCase(),
				value: any = objects.get(this)
			) => {
				this.binding.set(name, value);
				debounces.delete(this);
			};
			updates.set(this, (name?: string, value?: any) => {
				debounces.set(
					this,
					setTimeout(() => {
						setValue(name, value);
					})
				);
			});
			//Property is undefined
			if (proxies.get(this) == null) {
				//Update proxy value
				const object = this.binding.get(path);
				objects.set(this, object);
				proxies.set(
					this,
					typeof object == "object" && object !== null
						? new Proxy(object, {
								set: handler.set?.bind(this),
								get: handler.get?.bind(this)
						  })
						: object
				);
			} else {
				setValue();
			}

			//Data-set hook
			setTimeout(() => {
				if (!this.binding) return;
				//Save real binding set function
				const realSet = this.binding.set.bind(this.binding);

				const hook = (name: string, value?: any, mode?: number) => {
					//Hook only for the path
					if (name === path && value !== objects.get(this)) {
						//Fetch value for default update
						if (value === undefined) {
							value = this.binding.get(path);
						}

						//Update proxy value
						const object = Utils.convertTo(
							objects.get(this),
							value
						);
						objects.set(this, object);
						proxies.set(
							this,
							typeof object == "object" && object !== null
								? new Proxy(object, {
										set: handler.set?.bind(this),
										get: handler.get?.bind(this)
								  })
								: object
						);
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

/* istanbul ignore next */
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
			if (!("event" in globalThis) || !event) return;
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

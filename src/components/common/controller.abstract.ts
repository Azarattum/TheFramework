/* eslint @typescript-eslint/explicit-function-return-type: 0 */
import { IComponent } from "./manager.class";
import Exposer from "./exposer.class";
import Utils from "./utils.class";

import Binding from "./binding.class";

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

		/**
		 * Creates controller class
		 */
		public constructor(exposer: Exposer, relation?: object) {
			this.uuid = Utils.generateID();
			this.name = this.constructor.name;
			this.exposer = exposer;
			this.relation = relation || null;
		}

		/**
		 * Initializes data binding for the controller
		 */
		protected bind(): void {
			this.bindings = new Map();

			const containers = Array.from(
				document.querySelectorAll(
					`[controller=${(this as any).name.toLowerCase()}]`
				)
			).reverse() as HTMLElement[];

			for (const container of containers) {
				const binding = new Binding(container);
				binding.bind();
				this.bindings.set(container, binding);
			}
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
			let container = this.sender
				? this.sender.closest(
						`[controller=${(this as any).name.toLowerCase()}]`
				  )
				: null;
			container =
				container ||
				document.querySelector(
					`[controller=${(this as any).name.toLowerCase()}]`
				);

			if (!container) {
				throw new Error(`Container ${(this as any).name} not found!`);
			}

			return container as HTMLElement;
		}

		/**
		 * Binded to the controller data
		 */
		protected get data(): Record<string, any> {
			if (!this.bindings) {
				throw new Error("Use this.bind() to bind your data first!");
			}

			let bindings: Iterable<Binding> = [];
			if (this.sender) {
				const binding = this.bindings.get(this.container);
				if (binding) bindings = [binding];
			} else {
				bindings = this.bindings.values();
			}

			const handler = {
				get: ({ path }: { path: string }, property: any): any => {
					//Nothing found
					const empty = [Symbol.toPrimitive, "toJSON", "toString"];
					if (empty.includes(property)) return () => undefined;
					if (!this.bindings) return undefined;

					path = (path ? path + "." : "") + property;

					const binding = bindings[Symbol.iterator]().next().value as
						| Binding
						| undefined;
					const data = binding?.get(path);
					if (data != null) return data;

					//Continue searching
					return new Proxy({ path }, handler);
				},
				set: (
					{ path }: { path: string },
					property: string,
					value: string
				) => {
					if (!this.bindings) return false;

					path = (path ? path + "." : "") + property;

					for (const binding of bindings) {
						binding.set(path, value);
					}

					return true;
				}
			};

			return new Proxy({ path: "" }, handler);
		}
	}

	//Return controller with specific typings
	return Controller;
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
			let node = event.target as HTMLElement;
			let controller = null;
			//Search for the nearest node with conroller
			while (
				controller == null ||
				(globalThis as any)[controller] == undefined ||
				(globalThis as any)[controller][prop] == undefined
			) {
				controller = node.getAttribute("controller");
				if (controller) {
					controller =
						controller.charAt(0).toUpperCase() +
						controller.slice(1);
				}
				if (node.parentElement) {
					node = node.parentElement;
				} else {
					return;
				}
			}

			//Trying to return exposed controller's function
			return (globalThis as any)[controller][prop];
		}
	}
);

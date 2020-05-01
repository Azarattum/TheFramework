/* eslint @typescript-eslint/explicit-function-return-type: 0 */
import { IComponent } from "./manager.class";
import Exposer from "./exposer.class";
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
			this.placeholders = new Map();

			const containers = document.querySelectorAll(
				`[controller=${(this as any).name.toLowerCase()}]`
			);

			for (const container of containers) {
				const map = new Map();
				this.registerContainer(container as HTMLElement, map);
			}
		}

		/**
		 * Registers data binding for container
		 */
		private registerContainer(
			container: HTMLElement,
			map: Map<string, (HTMLElement | Attr)[]>
		): void {
			if (!this.placeholders) return;

			this.placeholders.set(container, map);

			const placeholders = container.querySelectorAll(
				"placeholder,[placeholder]"
			);

			//Interate through all placeholders
			placeholders.forEach(placeholder => {
				//Register node
				if (placeholder.tagName.toLowerCase() == "placeholder") {
					const name = placeholder.attributes.item(0)?.name;
					if (!name) return;

					if (!map.has(name)) {
						map.set(name, []);
					}

					map.get(name)?.push(placeholder as HTMLElement);
					placeholder.innerHTML = "";
				}
				//Register attribute
				else {
					const placeholderAttribute = placeholder.getAttributeNode(
						"placeholder"
					);
					if (!placeholderAttribute) return;
					//Parse predefined placeholder
					if (placeholderAttribute.value != "-->") {
						const binds = placeholderAttribute.value.split(";");
						for (const bind of binds) {
							if (!bind) continue;
							const parts = bind.split(":");
							const attr = placeholder.getAttributeNode(parts[0]);
							const name = parts[1];

							if (!name || !attr) return;

							if (!map.has(name)) {
								map.set(name, []);
							}

							map.get(name)?.push(attr);
						}
						return;
					}
					//Define new placeholder
					placeholderAttribute.value = "";

					const attributes = placeholder.attributes;
					for (const attribute of attributes) {
						const match = attribute.value.match(
							/<placeholder (\w+)\/><!--/
						);
						if (!match) continue;

						const name = match[1];

						if (!map.has(name)) {
							map.set(name, []);
						}

						placeholderAttribute.value += `${attribute.name}:${name};`;
						map.get(name)?.push(attribute);
						attribute.value = "";
					}
				}
			});
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
		protected get data(): Record<string, string> {
			if (!this.placeholders) {
				throw new Error("Use this.bind() to bind your data first!");
			}

			return new Proxy(
				{},
				{
					get: (object: {}, property: string) => {
						if (!this.placeholders) return undefined;

						let elements:
							| (HTMLElement | Attr)[]
							| undefined = undefined;

						if (this.sender) {
							elements = this.placeholders
								.get(this.container)
								?.get(property);
						} else {
							this.placeholders.forEach(map => {
								elements = elements || map.get(property);
							});
						}

						if (!elements || elements.length <= 0) return undefined;
						return elements[0].nodeValue || elements[0].textContent;
					},
					set: (object: {}, property: string, value: string) => {
						if (!this.placeholders) return false;

						let elements:
							| (HTMLElement | Attr)[]
							| undefined = undefined;

						if (this.sender) {
							elements = this.placeholders
								.get(this.container)
								?.get(property);
						} else {
							elements = [];
							this.placeholders.forEach(map => {
								const prop = map.get(property);
								if (prop) elements?.push(...prop);
							});
						}

						if (!elements) return true;

						elements.forEach(x => {
							x.nodeValue = value;
							x.textContent = value;
						});

						return true;
					}
				}
			);
		}
	}

	//Return controller with specific typings
	return Controller;
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

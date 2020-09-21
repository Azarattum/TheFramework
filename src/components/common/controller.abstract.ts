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
			map: Placeholders
		): void {
			if (!this.placeholders) return;

			this.placeholders.set(container, map);

			const placeholders = container.querySelectorAll(
				"placeholder,[placeholders]"
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

					map.get(name)?.push({
						prefix: "",
						postfix: "",
						element: placeholder as HTMLElement
					});
					placeholder.innerHTML = "";
				}
				//Register attribute
				else {
					const placeholderAttribute = placeholder.getAttributeNode(
						"placeholders"
					);
					if (!placeholderAttribute) return;
					//Parse predefined placeholder
					if (placeholderAttribute.value != "") {
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

							const prefix =
								placeholder.getAttribute("_" + attr.name) || "";
							const postfix =
								placeholder.getAttribute(attr.name + "_") || "";

							map.get(name)?.push({
								prefix: prefix,
								postfix: postfix,
								element: attr
							});
						}
						return;
					}
					//Define new placeholder
					placeholderAttribute.value = "";

					const attributes = placeholder.attributes;
					for (const attribute of attributes) {
						const match = attribute.value.match(
							/^(.*)<placeholder ([\w.]+)\/><!--/
						);
						if (!match) continue;

						const name = match[2];
						const prefix = match[1] || "";
						const postfix =
							placeholder
								.getAttribute(`__postfix_${name}`)
								?.slice(3) || "";

						if (!map.has(name)) {
							map.set(name, []);
						}

						if (prefix) {
							placeholder.setAttribute(
								"_" + attribute.name,
								prefix
							);
						}
						if (postfix) {
							placeholder.setAttribute(
								attribute.name + "_",
								postfix
							);
						}

						placeholderAttribute.value += `${attribute.name}:${name};`;
						map.get(name)?.push({
							prefix: prefix,
							postfix: postfix,
							element: attribute
						});
						attribute.value = prefix + postfix;
						placeholder.removeAttribute(`__postfix_${name}`);
					}
				}
			});

			const bindings = container.querySelectorAll("input[bind]");
			bindings.forEach(binding => {
				const input = binding as HTMLInputElement;
				const path = binding
					.getAttribute("bind")
					?.replace(/^data\.?/, "");
				if (!path) return;

				const handler = (event: Event) => {
					this.sender = input;
					const names = path.split(".");
					const last = names.pop();
					if (!last) return;

					let proxy = this.data;
					for (const name of names) {
						proxy = proxy[name];
					}

					if (["radio", "checkbox"].includes(input.type)) {
						proxy[last] = input.checked;
					} else {
						proxy[last] = input.value;
					}
				};

				if (input.type == "radio") {
					document
						.querySelectorAll(
							`input[type="radio"][name="${input.name}"]`
						)
						.forEach(radio => {
							radio.addEventListener("input", handler);
						});
				} else {
					input.addEventListener("input", handler);
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
		protected get data(): Record<string, any> {
			if (!this.placeholders) {
				throw new Error("Use this.bind() to bind your data first!");
			}

			const handler = {
				get: (object: { _: string }, property: any): any => {
					//Nothing found
					if (
						property == Symbol.toPrimitive ||
						property == "toJSON" ||
						property == "toString"
					) {
						return () => undefined;
					}

					//Prepare new object for recursive search
					const newObject = {
						_: (object._ ? object._ + "." : "") + property
					};

					if (!this.placeholders) return undefined;

					let elements: IPlaceholder[] | undefined = undefined;

					//Try to find the element
					const inputs: Element[] = [];
					if (this.sender) {
						elements = this.placeholders
							.get(this.container)
							?.get(newObject._);
						inputs.push(
							...this.container.querySelectorAll(
								`input[bind="data.${property}"]`
							)
						);
					} else {
						this.placeholders.forEach((map, container) => {
							elements = elements || map.get(newObject._);
							inputs.push(
								...container.querySelectorAll(
									`input[bind="data.${property}"]`
								)
							);
						});
					}

					if (inputs.length > 0) {
						const input = inputs[0] as HTMLInputElement;
						if (["radio", "checkbox"].includes(input.type)) {
							return input.checked;
						} else {
							return input.value;
						}
					}

					//Continue searching
					if (!elements || elements.length <= 0) {
						return new Proxy(newObject, handler);
					}

					const text =
						elements[0].element.nodeValue ||
						elements[0].element.textContent;

					return text?.slice(
						elements[0].prefix.length,
						text.length - elements[0].postfix.length
					);
				},
				set: (
					object: { _: string },
					property: string,
					value: string
				) => {
					if (!this.placeholders) return false;

					property = (object._ ? object._ + "." : "") + property;
					let elements: IPlaceholder[] | undefined = undefined;

					const inputs: Element[] = [];
					if (this.sender) {
						elements = this.placeholders
							.get(this.container)
							?.get(property);

						inputs.push(
							...this.container.querySelectorAll(
								`input[bind="data.${property}"]`
							)
						);
					} else {
						elements = [];
						this.placeholders.forEach((map, container) => {
							const prop = map.get(property);
							if (prop) elements?.push(...prop);
							inputs.push(
								...container.querySelectorAll(
									`input[bind="data.${property}"]`
								)
							);
						});
					}

					//Set data in binded inputs
					for (const input of inputs) {
						(input as HTMLInputElement).value = value;
						(input as HTMLInputElement).checked =
							(value as unknown) === true || value == "true";
					}

					if (!elements) return true;

					elements.forEach(x => {
						x.element.nodeValue = x.prefix + value + x.postfix;
						x.element.textContent = x.prefix + value + x.postfix;
					});

					return true;
				}
			};

			return new Proxy({ _: "" }, handler);
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

/**
 * Placeholders type
 */
type Placeholders = Map<string, IPlaceholder[]>;

/**
 * Placeholder interface
 */
interface IPlaceholder {
	prefix: string;
	postfix: string;
	element: HTMLElement | Attr;
}

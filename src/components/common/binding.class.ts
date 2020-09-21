/**
 * Class for 2-Way data binding
 */
export default class Binding {
	private container: HTMLElement;
	private placeholders: Placeholders;
	private binds: Map<string, Set<HTMLInputElement>>;
	private loops: Map<string, Set<HTMLTemplateElement>>;
	private data: any;
	private removedEvent: Event;

	/**
	 * Creates binding on a container
	 * @param container Managed container
	 */
	public constructor(container: HTMLElement) {
		this.removedEvent = new Event("removed");
		this.placeholders = new Map();
		this.container = container;
		this.loops = new Map();
		this.binds = new Map();
		this.data = {};
	}

	/**
	 * Registers data binding for the container
	 */
	public bind(): void {
		const placeholders = this.container.querySelectorAll(
			"placeholder"
		) as NodeListOf<HTMLElement>;
		const attribholders = this.container.querySelectorAll(
			"[placeholders]"
		) as NodeListOf<HTMLElement>;
		const loops = this.container.querySelectorAll(
			"[iterate]"
		) as NodeListOf<HTMLElement>;
		const binds = this.container.querySelectorAll(
			"input[bind]"
		) as NodeListOf<HTMLInputElement>;

		loops.forEach(this.bindLoop.bind(this));
		attribholders.forEach(this.bindAttribute.bind(this));
		placeholders.forEach(this.bindElement.bind(this));
		binds.forEach(this.bindInput.bind(this));
	}

	/**
	 * Registers element as binded by path
	 * @param path Element path
	 * @param element Element
	 * @param prefix String before variable
	 * @param postfix String after variable
	 */
	private register(
		path: string,
		element: HTMLElement | Attr,
		prefix: string = "",
		postfix: string = ""
	): void {
		let container = element;
		if (element instanceof Attr) {
			container = element.ownerElement as HTMLElement;
		}

		if (!this.container.contains(container)) return;

		if (!this.placeholders.has(path)) {
			this.placeholders.set(path, new Set());
		}

		const placeholder = { prefix, postfix, element };
		this.placeholders.get(path)?.add(placeholder);

		container.addEventListener("removed", () => {
			this.placeholders.get(path)?.delete(placeholder);
		});
	}

	/**
	 * Binds element
	 * @param element Placeholder element
	 */
	private bindElement(element: HTMLElement): void {
		const path = element.attributes.item(0)?.name;
		if (!path || !this.container.contains(element)) return;

		this.register(path, element);
		element.innerHTML = "";

		if ((element as any).observed) return;
		const observer = new MutationObserver(mutationList => {
			const mutation = mutationList[mutationList.length - 1];

			const value = mutation.addedNodes[0]?.textContent || "";
			if (!value) return;
			const path = (mutation.target as HTMLElement).attributes[0].name;
			this.set(path, value);
		});
		observer.observe(element, { childList: true });
		(element as any).observed = true;
	}

	/**
	 * Binds element's attributes
	 * @param element Element with placeholder attribute
	 */
	private bindAttribute(element: HTMLElement): void {
		const attr = element.getAttributeNode("placeholders");
		if (!attr) return;

		//Parse predefined placeholder
		if (attr.value != "") {
			const binds = attr.value.split(";");
			for (const bind of binds) {
				if (!bind) continue;
				const parts = bind.split(":");
				const attribute = element.getAttributeNode(parts[0]);
				const path = parts[1];

				if (!path || !attribute) return;

				const prefix = element.getAttribute("_" + attribute.name) || "";
				const postfix =
					element.getAttribute(attribute.name + "_") || "";

				this.register(path, attribute, prefix, postfix);
			}
			return;
		}

		//Define new placeholder
		attr.value = "";
		const attributes = element.attributes;
		for (const attribute of attributes) {
			const match = attribute.value.match(
				/^(.*)<placeholder ([\w.]+)><!--/
			);
			if (!match) continue;

			const path = match[2];
			const prefix = match[1] || "";
			const postfix =
				element.getAttribute(`__postfix_${path}`)?.slice(17) || "";

			if (prefix) {
				element.setAttribute("_" + attribute.name, prefix);
			}
			if (postfix) {
				element.setAttribute(attribute.name + "_", postfix);
			}

			attribute.value = prefix + postfix;
			attr.value += `${attribute.name}:${path};`;
			this.register(path, attribute, prefix, postfix);

			element.removeAttribute(`__postfix_${path}`);
		}

		if ((element as any).observed) return;
		const observer = new MutationObserver(mutationList => {
			const mutation = mutationList[mutationList.length - 1];

			const name = mutation.attributeName;
			if (!name) return;
			let value = element.getAttribute(name);
			if (!value) return;
			const postfix = element.getAttribute(name + "_") || "";
			const prefix = element.getAttribute("_" + name) || "";
			value = value.slice(prefix.length, value.length - postfix.length);

			let path = null;
			const parts = element.getAttribute("placeholders")?.split(";");
			if (!parts) return;
			for (const part of parts) {
				if (part.split(":")[0] == name) {
					path = part.split(":")[1];
				}
			}
			if (!path) return;
			this.set(path, value);
		});
		observer.observe(element, { attributes: true });
		(element as any).observed = true;
	}

	/**
	 * Binds input element
	 * @param element Input element
	 */
	private bindInput(element: HTMLInputElement): void {
		const attr = element.getAttributeNode("bind");
		if (!attr?.value.startsWith("data.")) return;
		if (!this.container.contains(element)) return;
		const path = attr.value.slice(5);
		attr.value = path;

		const handler = (): void => {
			if (["radio", "checkbox"].includes(element.type)) {
				this.set(path, element.checked);
			} else {
				this.set(path, element.value);
			}
		};

		if (element.type == "radio") {
			const adjacents = this.container.querySelectorAll(
				`input[type="radio"][name="${element.name}"]`
			);

			adjacents.forEach(radio => {
				radio.addEventListener("input", handler);
			});
		} else {
			element.addEventListener("input", handler);
		}

		handler();

		if (!this.binds.has(path)) {
			this.binds.set(path, new Set());
		}

		this.binds.get(path)?.add(element);
		element.addEventListener("removed", () => {
			this.binds.get(path)?.delete(element);
		});
	}

	/**
	 * Binds elements which are use as loops
	 * @param element Element with "iterate" attribute
	 */
	private bindLoop(element: HTMLElement): void {
		const through = element.getAttributeNode("iterate");
		if (!through || !this.container.contains(element)) return;
		through.value = through.value.replace("data.", "");

		const template = document.createElement("template");
		template.content.appendChild(element.cloneNode(true));
		element.parentNode?.replaceChild(template, element);

		if (!this.loops.has(through.value)) {
			this.loops.set(through.value, new Set());
		}

		this.loops.get(through.value)?.add(template);
		template.addEventListener("removed", () => {
			this.loops.get(through.value)?.delete(template);
		});
	}

	/**
	 * Creates a new loop element based on loop template
	 * @param path Loop path
	 * @param index Element index
	 */
	private createLoopElement(
		element: HTMLTemplateElement,
		index: number
	): void {
		const content = element.content.firstElementChild;
		if (!content) return;
		const through = content.getAttribute("iterate");
		if (!through) return;

		const node = content.cloneNode(true) as HTMLElement;

		//Find new elements
		const placeholders = node.querySelectorAll("placeholder") as NodeListOf<
			HTMLElement
		>;
		const attributes = node.querySelectorAll(
			"[placeholders]"
		) as NodeListOf<HTMLElement>;
		const loops = node.querySelectorAll("[iterate]") as NodeListOf<
			HTMLElement
		>;
		const binds = node.querySelectorAll("[bind]") as NodeListOf<
			HTMLInputElement
		>;

		//Parse inner placeholders
		placeholders.forEach(placeholder => {
			const attr = placeholder.attributes[0].name;
			const newAttr = attr.replace(through, `${through}.${index}`);

			placeholder.removeAttribute(attr);
			placeholder.setAttribute(newAttr, "");

			this.bindElement(placeholder as HTMLElement);
		});
		//Parse inner attributes
		attributes.forEach(attribute => {
			//Use bind here to parse raw attribute data
			this.bindAttribute(attribute);
			let attr = attribute.getAttribute("placeholders");
			if (!attr) return;
			const pattern = (":" + through).replace(
				/[.*+\-?^${}()|[\]\\]/g,
				"\\$&"
			);
			attr = attr.replace(
				new RegExp(pattern, "g"),
				`:${through}.${index}`
			);

			attribute.setAttribute("placeholders", attr);
		});
		//Parse inner loops
		loops.forEach(special => {
			let attr = special.getAttribute("iterate") || "";
			attr = attr.replace(through, `${through}.${index}`);
			special.setAttribute("iterate", attr);
		});
		//Parse inner binds
		binds.forEach(special => {
			let attr = special.getAttribute("bind") || "";
			attr = attr.replace(through, `${through}.${index}`);
			special.setAttribute("bind", attr);
		});
		//Parse self attribute
		this.bindAttribute(node);
		let attr = node.getAttribute("placeholders");
		if (attr) {
			const pattern = (":" + through).replace(
				/[.*+\-?^${}()|[\]\\]/g,
				"\\$&"
			);
			attr = attr.replace(
				new RegExp(pattern, "g"),
				`:${through}.${index}`
			);
			node.setAttribute("placeholders", attr);
		}

		//Insert loop element
		element.parentNode?.insertBefore(node, element);

		//Bind new elements
		loops.forEach(this.bindLoop.bind(this));
		binds.forEach(this.bindInput.bind(this));
		attributes.forEach(this.bindAttribute.bind(this));
		placeholders.forEach(this.bindElement.bind(this));
		this.bindAttribute(node);
	}

	/**
	 * Gets binded property
	 * @param path Property's path
	 */
	public get(path?: string): any {
		if (!path) return this.data;

		let object: any = this.data;
		const parts = path.split(".");
		for (const prop of parts) {
			if (object[prop] === undefined) object[prop] = {};
			object = object[prop];
		}

		return object;
	}

	/**
	 * Sets binded property
	 * @param path Property's path
	 * @param value New property's value
	 */
	public set(path: string, value: any, html: boolean = false): boolean {
		let changed = false;

		//Update nested objects
		if (typeof value == "object") {
			//Process array
			const loops = this.loops.get(path) || [];
			if (Array.isArray(value)) {
				//Remove unnecessary elements
				for (const loop of loops) {
					let node = loop.previousElementSibling;
					while (node) {
						const sibling = node.previousElementSibling;
						if (node.getAttribute("iterate") == path) {
							node.remove();
							node.querySelectorAll(
								"template,placeholder,[placeholders],[bind]"
							).forEach(x => {
								x.dispatchEvent(this.removedEvent);
							});
						}
						node = sibling;
					}
				}
			}
			for (const key in value) {
				if (Array.isArray(value)) {
					for (const loop of loops) {
						this.createLoopElement(loop, +key);
					}
				}

				changed =
					this.set(path + "." + key, value[key], html) || changed;
			}

			return changed;
		}

		//Update binded elements
		this.binds.get(path)?.forEach(binding => {
			if (binding.getAttribute("bind") === path) {
				if (["radio", "checkbox"].includes(binding.type)) {
					if (
						(binding.checked != value) === true ||
						value == "true"
					) {
						binding.checked = value === true || value == "true";
						if (binding.value == value) {
							binding.dispatchEvent(new Event("input"));
							changed = true;
						}
					}
				} else if (binding.value != value.toString()) {
					binding.value = value as string;
					if (binding.value == value) {
						binding.dispatchEvent(new Event("input"));
						changed = true;
					}
				}
			}
		});

		//Update placeholders
		const placeholders = this.placeholders.get(path);
		placeholders?.forEach(placeholder => {
			const text = placeholder.prefix + value + placeholder.postfix;
			const element = placeholder.element;
			if (element instanceof Attr) {
				if (element.nodeValue != text) {
					element.nodeValue = text;
					changed = true;
				}
			} else {
				if (html) {
					if (element.innerHTML != text) {
						element.innerHTML = text;
						changed = true;
					}
				} else {
					if (element.textContent != text) {
						element.textContent = text;
						changed = true;
					}
				}
			}
		});

		//Update data value
		if (changed && value !== undefined) {
			let object: any = this.data;
			const parts = path.split(".");
			const last = parts.pop();
			if (last) {
				for (const prop of parts) {
					if (typeof object[prop] !== "object") object[prop] = {};
					object = object[prop];
				}
				object[last] = value.toString();
			}
		}

		return changed;
	}
}

/**
 * Placeholders type
 */
export type Placeholders = Map<string, Set<IPlaceholder>>;

/**
 * Placeholder interface
 */
export interface IPlaceholder {
	prefix: string;
	postfix: string;
	element: HTMLElement | Attr;
}

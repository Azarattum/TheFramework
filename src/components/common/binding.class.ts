/**
 * Class for 2-Way data binding
 */
export default class Binding {
	private container: HTMLElement;
	private placeholders: Placeholders;
	private binds: NodeListOf<HTMLInputElement> | null;
	private data: any;

	/**
	 * Creates binding on a container
	 * @param container Managed container
	 */
	public constructor(container: HTMLElement) {
		this.container = container;
		this.placeholders = new Map();
		this.data = {};
		this.binds = null;
	}

	/**
	 * Registers data binding for the container
	 */
	public bind(): Placeholders {
		const map = this.placeholders;
		const placeholders = this.container.querySelectorAll(
			"placeholder,[placeholders]"
		) as NodeListOf<HTMLElement>;
		const binds = this.container.querySelectorAll(
			`input[bind]`
		) as NodeListOf<HTMLInputElement>;

		//Interate through all placeholders
		placeholders.forEach(placeholder => {
			if (placeholder.tagName.toLowerCase() == "placeholder") {
				this.bindElement(placeholder);
			} else {
				this.bindAttribute(placeholder);
			}
		});

		binds.forEach(this.bindInput.bind(this));
		this.binds = binds;
		return map;
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
		if (!this.placeholders.has(path)) {
			this.placeholders.set(path, []);
		}

		this.placeholders.get(path)?.push({ prefix, postfix, element });
	}

	/**
	 * Binds element
	 * @param element Placeholder element
	 */
	private bindElement(element: HTMLElement): void {
		const path = element.attributes.item(0)?.name;
		if (!path) return;

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
			const adjacents = document.querySelectorAll(
				`input[type="radio"][name="${element.name}"]`
			);

			adjacents.forEach(radio => {
				radio.addEventListener("input", handler);
			});
		} else {
			element.addEventListener("input", handler);
		}

		handler();
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
	public set(path: string, value: any): boolean {
		let changed = false;

		//Update binded elements
		this.binds?.forEach(binding => {
			if (binding.getAttribute("bind") === path) {
				if (["radio", "checkbox"].includes(binding.type)) {
					if (
						(binding.checked != value) === true ||
						value == "true"
					) {
						binding.checked = value === true || value == "true";
						if (binding.value == value) {
							binding.dispatchEvent(new Event("input"));
						}
						changed = true;
					}
				} else if (binding.value != value.toString()) {
					binding.value = value as string;
					if (binding.value == value) {
						binding.dispatchEvent(new Event("input"));
					}
					changed = true;
				}
			}
		});

		//Update data value
		const placeholders = this.placeholders.get(path);
		if (changed || (placeholders && placeholders.length > 0)) {
			let object: any = this.data;
			const parts = path.split(".");
			const last = parts.pop();
			if (last) {
				for (const prop of parts) {
					if (object[prop] === undefined) object[prop] = {};
					object = object[prop];
				}
				object[last] = value.toString();
			}
		}
		if (!placeholders || placeholders.length <= 0) return changed;

		//Update placeholders
		placeholders.forEach(placeholder => {
			const text = placeholder.prefix + value + placeholder.postfix;
			const element = placeholder.element;
			if (element.nodeValue != text) element.nodeValue = text;
			if (element.textContent != text) element.textContent = text;
		});

		return true;
	}
}

/**
 * Placeholders type
 */
export type Placeholders = Map<string, IPlaceholder[]>;

/**
 * Placeholder interface
 */
export interface IPlaceholder {
	prefix: string;
	postfix: string;
	element: HTMLElement | Attr;
}

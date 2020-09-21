/**
 * Class for 2-Way data binding
 */
export default class Binding {
	private container: HTMLElement;
	private placeholders: Placeholders;
	private binds: NodeListOf<HTMLInputElement> | null;
	private data: Map<string, string>;

	/**
	 * Creates binding on a container
	 * @param container Managed container
	 */
	public constructor(container: HTMLElement) {
		this.container = container;
		this.placeholders = new Map();
		this.data = new Map();
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
	public get(path: string): string | undefined {
		return this.data.get(path);
	}

	/**
	 * Sets binded property
	 * @param path Property's path
	 * @param value New property's value
	 */
	public set(path: string, value: any): void {
		//Update data value
		this.data.set(path, value);

		//Update binded elements
		this.binds?.forEach(binding => {
			if (binding.getAttribute("bind") === path) {
				binding.value = value as string;
				binding.checked = value === true || value == "true";
			}
		});

		//Update placeholders
		const placeholders = this.placeholders.get(path);
		if (!placeholders) return;

		placeholders.forEach(placeholder => {
			placeholder.element.nodeValue =
				placeholder.prefix + value + placeholder.postfix;
			placeholder.element.textContent =
				placeholder.prefix + value + placeholder.postfix;
		});
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

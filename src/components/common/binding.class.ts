import { format } from "./utils.class";

/**
 * Class for 2-Way data binding
 */
export default class Binding {
	/**All the tracked binding elements */
	private elements: Map<string, Set<HTMLElement>>;
	/**All the loop templates */
	private templates: Map<string, Set<HTMLTemplateElement>>;
	/**Main container of the binding object */
	private container: HTMLElement;
	/**Cached data inside the binding object */
	private data: IData;
	/**Observer of any changes within binding container */
	private observer: MutationObserver;
	/**Handles all mutations for the observer */
	private handler: MutationCallback;

	/**
	 * Creates binding on a container
	 * @param container Managed container
	 */
	public constructor(container: HTMLElement) {
		this.container = container;
		this.templates = new Map();
		this.elements = new Map();
		this.data = {};

		this.handler = (mutationsList, observer): void => {
			for (const mutation of mutationsList) {
				//Add deleted/add node in elemets
				this.updateElements(mutation.addedNodes, true);
				this.updateElements(mutation.removedNodes, false);
			}
		};

		//Observe changes in the container
		this.observer = new MutationObserver(this.handler);
		this.observer.observe(this.container, {
			childList: true,
			subtree: true
		});

		if (container.hasAttribute("bind")) {
			this.updateElements([container] as any, true);
		}
		this.updateElements(container.querySelectorAll(`[bind]`), true);
	}

	/**
	 * Performs all necessary updates on newly added/removed elements
	 * @param elements Elements to update
	 * @param add Were elements added(true) or removed(false)
	 */
	private updateElements(elements: NodeList, add: boolean): void {
		const renders: [HTMLElement, string][] = [];
		const changes: [string, string][] = [];

		(elements as NodeListOf<HTMLElement>).forEach(x => {
			if (x.nodeType !== x.ELEMENT_NODE) return;
			if (!x.hasAttribute("bind")) {
				this.updateElements(x.childNodes, add);
				return;
			}
			const paths: string[] = [];

			if (x.tagName == "TEMPLATE" && x.hasAttribute("each")) {
				const bind = x.getAttribute("bind");
				if (!bind) return;
				const elements = this.templates.get(bind) || new Set();
				if (add) {
					elements.add(x as HTMLTemplateElement);
				} else {
					elements.delete(x as HTMLTemplateElement);
				}
				this.templates.set(bind, elements);

				try {
					const data =
						this.get(bind) ||
						JSON.parse(x.getAttribute(`bind-${bind}`) || "null");
					if (data != null) {
						this.set(bind, data);
						x.removeAttribute(`bind-${bind}`);
					}
				} catch {
					//Do nothing
				}
				return;
			}

			for (const attr of x.attributes) {
				let name = attr.name;
				if (!name.startsWith("bind-")) continue;
				name = name.replace("bind-", "");
				paths.push(name);

				const elements = this.elements.get(name) || new Set();
				if (add) {
					try {
						//Update changes to the data
						const data = this.get(name);
						if (data != null) {
							attr.value =
								typeof data == "string"
									? data
									: JSON.stringify(data);
						} else {
							changes.push([attr.value || "", name]);
						}
					} catch {
						//Trying to access a string path
					}

					renders.push([x, name]);
					elements.add(x);
				} else {
					elements.delete(x);
				}

				this.elements.set(name, elements);
			}

			//Evaluate constant binds
			if (paths.length <= 0 && add) {
				renders.push([x, ""]);
			}

			//Register input events
			if (paths.length && x instanceof HTMLInputElement) {
				let timeout = -1;
				const handler = (): void => {
					clearTimeout(timeout);
					timeout = +setTimeout(() => {
						const checker = ["radio", "checkbox"].includes(x.type);
						const value = checker
							? x.checked
								? "true"
								: ""
							: x.value;

						//Update only paths that affect the value
						const exp = JSON.parse(x.getAttribute("bind") || "{}")[
							checker ? "checked" : "value"
						] as string;
						if (!exp) return;

						paths.forEach(path => {
							const valExp = exp.replace(
								this.varRegex(path),
								`$1"${value
									.replace(/\\/g, "\\\\")
									.replace(/"/g, '\\"')}"`
							);
							if (exp == valExp) return;
							this.set(path, eval(valExp));
						});
					});
				};

				if (add) {
					if (x.type == "radio") {
						this.container
							.querySelectorAll(
								`input[type="radio"][name="${x.name}"]`
							)
							.forEach(y => y.addEventListener("input", handler));
					} else {
						x.addEventListener("input", handler);
					}
				}
			}

			this.updateElements(x.childNodes, add);
		});

		if (!add) return;

		changes.sort((a, b) => (a[1] < b[1] ? -1 : a[1] == b[1] ? 0 : 1));
		renders.sort((a, b) => (a[1] < b[1] ? -1 : a[1] == b[1] ? 0 : 1));

		changes.forEach(([value, path]) => this.updateData(path, value));
		renders.forEach(([element, path]) => this.updateElement(element, path));
	}

	/**
	 * Returns a regex for finding variable in a string
	 * @param variable Variable to find
	 */
	private varRegex(variable: string): RegExp {
		return new RegExp(
			`(^|[^A-Za-z0-9_$.])(${variable})(?=$|[^A-Za-z0-9_$])`,
			"gi"
		);
	}

	/**
	 * Replaces the specified variable in a context
	 * with qoutes and template literals
	 * @param expression Expression to replace in
	 * @param variable Variable name to replace
	 * @param replacement A new value
	 */
	private replaceVariable(
		expression: string,
		variable: string,
		replacement: string
	): string {
		const removeQuoted = (string: string, qouted: string[]): string => {
			const quotes = ['"', "'", "`", "/"];

			let balance = -1;
			let quote = null;
			let updated = "";
			for (let i = 0; i < string.length; i++) {
				const char = string[i];
				if (char == "\\") {
					i++;
					continue;
				}

				if (balance >= 0) {
					if (char == "{") balance++;
					if (char == "}") balance--;
					if (balance <= -1) {
						updated += `{${qouted.length}}`;
						qouted.push(char);
						continue;
					}
					updated += char;
				} else {
					if (!quote) {
						if (quotes.includes(char)) {
							quote = char;
							updated += `{${qouted.length}}`;
							qouted.push(char);
							continue;
						}
						updated += char;
					} else {
						qouted[qouted.length - 1] += char;
						if (char == quote) {
							quote = null;
						} else if (
							quote == "`" &&
							char == "$" &&
							string[i + 1] == "{"
						) {
							i++;
							qouted[qouted.length - 1] += "{";
							balance = 0;
						}
					}
				}
			}

			return updated;
		};

		const quoted: string[] = [];
		const updated = removeQuoted(expression, quoted).replace(
			this.varRegex(variable),
			"$1" + replacement
		);

		return format(updated, ...quoted);
	}

	/**
	 * Creates an evaluation scope from element's attributes
	 * @param attributes Attributes of the reference scope element
	 */
	private createScope(attributes: NamedNodeMap): [string, string] {
		let expression = attributes.getNamedItem("bind")?.value;
		if (!expression) return ["", ""];

		let scope = "";
		for (const attr of attributes) {
			let name = attr.name;
			if (!name.startsWith("bind-")) continue;
			name = name.replace("bind-", "");
			if (expression && !expression.match(this.varRegex(name))) {
				continue;
			}
			if (expression) {
				expression = expression.replace(
					this.varRegex(name),
					"$1" +
						name
							.replace(/\./g, "_")
							.replace(/-/g, "__")
							.toLowerCase()
				);
			}

			const data = this.get(name);
			scope += `const ${name.replace(/\./g, "_").replace(/-/g, "__")}='${(
				(typeof data == "string" ? data : JSON.stringify(data)) || ""
			)
				.replace(/\\/g, "\\\\")
				.replace(/'/g, "\\'")
				.replace(/\n/g, "\\n")}';`;
		}

		return [expression, scope];
	}

	/**
	 * Converts any object to IData string only object
	 * @param object Any normal object
	 */
	private makeDataObject(object: Record<string, any>): IData {
		if (object instanceof Date) {
			return object.toString() as any;
		}

		object = Object.assign({}, object);
		for (const key in object) {
			if (typeof object[key] == "object") {
				object[key] = this.makeDataObject(object[key]);
			} else {
				object[key] = object[key]?.toString() || "";
			}
		}

		return object;
	}

	/**
	 * Updates the layout of all the template loop elements
	 * @param element Template loop element
	 * @param path Path to updating object
	 * @param value Updating object
	 */
	private updateLoop(
		element: HTMLTemplateElement,
		path: string,
		value: Record<string, any> | string
	): void {
		if (typeof value == "string") value = {};
		const iterable = element.getAttribute("value");
		const index = element.getAttribute("key");
		const existing = new Set() as Set<string>;
		const keys = Object.keys(value);

		//Remove not needed elements
		let current: HTMLElement;
		let next = element.nextSibling as HTMLElement;
		while (next) {
			current = next;
			next = current.nextSibling as HTMLElement;
			if (current.nodeType != current.ELEMENT_NODE) continue;

			const one = current.getAttribute("one")?.toLowerCase();
			if (!one || !one.startsWith(path) || one == path) continue;

			const key = one.replace(`${path}.`, "");
			if (keys.includes(key)) {
				existing.add(key);
			} else {
				current.remove();
			}
		}

		const selectWithTemplates = (
			element: Element | DocumentFragment,
			iterable: string | null,
			index: string | null
		): Element[] => {
			const results = [...element.querySelectorAll("[bind], [each]")];
			results.filter(x =>
				[...x.attributes].find(
					a =>
						a.name.startsWith(`bind-${iterable}.`) ||
						a.name == `bind-${iterable}` ||
						a.name == `bind-${index}` ||
						a.name == "each"
				)
			);

			element.querySelectorAll("template").forEach(x => {
				results.push(
					...selectWithTemplates(x.content, iterable, index)
				);
			});

			return results;
		};

		//Add new elements
		current = element;
		const map = new Map<
			Element,
			{ bind: string; changes: Map<string, string>; indexOnly: boolean }
		>();
		const node = element.content.cloneNode(true) as HTMLElement;
		const step = [...node.childNodes].filter(
			x => x.nodeType != x.TEXT_NODE || x.textContent?.trim()
		).length;
		const iterables = selectWithTemplates(node, iterable, index);

		//Prepare iterables for changes
		iterables.forEach(x => {
			//Save initial state
			map.set(x, {
				bind: x.getAttribute("bind") || "",
				changes: new Map(),
				indexOnly: ![...x.attributes].find(
					x =>
						x.name == `bind-${iterable}` ||
						x.name.startsWith(`bind-${iterable}.`)
				)
			});

			x.removeAttribute(`bind-${index}`);
		});

		//Make sure that an element exist for each key
		for (const key of keys) {
			//Skip existing elements
			if (existing.has(key)) {
				for (let i = 0; i < step; i++) {
					current = (current.nextSibling as HTMLElement) || current;
				}
				continue;
			}

			//Dynamicly replace node's content keys
			iterables.forEach(x => {
				let expression = map.get(x)?.bind;
				if (!expression || !iterable) return;

				try {
					//For JSON encoded attributes
					const object = JSON.parse(expression);
					if (typeof object != "object") throw "";

					for (const i in object) {
						object[i] = this.replaceVariable(
							object[i],
							iterable,
							`${path}.${key}`
						);
						if (!index) continue;
						object[i] = this.replaceVariable(
							object[i],
							index,
							`"${key}"`
						);
					}

					expression = JSON.stringify(object);
				} catch {
					//For a normal content expression
					expression = this.replaceVariable(
						expression,
						iterable,
						`${path}.${key}`
					);
					if (index) {
						expression = this.replaceVariable(
							expression,
							index,
							`"${key}"`
						);
					}
				}

				x.setAttribute("bind", expression);
				if (x.tagName === "TEMPLATE" && x.hasAttribute("each")) return;
				if (map.get(x)?.indexOnly) return;
				try {
					//Replace all the attributes
					for (const attr of x.attributes) {
						if (
							attr.name == `bind-${iterable}` ||
							attr.name.startsWith(`bind-${iterable}.`)
						) {
							const name = attr.name.replace(
								`bind-${iterable}`,
								`bind-${path}.${key}`
							);

							map.get(x)?.changes.set(attr.name, name);
							x.setAttribute(name, "");
							x.removeAttribute(attr.name);
						}
					}
				} catch (error) {
					if (error instanceof DOMException) {
						throw new Error(
							`"${key}" is an unacceptable binding key!`
						);
					}
				}
			});

			//Insert a new element
			for (let child of node.childNodes) {
				//Wrap any text in a span
				if (child.nodeType == child.TEXT_NODE) {
					if (!child.textContent?.trim()) continue;
					const span = document.createElement("span");
					span.textContent = child.textContent;
					child = span;
				}

				current =
					(current.insertAdjacentElement(
						"afterend",
						child.cloneNode(true) as HTMLElement
					) as HTMLElement) || current;
				current.setAttribute("one", `${path}.${key}`);
			}

			//Clean up the template
			iterables.forEach(x => {
				//Replace back all the attributes
				const backup = map.get(x);
				if (!backup) return;
				x.setAttribute("bind", backup.bind);
				backup.changes.forEach((changed, old) => {
					x.setAttribute(old, "");
					x.removeAttribute(changed);
				});
				backup.changes.clear();
			});
		}

		//Force update the observer before next call
		const records = this.observer.takeRecords();
		this.handler(records, this.observer);
	}

	/**
	 * Updates all the binded content of a single given element
	 * @param element Element to update
	 * @param path Data path to update
	 * @param data Optional data value, will be used as cache to avoid recompution
	 */
	private updateElement(
		element: HTMLElement,
		path: string,
		data?: IData | string
	): void {
		const tag = element.tagName;
		const [expression, scope] = this.createScope(element.attributes);

		if (tag == "DATA-TEXT" || tag == "DATA-HTML") {
			//Data elements
			this.updateContent(
				element,
				expression || path.replace(/\./g, "_"),
				scope
			);
		} else {
			//Attributes
			this.updateAttributes(element, expression, scope);
		}

		if (!path) return;
		data = data || this.get(path);
		element.setAttribute(
			`bind-${path}`,
			typeof data == "string" ? data : JSON.stringify(data)
		);
	}

	/**
	 * Updates element's content with current data
	 * @param element Element to update
	 * @param expression Expression to update with
	 * @param scope Scope string to eval with depending variables
	 */
	private updateContent(
		element: HTMLElement,
		expression: string | null,
		scope: string
	): void {
		//Evaluate the value
		const result = (function (): string {
			return eval(scope + `(${expression})`);
		})();

		//Insert content
		if (element.tagName == "DATA-TEXT") {
			element.textContent = result;
		} else if (element.tagName == "DATA-HTML") {
			element.innerHTML = result;
		}
	}

	/**
	 * Updates element's attributes with current data
	 * @param element Element to update
	 * @param expression Expression to update with
	 * @param scope Scope string to eval with depending variables
	 */
	private updateAttributes(
		element: HTMLElement,
		expression: string | null,
		scope: string
	): void {
		//Parse expression
		let expressions;
		try {
			expressions = JSON.parse(expression || "null") as Record<
				string,
				string
			>;
		} catch {
			throw new Error(
				`Malformed JSON bind expression '${expression}' on element '${element}'`
			);
		}
		if (typeof expressions != "object") return;

		//Iterate through the all binded attributes
		for (const attr in expressions) {
			let exp = expressions[attr];

			//Parse style
			let isStyle = false;
			if (exp.startsWith("pug.style(")) {
				isStyle = true;
				exp = exp.slice(0, exp.length - 1).replace("pug.style(", "");
			}
			//Parse calsses
			let isClasses = false;
			if (exp.startsWith("pug.classes(")) {
				isClasses = true;
				scope = `const pug={classes: (x) => x};` + scope;
			}

			//Evaluate the value
			const result = (function (): any {
				return eval(scope + `(${exp})`);
			})();

			//Apply the value
			if (isStyle) {
				//Support for style-as-object syntax
				if (typeof result == "object") {
					for (const prop in result) {
						element.style[prop as any] = result[prop];
					}
				} else {
					element.style.cssText = result.toString();
				}
			} else if (isClasses) {
				//Support for classes syntax
				const classes =
					typeof result == "object"
						? Object.values(result).map((x: any) => x.toString())
						: result.split(" ");

				element.className = classes.join(" ");
			} else {
				if (result === "" || result === false || result == null) {
					element.removeAttribute(attr);
				} else {
					element.setAttribute(attr, result.toString());
				}

				if (attr.toLowerCase() == "value") {
					(element as any).value = result.toString();
				}
				if (attr.toLowerCase() == "checked") {
					(element as any).checked = !!result;
				}
			}
		}
	}

	/**
	 * Updates the data at a given path to a new value
	 * @param path Data's path
	 * @param value New data value
	 */
	private updateData(
		path: string,
		value?: IData | string
	): [boolean, string | IData] {
		//Parse the path
		let object: IData | string = this.data;
		const parts = path.split(".");
		const last = parts.pop() as string;
		for (const prop of parts) {
			if (typeof object[prop] !== "object") object[prop] = {};
			object = object[prop] as IData;
		}
		const dest = object[last];

		if (value == undefined) return [false, dest];

		//Parse non object types
		if (typeof value != "object") {
			value = (value?.toString() || "") as string;
			//When trying to override object
			if (typeof dest === "object") {
				try {
					const parsed = this.makeDataObject(JSON.parse(value));
					value = parsed;
				} catch {
					value = {};
				}
			}
		}

		const diff = JSON.stringify(object[last]) === JSON.stringify(value);
		if (diff) return [false, dest];

		object[last] = value as IData | string;
		return [true, object[last]];
	}

	/**
	 * Gets binded property
	 * @param path Property's path
	 */
	public get(path?: string): IData | string {
		if (!path) return this.data;
		path = path.toLowerCase();

		let object: IData | string = this.data;
		const parts = path.split(".");
		for (const prop of parts) {
			if (typeof object == "string") {
				throw new TypeError(
					`Cannot read property '${prop}' of ${object.toString()} at path '${path}'`
				);
			}

			object = object[prop];
			if (object === undefined) break;
		}

		return object;
	}

	/**
	 * Sets binded property
	 * @param path Property's path
	 * @param value New property's value
	 * @param mode A mode for value to be set
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public set(path: string, value?: any, mode = SetMode.Normal): void {
		//Promise support
		if (value instanceof Promise) {
			value.then(resolved => {
				this.set(path, resolved, mode);
			});
			return;
		}
		//Normalize the input
		path = path.toLowerCase();
		value = typeof value == "object" ? this.makeDataObject(value) : value;
		if (value === false) value = "";
		let old;
		try {
			old = this.get(path);
		} catch {
			old = undefined;
		}
		const keys =
			typeof old === "object" ? new Set(Object.keys(old)) : new Set();

		//Update the data
		const [changed, data] = this.updateData(
			path,
			mode === SetMode.Recursive ? undefined : value
		);
		if (mode === SetMode.Normal && changed === null) return;

		//Recursive remap for objects
		if (typeof data == "object" || typeof old == "object") {
			//Update loop elements
			this.templates.get(path)?.forEach(x => {
				this.updateLoop(x, path, data);
			});
		}

		//Update all the elements
		this.elements
			.get(path)
			?.forEach(x => this.updateElement(x, path, data));

		//Perform recursive update
		keys.forEach(key => this.set(path + "." + key, "", SetMode.Recursive));

		//Update parent
		if (mode == SetMode.Recursive) return;
		const index = path.lastIndexOf(".");
		if (index != -1) {
			this.set(path.substring(0, index));
		}
	}

	/**
	 * Closes and disconnects binding from the container
	 */
	public close(): void {
		this.data = {};
		this.elements = new Map();
		this.observer.disconnect();
	}
}

/**
 * Binded data cache interface
 */
interface IData {
	[prop: string]: IData | string;
}

/**
 * Data setting mode
 */
enum SetMode {
	Normal,
	Force,
	Recursive
}

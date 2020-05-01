/**
 * Represents a view component
 */
export default abstract class View {
	public type = "Views";
	public readonly name: string;
	protected template: Function | null;
	private windowLoaded: boolean;

	/**
	 * Creates new view component
	 * @param name The name of view
	 */
	public constructor(name: string, template: Function | null = null) {
		this.name = name;
		this.windowLoaded = document.readyState === "complete";
		this.template = template;

		if (this.windowLoaded) return;
		window.addEventListener("load", () => {
			this.windowLoaded = true;
			if (this.template) {
				this.render(this.template);
			}
		});
	}

	/**
	 * Initializes view component by rendering it
	 * @param args View render arguments
	 */
	public async initialize(args: {}): Promise<void> {
		this.render(null, args);
	}

	/**
	 * Renders the content to the view's container
	 * @param content View content
	 */
	public render(
		template: Function | null = null,
		args: Record<string, any> = {}
	): void {
		if (!this.windowLoaded) {
			this.template = template;
			return;
		}
		if (!template) {
			template = this.template;
		}
		if (!args) {
			args = {};
		}

		this.container.forEach(x => {
			if (!template) return;

			//Wrap functional arguments
			const xArgs = {};
			for (const key in args) {
				if (Object.prototype.hasOwnProperty.call(args, key)) {
					const value = (args as any)[key];
					if (typeof value == "function") {
						(xArgs as any)[key] = (...args: any[]): any => {
							return value(x, ...args);
						};
					} else {
						(xArgs as any)[key] = value;
					}
				}
			}
			(xArgs as any)["data"] = this.data;

			x.innerHTML = template(xArgs);
		});
		this.template = null;
	}

	/**
	 * Toggles visibility of view's container
	 * @param visible Container visibility
	 */
	public toggle(visible: boolean | null = null): void {
		if (visible == null) {
			if (this.container[0].style.display == "none") {
				visible = true;
			} else {
				visible = false;
			}
		}

		if (visible) {
			this.container.forEach(x => {
				x.style.display = "block";
			});
		} else {
			this.container.forEach(x => {
				x.style.display = "none";
			});
		}
	}

	/**
	 * Data proxy for placeholders
	 */
	private get data(): Record<string, string> {
		const handler = {
			get: (object: { _: string }, property: any): any => {
				if (
					property == Symbol.toPrimitive ||
					property == "toJSON" ||
					property == "toString"
				) {
					return (): string =>
						`<placeholder ${object._}><!--"placeholders __postfix_${object._}="--></placeholder>`;
				}

				const newObject = {
					_: (object._ ? object._ + "." : "") + property
				};
				return new Proxy(newObject, handler);
			}
		};

		return new Proxy({ _: "" }, handler);
	}

	/**
	 * The container associated with current view
	 */
	private get container(): NodeListOf<HTMLElement> {
		const container = document.querySelectorAll(
			`[view=${this.name.toLowerCase()}]`
		);

		if (!container) {
			throw new Error(`Container ${this.name} not found!`);
		}

		return container as NodeListOf<HTMLElement>;
	}
}

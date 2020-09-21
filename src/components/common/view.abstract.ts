/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { IComponent } from "./manager.class";
import Utils, { LogType } from "./utils.class";

/**
 * View class type generator
 */
export default function View(template: Function) {
	/**
	 * Abstract class of a view component
	 */
	abstract class View implements IComponent {
		/**Component type */
		public static type: string = "Views";
		/**View name */
		public readonly name: string;
		/**View universal unique id */
		public readonly uuid: string;
		/**The container associated with current view */
		protected readonly container: HTMLElement | null;
		/**HTML template function */
		protected template: Function;
		/**Whether the view is rendered now */
		private rendered: boolean;

		/**
		 * Creates new view component
		 * @param name The name of view
		 */
		public constructor(exposer: any, relation?: object) {
			this.uuid = Utils.generateID();
			this.name = this.constructor.name;
			this.template = template;
			this.rendered = false;

			if (relation instanceof HTMLElement) {
				this.container = relation;
			} else {
				if (!relation) {
					Utils.log(
						`Container for view ${this.name} not found!`,
						LogType.WARNING
					);
				} else {
					Utils.log(
						`${relation} is not a valid container for view ${this.name}!`,
						LogType.ERROR
					);
				}
				this.container = null;
			}

			this.render();
		}

		/**
		 * All relational objects (html elements) displayed by this view
		 */
		public static get relations(): object[] {
			return Array.from(
				document.querySelectorAll(`[view=${this.name.toLowerCase()}]`)
			);
		}

		/**
		 * Initializes view component by rendering it
		 * @param args View render arguments
		 */
		public async initialize(args?: Record<string, any>): Promise<void> {
			if (!this.rendered || args) {
				this.render(args);
			}
		}

		/**
		 * Renders the content to the view's container
		 * @param content View content
		 */
		public render(args: Record<string, any> = {}): void {
			if (!this.container) return;
			//Clone object
			args = Object.assign({}, args);

			//Binding argument functions to the container
			const bind = (object: Record<string, any>) => {
				for (const key in object) {
					if (typeof object[key] == "function") {
						object[key] = object[key].bind(this.container);
					} else if (typeof object[key] == "object") {
						bind(object[key]);
					}
				}
			};

			//Expose extra data
			bind(args);
			args["data"] = this.data;
			args["uuid"] = this.uuid;
			for (const key in this.container.dataset) {
				args[key] = this.container.dataset[key];
			}

			//Render to the container
			this.container.innerHTML = template(args);
			this.rendered = true;
		}

		/**
		 * Toggles visibility of view's container
		 * @param visible Container visibility
		 */
		public toggle(visible: boolean | null = null): void {
			if (!this.container) return;

			if (visible == null) {
				if (this.container.style.display === "none") {
					visible = true;
				} else {
					visible = false;
				}
			}

			if (visible) {
				this.container.style.display =
					(this.container as any).display || "block";
			} else {
				(this.container as any).display = this.container.style.display;
				this.container.style.display = "none";
			}
		}

		/**
		 * Clears the container on component close
		 */
		public close(): void {
			if (!this.container) return;
			this.container.innerHTML = "";
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
	}

	//Return controller with specific typings
	return View;
}

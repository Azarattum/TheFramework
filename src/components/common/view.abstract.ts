/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { IComponent, IComponentOptions } from "./component.interface";
import Utils from "./utils.class";

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
		/**HTML template function */
		protected template: Function;
		/**Function resolves promise when the view is rendered the first time */
		private resolveRender: Function | null;
		/**Callback to refresh application */
		private refreshCallback: Function;

		/**
		 * Creates new view component
		 * @param name The name of view
		 */
		public constructor({ refresh }: IComponentOptions) {
			this.uuid = Utils.generateID();
			this.name = this.constructor.name;
			this.refreshCallback = refresh;
			this.resolveRender = () => {
				this.resolveRender = null;
			};

			this.template = template;
			this.defineElement();
		}

		/**
		 * Asynchronously initializes the view and resolves when it is rendered
		 */
		public async initialize(): Promise<void> {
			const promise = new Promise<void>(resolve => {
				if (this.resolveRender && this.containers.length) {
					this.resolveRender = resolve;
				} else {
					resolve();
				}
			});

			return promise;
		}

		/**
		 * Returns all the view-elements of current view
		 */
		public get containers(): NodeListOf<ViewElement> {
			return document.querySelectorAll<ViewElement>(
				`view-${this.name.toLowerCase()}`
			);
		}

		/**
		 * Defines a custom element for the view
		 */
		protected defineElement(): void {
			const regexp = /\(function\s*?\((([a-zA-Z0-9_$]+,?\s*?)+)\)\s*?\{/;
			const result = template.toString().match(regexp);
			let dataPoints: string[] = [];
			if (result) {
				dataPoints = result[1]?.replace(/ /g, "")?.split(",") || [];
			}

			const view = this;
			customElements.define(
				`view-${this.name.toLowerCase()}`,
				class extends HTMLElement {
					/**View's universal unique id */
					public readonly uuid: string;
					private renderHandle?: number;
					private reflectionHandle?: number;

					/**
					 * Custom element constructor
					 */
					public constructor() {
						super();

						this.uuid = Utils.generateID();
						this.render();
					}

					/**
					 * Renders the view element
					 */
					public render() {
						//Debounce render execution
						clearTimeout(this.renderHandle);
						this.renderHandle = setTimeout(() => {
							cancelAnimationFrame(this.reflectionHandle || -1);
							const args: Record<string, any> = {
								uuid: this.uuid
							};

							//Expose dataset attribute
							for (const key in this.dataset) {
								args[key] = this.dataset[key];
							}

							//Render view
							this.innerHTML = template(args);
							setTimeout(() => {
								view.resolveRender?.();
								view.refreshCallback();
							});
						});
					}

					/**
					 * Instant reflect a new value onto the page,
					 * for simple rendering cases (no expressions etc.)
					 * @param name Data variable name
					 * @param value New value
					 */
					private reflect(name: string, value: string) {
						cancelAnimationFrame(this.reflectionHandle || -1);
						this.reflectionHandle = requestAnimationFrame(
							async () => {
								this.querySelectorAll(
									`data-text[${name}]:not([value])`
								).forEach(x => (x.textContent = value));

								this.querySelectorAll(
									`data-html[${name}]:not([value])`
								).forEach(x => (x.innerHTML = value));
							}
						);
					}

					/**
					 * Observed data attributes for the view custom element
					 */
					private static get observedAttributes() {
						return dataPoints.map(x => `data-${x}`);
					}

					/**
					 * Refreshes app when the view is deleted from DOM
					 */
					private disconnectedCallback() {
						view.refreshCallback();
					}

					/**
					 * Rerenders the view when an observed data attribute changes
					 */
					private attributeChangedCallback(
						name: string,
						oldValue: string,
						newValue: string
					) {
						this.render();
						if (!name) return;
						this.reflect(name.replace("data-", ""), newValue);
					}
				}
			);
		}

		/**
		 * No relations for general view component
		 */
		public static get relations(): null {
			return null;
		}
	}

	//Return controller with specific typings
	return View;
}

export type ViewElement = HTMLElement & {
	/** Renders the view element */
	render: () => void;
	/**View's universal unique id */
	readonly uuid: string;
};

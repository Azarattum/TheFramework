/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { IComponent } from "./manager.class";
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

		/**
		 * Creates new view component
		 * @param name The name of view
		 */
		public constructor() {
			this.uuid = Utils.generateID();
			this.name = this.constructor.name;
			this.template = template;
			this.defineElement();
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

			customElements.define(
				`view-${this.name.toLowerCase()}`,
				class extends HTMLElement {
					/**View's universal unique id */
					public readonly uuid: string;
					private renderHandle?: number;
					private reflectionHandle?: number;

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

					private static get observedAttributes() {
						return dataPoints.map(x => `data-${x}`);
					}

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
		public static get relations(): object[] {
			return [];
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

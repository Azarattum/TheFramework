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
		public get containers(): HTMLCollectionOf<ViewElement> {
			return document.getElementsByTagName(
				`view-${this.name.toLowerCase()}`
			) as HTMLCollectionOf<ViewElement>;
		}

		/**
		 * Defines a custom element for the view
		 */
		protected defineElement(): void {
			const regexp = /\(function\s*?\((([a-zA-Z0-9_$]+,?\s*?)+)\)\s*?\{/;
			const result = template.toString().match(regexp);
			let dataPoints: string[] = [];
			if (result) {
				dataPoints = result[1].replace(/ /g, "").split(",");
			}

			const view = this;
			customElements.define(
				`view-${this.name.toLowerCase()}`,
				class extends HTMLElement {
					/**View's universal unique id */
					public readonly uuid: string;
					private renderHandle?: number;

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
							const args: Record<string, any> = {
								uuid: this.uuid
							};

							//Expose dataset attribute
							for (const key in this.dataset) {
								args[key] = this.dataset[key];
							}
							const html = template(args);

							//Render view
							this.innerHTML = html;
							setTimeout(() => {
								view.resolveRender?.();
								view.refreshCallback();
							});
						});
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
						if (!name) return;
						this.render();
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

		/**
		 * Remove all the view created elements when closed
		 */
		public close() {
			for (const container of this.containers) {
				container.parentElement?.removeChild(container);
			}
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

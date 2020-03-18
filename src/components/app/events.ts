import { IComponent } from "../common/manager.class";

/**
 * Event handler for application components
 */
export default class EnvetsHandler {
	/**
	 * Creates new envet handler for components
	 * @param components Components to handle interactions with
	 */
	public constructor(components: IComponent[]) {
		const component: { [name: string]: IComponent } = {};
		components.forEach(x => (component[x.name] = x));

		//Defining all components
		///this.template = component["Template"] as typeof Template;
	}

	/**
	 * Registers all events for components
	 */
	public async registerEvents(): Promise<void> {
		///this.template.on("example", () => {});
	}
}

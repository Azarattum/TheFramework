import { IComponent, IEventsHandler } from "../common/manager.class";

/**
 * Event handler for application components
 */
export default class EventsHandler implements IEventsHandler {
	/**
	 * Creates new envet handler for components
	 * @param components Components to handle interactions with
	 */
	// eslint-disable-next-line @typescript-eslint/no-useless-constructor
	public constructor(components: { [name: string]: IComponent[] }) {
		//Defining all components
		///this.template = components["Template"][0] as typeof Example;
	}

	/**
	 * Registers all events for components
	 */
	public async registerEvents(): Promise<void> {
		///Register your events here
		///this.template.on("example", () => {});
	}
}

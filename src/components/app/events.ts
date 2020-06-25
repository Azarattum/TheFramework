import { IComponent, IEventsHandler } from "../common/manager.class";

/**
 * Event handler for application components
 */
export default class EventsHandler implements IEventsHandler {
	///private example: Example;

	/**
	 * Creates new envet handler for components
	 * @param components Components to handle interactions with
	 */
	// eslint-disable-next-line @typescript-eslint/no-useless-constructor
	public constructor(components: { [name: string]: IComponent[] }) {
		//Defining all components
		///this.example = components["Example"][0] as Example;
	}

	/**
	 * Registers all events for components
	 */
	public async registerEvents(): Promise<void> {
		///Register your events here
		///this.example.on("example", () => {});
	}
}

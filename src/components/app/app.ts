import Manager, { IComponentType } from "../common/manager.class";

/**
 * Main application class
 */
export default class App {
	/**Component manager */
	private manager: Manager;

	/**
	 * Application constructor
	 */
	public constructor() {
		const components: IComponentType[] = [
			///Add your new components here
		];

		this.manager = new Manager(components);
	}

	/**
	 * Initializes the app
	 */
	public async initialize(): Promise<void> {
		const config = {
			///Your components' initialization configurations here
		};
		await this.manager.initialize(config);
	}

	/**
	 * Closes the application
	 */
	public close(): void {
		this.manager.close();
	}
}

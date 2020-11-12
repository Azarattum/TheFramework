import Manager from "../common/manager.class";

/**
 * Main application class
 */
export default class App extends Manager {
	/**
	 * Application constructor
	 */
	public constructor() {
		super([
			///Put your components here
		]);
	}

	/**
	 * Initializes the app
	 */
	public async initialize(): Promise<void> {
		await super.initialize({
			///Put components' configurations here
		});
	}
}

import Controller from "../../common/controller.abstract";

/**
 * Service that represents template for a new services
 */
export default class Template extends Controller<"">() {
	/**
	 * Creates template controller
	 */
	public constructor() {
		super("Template");
	}

	/**
	 * Initialization of Template service
	 */
	public async initialize(): Promise<void> {
		///Service initialization logic goes here
	}
}

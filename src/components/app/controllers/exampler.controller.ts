import Controller, { Relation } from "../../common/controller.abstract";

/**
 * Example of a controller.
 * It has `Relation.Default` which means association with DOM, but
 * no data binding. And the controller cannot emit any events, because
 * type template says `never`, it can be changed to any union string type
 * like `"event1" | "event2" | "event3"`.
 *
 * Best practice to name controllers as `something(er/or)`
 */
export default class Exampler extends Controller<never>(Relation.Default) {
	/**
	 * Initialization of Exampler controller
	 */
	public async initialize(): Promise<void> {
		///Controller initialization logic goes here
	}
}

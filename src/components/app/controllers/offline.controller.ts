import Utils, { LogType } from "../../common/utils.class";
import Controller from "../../common/controller.abstract";

/**
 * Controller responsible for offline caching
 */
export default class Offline extends Controller<"">() {
	/**
	 * No object relations for this controller
	 */
	public static get relations(): object[] {
		return [];
	}

	/**
	 * Registers service worker
	 */
	public async initialize(): Promise<void> {
		//Register service worker
		if ("serviceWorker" in navigator) {
			try {
				await navigator.serviceWorker.register("service-worker.js");
			} catch {
				//Failed to register
				Utils.log("Service Worker is disabled.", LogType.WARNING);
			}
		}
	}
}

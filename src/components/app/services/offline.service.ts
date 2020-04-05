import Service from "../../common/service.abstract";
import Utils, { LogType } from "../../common/utils.class";

/**
 * Service responsible for offline caching
 */
export default class Offline extends Service<"">() {
	public static async initialize(): Promise<void> {
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

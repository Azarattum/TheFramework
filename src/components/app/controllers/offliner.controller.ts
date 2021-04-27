import { log, LogType } from "../../common/utils.class";
import Controller, { Relation } from "../../common/controller.abstract";

/**
 * Controller responsible for offline caching
 */
export default class Offliner extends Controller(Relation.None) {
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
				log("Service Worker is disabled.", LogType.WARNING);
			}
		}
	}
}

import Controller, { Relation } from "../../common/controller.abstract";

/**
 * Controller for creating element tabs
 */
export default class Tabber extends Controller<"changed">(Relation.Default) {
	/**Saved display states for hidden elements */
	private displays: Map<HTMLElement, string> = new Map();

	/**
	 * Initializes tabs controller
	 * @param autoHide Option to hide all the tabs on init
	 */
	public initialize(autoHide: boolean = true): void {
		if (autoHide) {
			this.container.querySelectorAll<HTMLElement>("[tab]").forEach(x => {
				this.displays.set(x, getComputedStyle(x).display);
				x.style.display = "none";
			});
		}

		this.expose("change");
	}

	/**
	 * Changes current opened tab
	 * @param tabName The open of tab to open
	 */
	public change(tabName: string): void {
		const selected = this.container.querySelector<HTMLElement>(
			`[tab="${tabName.toLowerCase()}"]`
		);
		if (!selected) throw new Error(`Tab ${tabName} does not exist!`);

		this.container.querySelectorAll<HTMLElement>("[tab]").forEach(x => {
			if (!this.displays.has(x)) {
				this.displays.set(x, getComputedStyle(x).display);
			}
			x.style.display = "none";
		});
		selected.style.display = this.displays.get(selected) || "block";

		this.emit("changed", selected.getAttribute("tab"));
	}
}

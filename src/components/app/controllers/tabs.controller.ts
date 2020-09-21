import Controller from "../../common/controller.abstract";

/**
 * Service for controlling application views as tabs
 */
export default class Tabs extends Controller<"tabchanged">() {
	private tabs: IView[] = [];

	/**
	 * Initializes tabs service
	 * @param tabs Tabs views to control
	 */
	public initialize(tabs: IView[]): void {
		this.tabs = tabs;

		this.expose("change");
	}

	/**
	 * Changes current opened tab
	 * @param tabName The open of tab to open
	 */
	public change(tabName: string): void {
		let name;
		//View tabs
		if (this.tabs && this.tabs.length > 0) {
			const selected = this.tabs.find(
				tab => tab.name.toLowerCase() == tabName.toLowerCase()
			);
			if (!selected) {
				throw new Error(`Tab ${tabName} does not exist!`);
			}

			name = selected.name;
			this.tabs.forEach(tab => tab.toggle(false));
			selected.toggle(true);
		}
		//Element tabs
		else {
			const selected = this.container.querySelector(
				`[tab="${tabName.toLowerCase()}"]`
			);
			if (!selected) {
				throw new Error(`Tab ${tabName} does not exist!`);
			}

			this.container.querySelectorAll("[tab]").forEach(x => {
				(x as HTMLElement).style.display = "none";
			});
			(selected as HTMLElement).style.display = "block";
			name = selected.getAttribute("tab");
		}

		this.emit("tabchanged", name);
	}
}

/**
 * Togglable view interface
 */
interface IView {
	name: string;
	toggle(value?: boolean): void;
}

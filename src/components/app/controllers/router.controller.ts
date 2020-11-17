import Controller, { Relation } from "../../common/controller.abstract";
import { format } from "../../common/utils.class";

/**
 * Example of a controller.
 */
export default class Router extends Controller<"navigated">(Relation.Default) {
	/**Format string for titles */
	public titleFormat: string = "{0} - {1}";
	/**Saved display states for hidden elements */
	private displays: Map<HTMLElement, string> = new Map();
	/**Saved original document title */
	private title: string = document.title;
	/**Regular expression to find url in location hash */
	private readonly urlRegex = /(?<=#|^)(\/([-a-zA-Z0-9()@%_+.~?&//=]*)(\/|$))|(?<=#)\/?|^$/;

	/**
	 * Override relations to the document body
	 */
	public static get relations(): object[] {
		return [document.body];
	}

	/**
	 * Initialization of Router controller
	 * @param defaultPath Default path to navigate from the main page
	 */
	public initialize(defaultPath: string = "", titleFormat?: string): void {
		this.titleFormat = titleFormat ?? this.titleFormat;
		window.addEventListener("popstate", event => {
			this.navigate(this.path, true);
		});

		this.navigate(this.path || defaultPath, true);
		this.expose("navigate");
	}

	/**
	 * Navigates to a specified path
	 * @param path Route path
	 * @param stateless Perform navigation without saving state
	 */
	public navigate(path: string, stateless: boolean = false): void {
		path = path.replace(/\/$|^\//g, "");
		const route = path.split("/");

		//Hide all routed elements
		this.container.querySelectorAll(`[route]`).forEach(x => {
			if (!(x instanceof HTMLElement)) return;
			const style = getComputedStyle(x).display;
			if (!this.displays.has(x) || style !== "none") {
				this.displays.set(x, getComputedStyle(x).display);
			}
			x.style.display = "none";
		});

		//Render needed elements
		let subtitle = this.renderRoute(route);
		subtitle = subtitle
			? format(this.titleFormat, this.title, subtitle)
			: this.title;

		//Save state
		let state = location.hash.replace(
			this.urlRegex,
			`/${path ? path + "/" : ""}`
		);
		if (!state.startsWith("#")) state = "#" + state;

		if (!stateless) {
			history.pushState(null, "", state);
		} else {
			history.replaceState(null, "", state);
		}
		document.title = subtitle;

		//Emit navigated event
		this.emit("navigated", path, stateless);
	}

	/**
	 * Returns current router path
	 */
	public get path(): string {
		const hash = location.hash;
		return (hash.match(this.urlRegex)?.[0] || "").replace(/\/$|^\//g, "");
	}

	/**
	 * Renders a specified route by showing/hiding elements
	 * @param route Route path string array
	 * @param container Root routing container
	 */
	private renderRoute(
		route: string[],
		container: HTMLElement = this.container
	): string | null {
		let subtitle = "";
		route = [...route];
		const path = route.shift()?.toLowerCase();
		const notFounds: HTMLElement[] = [];

		//Find nodes to render
		const walker = document.createTreeWalker(
			container,
			NodeFilter.SHOW_ELEMENT,
			{
				acceptNode: (node: HTMLElement) => {
					const parent = node.parentElement;
					if (parent?.getAttribute("route") && parent !== container) {
						return NodeFilter.FILTER_REJECT;
					}

					const route = node.getAttribute("route")?.toLowerCase();
					if (
						(path && route === path) ||
						(!path && node.hasAttribute("default"))
					) {
						return NodeFilter.FILTER_ACCEPT;
					} else if (route) {
						if (route === "404") notFounds.push(node);
						return NodeFilter.FILTER_REJECT;
					}

					return NodeFilter.FILTER_SKIP;
				}
			}
		);

		//Render all found nodes
		let found = false;
		while (walker.nextNode()) {
			const node = walker.currentNode;
			if (!(node instanceof HTMLElement)) continue;

			//Recursively render subtree
			const result = this.renderRoute(route, node);
			if (result !== null) {
				found = true;
				node.style.display = this.displays.get(node) || "block";
				subtitle = result || node.getAttribute("subtitle") || subtitle;
			}
		}
		//Try to render 404 route
		if (!found && path) {
			notFounds.forEach(x => {
				found = true;
				x.style.display = this.displays.get(x) || "block";
				subtitle = x.getAttribute("subtitle") || subtitle;
			});

			return found ? subtitle : null;
		}

		return subtitle;
	}
}

import Controller, { Relation } from "../../common/controller.abstract";

/**
 * Util controller to work with URL hash
 */
export default class Hasher extends Controller<"loaded" | "changed">(
	Relation.None
) {
	/** Whether the hash is frozen from changes */
	public frozen: boolean = false;
	/** Default hash values */
	public defaults: Record<string, string> = {};
	/** Regular expression to data in location hash */
	private hashExp = /(?<=#|^|\/)([^#:/]+:[^:,/]+,?)*$/;

	/**
	 * Initializes URL Hash object
	 * @param {Object} defaults Default values for hash
	 */
	public initialize(defaults: Record<string, string> = {}): void {
		//Register change event
		window.addEventListener("hashchange", event => {
			if (!event.newURL.includes("#")) return;

			const oldHash = event.oldURL
				.slice(event.oldURL.indexOf("#"))
				.match(this.hashExp)?.[0];
			const newHash = event.newURL
				.slice(event.newURL.indexOf("#"))
				.match(this.hashExp)?.[0];

			if (newHash == null) return;
			if (oldHash?.toLowerCase() === newHash?.toLowerCase()) return;
			this.emit("changed", this.properties);
		});

		this.defaults = defaults;
		//Fire load event
		this.emit("loaded", this.properties);
	}

	/**
	 * Returns all current properties accounting for default values
	 */
	public get properties(): Record<string, string> {
		const properties: { [name: string]: string } = {};

		//Get all existing properties
		this.hash.split(",").forEach(prop => {
			const [key, value] = prop.split(":");
			if (key === undefined || value === undefined) return;
			properties[key] = value;
		});

		//Add all default values
		for (const key in this.defaults) {
			if (key in properties) continue;

			const value = this.defaults[key];
			this.set(key, value.toString(), true);
			properties[key] = value.toString();
		}

		return properties;
	}

	/**
	 * Returns the value of hash property
	 * @param {String} property Name of property
	 */
	public get(property: string): string | null {
		this.validateString(property);
		const properties = this.hash.split(",");
		for (const prop of properties) {
			const key = prop.split(":")[0];
			//Find property with given name
			if (key.toLocaleLowerCase() == property.toLocaleLowerCase()) {
				//Return the value
				return prop.split(":")[1];
			}
		}

		return this.defaults[property] || null;
	}

	/**
	 * Freezes hash from changes untils it is unfrozen
	 * @param frozen Whether the hash frozen
	 */
	public freeze(frozen: boolean = true): void {
		this.frozen = frozen;
	}

	/**
	 * Sets the value of hash property
	 * @param {String} propertyName Name of a property
	 */
	public set(property: string, value: any, stateless: boolean = false): void {
		if (this.frozen) return;

		value = value.toString();
		const hash = this.hash;
		let updated = hash;

		this.validateString(property);
		this.validateString(value);
		//Add value to hash if it does not exist
		if (!this.exists(property)) {
			if (!hash.trim().endsWith(",") && hash != "" && hash != "#") {
				updated += ",";
			}
			updated += property + ":" + value;
		}

		//Replace an existing value
		const regexp = new RegExp(property + ":([^,]*|$)");
		updated = updated.replace(regexp, property + ":" + value);

		//Update hash
		let state = location.hash.replace(this.hashExp, updated);
		if (!state.startsWith("#")) state = "#" + state;
		if (!stateless) {
			history.pushState(null, "", state);
		} else {
			history.replaceState(null, "", state);
		}
	}

	/**
	 * Checks whethe the property exists or not
	 * @param {String} property Property name
	 */
	public exists(property: string): boolean {
		return (
			this.hash.toLowerCase().indexOf(property.toLowerCase() + ":") != -1
		);
	}

	/**
	 * Returns raw hash data. Without any routing paths
	 */
	public get hash(): string {
		return location.hash.match(this.hashExp)?.[0] || "";
	}

	/**
	 * Raises an exception if the strings contains illegal characters
	 * @param {String} string String to check
	 */
	private validateString(string: string): void {
		if (
			string.toString().indexOf(",") != -1 ||
			string.toString().indexOf("/") != -1 ||
			string.toString().indexOf(":") != -1
		) {
			throw new Error("Illegal characters in property!");
		}
	}
}

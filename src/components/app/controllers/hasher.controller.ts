import Controller from "../../common/controller.abstract";

/**
 * Util controller to work with URL hash
 */
export default class Hasher extends Controller<"loaded">() {
	/** Whether the hash is frozen from changes */
	private frozen: boolean = false;

	/**
	 * No object relations for this controller
	 */
	public static get relations(): null {
		return null;
	}

	/**
	 * Initializes URL Hash object
	 * @param {Object} defaults Default values for hash
	 */
	public initialize(defaults: { [property: string]: any } = {}): void {
		const properties: { [name: string]: string } = {};
		//Get all existing properties
		window.location.hash
			.slice(1)
			.split(",")
			.forEach(prop => {
				const [key, value] = prop.split(":");
				if (key === undefined || value === undefined) return;
				properties[key] = value;
			});

		for (const key in defaults) {
			if (key in properties) continue;

			const value = defaults[key];
			this.set(key, value.toString());
			properties[key] = value.toString();
		}

		this.emit("loaded", properties);
	}

	/**
	 * Returns the value of hash property
	 * @param {String} property Name of property
	 */
	public get(property: string): string | null {
		this.validateString(property);
		const properties = window.location.hash.slice(1).split(",");
		for (const prop of properties) {
			const key = prop.split(":")[0];
			//Find property with given name
			if (key.toLocaleLowerCase() == property.toLocaleLowerCase()) {
				//Return the value
				return prop.split(":")[1];
			}
		}
		return null;
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
	public set(property: string, value: any): void {
		if (this.frozen) return;

		value = value.toString();
		const hash = window.location.hash;
		this.validateString(property);
		this.validateString(value);
		//Add value to hash if it does not exist
		if (!this.exists(property)) {
			if (!hash.trim().endsWith(",") && hash != "" && hash != "#") {
				window.location.hash += ",";
			}
			window.location.hash += property + ":" + value;
		}

		//Replace an existing value
		const regexp = new RegExp(property + ":([^,]*|$)");
		window.location.hash = window.location.hash.replace(
			regexp,
			property + ":" + value
		);
	}

	/**
	 * Checks whethe the property exists or not
	 * @param {String} property Property name
	 */
	public exists(property: string): boolean {
		const hash = window.location.hash;
		return hash.toLowerCase().indexOf(property.toLowerCase() + ":") != -1;
	}

	/**
	 * Raises an exception if the strings contains illegal characters
	 * @param {String} string String to check
	 */
	private validateString(string: string): void {
		if (
			string.toString().indexOf(",") != -1 ||
			string.toString().indexOf(":") != -1
		) {
			throw new Error("Illegal characters in property!");
		}
	}
}

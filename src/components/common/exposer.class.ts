/**
 * Class to assist functions exposion to any scope
 */
export default class Exposer {
	/**Scope reference */
	private scope: Record<string, any>;
	/**Function records */
	private records: Map<string, Map<string, Function[]>>;
	/**Object relations */
	private relations: Map<Function, object | null>;

	/**
	 * Creates an exposer on the given scope
	 * @param scope Scope object to expose things
	 */
	public constructor(scope: Record<string, any>) {
		this.scope = scope;
		this.relations = new Map();
		this.records = new Map();
	}

	/**
	 * Exposes function to the scope with access like `module.name`
	 * @param module Module name
	 * @param name Method name
	 * @param method Function to expose
	 * @param relation Optional object relation
	 */
	public expose(
		module: string,
		name: string,
		method: Function,
		relation: object | null = null
	): void {
		if (!this.records.get(module)) {
			this.records.set(module, new Map());
		}
		if (!this.records.get(module)?.get(name)) {
			this.records.get(module)?.set(name, []);
		}
		if (this.scope[module] == null) {
			this.scope[module] = {};
		}

		this.relations.set(method, relation);
		this.records
			.get(module)
			?.get(name)
			?.push(method);

		const bounds = this.relations;
		const methods = this.records.get(module)?.get(name);
		const self = this.scope[module];
		self[name] = function(...args: any[]): any | any[] {
			if (!methods || !methods.length) return;

			const results = [];
			for (const method of methods) {
				const relation = bounds.get(method);
				if (!this || this == self || !relation || relation === this) {
					results.push(method(...args));
				}
			}

			if (!results.length) return;
			if (results.length == 1) return results[0];
			return results;
		};
	}
}

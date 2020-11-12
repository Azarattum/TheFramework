import Utils, { LogType } from "./utils.class";
import Exposer from "./exposer.class";

/**
 * Components manager
 */
export default class Manager {
	/**Whether to log out initialization status */
	public logging: boolean = true;
	/**Managed components */
	protected components: IComponent[];
	/**Configuration for initialization of componets */
	protected config: IComponentConfig = {};
	/**Whether manager is initialized now */
	private initialized = false;
	/**Manager's exposer object */
	private readonly exposer: Exposer;
	/**Components types */
	private readonly types: IComponentType[];
	/**Relation map for dynamic components */
	private readonly relations: Map<IComponent, object | null>;
	/**Handlers map for each component type */
	private readonly handlers: Map<IComponentType, ((self: any) => void)[]>;
	/**Timeout id for debouncing refresh calls */
	private refresher: any = undefined;

	/**
	 * Creates a component manager
	 * @param components Components to manage
	 */
	public constructor(
		components: IComponentType[],
		{ scope = globalThis, logging = true }: IManagerOptions = {}
	) {
		this.components = [];
		this.logging = logging;
		this.types = components;
		this.handlers = new Map();
		this.relations = new Map();
		this.exposer = new Exposer(scope);

		this.registerHandlers();

		const typesOrder = ["Services", "Views", "Controllers"];
		this.types.sort(
			(a, b) => typesOrder.indexOf(a.type) - typesOrder.indexOf(b.type)
		);

		for (const component of this.types) {
			const relations = component.relations;
			if (Array.isArray(relations)) {
				relations.forEach(async relation => {
					await this.registerComponent(component, relation);
				});
			} else {
				this.registerComponent(component);
			}
		}
	}

	/**
	 * Initializes all components
	 */
	public async initialize(config: IComponentConfig = {}): Promise<void> {
		let exceptions = 0;
		if (this.logging) Utils.log("Initializtion started...");

		this.config = config;

		let lastType = "";
		//Initialize all components
		for (const component of this.components) {
			const type =
				component instanceof Promise
					? (await component).constructor.type
					: (component.constructor as IComponentType).type;

			if (this.logging && type != lastType) {
				Utils.log(type, LogType.DIVIDER);
				lastType = type;
			}

			exceptions += 1 * +!(await this.initializeComponent(component));
		}

		this.initialized = true;
		if (this.refresher === -1) this.refresh();

		//Log result
		if (!this.logging) return;
		Utils.log("", LogType.DIVIDER);
		if (exceptions) {
			Utils.log(
				`Initialization completed with ${exceptions} exceptions!`,
				LogType.WARNING
			);
		} else {
			Utils.log("Successfyly initialized!", LogType.OK);
		}
	}

	/**
	 * Looks for changed relations of components and updates them accordingly
	 */
	public refresh(): void {
		if (!this.initialized) {
			this.refresher = -1;
			return;
		}

		clearTimeout(this.refresher);
		this.refresher = setTimeout(() => {
			if (this.logging) Utils.log("Refreshing components...");

			//Find all the relevant relations
			const relations: Map<IComponentType, object[]> = new Map();
			this.types.forEach(type => {
				let array: object[] | null | undefined = relations.get(type);
				if (array === undefined) {
					array = type.relations;
					if (array == null) return;
					relations.set(type, array);
				}
			});

			const before = this.components.length;
			//Filter non relevant components
			this.components = this.components.filter((component, i) => {
				const relation = this.relations.get(component);
				if (!relation) return true;
				const array = relations.get(
					component.constructor as IComponentType
				);
				if (!array) return true;

				const index = array.indexOf(relation);
				//Component exists on its relation, remove from array
				if (index > -1) {
					array.splice(index, 1);
				}
				//Component's relation no longer exists, remove component
				else {
					this.relations.delete(component);
					component.close?.();
					return false;
				}

				return true;
			});
			const after = this.components.length;
			if (this.logging && before != after) {
				Utils.log(
					`${before - after} composents were closed!`,
					LogType.OK
				);
			}

			//Create missing components
			relations.forEach((relations, type) => {
				relations.forEach(async relation => {
					const component = this.registerComponent(type, relation);
					if (component) this.initializeComponent(component);
				});
			});
		});
	}

	/**
	 * Closes all managed components
	 */
	public close(): void {
		if (!this.initialized) return;
		if (this.logging) {
			Utils.log("", LogType.DIVIDER);
			Utils.log("Closing all components...");
		}

		let exceptions = 0;
		const promises = [];
		for (const component of this.components) {
			try {
				if (component.close) {
					promises.push(component.close());
				}

				if (this.logging) {
					Utils.log(`${component.name} closed!`, LogType.OK);
				}
			} catch (exception) {
				if (this.logging) {
					Utils.log(
						`${component.name} closing exception:\n\t` +
							`${exception.stack.replace(/\n/g, "\n\t")}`,
						LogType.ERROR
					);
				}
				exceptions++;
			}
		}

		this.initialized = false;

		//Log result
		if (!this.logging) return;
		Utils.log("", LogType.DIVIDER);
		Promise.all(promises).then(() => {
			if (exceptions) {
				Utils.log(
					`Stopped with ${exceptions} exceptions!`,
					LogType.WARNING
				);
			} else {
				Utils.log("Successfyly stopped!", LogType.OK);
			}
		});
	}

	/**
	 * Returns the first component by the type
	 * @param type Component's type
	 */
	protected getComponent<T extends IComponent>(type: IComponentType<T>): T {
		const component = this.components.find(
			component => component instanceof (type.valueOf() as any)
		);

		if (!component) {
			throw new Error(`${type.name} component could not be found!`);
		}

		return component as T;
	}

	/**
	 * Returns managed components by the type
	 * @param type Component's type
	 */
	protected getComponents<T extends IComponent>(
		type: IComponentType<T>
	): T[] {
		return this.components.filter(
			component => component instanceof (type.valueOf() as any)
		) as T[];
	}

	/**
	 * Performs full initialization of a component. This includes
	 * resolving promises, calling handlers and a call to inner method
	 * @param component Component to initialize
	 */
	private async initializeComponent(component: IComponent): Promise<boolean> {
		try {
			//Resolve promised component
			if (component instanceof Promise) {
				const index = this.components.indexOf(component);
				const relation = this.relations.get(component);
				const value = await component;

				if (relation) this.relations.set(value, relation);
				this.relations.delete(component);
				this.components[index] = value;
				component = value;
			}

			//Call all component's handlers
			const handlers = this.handlers.get(
				component.constructor as IComponentType
			);
			if (handlers) {
				handlers.forEach(handler => {
					handler(component);
				});
			}

			//Initialize the component with its config
			const args = this.config[component.name] || [];
			if (component.initialize) {
				await component.initialize(...args);
			}

			//Log result
			if (!this.logging) return true;
			Utils.log(`${component.name} initialized!`, LogType.OK);
			return true;
		} catch (exception) {
			//Log error
			if (!this.logging) return false;
			Utils.log(
				`${component.name} initialization exception:\n\t` +
					`${exception.stack.replace(/\n/g, "\n\t")}`,
				LogType.ERROR
			);
			return false;
		}
	}

	/**
	 * Creates a new component and adds it to components list
	 * @param component Component type
	 * @param relation Component's relation object
	 */
	private registerComponent(
		component: IComponentType,
		relation?: object
	): IComponent | null {
		try {
			const created = new component(
				this.refresh.bind(this),
				this.exposer,
				relation
			);
			if (relation) this.relations.set(created, relation);

			this.components.push(created);
			return created;
		} catch (exception) {
			if (!this.logging) return null;

			Utils.log(
				`${component.name} creation exception:\n\t` +
					`${exception.stack.replace(/\n/g, "\n\t")}`,
				LogType.ERROR
			);
			return null;
		}
	}

	/**
	 * This is a placeholder method for registering handlers.
	 * Its content will be extended by `@handle` decorators
	 */
	private registerHandlers(): void {
		//Method's implementation is handled by decorators
	}
}

/**
 * Registers the method below as a handler of a specific component type.
 * It will be called after a creation of any component of this type, but
 * before its initializtion. The main use case is events registration
 * @param type Component type to handle
 */
export function handle<T extends IComponent>(type: IComponentType<T>) {
	return function(
		target: Manager,
		_: string,
		descriptor: TypedPropertyDescriptor<(self: T) => any>
	): any {
		if (!descriptor.value) return;
		type = type.valueOf() as any;
		const handler = descriptor.value;

		const original = target["registerHandlers"];
		target["registerHandlers"] = function(...args): any {
			let handlers = this["handlers"].get(type);
			if (!handlers) handlers = [];
			handlers.push(handler.bind(this));
			this["handlers"].set(type, handlers);

			return original.bind(this)(...args);
		};
	};
}

/**
 * Interface of component class
 */
export interface IComponent {
	/**Initializable name */
	name: string;

	/**Initializable entry */
	initialize?(...args: any[]): void;

	/**Component destructor */
	close?(): void;
}

/**
 * Manger options interface
 */
interface IManagerOptions {
	scope?: Record<string, any>;
	logging?: boolean;
}

/**
 * Interface of component constructor
 */
interface IComponentType<T extends IComponent = IComponent> {
	/**Component constructor */
	new (refresh: () => void, exposer: Exposer, relation?: object): T;

	/**Component relations */
	relations: object[] | null;

	/**Component type */
	type: string;
}

/**
 * Arguments for components initialization
 */
interface IComponentConfig {
	[name: string]: any[];
}

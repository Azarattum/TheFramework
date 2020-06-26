import Utils, { LogType } from "./utils.class";
import Exposer from "./exposer.class";

/**
 * Components manager
 */
export default class Manager {
	/**Whether to log out initialization status */
	public logging: boolean = true;
	/**Whether manager is initialized now */
	public isInitialized = false;
	/**Managed components */
	public readonly components: IComponent[];
	/**Handler for componet events */
	private events: IEventsHandlerType | null;

	/**
	 * Creates a component manager
	 * @param components Components to manage
	 */
	public constructor(
		components: IComponentType[],
		{ events, scope }: IManagerOptions = {}
	) {
		const exposer = new Exposer(scope || globalThis);
		const typesOrder = ["Services", "Views", "Controllers"];
		components.sort((a, b) =>
			typesOrder.indexOf(a.type) >= typesOrder.indexOf(b.type) ? 1 : -1
		);

		this.components = [];
		for (const component of components) {
			if (component.relations && component.relations.length) {
				for (const relation of component.relations) {
					this.components.push(new component(exposer, relation));
				}
			} else {
				this.components.push(new component(exposer));
			}
		}

		this.events = events || null;
	}

	/**
	 * Initializes all components
	 */
	public async initialize(componentArgs: IComponentArgs = {}): Promise<void> {
		let exceptions = 0;
		if (this.logging) Utils.log("Initializtion started...");

		//Load promise components
		for (const i in this.components) {
			if (!(this.components[i] instanceof Promise)) continue;

			const loaded = await this.components[i];
			this.components[i] = loaded;
		}

		//Register events
		try {
			if (this.events) {
				const named: { [name: string]: IComponent[] } = {};
				this.components.forEach(x => {
					if (!named[x.name]) {
						named[x.name] = [];
					}
					named[x.name].push(x);
				});

				const events = new this.events(named);
				await events.registerEvents();
			}
		} catch (exception) {
			//Log exception
			if (this.logging) {
				Utils.log(
					`Events register exception:\n\t` +
						`${exception.stack.replace(/\n/g, "\n\t")}`,
					LogType.ERROR
				);
			}
			exceptions++;
		}

		let lastType = "";
		//Initialize all components
		for (const component of this.components) {
			const type = (component.constructor as IComponentType).type;

			if (this.logging && type != lastType) {
				Utils.log(type, LogType.DIVIDER);
				lastType = type;
			}

			try {
				const args = componentArgs[component.name] || [];
				if (component.initialize) {
					await component.initialize(...args);
				}

				//Log success
				if (this.logging) {
					Utils.log(`${component.name} initialized!`, LogType.OK);
				}
			} catch (exception) {
				//Log exception
				if (this.logging) {
					Utils.log(
						`${component.name} initialization exception:\n\t` +
							`${exception.stack.replace(/\n/g, "\n\t")}`,
						LogType.ERROR
					);
				}
				exceptions++;
			}
		}

		this.isInitialized = true;

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
	 * Closes all managed components
	 */
	public close(): void {
		if (!this.isInitialized) return;
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

		this.isInitialized = false;

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
	 * Returs a managed components by the name
	 * @param name Component's name
	 */
	public getComponents(name: string): IComponent[] {
		return this.components.filter(
			component => component.name.toLowerCase() == name.toLowerCase()
		);
	}
}

/**
 * Manger options interface
 */
interface IManagerOptions {
	events?: IEventsHandlerType;
	scope?: Record<string, any>;
}

/**
 * Interface of handler for component events constructor
 */
export interface IEventsHandlerType {
	/**Creates event handler */
	new (components: { [name: string]: IComponent[] }): IEventsHandler;
}

/**
 * Interface of handler for component events
 */
export interface IEventsHandler {
	/**Registers events */
	registerEvents(): Promise<void>;
}

/**
 * Interface of component constructor
 */
export interface IComponentType {
	/**Component constructor */
	new (exposer: Exposer, relation?: object): IComponent;

	/**Component relations */
	relations?: object[];

	/**Component type */
	type: string;
}

/**
 * Arguments for components initialization
 */
export interface IComponentArgs {
	[name: string]: any[];
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

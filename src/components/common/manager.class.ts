import Utils, { LogType } from "./utils.class";

/**
 * Component manager for IInitializables
 */
export default class Manager {
	/**Whether to log out initialization status */
	public logging: boolean = true;
	/**Managed components */
	public readonly components: IComponent[];

	/**
	 * Creates a component manager
	 * @param components Components to manage
	 */
	public constructor(components: IComponent[]) {
		const typesOrder = ["Services", "Views", "Controllers"];
		this.components = components.sort((a, b) =>
			typesOrder.indexOf(a.type) >= typesOrder.indexOf(b.type) ? 1 : -1
		);
	}

	/**
	 * Initializes all components
	 */
	public async initialize(componentArgs: ComponentArgs = []): Promise<void> {
		let exceptions = 0;
		if (this.logging) Utils.log("Initializtion started...");

		let type = "";
		//Initialize all components
		for (const i in this.components) {
			const component = this.components[i];
			if (this.logging && type != component.type) {
				Utils.log(component.type, LogType.DIVIDER);
				type = component.type;
			}

			try {
				const args = Array.isArray(componentArgs)
					? componentArgs[i]
					: componentArgs[component.name];

				if (args && component.initialize) {
					await component.initialize(...args);
				} else if (component.initialize) {
					await component.initialize();
				}
				if (this.logging) {
					Utils.log(`${component.name} initialized!`, LogType.OK);
				}
			} catch (exception) {
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
		if (this.logging) {
			Utils.log("", LogType.DIVIDER);
			Utils.log("Closing all components...");
		}

		let exceptions = 0;
		for (const component of this.components) {
			try {
				if (component.close) {
					component.close();
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

		//Log result
		if (!this.logging) return;
		Utils.log("", LogType.DIVIDER);
		if (exceptions) {
			Utils.log(
				`Stopped with ${exceptions} exceptions!`,
				LogType.WARNING
			);
		} else {
			Utils.log("Successfyly stopped!", LogType.OK);
		}
	}

	/**
	 * Returs a managed component by its name
	 * @param name Component's name
	 */
	public getComponent(name: string): IComponent | null {
		return (
			this.components.find(
				component => component.name.toLowerCase() == name.toLowerCase()
			) || null
		);
	}
}

/**
 * Interface of an initializable class
 */
export interface IComponent {
	/**Initializable name */
	name: string;

	/**Component type */
	type: string;

	/**Initializable entry */
	initialize?(...args: any[]): void;

	/**Component destructor */
	close?(): void;
}

/**Arguments for components initialization */
export type ComponentArgs = any[][] | { [component: string]: any[] };

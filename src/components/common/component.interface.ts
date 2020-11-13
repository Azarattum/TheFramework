import Exposer from "./exposer.class";

/**
 * Component interface
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
 * Component type interface
 */
export interface IComponentType<T extends IComponent = IComponent> {
	/**Component type */
	type: string;

	/**Component constructor */
	new (options: IComponentOptions): T;

	/**Component relations */
	relations: object[] | null;
}

/**
 * Component's constructor options interface
 */
export interface IComponentOptions {
	/**Exposer object to use within component */
	exposer: Exposer;

	/**Component's relation */
	relation: object | null;

	/**Application refresh callback */
	refresh: () => void;
}

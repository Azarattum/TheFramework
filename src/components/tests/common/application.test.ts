import Application from "../../common/application.abstract";
import { IComponentType } from "../../common/component.interface";

describe("Application", () => {
	/**
	 * Test application with single component
	 */
	it("singleComponent", async () => {
		const create = jest.fn();
		const close = jest.fn();
		const initialize = jest.fn();
		class MockComponent {
			public static type = "Controllers";
			public name = "Test";
			public constructor(...args: any) {
				create();
			}
			public async initialize(): Promise<void> {
				initialize();
			}
			public close(): void {
				close();
			}
			public static get relations(): null {
				return null;
			}
		}

		class App extends Application {}

		const components: IComponentType[] = [MockComponent];
		const app = new App(components);
		app.logging = false;

		expect(create).toBeCalledTimes(1);
		expect(app["components"].length).toBe(1);

		const component = app["getComponents"](MockComponent as any);
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(1);
		expect(component[0]).toBeInstanceOf(MockComponent);

		await app.initialize().then(() => {
			expect(initialize).toBeCalledTimes(1);
		});

		app.close();
		expect(close).toBeCalledTimes(1);
	});

	/**
	 * Test application with multiple components
	 * of different types
	 */
	it("multipleComponents", async () => {
		const create = jest.fn();
		const close = jest.fn();
		const initialize = jest.fn();
		class MockControllerComponent {
			public static type = "Controllers";
			public name = "TestController";
			public constructor(...args: any) {
				create();
			}
			public async initialize(): Promise<void> {
				initialize();
			}
			public close(): void {
				close();
			}
			public static get relations(): null {
				return null;
			}
		}
		class MockServiceComponent {
			public static type = "Services";
			public name = "TestService";
			public constructor(...args: any) {
				create();
			}
			public async initialize(): Promise<void> {
				initialize();
			}
			public close(): void {
				close();
			}
			public static get relations(): null {
				return null;
			}
		}
		class MockViewComponent {
			public static type = "Views";
			public name = "TestView";
			public constructor(...args: any) {
				create();
			}
			public async initialize(): Promise<void> {
				initialize();
			}
			public close(): void {
				close();
			}
			public static get relations(): null {
				return null;
			}
		}
		class App extends Application {}

		const components: IComponentType[] = [
			MockControllerComponent,
			MockServiceComponent,
			MockViewComponent
		];
		const app = new App(components);
		app.logging = false;

		expect(create).toBeCalledTimes(3);
		expect(app["components"].length).toBe(3);
		expect(app["components"][0]).toBeInstanceOf(MockServiceComponent);
		expect(app["components"][1]).toBeInstanceOf(MockViewComponent);
		expect(app["components"][2]).toBeInstanceOf(MockControllerComponent);

		let component = app["getComponents"](MockControllerComponent as any);
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(1);
		expect(component[0]).toBeInstanceOf(MockControllerComponent);

		component = app["getComponents"](MockServiceComponent as any);
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(1);
		expect(component[0]).toBeInstanceOf(MockServiceComponent);

		component = app["getComponents"](MockViewComponent as any);
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(1);
		expect(component[0]).toBeInstanceOf(MockViewComponent);

		await app.initialize().then(() => {
			expect(initialize).toBeCalledTimes(3);
		});

		app.close();
		expect(close).toBeCalledTimes(3);
	});

	/**
	 * Test application with duplicate components
	 * with multiple relations of the same type
	 */
	it("relationalComponents", async () => {
		const create = jest.fn();
		const close = jest.fn();
		const initialize = jest.fn();
		class MockRelationalComponent {
			public static type = "Controllers";
			public name = "TestController";
			public constructor(...args: any) {
				create();
			}
			public async initialize(): Promise<void> {
				initialize();
			}
			public close(): void {
				close();
			}
			public static get relations(): object[] {
				return [{}, {}, {}, {}];
			}
		}
		class App extends Application {}

		const components: IComponentType[] = [MockRelationalComponent];
		const app = new App(components);
		app.logging = false;

		expect(app["components"].length).toBe(4);
		expect(create).toBeCalledTimes(4);

		const component = app["getComponents"](MockRelationalComponent);
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(4);
		for (let i = 0; i < component.length; i++) {
			expect(component[i]).toBeInstanceOf(MockRelationalComponent);
		}

		await app.initialize().then(() => {
			expect(initialize).toBeCalledTimes(4);
		});

		app.close();
		expect(close).toBeCalledTimes(4);
	});
});

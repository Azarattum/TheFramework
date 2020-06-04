import Manager, { IComponentType } from "../../common/manager.class";

describe("Manager", () => {
	/**
	 * Test manager with single component
	 */
	it("singleComponent", () => {
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
		}

		const components: IComponentType[] = [MockComponent];
		const manager = new Manager(components);
		manager.logging = false;

		expect(create).toBeCalledTimes(1);
		expect(manager.components.length).toBe(1);

		const component = manager.getComponents("Test");
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(1);
		expect(component[0]).toBeInstanceOf(MockComponent);

		manager.initialize().then(() => {
			expect(initialize).toBeCalledTimes(1);
		});

		manager.close();
		expect(close).toBeCalledTimes(1);
	});

	/**
	 * Test manager with multiple components
	 * of different types
	 */
	it("multipleComponents", () => {
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
		}

		const components: IComponentType[] = [
			MockControllerComponent,
			MockServiceComponent,
			MockViewComponent
		];
		const manager = new Manager(components);
		manager.logging = false;

		expect(create).toBeCalledTimes(3);
		expect(manager.components.length).toBe(3);
		expect(manager.components[0]).toBeInstanceOf(MockServiceComponent);
		expect(manager.components[1]).toBeInstanceOf(MockViewComponent);
		expect(manager.components[2]).toBeInstanceOf(MockControllerComponent);

		let component = manager.getComponents("TestController");
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(1);
		expect(component[0]).toBeInstanceOf(MockControllerComponent);

		component = manager.getComponents("TestService");
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(1);
		expect(component[0]).toBeInstanceOf(MockServiceComponent);

		component = manager.getComponents("TestView");
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(1);
		expect(component[0]).toBeInstanceOf(MockViewComponent);

		manager.initialize().then(() => {
			expect(initialize).toBeCalledTimes(3);
		});

		manager.close();
		expect(close).toBeCalledTimes(3);
	});

	/**
	 * Test manager with duplicate components
	 * with multiple relations of the same type
	 */
	it("relationalComponents", () => {
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

		const components: IComponentType[] = [MockRelationalComponent];
		const manager = new Manager(components);
		manager.logging = false;

		expect(manager.components.length).toBe(4);
		expect(create).toBeCalledTimes(4);

		const component = manager.getComponents("TestController");
		expect(component).toBeInstanceOf(Array);
		expect(component).toHaveLength(4);
		for (let i = 0; i < component.length; i++) {
			expect(component[i]).toBeInstanceOf(MockRelationalComponent);
		}

		manager.initialize().then(() => {
			expect(initialize).toBeCalledTimes(4);
		});

		manager.close();
		expect(close).toBeCalledTimes(4);
	});
});

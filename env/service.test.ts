import {
	IComponent,
	IComponentType
} from "../src/components/common/component.interface";
import Service from "../src/components/common/service.abstract";
import serviceLoad from "./service.loader";

/**
 * Loads the service with custom loader
 * @param service Service class to load
 */
function load<T extends IComponent>(
	service: IComponentType<T>
): IComponentType<T> {
	const source = serviceLoad("module.exports=" + service.toString());
	return eval(source);
}

/**
 * Promise based delay function
 * @param delay Delay in milliseconds
 */
const delay = async (delay: number): Promise<void> => {
	return new Promise(resolve => {
		setTimeout(resolve, delay);
	});
};

describe("ServiceLoader", () => {
	/**
	 * Simple test for loading a service
	 */
	it("simpleLoad", async () => {
		console.log = jest.fn();

		class Test extends Service<"">() {
			public async initialize(): Promise<void> {
				console.log(42);
			}
		}

		const exposer = {};

		const TestLoaded = load(Test);
		expect(TestLoaded.type).toBe("Services");
		expect(TestLoaded.relations).toBeNull();
		expect((TestLoaded.valueOf() as any).name).toBe("ServiceWrapper");
		const test = await new TestLoaded({ exposer } as any);

		expect(test).not.toBeInstanceOf(Test);
		expect(test.constructor.name).toBe("ServiceWrapper");
		expect(await test.name).toBe("Test");
		expect((test as any).exposer).toBe(exposer);

		expect(test.on);
		expect(test.close);

		await test.initialize();
		expect(console.log).toBeCalledWith(42);
	});

	/**
	 * Test events and exposer functionality of wrapper
	 */
	it("exposeAndEvents", async () => {
		console.log = jest.fn();

		class Test extends Service<"initted">() {
			public async initialize(): Promise<void> {
				this.emit("initted");
				this.expose(
					"func",
					jest.fn(() => {
						console.log("called!");
						return 42;
					})
				);
			}
		}

		let func: any = null;
		const expose = jest.fn((a, b, exposed) => {
			func = exposed;
		});
		const close = jest.fn();
		const initted = jest.fn();
		const exposer = { expose, close };

		const TestLoaded = load(Test);
		const test = await new TestLoaded({ exposer } as any);
		test.on("initted", initted);
		await delay(1);

		expect(initted).not.toBeCalled();
		await test.initialize();
		await delay(1);

		expect(initted).toBeCalled();
		expect(expose).toBeCalledWith("test", "func", expect.any(Function));
		expect(func).toBeInstanceOf(Function);
		expect(await func()).toBe(42);
		expect(console.log).toBeCalledWith("called!");

		await test.close();
		expect(close).toBeCalledWith("test", null);
	});
});

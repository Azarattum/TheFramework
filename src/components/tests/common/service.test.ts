import Service from "../../common/service.abstract";

describe("Service", () => {
	/**
	 * Test general live cycle of the service
	 */
	it("liveCycle", async () => {
		class Test extends Service<"initted">() {
			public async initialize(): Promise<void> {
				this.emit("initted");
			}
		}

		const callback = jest.fn();
		const test = new Test();

		expect(test.name).toBe("Test");
		test.on("initted", callback);
		test.initialize();

		const { type, args } = await (test as any).listen();
		expect(type).toBe("initted");
		expect(args).toHaveLength(0);

		test.close();
	});

	/**
	 * Test call and expose service functionality
	 */
	it("callAndExpose", async () => {
		const value = "test";
		const value2 = "arg";
		const mock = jest.fn();

		class Test extends Service<"initted">() {
			public async initialize(): Promise<void> {
				this.expose("mock");
			}

			public async mock(...args: any[]): Promise<string> {
				mock(...args);
				return value;
			}
		}

		const test = new Test();
		test.initialize();

		const { type, args } = await (test as any).listen();
		expect(type).toBe("__exposed");
		expect(args[0]).toBe("mock");
		expect(args[1]).toContain("mock");

		const result = await (test as any).call(args[1], value2);
		expect(mock).toBeCalledTimes(1);
		expect(mock).toBeCalledWith(value2);
		expect(result).toBe(value);

		test.close();
	});
});

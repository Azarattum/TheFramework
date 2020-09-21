import Controller from "../../common/controller.abstract";

describe("Controller", () => {
	/**
	 * Test full controller life cycle
	 */
	it("lifeCycle", () => {
		class TestController extends Controller<"initialized">() {
			public initialize(): void {
				this.emit("initialized");
				this.expose("test", exposed);
				this.expose("method");
			}

			public method(): any {
				//Do nothing
			}
		}

		const callback1 = jest.fn();
		const callback2 = jest.fn();
		const exposed = jest.fn();
		const expose = jest.fn();
		const test = new TestController({ expose } as any);

		test.on("initialized", callback1);
		test.on("initialized", callback2);
		test.initialize();

		expect(callback1).toBeCalledTimes(1);
		expect(callback2).toBeCalledTimes(1);
		expect(expose).toBeCalledTimes(2);
		expect(expose).toBeCalledWith("testcontroller", "test", exposed, null);
		expect(expose).toBeCalledWith(
			"testcontroller",
			"method",
			expect.any(Function),
			null
		);

		test.close();
		test.initialize();
		expect(callback1).toBeCalledTimes(1);
		expect(callback2).toBeCalledTimes(1);
	});
});

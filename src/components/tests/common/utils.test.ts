import Utils, { LogType } from "../../common/utils.class";

describe("Utils", () => {
	/**
	 * Test utils log function
	 */
	it("log", () => {
		const testLog = "This is test!";
		const mock = (text: string): void => {
			expect(text).toContain(testLog);
			if (text.startsWith("=")) {
				expect(text).toHaveLength(60);
			}
		};

		console.log = jest.fn(mock);
		console.warn = jest.fn(mock);
		console.error = jest.fn(mock);

		Utils.log(testLog);
		Utils.log(testLog, LogType.INFO);
		Utils.log(testLog, LogType.OK);
		Utils.log(testLog, LogType.WARNING);
		Utils.log(testLog, LogType.ERROR);
		Utils.log(testLog, LogType.DIVIDER);
		Utils.log(testLog + "!", LogType.DIVIDER);
		expect(() => {
			Utils.log(testLog, -1);
		}).toThrow();

		expect(console.log).toBeCalledTimes(5);
		expect(console.warn).toBeCalledTimes(1);
		expect(console.error).toBeCalledTimes(1);
	});

	/**
	 * Test utils format function
	 */
	it("format", () => {
		let string = "The simplest {0}";
		string = Utils.format(string, "string");
		expect(string).toBe("The simplest string");

		string = "This {1} custom {0}";
		string = Utils.format(string, "order", "is");
		expect(string).toBe("This is custom order");

		string = "Double holder: {0}_{0}";
		string = Utils.format(string, "•");
		expect(string).toBe("Double holder: •_•");
	});
});

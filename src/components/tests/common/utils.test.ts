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

		Utils.log(testLog, LogType.INFO);
		Utils.log(testLog, LogType.OK);
		Utils.log(testLog, LogType.WARNING);
		Utils.log(testLog, LogType.ERROR);
		Utils.log(testLog, LogType.DIVIDER);

		expect(console.log).toBeCalledTimes(3);
		expect(console.warn).toBeCalledTimes(1);
		expect(console.error).toBeCalledTimes(1);
	});
});

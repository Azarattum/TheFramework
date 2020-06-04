import Exposer from "../../common/exposer.class";

describe("Exposer", () => {
	/**
	 * Test simple expose case
	 */
	it("simpleExpose", () => {
		const scope: any = {};
		const exposer = new Exposer(scope);

		const modules = ["Test", "Framework", "Module"];
		const name = "mock";

		for (const i in modules) {
			const mock = jest.fn(x => i);
			const module = modules[i];
			exposer.expose(module, name, mock);

			expect(scope[module]).toBeInstanceOf(Object);
			expect(scope[module][name]).toBeInstanceOf(Function);

			const result = scope[module][name]();
			expect(result).toBe(i);
			expect(mock).toBeCalledTimes(1);
		}
	});

	/**
	 * Test expose overlaps
	 */
	it("overlappingExpose", () => {
		const scope: any = {};
		const exposer = new Exposer(scope);

		const module = "Test";
		const name = "mock";
		const mock = jest.fn(x => 42);

		const overlap = 3;

		for (let i = 0; i < overlap; i++) {
			exposer.expose(module, name, mock);
		}

		expect(scope[module]).toBeInstanceOf(Object);
		expect(scope[module][name]).toBeInstanceOf(Function);

		let result = scope[module][name]();
		expect(mock).toBeCalledTimes(overlap);
		expect(result).toStrictEqual(Array(overlap).fill(42));

		result = scope[module][name].call({});
		expect(mock).toBeCalledTimes(overlap * 2);
		expect(result).toStrictEqual(Array(overlap).fill(42));
	});

	/**
	 * Test expose with object relations
	 */
	it("relationalExpose", () => {
		const scope: any = {};
		const exposer = new Exposer(scope);

		const module = "Test";
		const name = "mock";
		const overlap = 3;
		const mocks = [];
		const results = [];

		const relations = Array(overlap)
			.fill(null)
			.map(x => {
				return {};
			});

		for (let i = 0; i < overlap; i++) {
			results.push(i);
			mocks.push(jest.fn(x => i));

			exposer.expose(module, name, mocks[i], relations[i]);
		}

		expect(scope[module]).toBeInstanceOf(Object);
		expect(scope[module][name]).toBeInstanceOf(Function);

		const result = scope[module][name]();
		for (const mock of mocks) {
			expect(mock).toBeCalledTimes(1);
		}
		expect(result).toStrictEqual(results);

		for (let i = 0; i < overlap; i++) {
			const result = scope[module][name].call(relations[i]);
			expect(result).toBe(i);
		}

		for (let i = 0; i < overlap; i++) {
			expect(mocks[i]).toBeCalledTimes(2);
		}
	});
});

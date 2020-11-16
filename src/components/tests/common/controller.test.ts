import Controller, {
	bind,
	element,
	elements
} from "../../common/controller.abstract";
import { sleep } from "../../common/utils.class";

describe("Controller", () => {
	/**
	 * Test full controller life cycle
	 */
	it("lifeCycle", () => {
		class TestController extends Controller<"initialized">() {
			@bind
			private empty: null = null;

			public initialize(): void {
				this.emit("initialized");
				this.expose("test", exposed);
				this.expose("method");

				const bind = jest.fn(() => {
					this.data.lol;
				});
				expect(bind).toThrowError();
				const container = jest.fn(() => {
					this.container;
				});
				expect(container).toThrowError();
			}

			public method(): any {
				//Do nothing
			}
		}

		const callback1 = jest.fn();
		const callback2 = jest.fn();
		const exposed = jest.fn();
		const expose = jest.fn();
		const close = jest.fn();
		const test = new TestController({ exposer: { expose, close } } as any);

		expect(TestController.relations).toEqual([]);
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
		expect(close).toBeCalledTimes(1);
		test.initialize();
		expect(callback1).toBeCalledTimes(1);
		expect(callback2).toBeCalledTimes(1);
	});

	/**
	 * Testing controllers with DOM relations
	 */
	it("relationalControllers", async () => {
		document.body.innerHTML = `
			<div controller="test"></div>
			<div controller="test"></div>
		`;

		const init = jest.fn();
		const close = jest.fn();

		class Test extends Controller<"">() {
			public initialize(): void {
				expect(this.container).toBeInstanceOf(HTMLDivElement);
				init();
			}

			public close(): void {
				close();
			}
		}

		expect(Test.relations).toHaveLength(2);
		expect(Test.relations?.every(x => x instanceof HTMLDivElement));

		let relation = Test.relations?.[0] as any;
		const test = new Test({ relation } as any);
		relation = Test.relations?.[1] as any;
		const test2 = new Test({ relation } as any);
		await test.initialize();
		await test2.initialize();
		expect(init).toBeCalledTimes(2);

		test.close();
		test2.close();
		expect(close).toBeCalledTimes(2);
	});

	/**
	 * Testing controller's data property
	 * (maping to `this.binding`)
	 */
	it("dataProperty", async () => {
		document.body.innerHTML = `
			<div controller="test"></div>
		`;

		const init = jest.fn();
		const data = {
			hello: undefined,
			test: {
				deep: {
					data: 2
				}
			}
		};

		const binding = {
			get: jest.fn(() => {
				return data;
			}),
			set: jest.fn(),
			close: jest.fn()
		};

		class Test extends Controller<"">() {
			public initialize(): void {
				this.data.hello;
				expect(binding.get).toHaveBeenCalled();
				expect(binding.get).toHaveBeenCalledWith("hello");
				this.data.test.deep.data;
				expect(binding.get).toHaveBeenCalled();

				this.data.a = 42;
				expect(binding.get).toHaveBeenCalled();
				expect(binding.set).toHaveBeenCalledWith("a", 42);

				this.data.test.deep.data = "lol";
				expect(binding.get).toHaveBeenCalled();
				expect(binding.set).toHaveBeenCalledWith(
					"test.deep.data",
					"lol"
				);

				init();
			}
		}

		const relation = Test.relations?.[0] as any;
		const test = new Test({
			relation,
			exposer: { close: jest.fn() }
		} as any);
		//Mock binding
		test["binding"] = binding as any;
		await test.initialize();
		expect(init).toBeCalled();

		test.close();
		expect(binding.close).toBeCalled();
	});

	/**
	 * Testing element, elements decorators
	 */
	it("elementDecorators", async () => {
		document.body.innerHTML = `
			<div controller="test">
				<p class="hey text">hello</p>
				<p class="text">bye</p>
			</div>
		`;

		class Test extends Controller<"">() {
			@element("p")
			private hello!: HTMLElement;
			@element
			private hey!: HTMLElement;
			@element()
			private nothing!: HTMLElement;
			@elements("p")
			private paragraphs!: HTMLElement[];
			@elements
			private text!: HTMLElement[];
			@elements()
			private nothings!: HTMLElement[];

			public initialize(): void {
				const test = jest.fn(() => {
					this.nothing;
				});

				expect(this.hello).toBeInstanceOf(HTMLParagraphElement);
				expect(this.hello.textContent).toBe("hello");
				expect(this.hey).toBe(this.hello);
				expect(this.paragraphs).toHaveLength(2);
				expect(this.text).toEqual(this.paragraphs);
				expect(
					this.paragraphs.every(
						x => x instanceof HTMLParagraphElement
					)
				);
				expect(test).toThrowError();
				expect(this.nothings).toHaveLength(0);
			}
		}

		const relation = Test.relations?.[0] as any;
		const test = new Test({ relation } as any);
		await test.initialize();
	});

	/**
	 * Global controller shortcut test
	 */
	it("controllerShortcut", async () => {
		document.body.innerHTML = `
			<div controller="test" id="ctrl">
				<div id="element"></div>
			</div>
			<p id="nothing"></p>
		`;

		//We have to wrap function into an object, otherwise TypeScript
		// throws an error because of using `this` keyword.
		const obj = {
			func: function(): void {
				expect(this).toBe(document.getElementById("ctrl"));
			}
		};
		const func = jest.fn(obj.func);
		(globalThis as any)["test"]["prop"] = func;

		//Undefined test
		expect((globalThis as any).ctrl.nothing).toBeUndefined();
		(globalThis as any).event = {
			target: document.getElementById("element")
		};
		expect((globalThis as any).ctrl.nothing).toBeUndefined();

		//Normal test
		const result = (globalThis as any).ctrl.prop;
		result();
		expect(func).toHaveBeenCalled();

		//Self test
		(globalThis as any).event = {
			target: document.getElementById("ctrl")
		};
		(globalThis as any).ctrl.prop();
		expect(func).toHaveBeenCalled();

		//No controller test
		(globalThis as any).event = {
			target: document.getElementById("nothing")
		};
		expect((globalThis as any).ctrl.prop).toBeUndefined();
	});

	/**
	 * Global controller shortcut test
	 */
	it("bindDecorator", async () => {
		document.body.innerHTML = `
			<div controller="test"></div>
		`;

		const set = jest.fn();
		const get = jest.fn(path => {
			if (!path) return {};
			if (path === "predefined") return 42;
			if (path === "num") return 10;
			if (path === "object") return ["13", 2];
		});
		const binding = { get, set, close: jest.fn() };

		class Test extends Controller<"">() {
			@bind
			private num: number = 0;
			@bind()
			private predefined!: number;
			@bind("object")
			private numbers: number[] = [1, 2];

			public async initialize(): Promise<void> {
				expect(set).toHaveBeenCalledWith("num", 0);
				expect(set).toHaveBeenCalledWith("object", [1, 2]);
				expect(get).toHaveBeenCalledWith("predefined");
				expect(this.predefined).toBe(42);
				this.num = 42;
				expect(this.num).toBe(42);
				await sleep(0);
				expect(set).toHaveBeenCalledWith("num", 42, undefined);
				this.data.num = -1;
				expect(set).toHaveBeenCalledWith("num", -1, undefined);
				expect(this.num).toBe(-1);
				binding.set("num");
				expect(this.num).toBe(10);

				this.numbers[0] = 0;
				expect(set).toHaveBeenCalledWith("object", [0, 2]);
				binding.set("object");
				expect(this.numbers[0]).toBe(13);
			}
		}

		const relation = Test.relations?.[0] as any;
		const test = new Test({
			relation,
			exposer: { close: jest.fn() }
		} as any);
		//Mock binding
		test["binding"] = binding as any;
		await test.initialize();

		test.close();
		expect(binding.close).toBeCalled();
	});
});

import { sleep } from "../../common/utils.class";
import View from "../../common/view.abstract";

describe("View", () => {
	/**
	 * Test empty view creation
	 */
	it("emptyCreation", async () => {
		const template = (): string => {
			return "";
		};
		class Empty extends View(template) {}

		expect(Empty.relations).toBeNull();

		const refresh = jest.fn();
		const test = new Empty({ refresh } as any);
		expect(test.name).toBe("Empty");
		expect(test.containers.length).toBe(0);

		const timeout = new Promise((_, reject) => {
			const id = setTimeout(() => {
				clearTimeout(id);
				reject();
			}, 0);
		});

		expect(Promise.race([test.initialize(), timeout])).resolves.toBe(
			undefined
		);

		document.body.innerHTML = "<view-empty></view-empty>";
		await sleep(100);
		expect(refresh).toBeCalled();
	});

	/**
	 * Test simple view creation
	 */
	it("simpleView", async () => {
		document.body.innerHTML = "<view-simple></view-simple>";
		const template = (): string => {
			return (function(): string {
				return "<div>content</div>";
			})();
		};
		class Simple extends View(template) {}

		const refresh = jest.fn();
		const test = new Simple({ refresh } as any);
		expect(test.containers.length).toBe(1);

		await test.initialize();
		expect(refresh).toBeCalled();

		const children = document.body.firstElementChild?.children;
		expect(children?.length).toBe(1);
		expect(children?.[0]).toBeInstanceOf(HTMLDivElement);
		expect(document.querySelector("div")?.textContent).toBe("content");

		test.close();
		expect(refresh).toBeCalled();
		expect(document.body.innerHTML).toBe("");
	});

	/**
	 * Test simple view creation
	 */
	it("dataAttributes", async () => {
		document.body.innerHTML = `<view-attrs data-test="42" data-attr="something"></view-attrs>`;
		const template = (locals: any): string => {
			expect(locals).toHaveProperty("uuid");
			return (function(attr, test): string {
				expect(["21", "42"].includes(test));
				expect(attr).toBe("something");

				return `<div>${locals.attr}: ${locals.test}</div>`;
			})(locals.attr, locals.test);
		};
		class Attrs extends View(template) {}

		const refresh = jest.fn();
		const test = new Attrs({ refresh } as any);
		expect(test.containers.length).toBe(1);

		await test.initialize();
		expect(refresh).toBeCalledTimes(1);
		expect(document.querySelector("div")?.textContent).toBe(
			"something: 42"
		);

		const view = document.querySelector("view-attrs") as HTMLElement;
		expect(view).toBeInstanceOf(HTMLElement);
		view.dataset.test = "21";

		//Expect rerender
		await sleep(100);
		expect(refresh).toBeCalledTimes(2);
		expect(document.querySelector("div")?.textContent).toBe(
			"something: 21"
		);

		test.close();
		expect(refresh).toBeCalled();
		expect(document.body.innerHTML).toBe("");
	});
});

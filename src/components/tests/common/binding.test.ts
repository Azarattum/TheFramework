import Binding from "../../common/binding.class";
import { sleep } from "../../common/utils.class";

const container = document.createElement("div");
let bind: Binding;

/**Id selector shortcut */
const $ = (id: string): HTMLElement => {
	return container.querySelector("#" + id) as HTMLElement;
};

describe("Binding", () => {
	/**
	 * Test binding on an empty container
	 */
	it("emptyContainer", () => {
		container.innerHTML = "";
		bind = new Binding(container);

		const testValue = "42";

		expect(bind.get()).toEqual({});

		bind.set("test1", testValue);

		//We should be able to get a whole object
		expect(bind.get()).toEqual({ test1: testValue });
		//Every primitive is converted to string
		expect(bind.get("test1")).toEqual("42");

		//Test deep objects
		const dataObject: any = {
			data: "hmm",
			test: {
				value: +testValue
			}
		};

		bind.set("test2", dataObject);
		dataObject.test.value = testValue;
		expect(bind.get("test2")).toEqual(dataObject);
		expect(bind.get("test2.test.value")).toEqual(testValue);

		//Test arrays
		const dataArray = [1, 2, "3", { a: "42", b: 2 }];
		const expected = { 0: "1", 1: "2", 2: "3", 3: { a: "42", b: "2" } };

		bind.set("test3", dataArray);
		expect(bind.get("test3")).toEqual(expected);
		expect(bind.get("test3.0")).toEqual(expected[0]);
		expect(bind.get("test3.3.a")).toEqual(expected[3].a);

		bind.close();
	});

	/**
	 * Test binding of deep nested objects
	 */
	it("deepNesed", async () => {
		container.innerHTML = `
		<data-text id="a" bind-a bind="a"></data-text>
		<data-text id="a0" bind-a.0 bind="a.0"></data-text>
		<data-text id="a1" bind-a.1 bind="a.1"></data-text>
		<data-text id="a2" bind-a.2 bind="a.2"></data-text>
		<data-text id="a2a" bind-a.2.a bind="a.2.a"></data-text>
		<data-text id="a2b" bind-a.2.b bind="a.2.b"></data-text>
		<data-text id="a2b0" bind-a.2.b.0 bind="a.2.b.0"></data-text>
		<data-text id="a2b1" bind-a.2.b.1 bind="a.2.b.1"></data-text>
		<data-text id="a2c" bind-a.2.c bind="a.2.c"></data-text>
		<data-text id="a2ctest" bind-a.2.c.test bind="a.2.c.test"></data-text>
		`;
		bind = new Binding(container);

		const obj = [1, 2, { a: "123", b: [42, 73], c: { test: "message" } }];
		const expected = {
			0: "1",
			1: "2",
			2: { a: "123", b: { 0: "42", 1: "73" }, c: { test: "message" } }
		};

		bind.set("a", obj);

		expect(bind.get("a")).toEqual(expected);
		expect($("a").innerHTML).toBe(JSON.stringify(expected));
		expect($("a0").innerHTML).toBe(expected[0]);
		expect($("a1").innerHTML).toBe(expected[1]);
		expect($("a2").innerHTML).toBe(JSON.stringify(expected[2]));
		expect($("a2a").innerHTML).toBe(expected[2]["a"]);
		expect($("a2b").innerHTML).toBe(JSON.stringify(expected[2]["b"]));
		expect($("a2b0").innerHTML).toBe(expected[2]["b"][0]);
		expect($("a2b1").innerHTML).toBe(expected[2]["b"][1]);
		expect($("a2c").innerHTML).toBe(JSON.stringify(expected[2]["c"]));
		expect($("a2ctest").innerHTML).toBe(expected[2]["c"]["test"]);

		//The same but at runtime
		container.innerHTML = `
		<data-text id="a" bind-a bind="a"></data-text>
		<data-text id="a0" bind-a.0 bind="a.0"></data-text>
		<data-text id="a1" bind-a.1 bind="a.1"></data-text>
		<data-text id="a2" bind-a.2 bind="a.2"></data-text>
		<data-text id="a2a" bind-a.2.a bind="a.2.a"></data-text>
		<data-text id="a2b" bind-a.2.b bind="a.2.b"></data-text>
		<data-text id="a2b0" bind-a.2.b.0 bind="a.2.b.0"></data-text>
		<data-text id="a2b1" bind-a.2.b.1 bind="a.2.b.1"></data-text>
		<data-text id="a2c" bind-a.2.c bind="a.2.c"></data-text>
		<data-text id="a2ctest" bind-a.2.c.test bind="a.2.c.test"></data-text>
		`;

		await sleep(0);

		expect(bind.get("a")).toEqual(expected);
		expect($("a").innerHTML).toBe(JSON.stringify(expected));
		expect($("a0").innerHTML).toBe(expected[0]);
		expect($("a1").innerHTML).toBe(expected[1]);
		expect($("a2").innerHTML).toBe(JSON.stringify(expected[2]));
		expect($("a2a").innerHTML).toBe(expected[2]["a"]);
		expect($("a2b").innerHTML).toBe(JSON.stringify(expected[2]["b"]));
		expect($("a2b0").innerHTML).toBe(expected[2]["b"][0]);
		expect($("a2b1").innerHTML).toBe(expected[2]["b"][1]);
		expect($("a2c").innerHTML).toBe(JSON.stringify(expected[2]["c"]));
		expect($("a2ctest").innerHTML).toBe(expected[2]["c"]["test"]);

		bind.close();
	});

	/**
	 * Test binding for a simple loop
	 */
	it("simpleLoop", async () => {
		container.innerHTML = `
		<template each bind="arr" key="key" value="val">
			<div bind-val bind="{&quot;id&quot;: &quot;'d' + val&quot;}">
				<data-text bind-val bind="val"></data-text>
				<data-text bind-key bind="key"></data-text>
			</div>
		</template>
		`;
		bind = new Binding(container);

		bind.set("arr", [1, 2, 3, 4, 5]);
		expect(container.getElementsByTagName("div").length).toBe(5);
		for (const i of [1, 2, 3, 4, 5]) {
			const div = $("d" + i);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(2);
			expect(div.firstElementChild?.textContent).toBe(i.toString());
			expect(div.lastElementChild?.textContent).toBe((+i - 1).toString());
		}

		bind.set("arr", [1, 2, 3, 4]);
		expect(container.getElementsByTagName("div").length).toBe(4);
		for (const i of [1, 2, 3, 4]) {
			const div = $("d" + i);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(2);
			expect(div.firstElementChild?.textContent).toBe(i.toString());
			expect(div.lastElementChild?.textContent).toBe((+i - 1).toString());
		}

		bind.set("arr", [1, 2, 3, 4, 5]);
		expect(container.getElementsByTagName("div").length).toBe(5);
		for (const i of [1, 2, 3, 4, 5]) {
			const div = $("d" + i);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(2);
			expect(div.firstElementChild?.textContent).toBe(i.toString());
			expect(div.lastElementChild?.textContent).toBe((+i - 1).toString());
		}

		//Runtime tets
		container.innerHTML = `
		<template each bind="arr" key="key" value="val">
			<div bind-val bind="{&quot;id&quot;: &quot;'d' + val&quot;}">
				<data-text bind-val bind="val"></data-text>
				<data-text bind-key bind="key"></data-text>
			</div>
		</template>
		`;

		await sleep(0);

		expect(container.getElementsByTagName("div").length).toBe(5);
		for (const i of [1, 2, 3, 4, 5]) {
			const div = $("d" + i);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(2);
			expect(div.firstElementChild?.textContent).toBe(i.toString());
			expect(div.lastElementChild?.textContent).toBe((+i - 1).toString());
		}

		bind.close();
	});

	/**
	 * Test binding for a simple loop
	 */
	it("objectLoop", async () => {
		container.innerHTML = `
		<template each bind="obj" key="key" value="val">
			<div bind-val bind="{&quot;id&quot;: &quot;key&quot;}">
				<data-text bind-key bind="key + ': '"></data-text>
				<data-text bind-val bind="val"></data-text>
			</div>
		</template>
		`;
		bind = new Binding(container);

		const object: any = {
			lol: "123",
			test: 42,
			arr: [1, 3]
		};

		bind.set("obj", object);
		expect(container.getElementsByTagName("div").length).toBe(3);
		for (const key in object) {
			const div = $(key);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(2);
			expect(div.firstElementChild?.textContent).toBe(`${key}: `);
			expect(div.lastElementChild?.textContent).toBe(
				key == "arr" ? '{"0":"1","1":"3"}' : object[key].toString()
			);
		}

		//Runtime tets
		container.innerHTML = `
		<template each bind="obj" key="key" value="val">
			<div bind-val bind="{&quot;id&quot;: &quot;key&quot;}">
				<data-text bind-key bind="key + ': '"></data-text>
				<data-text bind-val bind="val"></data-text>
			</div>
		</template>
		`;

		await sleep(0);

		expect(container.getElementsByTagName("div").length).toBe(3);
		for (const key in object) {
			const div = $(key);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(2);
			expect(div.firstElementChild?.textContent).toBe(`${key}: `);
			expect(div.lastElementChild?.textContent).toBe(
				key == "arr" ? '{"0":"1","1":"3"}' : object[key].toString()
			);
		}

		bind.close();
	});

	/**
	 * Test binding for a nested loop
	 */
	it("nestedLoop", async () => {
		container.innerHTML = `
		<template each bind="arr" key="i" value="y">
			<template each bind="y" key="j" value="x">
				<div bind-x bind="{&quot;id&quot;: &quot;'d' + x&quot;}">
					<data-text bind-x bind="x"></data-text>
					<data-text bind-i bind-j bind="i + j"></data-text>
					<data-text bind-y bind="y"></data-text>
				</div>
			</template>
			<p bind-i bind="{&quot;id&quot;: &quot;'dd' + i&quot;}">
				<data-text bind-y bind="y"></data-text>
			</p>
		</template>
		`;
		bind = new Binding(container);

		const matrix = [
			[1, 2, 3, 4],
			[5, 6, 7, 8],
			[9, 10, 11, 12],
			[13, 14, 15, 16]
		];

		bind.set("arr", matrix);
		expect(container.getElementsByTagName("div").length).toBe(16);
		expect(container.getElementsByTagName("p").length).toBe(4);
		for (const i in matrix) {
			const json = JSON.stringify(
				Object.assign(
					{},
					matrix[i].map(x => x.toString())
				)
			);
			for (const j in matrix[i]) {
				const x = matrix[i][j];
				const div = $("d" + x);
				expect(div).toBeTruthy();
				expect(div.children.length).toBe(3);
				expect(div.firstElementChild?.textContent).toBe(x + "");
				expect(div.children[1].textContent).toBe(i + j);
				expect(div.children[2].textContent).toBe(json);
			}
			const div = $("dd" + i);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(1);
			expect(div.firstElementChild?.textContent).toBe(json);
		}

		bind.set("arr.0", [1, 2, 3, 4, 42]);
		expect(container.getElementsByTagName("div").length).toBe(17);
		expect(container.getElementsByTagName("p").length).toBe(4);
		for (const j in [1, 2, 3, 4, 42]) {
			const x = [1, 2, 3, 4, 42][j];
			const div = $("d" + x);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(3);
			expect(div.firstElementChild?.textContent).toBe(x + "");
			expect(div.children[1].textContent).toBe("0" + j);
		}

		bind.close();
	});

	/**
	 * Test binding on complex loop varaibles like `<loop-value>[0]`
	 */
	it("complexLoopBinding", async () => {
		container.innerHTML = `
		<template each bind="arr" value="val">
			<div bind-val.0 bind="{&quot;id&quot;: &quot;'d' + val.0&quot;}">
				<data-text bind-val.0 bind="val.0"></data-text>
				<data-text bind-val.1 bind="val.1"></data-text>
			</div>
		</template>
		`;
		bind = new Binding(container);

		const data = ["a", "b", "c"];

		bind.set("arr", [
			[1, data[0]],
			[2, data[1]],
			[3, data[2]]
		]);
		expect(container.getElementsByTagName("div").length).toBe(3);
		for (const i of [1, 2, 3]) {
			const div = $("d" + i);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(2);
			expect(div.firstElementChild?.textContent).toBe(i.toString());
			expect(div.lastElementChild?.textContent).toBe(data[i - 1]);
		}

		//Runtime tets
		container.innerHTML = `
		<template each bind="arr" value="val">
			<div bind-val.0 bind="{&quot;id&quot;: &quot;'d' + val.0&quot;}">
				<data-text bind-val.0 bind="val.0"></data-text>
				<data-text bind-val.1 bind="val.1"></data-text>
			</div>
		</template>
		`;

		await sleep(0);

		expect(container.getElementsByTagName("div").length).toBe(3);
		for (const i of [1, 2, 3]) {
			const div = $("d" + i);
			expect(div).toBeTruthy();
			expect(div.children.length).toBe(2);
			expect(div.firstElementChild?.textContent).toBe(i.toString());
			expect(div.lastElementChild?.textContent).toBe(data[i - 1]);
		}

		bind.close();
	});

	/**
	 * Test constant bind expressions
	 */
	it("constantBinds", async () => {
		container.innerHTML = `
		<data-text id="a" bind="2 + 2"></data-text>
		<data-text id="b" bind="'test'"></data-text>
		<p bind="{&quot;id&quot;: &quot;'c'&quot;}"></p>
		`;
		bind = new Binding(container);

		expect($("a").innerHTML).toBe("4");
		expect($("b").innerHTML).toBe("test");
		expect($("c")).toBeTruthy();

		container.innerHTML = `
		<data-text id="a" bind="2 + 2"></data-text>
		<data-text id="b" bind="'test'"></data-text>
		<p bind="{&quot;id&quot;: &quot;'c'&quot;}"></p>
		`;

		await sleep(0);

		expect($("a").innerHTML).toBe("4");
		expect($("b").innerHTML).toBe("test");
		expect($("c")).toBeTruthy();

		bind.close();
	});

	/**
	 * Test of clearing overrided objects
	 */
	it("clearingObjects", async () => {
		container.innerHTML = `
		<data-text id="a" bind-a bind="a"></data-text>
		<data-text id="a0" bind-a.0 bind="a.0"></data-text>
		<data-text id="a1" bind-a.1 bind="a.1"></data-text>
		<data-text id="a2" bind-a.2 bind="a.2"></data-text>
		`;
		bind = new Binding(container);

		const obj = [1, 2, 3];
		const expected: Record<string, string> = {
			0: "1",
			1: "2",
			2: "3"
		};

		bind.set("a", obj);

		expect(bind.get("a")).toEqual(expected);
		expect($("a").innerHTML).toBe(JSON.stringify(expected));
		expect($("a0").innerHTML).toBe(expected[0]);
		expect($("a1").innerHTML).toBe(expected[1]);
		expect($("a2").innerHTML).toBe(expected[2]);

		bind.set("a", obj.slice(0, 2));
		delete expected["2"];

		expect(bind.get("a")).toEqual(expected);
		expect($("a").innerHTML).toBe(JSON.stringify(expected));
		expect($("a0").innerHTML).toBe(expected[0]);
		expect($("a1").innerHTML).toBe(expected[1]);
		expect($("a2").innerHTML).toBe("");

		bind.close();
	});

	/**
	 * Test binding of style attribute
	 */
	it("bindStyle", async () => {
		container.innerHTML = `
		<div id="a"
			bind-color
			bind-size
			bind="{&quot;style&quot;: &quot;pug.style('color:'+color+';font-size:'+size+'px')&quot;}"
		></div>
		<div id="b"
			bind-color
			bind-size
			bind="{&quot;style&quot;: &quot;pug.style({'color': color, 'font-size': size+'px'})&quot;}"
		></div>
		`;
		bind = new Binding(container);

		expect($("a").style.color).toBe("");
		expect($("b").style.color).toBe("");
		bind.set("color", "red");
		expect($("a").style.color).toBe("red");
		expect($("b").style.color).toBe("red");
		bind.set("color", "unknowncolor");
		expect($("a").style.color).toBe("");
		expect($("b").style.color).toBe("red");

		expect($("a").style.fontSize).toBe("");
		expect($("b").style.fontSize).toBe("");
		bind.set("size", "4");
		expect($("a").style.fontSize).toBe("4px");
		expect($("b").style.fontSize).toBe("4px");
		bind.set("size", "NaN");
		expect($("a").style.fontSize).toBe("");
		expect($("b").style.fontSize).toBe("4px");

		bind.close();
	});

	/**
	 * Test binding for objects
	 */
	it("objectLikeData", async () => {
		container.innerHTML = `
        <data-text id="a0" bind-a.0="1" bind="a.0"></data-text>
        <data-text id="a1" bind-a.1="2" bind="a.1"></data-text>
		<data-text id="a" bind-a="data" bind="a"></data-text>
		<div id="aa" test="" bind-a="a" bind='{"test": "a"}'></div>

		<div id="bb" test="" bind-b="a" bind='{"test": "b"}'></div>
		<data-text id="b" bind-b="data" bind="b"></data-text>
		<data-text id="b0" bind-b.0="1" bind="b.0"></data-text>
		<data-text id="b1" bind-b.1="2" bind="b.1"></data-text>
		`;
		bind = new Binding(container);

		const obj = { 0: "1", 1: "2" };

		expect($("a0").innerHTML).toBe("1");
		expect($("a1").innerHTML).toBe("2");
		expect($("a").innerHTML).toBe(JSON.stringify(obj));
		expect($("aa").getAttribute("test")).toBe(JSON.stringify(obj));
		expect($("b0").innerHTML).toBe("1");
		expect($("b1").innerHTML).toBe("2");
		expect($("b").innerHTML).toBe(JSON.stringify(obj));
		expect($("bb").getAttribute("test")).toBe(JSON.stringify(obj));

		expect(bind.get()).toEqual({ a: obj, b: obj });

		//Same test but in runtime
		container.innerHTML = `
        <data-text id="a0" bind-a.0="1" bind="a.0"></data-text>
        <data-text id="a1" bind-a.1="2" bind="a.1"></data-text>
		<data-text id="a" bind-a="data" bind="a"></data-text>
		<div id="aa" test="" bind-a="a" bind='{"test": "a"}'></div>

		<div id="bb" test="" bind-b="a" bind='{"test": "b"}'></div>
		<data-text id="b" bind-b="data" bind="b"></data-text>
		<data-text id="b0" bind-b.0="1" bind="b.0"></data-text>
		<data-text id="b1" bind-b.1="2" bind="b.1"></data-text>
		`;

		await sleep(0);

		expect($("a0").innerHTML).toBe("1");
		expect($("a1").innerHTML).toBe("2");
		expect($("a").innerHTML).toBe(JSON.stringify(obj));
		expect($("aa").getAttribute("test")).toBe(JSON.stringify(obj));
		expect($("b0").innerHTML).toBe("1");
		expect($("b1").innerHTML).toBe("2");
		expect($("b").innerHTML).toBe(JSON.stringify(obj));
		expect($("bb").getAttribute("test")).toBe(JSON.stringify(obj));

		expect(bind.get()).toEqual({ a: obj, b: obj });

		bind.close();
	});

	/**
	 * Test inferring binding values from context
	 */
	it("autoInferredValues", async () => {
		container.innerHTML = `
        <data-text id="a" bind-test1="i am nothing" bind="test1"></data-text>
        <data-text id="b" bind-test1="valueless" bind="test1"></data-text>
        <data-html id="c" bind-test1 bind="test1"></data-html>
		<div id="d" test="" bind-test1 bind='{"test": "test1"}'></div>
		<div id="e" test="" bind-test1="<br>initial" bind='{"test": "test1"}'></div>
		<div id="container"></div>

		<input id="z" type="text" bind-test2 bind='{"value": "test2"}'>
		`;
		bind = new Binding(container);

		//Test
		expect(bind.get("test1")).toBe("<br>initial");
		expect($("a")?.innerHTML).toBe("&lt;br&gt;initial");
		expect($("b")?.innerHTML).toBe("&lt;br&gt;initial");
		expect($("c")?.innerHTML).toBe("<br>initial");
		expect($("d")?.getAttribute("test")).toBe("<br>initial");
		expect($("e")?.getAttribute("test")).toBe("<br>initial");
		expect(($("z") as HTMLInputElement).value).toBe("");

		//Change unset value
		bind.set("test2", "2");

		expect(($("z") as HTMLInputElement).value).toBe("2");
	});

	/**
	 * Test sync for inserted nodes
	 */
	it("syncForAddedElements", async () => {
		$("container").innerHTML = `
		<data-text id="f" bind-test1 bind="test1"></data-text>
		<data-text id="g" bind-test1="weak value" bind="test1"></data-text>
		<div id="h" test="" bind-test1 bind='{"test": "test1"}'></div>

		<data-text id="i" bind-test2="weak" bind="test2"></data-text>
		<div id="j" test="" bind-test2 bind='{"test": "test2"}'></div>
		<div id="k" test="" bind-test2 bind-test1 bind='{"test": "test2+test1"}'></div>
		`;

		await sleep(0);

		//Test value sync for newly added elements
		expect(bind.get("test1")).toBe("<br>initial");
		expect($("a")?.innerHTML).toBe("&lt;br&gt;initial");
		expect($("b")?.innerHTML).toBe("&lt;br&gt;initial");
		expect($("c")?.innerHTML).toBe("<br>initial");
		expect($("d")?.getAttribute("test")).toBe("<br>initial");
		expect($("e")?.getAttribute("test")).toBe("<br>initial");

		expect($("f")?.getAttribute("bind-test1")).toBe("<br>initial");

		expect($("f")?.innerHTML).toBe("&lt;br&gt;initial");
		expect($("g")?.innerHTML).toBe("&lt;br&gt;initial");
		expect($("h")?.getAttribute("test")).toBe("<br>initial");

		expect($("i")?.innerHTML).toBe("2");
		expect($("j")?.getAttribute("test")).toBe("2");
		expect($("k")?.getAttribute("test")).toBe("2<br>initial");

		expect(
			container.querySelectorAll("[bind-test1='<br>initial']").length
		).toBe(9);
	});

	/**
	 * Test sync for inserted nodes' attributes
	 */
	it("attributesSync", async () => {
		//Test attrubute sync
		$("f")?.setAttribute("bind-test1", "updated");

		await sleep(0);

		expect(bind.get("test1")).toBe("updated");

		bind.set("test1");
		expect($("a")?.innerHTML).toBe("updated");
		expect($("b")?.innerHTML).toBe("updated");
		expect($("c")?.innerHTML).toBe("updated");
		expect($("d")?.getAttribute("test")).toBe("updated");
		expect($("e")?.getAttribute("test")).toBe("updated");
		expect($("f")?.innerHTML).toBe("updated");
		expect($("g")?.innerHTML).toBe("updated");
		expect($("h")?.getAttribute("test")).toBe("updated");
		expect($("k")?.getAttribute("test")).toBe("2updated");
	});

	/**
	 * Test that removed from DOM elements are no longer tracked
	 */
	it("unsyncRemovedElements", async () => {
		//Test attrubute sync
		const element = $("f");
		element.remove();

		expect(element.innerHTML).toBe("updated");
		element.setAttribute("bind-test1", "removed");
		await sleep(0);
		expect(bind.get("test1")).toBe("updated");

		bind.set("test1", "newvalue");
		await sleep(0);
		expect(element.innerHTML).toBe("updated");
	});

	/**
	 * Test data binding with text-like input elements
	 */
	it("textInputsSync", async () => {
		container.innerHTML = `
		<data-text id="t" bind-input bind="input"></data-text>
		<input id="c" type="checkbox" bind-input bind='{"checked": "!!input"}'>
		<input id="i" type="text" bind-input bind='{"value": "input"}'>
		<input id="i2" type="text" bind-input bind='{"value": "(input).toUpperCase()"}'>
		<input id="r" type="radio" name="r" bind-input bind='{"checked": "!!input"}'>
		<input id="r2" type="radio" name="r"'>
		`;
		await sleep(0);

		const input = $("i") as HTMLInputElement;

		expect($("t").innerHTML).toBe("");
		expect(input.value).toBe("");
		expect(($("i2") as HTMLInputElement).value).toBe("");

		input.value = "text";
		input.dispatchEvent(new Event("input"));
		await sleep(0);

		expect(input.getAttribute("bind-input")).toBe("text");
		expect(input.value).toBe("text");
		expect($("t").innerHTML).toBe("text");
		expect(($("i2") as HTMLInputElement).value).toBe("TEXT");
		expect(($("c") as HTMLInputElement).checked);
		expect(($("r") as HTMLInputElement).checked);
	});

	/**
	 * Test data binding with checkbox-like input elements
	 */
	it("checkedInputsSync", async () => {
		const checkbox = $("c") as HTMLInputElement;
		const radio = $("r") as HTMLInputElement;
		const radio2 = $("r2") as HTMLInputElement;

		checkbox.checked = false;
		checkbox.dispatchEvent(new Event("input"));
		await sleep(0);

		expect($("t").innerHTML).toBe("");
		expect($("i").getAttribute("bind-input")).toBe("");
		expect(($("i") as HTMLInputElement).value).toBe("");
		expect(($("i2") as HTMLInputElement).value).toBe("");
		expect(!radio.checked);
		expect(radio2.checked);
		expect(!checkbox.checked);

		checkbox.checked = true;
		checkbox.dispatchEvent(new Event("input"));
		await sleep(0);

		expect($("t").innerHTML).toBe("true");
		expect($("i").getAttribute("bind-input")).toBe("true");
		expect(($("i") as HTMLInputElement).value).toBe("true");
		expect(($("i2") as HTMLInputElement).value).toBe("TRUE");
		expect(radio.checked);
		expect(!radio2.checked);
		expect(checkbox.checked);

		radio2.checked = true;
		radio2.dispatchEvent(new Event("input"));
		await sleep(0);

		expect($("t").innerHTML).toBe("");
		expect($("i").getAttribute("bind-input")).toBe("");
		expect(($("i") as HTMLInputElement).value).toBe("");
		expect(($("i2") as HTMLInputElement).value).toBe("");
		expect(!radio.checked);
		expect(radio2.checked);
		expect(!checkbox.checked);
		bind.close();
	});

	/**
	 * Test for values given as promise
	 */
	it("promisesSupport", async () => {
		container.innerHTML = `
			<data-text id="text" bind-text bind="text"></data-text>
		`;
		bind = new Binding(container);

		const promise = new Promise(resolve => {
			setTimeout(() => {
				resolve('"First line\nSecond line"');
			}, 0);
		});

		bind.set("text", promise);

		expect(bind.get("text")).toBe("");
		expect($("text").innerHTML).toBe("");

		await sleep(2);

		expect(bind.get("text")).toBe('"First line\nSecond line"');
		expect($("text").innerHTML).toBe('"First line\nSecond line"');
	});
});

import viewLoad from "../../../../env/view.loader";
const pugLoad = require("pug-loader") as (
	source: string,
	options: obj
) => string;

async function load(source: string): Promise<HTMLElement> {
	return new Promise(resolve => {
		const callback = (_: any, result: string): void => {
			const source = viewLoad(result);
			const html = eval(
				source.replace(/!.+\/pug-runtime\/index.js/, "pug-runtime")
			)();

			const container = document.createElement("div");
			container.innerHTML = html;
			resolve(container);
		};

		const loaderContext = {
			loaders: ["itself"],
			callback: callback
		};

		pugLoad.bind(loaderContext)(source, {});
	});
}

describe("ViewLoader", () => {
	/**
	 * Simple test for composition of loaders
	 */
	it("loadersComposition", async () => {
		const root = await load(
			`
			p hello
            div
                span hey
            `.replace(/^ {12}|^\t{3}|\s*$/gm, "")
		);

		expect(root.children.length).toBe(2);
		expect(root.firstElementChild).toBeInstanceOf(HTMLParagraphElement);
		expect(root.firstElementChild?.textContent).toBe("hello");
		expect(root.lastElementChild).toBeInstanceOf(HTMLDivElement);
		expect(root.lastElementChild?.firstElementChild).toBeInstanceOf(
			HTMLSpanElement
		);
		expect(root.lastElementChild?.firstElementChild?.textContent).toBe(
			"hey"
		);
	});

	/**
	 * Test for loading an empty view
	 */
	it("emptyLoad", async () => {
		const root = await load("");

		expect(root.children.length).toBe(0);
		expect(root.innerHTML).toBe("");
	});

	/**
	 * Test preprocessing for content binding
	 */
	it("contentBinding", async () => {
		const root = await load(
			`
			p=content
			p!=content
            p #{content}
            p !{content}
            - content = "\\"hello"
            p #{\`\${content.toUpperCase()} you!"\`}
            p #{content.prop}
            p #{content.length}
            p #{content[0]}
            p #{(content)[1]}
            p #{content + ' there"'}
            `.replace(/^ {12}|^\t{3}|\s*$/gm, "")
		);

		//Simple Test
		expect(root.children.length).toBe(10);
		for (let i = 0; i < 4; i++) {
			const child = root.children[i];

			expect(child).toBeInstanceOf(HTMLParagraphElement);
			expect(child.children.length).toBe(1);

			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.tagName).toBe(+i % 2 ? "DATA-HTML" : "DATA-TEXT");

			const attrs = dataTag?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe("content");
			expect(attrs?.getNamedItem("bind-content")?.value).toBe("");
		}

		//Templates and functions
		{
			const child = root.children[4];
			expect(child).toBeTruthy();
			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.textContent).toBe('"HELLO you!"');
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			const attrs = dataTag?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				'`${content.toUpperCase()} you!"`'
			);
			expect(attrs?.getNamedItem("bind-content")?.value).toBe('"hello');
		}

		//Object properties
		{
			const child = root.children[5];
			expect(child).toBeTruthy();
			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.textContent).toBe("");
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			const attrs = dataTag?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe("content.prop");
			expect(attrs?.getNamedItem("bind-content.prop")?.value).toBe("");
		}

		//Length property
		{
			const child = root.children[6];
			expect(child).toBeTruthy();
			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.textContent).toBe("6");
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			const attrs = dataTag?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe("content.length");
			expect(attrs?.getNamedItem("bind-content")?.value).toBe('"hello');
		}

		//Array indexes
		{
			const child = root.children[7];
			expect(child).toBeTruthy();
			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.textContent).toBe('"');
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			const attrs = dataTag?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe("content.0");
			expect(attrs?.getNamedItem("bind-content.0")?.value).toBe('"');
		}

		//String indexes
		{
			const child = root.children[8];
			expect(child).toBeTruthy();
			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.textContent).toBe("h");
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			const attrs = dataTag?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe("(content)[1]");
			expect(attrs?.getNamedItem("bind-content")?.value).toBe('"hello');
		}

		//Simple expression
		{
			const child = root.children[9];
			expect(child).toBeTruthy();
			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.textContent).toBe('"hello there"');
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			const attrs = dataTag?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				`content + ' there"'`
			);
			expect(attrs?.getNamedItem("bind-content")?.value).toBe('"hello');
		}
	});

	/**
	 * Test preprocessing for attributes binding
	 */
	it("attributesBinding", async () => {
		const root = await load(
			`
			p(data-test=content)
            - content = "\\"hello"
            p(data-test=\`\${content.toUpperCase()} you!"\`)
            p(data-test=content.prop)
            p(data-test=content.length)
            p(data-test=content[0])
            p(data-test=(content)[1])
            p(data-test=content + ' there"')
			p(style={"content": content + '"'})
			- const hardcoded = "42"
			p(data-test=hardcoded)
            `.replace(/^ {12}|^\t{3}|\s*$/gm, "")
		);

		const wrap = (x: string): string => JSON.stringify({ "data-test": x });

		//Simple Test
		expect(root.children.length).toBe(9);
		{
			const child = root.children[0];

			expect(child).toBeInstanceOf(HTMLParagraphElement);

			const attrs = child?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(wrap("content"));
			expect(attrs?.getNamedItem("bind-content")?.value).toBe("");
			expect(attrs?.getNamedItem("data-test")).toBeNull();
		}

		//Templates and functions
		{
			const child = root.children[1];
			expect(child).toBeTruthy();

			const attrs = child?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				wrap('`${content.toUpperCase()} you!"`')
			);
			expect(attrs?.getNamedItem("bind-content")?.value).toBe('"hello');
			expect(attrs?.getNamedItem("data-test")?.value).toBe(
				'"HELLO you!"'
			);
		}

		//Object properties
		{
			const child = root.children[2];
			expect(child).toBeTruthy();

			const attrs = child?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				wrap("content.prop")
			);
			expect(attrs?.getNamedItem("bind-content.prop")?.value).toBe("");
			expect(attrs?.getNamedItem("data-test")).toBeNull();
		}

		//Length property
		{
			const child = root.children[3];
			expect(child).toBeTruthy();

			const attrs = child?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				wrap("content.length")
			);
			expect(attrs?.getNamedItem("bind-content")?.value).toBe('"hello');
			expect(attrs?.getNamedItem("data-test")?.value).toBe("6");
		}

		//Array indexes
		{
			const child = root.children[4];
			expect(child).toBeTruthy();

			const attrs = child?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(wrap("content.0"));
			expect(attrs?.getNamedItem("bind-content.0")?.value).toBe('"');
			expect(attrs?.getNamedItem("data-test")?.value).toBe('"');
		}

		//String indexes
		{
			const child = root.children[5];
			expect(child).toBeTruthy();

			const attrs = child?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				wrap("(content)[1]")
			);
			expect(attrs?.getNamedItem("bind-content")?.value).toBe('"hello');
			expect(attrs?.getNamedItem("data-test")?.value).toBe("h");
		}

		//Simple expression
		{
			const child = root.children[6];
			expect(child).toBeTruthy();

			const attrs = child?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				wrap(`content + ' there"'`)
			);
			expect(attrs?.getNamedItem("bind-content")?.value).toBe('"hello');
			expect(attrs?.getNamedItem("data-test")?.value).toBe(
				'"hello there"'
			);
		}

		//Style attribute
		{
			const child = root.children[7];
			expect(child).toBeTruthy();
			expect((child as HTMLElement).style.content).toBe('"hello"');

			const attrs = child?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				'{"style":"pug.style({\\"content\\": content + \'\\"\'})"}'
			);
			expect(attrs?.getNamedItem("bind-content")?.value).toBe('"hello');
		}

		//Constant attribute
		{
			const child = root.children[8];

			expect(child).toBeInstanceOf(HTMLParagraphElement);
			expect(child.attributes.length).toBe(1);
			expect(child.getAttribute("data-test")).toBe("42");
		}
	});

	/**
	 * Test preprocessing for mixed attribute and content bindings
	 */
	it("mixedBinding", async () => {
		const root = await load(
			`
            - content = \`"hello'\`
			div(data-test=content data-test2=content + 2)=content.replace(/o/g, "")
            `.replace(/^ {12}|^\t{3}|\s*$/gm, "")
		);

		const wrap = (x: string, y: string): string =>
			JSON.stringify({ "data-test": x, "data-test2": y });

		expect(root.children.length).toBe(1);
		{
			const child = root.children[0];

			expect(child).toBeInstanceOf(HTMLDivElement);

			let attrs: NamedNodeMap | undefined = child?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				wrap("content", "content + 2")
			);
			expect(attrs?.getNamedItem("bind-content")?.value).toBe(`"hello'`);
			expect(attrs?.getNamedItem("data-test")?.value).toBe(`"hello'`);
			expect(attrs?.getNamedItem("data-test2")?.value).toBe(`"hello'2`);

			expect(child.children.length).toBe(1);
			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.textContent).toBe(`"hell'`);
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			attrs = dataTag?.attributes;
			expect(attrs).toBeTruthy();
			expect(attrs?.getNamedItem("bind")?.value).toBe(
				'content.replace(/o/g, "")'
			);
			expect(attrs?.getNamedItem("bind-content")?.value).toBe(`"hello'`);
		}
	});

	/**
	 * Test preprocessing for loop binding
	 */
	it("loopBinding", async () => {
		const root = await load(
			`
            - arr = [1, 2, 3, 4]
            for val, key in arr
                div(id="d" + key + val)
                    | #{val}
                    | #{key}

            - arr = [[1, 2], [3, 4]]
            for val, key in arr
                for val2, key2 in val
                    div(id="d" + key + key2)
                        | #{val}
                        | #{val2}
                        | #{key}
                        | #{key2}
                span text

            - obj = {"a": 42}
            for val, key in obj
                div(id="d" + key + val)
                    | #{val}
                    | #{key}
            `.replace(/^ {12}|^\t{3}|\s*$/gm, "")
		);

		const wrap = (x: string): string => JSON.stringify({ id: x });

		expect(root.children.length).toBe(3);
		//Simple loop
		{
			const child = root.children[0] as HTMLTemplateElement;
			expect(child).toBeInstanceOf(HTMLTemplateElement);
			expect(child.getAttribute("bind")).toBe("arr");
			expect(child.getAttribute("bind-arr")).toBe(
				JSON.stringify([1, 2, 3, 4])
			);
			expect(child.getAttribute("key")).toBe("key");
			expect(child.getAttribute("value")).toBe("val");
			expect(child.hasAttribute("each"));

			const content = child.content;
			expect(content.children.length).toBe(1);

			const div = content.firstElementChild;
			expect(div?.getAttribute("bind")).toBe(wrap('"d" + key + val'));
			expect(div?.getAttribute("bind-key")).toBe("");
			expect(div?.getAttribute("bind-val")).toBe("");
			expect(div?.id).toBe("d");
			expect(div?.children.length).toBe(2);

			const val = div?.firstElementChild;
			const key = div?.lastElementChild;
			expect(val?.tagName).toBe("DATA-TEXT");
			expect(key?.tagName).toBe("DATA-TEXT");
			expect(val?.textContent).toBe("");
			expect(key?.textContent).toBe("");
			expect(val?.getAttribute("bind-val")).toBe("");
			expect(key?.getAttribute("bind-key")).toBe("");
		}

		//Nested loop
		{
			const data = [
				[1, 2],
				[3, 4]
			];

			const child = root.children[1] as HTMLTemplateElement;
			expect(child).toBeInstanceOf(HTMLTemplateElement);
			expect(child.getAttribute("bind")).toBe("arr");
			expect(child.getAttribute("bind-arr")).toBe(JSON.stringify(data));
			expect(child.getAttribute("key")).toBe("key");
			expect(child.getAttribute("value")).toBe("val");
			expect(child.hasAttribute("each"));

			let content = child.content;
			expect(content.children.length).toBe(2);

			const innerLopp = content.firstElementChild as HTMLTemplateElement;
			expect(innerLopp).toBeInstanceOf(HTMLTemplateElement);
			expect(innerLopp.getAttribute("bind")).toBe("val");
			expect(innerLopp.getAttribute("key")).toBe("key2");
			expect(innerLopp.getAttribute("value")).toBe("val2");
			expect(innerLopp.hasAttribute("each"));
			const span = content.lastElementChild;
			expect(span).toBeTruthy();
			expect(span?.textContent).toBe("text");

			content = innerLopp.content;
			expect(content.children.length).toBe(1);

			const div = content.firstElementChild;
			expect(div?.getAttribute("bind")).toBe(wrap('"d" + key + key2'));
			expect(div?.getAttribute("bind-key")).toBe("");
			expect(div?.getAttribute("bind-key2")).toBe("");
			expect(div?.id).toBe("d");
			expect(div?.children.length).toBe(4);

			const val = div?.children[0];
			const val2 = div?.children[1];
			const key = div?.children[2];
			const key2 = div?.children[3];
			expect(val?.tagName).toBe("DATA-TEXT");
			expect(val2?.tagName).toBe("DATA-TEXT");
			expect(key?.tagName).toBe("DATA-TEXT");
			expect(key2?.tagName).toBe("DATA-TEXT");

			expect(val?.textContent).toBe("");
			expect(val2?.textContent).toBe("");
			expect(key?.textContent).toBe("");
			expect(key2?.textContent).toBe("");

			expect(val?.getAttribute("bind-val")).toBe("");
			expect(val2?.getAttribute("bind-val2")).toBe("");
			expect(key?.getAttribute("bind-key")).toBe("");
			expect(key2?.getAttribute("bind-key2")).toBe("");
		}

		//Object loop
		{
			const child = root.children[2] as HTMLTemplateElement;
			expect(child).toBeInstanceOf(HTMLTemplateElement);
			expect(child.getAttribute("bind")).toBe("obj");
			expect(child.getAttribute("bind-obj")).toBe(
				JSON.stringify({ a: 42 })
			);
			expect(child.getAttribute("key")).toBe("key");
			expect(child.getAttribute("value")).toBe("val");
			expect(child.hasAttribute("each"));

			const content = child.content;
			expect(content.children.length).toBe(1);

			const div = content.firstElementChild;
			expect(div?.getAttribute("bind")).toBe(wrap('"d" + key + val'));
			expect(div?.getAttribute("bind-key")).toBe("");
			expect(div?.getAttribute("bind-val")).toBe("");
			expect(div?.id).toBe("d");
			expect(div?.children.length).toBe(2);

			const val = div?.firstElementChild;
			const key = div?.lastElementChild;
			expect(val?.tagName).toBe("DATA-TEXT");
			expect(key?.tagName).toBe("DATA-TEXT");
			expect(val?.textContent).toBe("");
			expect(key?.textContent).toBe("");
			expect(val?.getAttribute("bind-val")).toBe("");
			expect(key?.getAttribute("bind-key")).toBe("");
		}
	});

	/**
	 * Test preprocessing for mixed constants and variables
	 */
	it("constantBinding", async () => {
		const root = await load(
			`
            - const greeting = "hello"
            - user = "default"
            p=\`\${greeting}, \${user}!\`

            each text in ["lol", "kek"]
                p=text

            - prefix = "_"
            each text in ["lol", "kek"]
                p(data-test=text+prefix)=prefix + text

            - arr = [[1, "a"], [2, "b"], [3, "c"]]
            each item in arr
                p start
                each val, i in ["first", "second"]
                    | !{\`\${val} (\${i + 1}): \${item[i]};<br>\`}
                    | !{\`\${val} (\${i + 1}): \${arr[0][i]};<br>\`}
                    | !{\`\${val} (\${i + 1}): \${arr[i][i]};<br>\`}
                    div(data-test=item[i] + "\\"")
                p end

            each _ in [1,2]
                each item in arr
                    p=item
            `.replace(/^ {12}|^\t{3}|\s*$/gm, "")
		);

		const wrap = (x: string): string => JSON.stringify({ "data-test": x });

		const data = [
			[1, "a"],
			[2, "b"],
			[3, "c"]
		];

		expect(root.children.length).toBe(8);
		//Mixed expression
		{
			const child = root.children[0];
			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			expect(dataTag?.getAttribute("bind")).toBe(
				'`${"hello"}, ${user}!`'
			);
			expect(dataTag?.getAttribute("bind-user")).toBe("default");
		}
		//Constant loop
		{
			const p1 = root.children[1];
			const p2 = root.children[2];
			expect(p1).toBeTruthy();
			expect(p2).toBeTruthy();
			expect(p1?.tagName).toBe("P");
			expect(p2?.tagName).toBe("P");

			expect(p1.attributes.length).toBe(0);
			expect(p2.attributes.length).toBe(0);

			expect(p1.textContent).toBe("lol");
			expect(p2.textContent).toBe("kek");
		}
		//Constant loop with variable
		{
			const p1 = root.children[3];
			const p2 = root.children[4];
			expect(p1).toBeTruthy();
			expect(p2).toBeTruthy();
			expect(p1?.tagName).toBe("P");
			expect(p2?.tagName).toBe("P");

			expect(p1.attributes.length).toBe(3);
			expect(p2.attributes.length).toBe(3);
			expect(p1.getAttribute("bind-prefix")).toBe("_");
			expect(p2.getAttribute("bind-prefix")).toBe("_");
			expect(p1.getAttribute("data-test")).toBe("lol_");
			expect(p2.getAttribute("data-test")).toBe("kek_");
			expect(p1.getAttribute("bind")).toBe(wrap('"lol"+prefix'));
			expect(p2.getAttribute("bind")).toBe(wrap('"kek"+prefix'));

			expect(p1.textContent).toBe("_lol");
			expect(p2.textContent).toBe("_kek");

			let dataTag = p1.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.tagName).toBe("DATA-TEXT");
			expect(dataTag?.getAttribute("bind")).toBe('prefix + "lol"');
			expect(dataTag?.getAttribute("bind-prefix")).toBe("_");

			dataTag = p2.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			expect(dataTag?.getAttribute("bind")).toBe('prefix + "kek"');
			expect(dataTag?.getAttribute("bind-prefix")).toBe("_");
		}
		//Mixed loop
		{
			const child = root.children[5] as HTMLTemplateElement;
			expect(child).toBeInstanceOf(HTMLTemplateElement);
			expect(child.getAttribute("bind")).toBe("arr");
			expect(child.getAttribute("bind-arr")).toBe(JSON.stringify(data));
			expect(child.getAttribute("value")).toBe("item");
			expect(child.hasAttribute("each"));

			const content = child.content;
			expect(content.children.length).toBe(10);
			expect(content.firstElementChild?.textContent).toBe("start");
			expect(content.lastElementChild?.textContent).toBe("end");
			const text = ["first", "second"];

			for (let i = 0; i < content.children.length - 2; i++) {
				const element = content.children[i + 1];
				let a = 0;
				let b = 0;
				if (i % 4 == 0) {
					a = i / 4;
					expect(element?.getAttribute("bind-item." + a)).toBe("");
					expect(element?.getAttribute("bind")).toBe(
						`\`\${"${text[a]}"} (\${${a} + 1}): \${item.${a}};<br>\``
					);
				} else if (i % 4 == 3) {
					a = (i - 3) / 4;
					expect(element?.getAttribute("bind")).toBe(
						wrap(`item.${a} + "\\""`)
					);
					expect(element?.getAttribute(`bind-item.${a}`)).toBe("");
				} else {
					if (i % 4 == 1) {
						a = 0;
						b = (i - 1) / 4;
					} else if (i % 4 == 2) {
						a = (i - 2) / 4;
						b = a;
					}

					expect(element?.getAttribute(`bind-arr.${a}.${b}`)).toBe(
						data[a][b].toString()
					);
					expect(element?.getAttribute("bind")).toBe(
						`\`\${"${text[b]}"} (\${${b} + 1}): \${arr.${a}.${b}};<br>\``
					);
				}
			}
		}
		//Dublicated loop
		{
			const child = root.children[6] as HTMLTemplateElement;
			expect(child).toBeInstanceOf(HTMLTemplateElement);
			expect(child.getAttribute("bind")).toBe("arr");
			expect(child.getAttribute("bind-arr")).toBe(JSON.stringify(data));
			expect(child.getAttribute("value")).toBe("item");
			expect(child.hasAttribute("each"));

			expect(root.children[7].innerHTML).toBe(child.innerHTML);
		}
	});

	/**
	 * Test preprocessing with binded functions
	 */
	it("functionBinding", async () => {
		const root = await load(
			`
            - let func = () => "hello";
            p=Function(\`return (\${func})()\`)()

            - func = () => 2 * 42;
            - num = "10"
            p='"Data: ' + Function(\`return (\${func}-\${num})()\`)() + '"'
            `.replace(/^ {12}|^\t{3}|\s*$/gm, "")
		);

		expect(root.children.length).toBe(2);
		//Simple function eval
		{
			const child = root.children[0];
			expect(child.children.length).toBe(0);
			expect(child.attributes.length).toBe(0);
			expect(child.textContent).toBe("hello");
		}
		//Eval with variable
		{
			const child = root.children[1];
			expect(child.attributes.length).toBe(0);
			expect(child.textContent).toBe('"Data: 74"');
			expect(child.children.length).toBe(1);

			const dataTag = child.firstElementChild;
			expect(dataTag).toBeTruthy();
			expect(dataTag?.tagName).toBe("DATA-TEXT");

			expect(dataTag?.getAttribute("bind")).toBe(
				`'"Data: ' + Function(\`return (\${"() => 2 * 42"}-\${num})()\`)() + '"'`
			);
			expect(dataTag?.getAttribute("bind-num")).toBe("10");
		}
	});
});

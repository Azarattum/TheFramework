import Hasher from "../../../app/controllers/hasher.controller";
import { sleep } from "../../../common/utils.class";

history.replaceState(null, "", "#init:value,important:!,");

describe("Hasher", () => {
	/**
	 * Test get and set of hash values
	 */
	it("getAndSet", async () => {
		expect(Hasher.relations).toBeNull();
		const hasher = new Hasher({ exposer: { close: jest.fn() } } as any);
		const loaded = jest.fn();
		hasher.on("loaded", (props: Record<string, string>) => {
			expect(props["init"]).toBe("value");
			expect(props["default"]).toBe("42");
			expect(props["important"]).toBe("!");
			loaded();
		});
		hasher.initialize({ default: "42", important: "not" });
		expect(loaded).toBeCalled();
		expect(hasher.get("init")).toBe("value");
		expect(hasher.get("default")).toBe("42");
		expect(hasher.get("setted")).toBeNull();
		hasher.set("setted", "test");
		expect(hasher.get("setted")).toBe("test");
		expect(hasher.get("nothing")).toBeNull();
		expect(hasher.exists("init"));
		expect(hasher.exists("default"));
		expect(hasher.exists("setted"));

		const illegal = jest.fn(() => {
			hasher.set(":", ",/");
		});
		expect(illegal).toThrowError();

		hasher.close();
		expect(location.hash).toBe("");
	});

	/**
	 * Test freezing changes to hash
	 */
	it("freeze", () => {
		const hasher = new Hasher({ exposer: { close: jest.fn() } } as any);
		hasher.initialize();

		hasher.set("value", "1");
		hasher.freeze();
		expect(hasher.get("value")).toBe("1");
		hasher.set("value", "2");
		expect(hasher.get("value")).toBe("1");
		hasher.freeze(false);
		expect(hasher.get("value")).toBe("1");
		hasher.set("value", "2");
		expect(hasher.get("value")).toBe("2");

		hasher.close();
	});

	/**
	 * Test hash change event
	 */
	it("hashChange", async () => {
		const changed = jest.fn();

		const hasher = new Hasher({ exposer: { close: jest.fn() } } as any);
		hasher.initialize();
		expect(Object.keys(hasher.properties)).toHaveLength(0);

		hasher.on("changed", (props: Record<string, string>) => {
			expect(Object.keys(props).length).toBe(2);
			expect(props["test"]).toBe("another");
			expect(props["something"]).toBe("else");
			changed();
		});

		hasher.set("test", "change", true);
		hasher.set("something", "value");
		await sleep(100);
		expect(changed).not.toHaveBeenCalled();
		expect(hasher.get("test")).toBe("change");
		expect(hasher.get("something")).toBe("value");

		location.hash = "test:another,something:else";
		await sleep(100);
		expect(changed).toHaveBeenCalled();

		location.hash = "/path/test:another,something:else";
		await sleep(100);
		expect(changed).toBeCalledTimes(1);

		location.hash = "/path/test:";
		await sleep(100);
		expect(changed).toBeCalledTimes(1);

		location.href = location.href.slice(0, location.href.indexOf("#"));
		await sleep(100);
		expect(changed).toBeCalledTimes(1);

		hasher.close();
	});
});

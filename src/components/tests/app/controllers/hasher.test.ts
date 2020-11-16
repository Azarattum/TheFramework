import Hasher from "../../../app/controllers/hasher.controller";

describe("Hasher", () => {
	/**
	 * Test get and set of hash values
	 */
	it("getAndSet", () => {
		expect(Hasher.relations).toBeNull();

		location.hash = "init:value,important:!,";
		const hasher = new Hasher({} as any);
		const loaded = jest.fn();
		hasher.on("loaded", (props: Record<string, string>) => {
			expect(props["init"]).toBe("value");
			expect(props["default"]).toBe("42");
			expect(props["important"]).toBe("!");
			loaded();
		});
		hasher.initialize({ default: 42, important: "not" });
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
			hasher.set(":", ",");
		});
		expect(illegal).toThrowError();
	});

	/**
	 * Test freezing changes to hash
	 */
	it("freeze", () => {
		const hasher = new Hasher({} as any);
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
	});
});

import Tabber from "../../../app/controllers/tabber.controller";
import { IComponentOptions } from "../../../common/component.interface";
import Exposer from "../../../common/exposer.class";

describe("Tabber", () => {
	/**
	 * Test tab changing of tabber controller
	 */
	it("tabChanging", () => {
		document.body.innerHTML = `
            <div controller="tabber">
                <div tab="1"></div>
                <div tab="2" style="display:fixed;"></div>
                <div tab="3" id="last"></div>
            </div>
        `;
		const scope: any = {};
		const exposer = new Exposer(scope);
		const tabber = new Tabber({
			exposer,
			relation: Tabber.relations?.[0]
		} as IComponentOptions);

		document.querySelectorAll("[tab]").forEach(x => {
			expect(getComputedStyle(x).display).not.toBe("none");
		});

		tabber.initialize();

		document.querySelectorAll("[tab]").forEach(x => {
			expect(getComputedStyle(x).display).toBe("none");
		});
		expect("tabber" in scope);
		expect("change" in scope["tabber"]);

		const changed = jest.fn();
		tabber.on("changed", changed);

		tabber.change("1");
		expect(changed).toHaveBeenCalledWith("1");
		document.querySelectorAll("[tab]").forEach(x => {
			const tab = x.getAttribute("tab");
			expect(getComputedStyle(x).display).toBe(
				tab === "1" ? "block" : "none"
			);
		});

		tabber.change("2");
		expect(changed).toHaveBeenCalledWith("2");
		document.querySelectorAll("[tab]").forEach(x => {
			const tab = x.getAttribute("tab");
			expect(getComputedStyle(x).display).toBe(
				tab === "2" ? "fixed" : "none"
			);
		});

		const notFound = jest.fn(() => {
			tabber.change("4");
		});
		expect(notFound).toThrowError();

		const last = document.getElementById("last");
		const div = document.createElement("div");
		div.setAttribute("tab", "4");
		div.style.display = "sticky";
		last?.parentElement?.appendChild(div);

		tabber.change("3");
		expect(changed).toHaveBeenCalledWith("3");
		document.querySelectorAll("[tab]").forEach(x => {
			const tab = x.getAttribute("tab");
			expect(getComputedStyle(x).display).toBe(
				tab === "3" ? "block" : "none"
			);
		});

		tabber.change("4");
		expect(changed).toHaveBeenCalledWith("4");
		document.querySelectorAll("[tab]").forEach(x => {
			const tab = x.getAttribute("tab");
			expect(getComputedStyle(x).display).toBe(
				tab === "4" ? "sticky" : "none"
			);
		});
	});

	/**
	 * Test with no auto hide of tabs on init
	 */
	it("noAutoHide", () => {
		document.body.innerHTML = `
        <div controller="tabber">
            <div tab="1"></div>
            <div tab="2"></div>
        </div>
    `;
		const scope: any = {};
		const exposer = new Exposer(scope);
		const tabber = new Tabber({
			exposer,
			relation: Tabber.relations?.[0]
		} as IComponentOptions);

		document.querySelectorAll("[tab]").forEach(x => {
			expect(getComputedStyle(x).display).not.toBe("none");
		});

		tabber.initialize(false);

		document.querySelectorAll("[tab]").forEach(x => {
			expect(getComputedStyle(x).display).not.toBe("none");
		});
	});
});

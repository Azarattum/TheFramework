import Router from "../../../app/controllers/router.controller";
import { IComponentOptions } from "../../../common/component.interface";
import Exposer from "../../../common/exposer.class";
import { sleep } from "../../../common/utils.class";

describe("Router", () => {
	/**
	 * Test route rendering
	 */
	it("simpleNavigate", async () => {
		document.body.innerHTML = `
			<div route="1">1</div>
			<p id="notRoute">something</p>
			<div route="2" subtitle="2">2</div>
			<div route="3" style="display: fixed">3</div>
		`;

		const scope: any = {};
		const exposer = new Exposer(scope);
		const router = new Router({
			exposer,
			relation: Router.relations[0]
		} as IComponentOptions);

		router.initialize("", "{0}:{1}");
		const span = document.getElementById("notRoute") as HTMLElement;
		expect(getComputedStyle(span).display).toBe("block");

		const divs = document.getElementsByTagName("div");
		for (const div of divs) {
			expect(getComputedStyle(div).display).toBe("none");
		}
		scope.router.navigate("1");
		expect(getComputedStyle(span).display).toBe("block");
		expect(getComputedStyle(divs.item(0) as any).display).toBe("block");
		expect(document.title).toBe("");

		scope.router.navigate("2");
		expect(getComputedStyle(span).display).toBe("block");
		expect(document.title).toBe(":2");
		expect(getComputedStyle(divs.item(0) as any).display).toBe("none");
		expect(getComputedStyle(divs.item(1) as any).display).toBe("block");

		scope.router.navigate("3");
		expect(getComputedStyle(span).display).toBe("block");
		expect(document.title).toBe("");
		expect(getComputedStyle(divs.item(1) as any).display).toBe("none");
		expect(getComputedStyle(divs.item(2) as any).display).toBe("fixed");

		history.go(-2);
		await sleep(100);

		expect(getComputedStyle(span).display).toBe("block");
		expect(getComputedStyle(divs.item(0) as any).display).toBe("block");
		expect(getComputedStyle(divs.item(1) as any).display).toBe("none");
		expect(getComputedStyle(divs.item(2) as any).display).toBe("none");
		expect(document.title).toBe("");

		router.close();
		expect(getComputedStyle(span).display).toBe("block");
	});

	/**
	 * Test nested routes
	 */
	it("nestedNavigate", () => {
		document.body.innerHTML = `
			<div route="1">
				<div route="1"></div>
			</div>

			<div route="2"></div>

			<div route="1/*">
				<span>
					<span route="2"></span>
				</span>
			</div>
		`;

		const scope: any = {};
		const exposer = new Exposer(scope);
		const router = new Router({
			exposer,
			relation: Router.relations[0]
		} as IComponentOptions);

		router.initialize();
		const span = document.getElementsByTagName("span")[1];
		const divs = document.getElementsByTagName("div");
		for (const div of divs) {
			expect(getComputedStyle(div).display).toBe("none");
		}
		scope.router.navigate("1");
		expect(getComputedStyle(divs.item(0) as any).display).toBe("block");
		expect(getComputedStyle(divs.item(3) as any).display).toBe("block");
		expect(getComputedStyle(span).display).toBe("none");

		scope.router.navigate("1/1");
		expect(getComputedStyle(divs.item(0) as any).display).toBe("block");
		expect(getComputedStyle(divs.item(1) as any).display).toBe("block");
		expect(getComputedStyle(divs.item(3) as any).display).toBe("block");
		expect(getComputedStyle(span).display).toBe("none");

		scope.router.navigate("2");
		expect(getComputedStyle(divs.item(0) as any).display).toBe("none");
		expect(getComputedStyle(divs.item(1) as any).display).toBe("none");
		expect(getComputedStyle(divs.item(2) as any).display).toBe("block");
		expect(getComputedStyle(divs.item(3) as any).display).toBe("none");
		expect(getComputedStyle(span).display).toBe("none");

		router.close();
	});

	/**
	 * Test route patterns
	 */
	it("routePatterns", () => {
		document.body.innerHTML = `
			<div route="1/1">
				<div route="2"></div>
			</div>
			<div route="1/.">
				<div route="2"></div>
			</div>
			<div route="1/?">
				<div route="2"></div>
			</div>
			<div route="1/*">
				<div route="2"></div>
			</div>
			<div route="1/+">
				<div route="2"></div>
			</div>
			<div route="."></div>
			<div route="?"></div>
			<div route="*/thisIsIgnored"></div>
			<div route="+/thisIsIgnored"></div>
			<div route="1/?/2"></div>
		`;

		const scope: any = {};
		const exposer = new Exposer(scope);
		const router = new Router({
			exposer,
			relation: Router.relations[0]
		} as IComponentOptions);

		router.initialize();
		const divs = document.getElementsByTagName("div");
		const elems = [...divs];
		{
			const displays = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			scope.router.navigate("1");
			const displays = [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			scope.router.navigate("1/1");
			const displays = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			scope.router.navigate("1/2");
			const displays = [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			scope.router.navigate("1/1/2");
			const displays = [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			scope.router.navigate("1/2/2");
			const displays = [0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			scope.router.navigate("1/2/1");
			const displays = [0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}

		router.close();
	});

	/**
	 * Test default routes
	 */
	it("defaultRoutes", () => {
		document.body.innerHTML = `
			<div route="home" default>Home</div>
			<div route="settings">
				<div route="profile" default>Profile</div>
				<div route="contacts">Contacts</div>
			</div>
			<div route="feed">
				<div route="main" default>
					<div route="posts" default>
					</div>
				</div>
			</div>
			<div route="home" default>Second Home</div>
			<div route="home">Lone Home</div>
		`;

		const scope: any = {};
		const exposer = new Exposer(scope);
		const router = new Router({
			exposer,
			relation: Router.relations[0]
		} as IComponentOptions);

		router.initialize();

		const divs = document.getElementsByTagName("div");
		const elems = [...divs];
		{
			const displays = [1, 0, 0, 0, 0, 0, 0, 1, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("home");
			const displays = [1, 0, 0, 0, 0, 0, 0, 1, 1];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("settings");
			const displays = [0, 1, 1, 0, 0, 0, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("settings/profile");
			const displays = [0, 1, 1, 0, 0, 0, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("settings/contacts");
			const displays = [0, 1, 0, 1, 0, 0, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("feed");
			const displays = [0, 0, 0, 0, 1, 1, 1, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("feed/main");
			const displays = [0, 0, 0, 0, 1, 1, 1, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("feed/main/posts");
			const displays = [0, 0, 0, 0, 1, 1, 1, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}

		router.close();
	});

	/**
	 * Test not found routes
	 */
	it("notFoundRoutes", () => {
		document.body.innerHTML = `
			<div route="home"></div>
			<div route="posts">
				<div route="best">
					<div route="comments"></div>
					<div route="404"></div>
				</div>
				<div route="404"></div>
			</div>
			<div route="404"></div>
		`;

		const scope: any = {};
		const exposer = new Exposer(scope);
		const router = new Router({
			exposer,
			relation: Router.relations[0]
		} as IComponentOptions);

		router.initialize();

		const divs = document.getElementsByTagName("div");
		const elems = [...divs];
		{
			const displays = [0, 0, 0, 0, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("hom");
			const displays = [0, 0, 0, 0, 0, 0, 1];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("posts");
			const displays = [0, 1, 0, 0, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("posts/best");
			const displays = [0, 1, 1, 0, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("posts/best/top");
			const displays = [0, 1, 1, 0, 1, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("posts/bestt");
			const displays = [0, 1, 0, 0, 0, 1, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("posts/best/comments");
			const displays = [0, 1, 1, 1, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("posts/best/comment/lol");
			const displays = [0, 1, 1, 0, 1, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("posts/best/comments/lol");
			const displays = [0, 1, 1, 0, 1, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}

		router.close();
	});

	/**
	 * Test when element has more than one route
	 */
	it("multipleRoutes", () => {
		document.body.innerHTML = `
			<div route="home stonks"></div>
			<div route="shop/item shop">
				<div route="cost"></div>
				<div route="item">
					<div route="cost"></div>
				</div>
			</div>
			<div route="shop shop/item">
				<div route="cost"></div>
				<div route="item">
					<div route="cost"></div>
				</div>
			</div>
		`;

		const scope: any = {};
		const exposer = new Exposer(scope);
		const router = new Router({
			exposer,
			relation: Router.relations[0]
		} as IComponentOptions);

		router.initialize();

		const divs = document.getElementsByTagName("div");
		const elems = [...divs];
		{
			const displays = [0, 0, 0, 0, 0, 0, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("home");
			const displays = [1, 0, 0, 0, 0, 0, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("stonks");
			const displays = [1, 0, 0, 0, 0, 0, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("shop");
			const displays = [0, 1, 0, 0, 0, 1, 0, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("shop/item");
			const displays = [0, 1, 0, 0, 0, 1, 0, 1, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("shop/cost");
			const displays = [0, 1, 1, 0, 0, 1, 1, 0, 0];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
		{
			router.navigate("shop/item/cost");
			const displays = [0, 1, 1, 0, 0, 1, 0, 1, 1];
			for (const i in elems) {
				expect(getComputedStyle(elems[i]).display).toBe(
					displays[i] ? "block" : "none"
				);
			}
		}
	});
});

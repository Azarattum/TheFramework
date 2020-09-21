/**Main Script */
import App from "./components/app/app";

//Application init
const app = new App();
window.addEventListener("load", async () => {
	await app.initialize();
});

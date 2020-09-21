/**
 * Comlink's adapter fix for NodeJS
 * @param {string} source Service source code
 */
module.exports = function(source) {
	return `import nodeEndpoint from "comlink/dist/esm/node-adapter.mjs";
        import { MessageChannel, parentPort } from "worker_threads";
        ${source}
        globalThis.self = nodeEndpoint(parentPort);
        globalThis.self.ports = [parentPort];
		comlink__WEBPACK_IMPORTED_MODULE_0__.transferHandlers.set("proxy", {
            canHandle: obj => {
                return obj && obj[comlink__WEBPACK_IMPORTED_MODULE_0__.proxyMarker];
            },
            serialize: obj => {
                const { port1, port2 } = new MessageChannel();
                globalThis.self.ports.push(port1);
                comlink__WEBPACK_IMPORTED_MODULE_0__.expose(obj, nodeEndpoint(port1));
                return [port2, [port2]];
            },
            deserialize: port => {
                port = nodeEndpoint(port);
                port.start();
                return comlink__WEBPACK_IMPORTED_MODULE_0__.wrap(port);
            }
        });`;
};

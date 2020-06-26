/**
 * Loader for wrapping services
 * @param {string} source Service source code
 */
module.exports = source => {
	return (
		source +
		ServiceWrapper.toString() +
		wrap.toString() +
		"module.exports = wrap(module.exports);"
	);
};

/**
 * Wraps given object into proxy
 * @param {Object} object Target object
 */
function wrap(object) {
	const wrapping = new Proxy(object, {
		//Trap default export
		get: (target, prop) => {
			if (prop == "default" || prop == "__esModule") {
				return wrap(target[prop]);
			}
			if (prop == "type") {
				return "Services";
			}
			if (prop == "relations") {
				return null;
			}

			return target[prop];
		},
		//Overwrite service constructor
		construct: async (target, args) => {
			const original = await new target();
			const name = await original.constructor.name;
			const wrapper = new ServiceWrapper(name, original, ...args);

			//Map defined calls to wrapper, everything else pass as is
			const proxy = new Proxy(wrapper, {
				get: (target, prop) => {
					if (target[prop]) {
						return target[prop];
					}

					return original[prop];
				}
			});

			return proxy;
		}
	});

	return wrapping;
}

/**
 * Wrapper aroung service in a worker
 */
class ServiceWrapper {
	static get type() {
		return "Services";
	}

	constructor(name, original, exposer) {
		this.name = name;
		this.original = original;
		this.exposer = exposer;
		this.relations = null;
		this.callbacks = {};

		//Handle event emits and function exposions
		const handler = async event => {
			const { type, args } = event;

			//Internal exposed event, happens when `this.expose` is
			// called in the service
			if (type === "__exposed") {
				const [name, id] = args;
				this.exposer.expose(this.name, name, (...arg) => {
					return this.original.call(id, ...arg);
				});
			}

			//Typical named callbacks
			if (this.callbacks[type]) {
				this.callbacks[type].forEach(x => x.call(x, ...args));
			}

			//Keep listening for incoming events
			original.listen().then(handler);
		};
		original.listen().then(handler);
	}

	on(type, callback) {
		if (!(type in this.callbacks)) this.callbacks[type] = [];
		this.callbacks[type].push(callback);
	}

	close() {
		this.callbacks = {};
		return this.original.close();
	}
}

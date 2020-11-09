module.exports = {
	rootDir: "..",
	transform: {
		"^.+\\.ts?$": "ts-jest",
		"\\.(pug)$": "jest-transform-pug",
		"\\.(css|scss)$": "<rootDir>/env/empty.transform.js"
	},
	testEnvironment: "jsdom"
};

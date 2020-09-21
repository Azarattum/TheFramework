module.exports = {
	rootDir: "..",
	transform: {
		"^.+\\.ts?$": "ts-jest",
		"\\.(pug)$": "jest-transform-pug"
	},
	testEnvironment: "jsdom"
};

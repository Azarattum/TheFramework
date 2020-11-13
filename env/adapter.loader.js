/**
 * Comlink's adapter fix for expose conflict
 * @param {string} source Service source code
 */
module.exports = function(source) {
	return source
		.replace(
			"import { expose } from 'comlink';",
			"import { expose as $$$$expose } from 'comlink';"
		)
		.replace(
			/(?<!@|\.)expose(?=\(\s*Object\.)(?!.*(?<!@|\.)expose)/s,
			"$$$$expose"
		);
};

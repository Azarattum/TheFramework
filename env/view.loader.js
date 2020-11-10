/**
 * Returns a regex to find a variable in a string expression
 * @param {string} variable Variable's name
 */
function varRegex(variable) {
	return new RegExp(
		`(^|[^A-Za-z0-9_$.])${variable}($|[^A-Za-z0-9_$.[]|((?=(\\.[A-Za-z0-9_$]*\\s*\\()|\\.length([^A-Za-z0-9_$]|$))))`
	);
}

/**
 * Returns a regex to find an object reference in a string expression
 * @param {string} variable Variable's name
 */
function objRegex(variable) {
	return new RegExp(
		`(?<=^|[^A-Za-z0-9_$])${variable}(((\\.(?!length([^A-Za-z0-9_$]|$))[A-Za-z0-9_$]+)|(\\[([^\\[]*\\[[^\\]]*\\])*[^\\[]*\\]))(?![A-Za-z0-9_$]*\\s*\\())+`,
		"g"
	);
}

//Define all regular expressions for searches
const dataExp = /\(function\s*?\((([a-zA-Z0-9_$]+,?\s*?)+)\)\s*?\{/;
const valueExp = /((\(pug\.escape)?\(null == \(pug_interp = (.+?)\) \? "" : pug_interp\)\)?)/g;
const attribExp = /pug\.attr\("([^\"]+)", ((.|\s)*?), (true|false), (true|false)\)/g;
const arrayExp = /(?<=[A-Za-z0-9_$\]]+)\[(\\\")?(([^\[]*\[[^\]]*\])*[^\[]*?)(\\\")?\]/g;
const loopStartExp = /;\((function\s*\(\)\s*{)\s*var\s+\$\$obj\s*=\s*([^;]+);\s*(if[^{]+{\s*for\s*\(var\s*(\S+)[^\n]+\s*var\s+(\S+)\s*=)/g;
const loopEndExp = /(  }\n)(}\))\.call\(this\);/g;
const variablesExp = /(?<=^(([^`]|(\\`))*(?<!\\)`([^`]|(\\`))*(?<!\\)`)*([^`]|(\\`))*((?<!\\)`([^`]|(\\`))*(?<!\\)\${[^}]*?)?)(?<=^|[^A-Za-z0-9_$.])[A-Za-z_$][A-Za-z0-9_$.]*(?=$|[^A-Za-z0-9_$])(?=(([^"]|(\\"))*(?<!\\)"([^"]|(\\"))*(?<!\\)")*([^"]|(\\"))*$)(?=(([^']|(\\'))*(?<!\\)'([^']|(\\'))*(?<!\\)')*([^']|(\\'))*$)(?=(([^/]|(\\\/))*(?<!\\)\/([^/]|(\\\/))+(?<!\\)\/)*([^/]|(\\\/))*($|\n))(?![A-Za-z0-9_$]*\s*\()/g;
const unescapeExp = /(?<=([a-zA-Z_$0-9]+|\])\[)"\+|\+\"(?=\]($|\[))/g;
const unescapeJSONExp = /\\\\\\"(\+\(\(typeof[^\\]*)\\\\\\"(undefined)\\\\\\"(\s*\|\|\s*)\\\\\\"([^\\]+)\\\\\\"([^\\]*)\\\\\\"([^\\]+)\\\\\\"([^\\]+)\\\\\\"/g;

/**
 * JavaScript's reserved keywords' names array + `pug` module keyword
 */
const reservedKeywords = [
	"abstract",
	"await",
	"boolean",
	"break",
	"byte",
	"case",
	"catch",
	"char",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"double",
	"else",
	"enum",
	"export",
	"extends",
	"false",
	"final",
	"finally",
	"float",
	"for",
	"function",
	"goto",
	"if",
	"implements",
	"import",
	"in",
	"instanceof",
	"int",
	"interface",
	"let",
	"long",
	"native",
	"new",
	"null",
	"package",
	"private",
	"protected",
	"public",
	"return",
	"short",
	"static",
	"super",
	"switch",
	"synchronized",
	"this",
	"throw",
	"transient",
	"true",
	"try",
	"typeof",
	"var",
	"void",
	"volatile",
	"while",
	"with",
	"yield",
	"pug"
];

/**
 * Returns a regular expression to find each loop start.
 * Only variable loops within datapoints are considered!
 * @param {string[]} dataPoints Data points' names array
 */
function getLoopExp(dataPoints) {
	//Add template at the start of each loop
	return new RegExp(
		`;\\((function\\s*\\(\\)\\s*{)\\s*var\\s+\\$\\$obj\\s*=\\s*(${dataPoints.join(
			"|"
		)});\\s*(if[^{]+{\\s*for\\s*\\(var\\s*(\\S+)[^\\n]+\\s*var\\s+(\\S+)\\s*=)`,
		"g"
	);
}

/**
 * Recursivly finds all additional datapoints within loops
 * @param {string} source Source code strin
 * @param {string[]} dataPoints Data points' names array
 */
function getLoopDatapoints(source, dataPoints) {
	if (dataPoints.length == 0) return [];

	const data = new Set();
	const matches = [...source.matchAll(getLoopExp(dataPoints))];
	for (const match of matches) {
		data.add(match[4]);
		data.add(match[5]);
	}

	//Recursivly find nested datapoints
	getLoopDatapoints(source, [...data]).forEach(x => {
		data.add(x);
	});

	return data;
}

/**
 * Returns a new expression, where all constant variables are explicitly defined
 * @param {string} expression Expression to unwrap
 * @param {string[]} dataPoints Data points' names array
 * @param {boolean} escape Apply additional escaping between variables
 */
function unwrapConstants(expression, dataPoints, escape = true) {
	//Find all strings that look like a variable
	const variables = [...expression.matchAll(variablesExp)];
	let updated = "";
	let last = 0;

	//Iterate through matches
	for (const match of variables) {
		let variable = match[0];

		//Escape everything else
		let sub = expression.substring(last, match.index);
		if (escape) sub = sub.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		updated += sub;

		//If this is a constant, put its value instead
		if (
			!(variable in globalThis) &&
			!dataPoints.find(
				x => variable.startsWith(x + ".") || x === variable
			) &&
			!reservedKeywords.includes(variable)
		) {
			variable = `"+((typeof ${variable} === "undefined" || "${variable}" in window) ? "${variable}" : _$$wrap(${variable},_$$escape(JSON.stringify(${variable}),${!escape})))+"`;
		}

		//Build a new expression
		updated += variable;
		last = match.index + match[0].length;
	}
	let sub = expression.substring(last, expression.length);
	if (escape) sub = sub.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	updated += sub;

	return updated;
}

/**
 * Searches for all variable dependencies in the expression
 * @param {string} expression Expression to parse
 * @param {string[]} dataPoints Data points' names array
 */
function parseDependencies(expression, dataPoints) {
	const dependencies = [];

	dataPoints.forEach(x => {
		//Adding a dependency
		if (expression.match(varRegex(x))) {
			dependencies.push(x);
		}

		//Check if there are some object property usage
		const objMatches = [...expression.matchAll(objRegex(x))];

		//Adding all object prop paths
		dependencies.push(...objMatches.map(x => x[0]));
	});

	return dependencies;
}

/**
 * Processes attributes of elements
 * @param {string} source Source code
 * @param {string[]} dataPoints Data points' names array
 */
function processAttributes(source, dataPoints) {
	const matches = [...source.matchAll(attribExp)];
	let updated = "";
	let last = 0;

	if (matches.length) {
		let attributes = {};
		for (const i in matches) {
			const index = matches[i].index;

			updated += source.substring(last, index);

			const match = matches[i];
			const full = match[0];
			const attribName = match[1];
			//Escape in `upwrapConstants` is disabled, because expression
			// will be escaped with `JSON.stringify` later
			const attribValue = unwrapConstants(match[2], dataPoints, false);
			const dependencies = parseDependencies(attribValue, dataPoints);

			if (dependencies.length) {
				attributes[attribName] = attribValue.replace(arrayExp, ".$2");

				dependencies.forEach(x => {
					//Use `.` instead of `[]` for arrays
					const arrayed = x.replace(arrayExp, ".$2");
					//Upwraped constant indexes are additionaly escaped,
					// we should compensate for that
					const unescaped = x.replace(unescapeExp, "");

					updated += `pug.attr("bind-${arrayed}", ${unescaped}!=null?${unescaped}:"",true,true)+`;
				});
			}

			updated += full;

			//If this is the last attrubute of this element,
			// add attribute of attrubutes (bind). \u003E == '>'
			if (
				(!matches[+i + 1] ||
					matches[+i + 1].index >=
						source.indexOf("\\u003E", index)) &&
				Object.keys(attributes).length
			) {
				updated += `+pug.attr("bind", ${JSON.stringify(
					JSON.stringify(attributes)
				).replace(
					unescapeJSONExp,
					'"$1"$2"$3"$4"$5"$6"$7"'
				)}, true, true)`;

				attributes = {};
			}

			last = index + full.length;
		}
	}
	source = updated + source.substring(last, source.length);

	return source;
}

/**
 * Processes innert contents of elements
 * @param {string} source Source code
 * @param {string[]} dataPoints Data points' names array
 */
function processContent(source, dataPoints) {
	const matches = [...source.matchAll(valueExp)];
	if (!matches.length) return source;
	let last = 0;
	let updated = "";

	for (const i in matches) {
		updated += source.substring(last, matches[i].index);

		const full = matches[i][0];
		const expression = unwrapConstants(matches[i][3], dataPoints);
		const dependencies = parseDependencies(expression, dataPoints);

		//Do not bind when expression has no dependencies
		if (dependencies.length == 0) {
			updated += full;
			last = matches[i].index + full.length;
			continue;
		}

		//Add initial values
		const args = dependencies
			.map(x => {
				//Use `.` instead of `[]` for arrays
				const arrayed = x.replace(arrayExp, ".$2");
				//Upwraped constant indexes are additionaly escaped,
				// we should compensate for that
				const unescaped = x.replace(unescapeExp, "");
				return `bind-${arrayed}=\\""+(pug.escape(${unescaped})!=null?pug.escape(${unescaped}):"")+"\\"`;
			})
			.join(" ");

		let tag = "data-html";
		if (full.includes("pug.escape")) tag = "data-text";
		updated += `"<${tag} ${args}`;

		//Include bind attribute for expressions
		updated += ` bind=\\""+pug.escape("${expression.replace(
			arrayExp,
			".$2"
		)}")+"\\"`;

		updated += `>"+${full}+"</${tag}>"`;
		last = matches[i].index + full.length;
	}
	updated += source.substring(last, source.length);

	return updated;
}

/**
 * Processes loop (`each`) elements
 * @param {string} source Source code
 * @param {string[]} dataPoints Data points' names array
 */
function processLoops(source, dataPoints) {
	//Define $$tmpl variable
	source = source.replace(
		"function template(locals) {",
		"$&let $$$$tmpl=false;let f=()=>{};"
	);

	//Replace loop functions within datapoints
	source = source.replace(
		getLoopExp(dataPoints),
		`;(f=$1pug_html+=$$$$tmpl?"<template each bind='$2' key='$4' value='$5' "+($2?"bind-$2="+JSON.stringify($2):"")+">":"";let $$$$obj=$$$$tmpl?{"":""}:$2;$3`
	);
	//Modify all constant loop to match the pattern
	source = source.replace(
		loopStartExp,
		`;(f=$1let $$$$obj=$2;let $$$$tmpl=false;$3`
	);

	//Add template at the end of each loop
	source = source.replace(
		loopEndExp,
		`$1pug_html+=$$$$tmpl?"</template>":"";$2;
		if (!$$$$tmpl) {
			$$$$tmpl = true;f.bind(this)();$$$$tmpl = false;
		} else {f.bind(this)();}
		`
	);

	return source;
}

/**
 * Loader for preprocessing views
 * @param {string} source View pug source code
 */
module.exports = source => {
	//Register JSONification of arrays and objects
	//Also some helper `wrap` and `escape` functions
	source = source.replace(
		/(function template\(locals\) {)/,
		`$1const _$$$$wrap=(obj,text) => typeof obj == "object" ? \`JSON.stringify(\${text})\` : text;
const _$$$$escape=(str,json) => json ? str.replace(/\\\\/g,'\\\\\\\\').replace(/"/g,'\\\\"') : str;
const _$$$$oo=Object.prototype.toString;
const _$$$$oa=Array.prototype.toString;
const _$$$$oj=JSON.stringify;
JSON.stringify=function (...args){if (typeof args[0] == "function"){args[0] = args[0].toString()}return _$$$$oj(...args);}
Object.prototype.toString=function (){return JSON.stringify(this);}
Array.prototype.toString=function (){return JSON.stringify(this);};`
	);

	//Find all the data points
	const arguments = source.match(dataExp);
	let dataPoints = [];
	if (arguments && arguments.length > 1) {
		dataPoints = arguments[1].replace(/ /g, "").split(",") || [];
	}
	dataPoints = dataPoints.filter(
		x => !(x in globalThis || reservedKeywords.includes(x))
	);
	dataPoints.push(...getLoopDatapoints(source, dataPoints));

	//Process all attribute expressions
	source = processAttributes(source, dataPoints);

	//Wrap each variable expression in `data` tag
	source = processContent(source, dataPoints);

	//Make loops templates
	source = processLoops(source, dataPoints);

	source = source.replace(
		/(return pug_html;)/,
		`JSON.stringify=_$$$$oj;Object.prototype.toString=_$$$$oo;Array.prototype.toString=_$$$$oa;$1`
	);

	return source;
};

/**
 * @module detect
 * (Language detector)
*/

/**
 * @typedef {import('./index.js').ShjLanguage} ShjLanguage
 */

/**
 * @type {[ShjLanguage, [RegExp, Number]][]}
 */
const languages =
	[
		['bash', [/#!(\/usr)?\/bin\/bash/g, 500], [/\b(if|elif|then|fi|echo|chmod|mkdir|cd|ls|grep|awk|sed)\b|\$/g, 10]],
		['c', [/#include\b|\bprintf\s*\(/g, 100], [/\b(int|char|float|double|void|if|else|while|for|return|main)\b/g, 8]],
		['cpp', [/#include\s*<[^>]+>/g, 50], [/\b(std::|cout|cin|endl|class|public|private|protected|namespace|using)\b/g, 15]],
		['css', [/^(@import|@page|@media|(\.|#)[a-z]+)/gm, 20], [/\b(color|background|margin|padding|border|width|height|display|position|font-size)\s*:/g, 5]],
		['docker', [/^(FROM|ENTRYPOINT|RUN|COPY|ADD|ENV|WORKDIR|EXPOSE)\s/gm, 100]],
		['go', [/\b(func|fmt|package|import|var|const|if|else|for|range|struct|interface)\b/g, 10], [/^package\s+\w+/gm, 100]],
		['html', [/<\/?[a-z-]+[^\n>]*>/g, 10], [/^\s*<!DOCTYPE\s+html/gi, 500]],
		['http', [/^(GET|HEAD|POST|PUT|DELETE|PATCH|HTTP)\b/g, 500]],
		['java', [/^import\s+java/gm, 500], [/\b(public|private|protected|class|interface|extends|implements|static|void|int|String)\b/g, 8]],
		['js', [/\b(console|await|async|function|export|import|this|class|for|let|const|map|join|require|if|else|var|return|window|document|setTimeout|setInterval|Promise)\b/g, 10]],
		['json', [/\b(true|false|null)\b|\"[^"]+\":/g, 10], [/^\s*[\{\[]/gm, 5]],
		['md', [/^(>|\t\*|\t\d+\.)/gm, 10], [/\[.*\]\(.*\)/g, 10], [/^#{1,6}\s/gm, 15]],
		['php', [/<\?php/g, 500], [/\b(echo|print|function|class|public|private|protected|if|else|elseif|while|for|foreach|array)\b|\$/g, 10]],
		['py', [/\b(def|print|class|and|or|lambda|import|from|if|else|elif|for|while|try|except|with|as|in|not|is)\b/g, 10], [/^\s*#\s*-\*-\s*coding[:=]/gm, 100], [/:\s*int\b|:\s*str\b|:\s*float\b|:\s*bool\b/g, 20], [/\bsys\.stdin\b|\blen\(|\brange\(|\bstr\(|\bint\(/g, 15]],
		['rs', [/^\s*(use|fn|mut|match|let|impl|struct|enum|mod|pub)\b/gm, 15], [/\b(String|Vec|Option|Result|println!|format!)\b/g, 10]],
		['sql', [/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY|CREATE|DROP|ALTER|TABLE)\b/gi, 20]],
		['ts', [/\b(console|await|async|function|export|import|this|class|for|let|const|map|join|require|implements|interface|namespace|type|enum)\b/g, 10], [/:\s*(string|number|boolean|object|any)\b/g, 15]],
		['xml', [/<\/?[a-z-]+[^\n>]*>/g, 10], [/^<\?xml/g, 500]],
		['yaml', [/^(\s+)?[a-zA-Z][a-zA-Z0-9_]*\s*:/gm, 10], [/^\s*-\s+/gm, 5]]
	]
	

/**
 * Try to find the language the given code belong to
 *
 * @function detectLanguage
 * @param {string} code The code
 * @returns {ShjLanguage} The language of the code
 */
export const detectLanguage = code => {
	return (languages
		.map(([lang, ...features]) => [
			lang,
			features.reduce((acc, [match, score]) => acc + [...code.matchAll(match)].length * score, 0)
		])
		.filter(([lang, score]) => score > 20)
		.sort((a, b) => b[1] - a[1])[0]?.[0] || 'plain');
}

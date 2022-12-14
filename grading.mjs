import chalk from 'chalk';
import {spawn, spawnSync} from 'child_process'
import {diffChars, diffWords} from 'diff'

/**
 * @param {string} expectation
 * @param {string} reality
 */
function printDiff(expectation, reality) {
	let panes = [[], []]
	diffWords(expectation, reality).forEach(part => {
		if (part.added) {
			panes[1].push(chalk.green(part.value))
		}
		else if (part.removed) { // removed from reality make it red
			panes[0].push(chalk.red(part.value))
		}
		else {
			panes[0].push(chalk.blue(part.value))
			panes[1].push(chalk.white(part.value))
		}
		// console.log(part)
	})
	panes.forEach(pane => {
		console.log(pane.join(''))
	})
}

/**
 * @param {string} io
 * */
function getInputLines(io) {
	return Array.from(io.matchAll(/`(.+?)`/gms)).map(x => x[1])
}

/**
 * @param {string} io
 * */
function trimSpaceEnds(io) {
	const sep = '\n'
	return io.split(sep).map(s => s.trimEnd()).join(sep).trimEnd()
}

/**
 * @param {string} testFileContent
 * */
function stringToCases(testFileContent) {
	return testFileContent.split('\n`\n')
		.map(s => trimSpaceEnds(s))
		.filter(trimmed => trimmed.length > 0)
		.map(a => ({inputs: getInputLines(a), completeOutput: a}))
}

/**
 * @param {string} io
 */
function removeInput(io) {
	return io.replace(/`.+?`\n/gm, '')
}


/**
 * @returns {Promise<{stdouterr:string,error?:any}>}
 */
function forkProgram(input, executable, args, timeout) {
	let stdouterr = ''
	return new Promise((resolve, reject) => {
		const proc = spawn(executable, args, {
			encoding: 'utf-8',
			timeout: timeout,
		})

		proc.on('error', (err) => {
			resolve({stdouterr, error: err})
		})

		proc.stderr.on('data', (chunk) => {
			stdouterr += chunk
		})

		proc.stdout.on('data', (chunk) => {
			stdouterr += chunk
		})
		proc.stdin.write(input)
		proc.stdin.end()

		proc.on('exit', (code, signal) => {
			if (signal !== null) { // Terminated by timeout
				resolve({stdouterr, error: {code: 'ETIMEDOUT'}})
			}
			else {
				resolve({stdouterr})
			}
		})
	})
}

/**
 * Fork programs and give score
 * @param {string} testCommand
 * @param {string} testCaseFileContent
 * @param {number} timeout
 */
function grade(executable, args, cases, timeout, asyncMode = false) {
	const syncForks = async () => {
		let all = []
		for (let {inputs} of cases) {
			all.push(await forkProgram(inputs.join('\n'), executable, args, timeout))
		}
		return all
	}
	const asyncFork = () => Promise.all(cases.map(({inputs}) =>
		forkProgram(inputs.join('\n'), executable, args, timeout)
	))
	return (asyncMode ? asyncFork : syncForks)().then(
		res => res.map(({stdouterr, error}, index) => {
			return {stdouterr, error, ...cases[index]}
		}).map(({stdouterr, error, inputs, completeOutput}) => {
			let charCode = '-';
			let clean_stdouterr = trimSpaceEnds(stdouterr)
			let clean_output = removeInput(completeOutput)
			if (error) {
				charCode = (error.code === 'ETIMEDOUT') ? 'T' : 'E'
			}
			else {
				let correct = clean_stdouterr == clean_output
				charCode = correct ? '???' : charCode
			}
			return {charCode, clean_output, clean_stdouterr, inputs, error}
		})
	)
}

function printSummary(results) {
	for (let {charCode, clean_output, clean_stdouterr, inputs, error} of results) {
		console.log(`[${charCode}]`, 'inputs =>', inputs)
		if (error) {
			console.error(error)
			// todo : make it optional to continue printing more results 
			break
		}
		if (charCode !== '???') {
			printDiff(clean_output, clean_stdouterr)
			// todo : make it optional to continue printing more results 
			break
		}
	}
	console.log("Your score:", results.map(r => r.charCode).join(''))
}
export async function grader(testCommand, testCaseFileContent, timeout, asyncMode) {
	const [executable, ...args] = testCommand.split(' ').filter(a => a.length > 0)

	const cases = stringToCases(testCaseFileContent)
	console.clear()
	console.log(cases.length, 'cases loaded')
	console.log("spawn command is:", executable, args)
	printSummary(await grade(executable, args, cases, timeout, asyncMode))
}

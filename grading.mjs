import chalk from 'chalk';
import { spawn, spawnSync } from 'child_process'
import { diffChars } from 'diff'

/**
 * @param {string} expectation
 * @param {string} reality
 */
function printDiff(expectation, reality) {
    console.log(chalk.blue(expectation))
    console.log(chalk.white(reality))
    //    diffChars(expectation, reality).forEach(part => {
    //        const color = part.added ? chalk.bgRed :
    //            part.removed ? chalk.bgGray : chalk.green;
    //        process.stderr.write(color(part.value));
    //    })
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
        .map(a => ({ inputs: getInputLines(a), completeOutput: a }))
}

/**
 * @param {string} io
 */
function removeInput(io) {
    return io.replace(/`.+?`\n/gm, '')
}
/**
 * @param {string} testCommand
 * @param {string} testCaseFileContent
 * @param {number} timeout
 */
export function grade(testCommand, testCaseFileContent, timeout) {
    let gradeResult = ''
    const [executable, ...args] = testCommand.split(' ').filter(a => a.length > 0)

    const cases = stringToCases(testCaseFileContent)
    console.log(cases.length, 'cases loaded')
    console.log("spawn command is:", executable, args)

    for (let { inputs, completeOutput } of cases) {
        let extraFn;
        let currentResult;
        const input = inputs.join('\n')
        const proc = spawnSync(executable, args, {
            encoding: 'utf-8',
            input: input,
            timeout: timeout
        })
        if (proc.error && proc.error.code === 'ETIMEDOUT') {
            currentResult = 'T'
        }
        else if (proc.error) {
            currentResult = 'E'
            console.error('spawn error:', proc.error)
        }
        else if (proc.stderr.length > 0) {
            currentResult = 'X'
            console.error('stderr:', proc.stderr)
        }
        else {
            // validate output
            let res = trimSpaceEnds(proc.stdout)
            let expectation = removeInput(completeOutput)
            let correct = res === expectation
            currentResult = (correct) ? '✓' : '-'
            if (!correct) {
                extraFn = () => {
                    printDiff(expectation, res)
                    console.log()
                }
            }
        }
        gradeResult += currentResult
        console.log(`[${currentResult}]`, 'inputs =>', inputs)
        extraFn?.()
    }
	return gradeResult
}

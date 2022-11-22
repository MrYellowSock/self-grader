#!/bin/sh
":" //# comment; exec /usr/bin/env node --noharmony "$0" "$@"

import path from 'path'
import fs from 'fs';
import {Command} from 'commander';
import {grader} from './grading.mjs';

import {createRequire} from "module";
const require = createRequire(import.meta.url);

const myPack = require('./package.json')
let {name, version, description} = myPack
const program = new Command();
program.name(name)
program.description(description)
program.version(version)
program.argument('<command>', 'command to run the test on')
program.argument('<testcasefile_path>', 'view example in example.txt')
program.option('--async', 'run each test cases asynchronously.', false)
program.option('--reload <filepath>', 'run the test again when this file changed', '')
program.option('--timeout <timeout>', 'timeout per test', '5000')

program.action((command, testcasefile_path, options) => {
	const checkFile = (nickname, p) => {
		if (!fs.existsSync(testcasefile_path)) {
			console.log(`can not find ${nickname} at`, path.resolve(p))
			return false
		}
		return true
	}
	console.log()
	if (!checkFile('testcasefile', testcasefile_path)) {
		return
	}
	if (options.reload.length > 0 && !checkFile('reload filepath', options.reload)) {
		return
	}
	const gradeAction = () => {
		grader(command, fs.readFileSync(testcasefile_path).toString(), +options.timeout, options.async)
	}
	if (options.reload.length > 0) {
		fs.watchFile(options.reload, {persistent: true, interval: 500}, (cur, prev) => {
			console.log("file changed!")
			gradeAction()
		})
	}
	gradeAction()
});
program.parse();

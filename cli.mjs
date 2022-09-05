#!/usr/bin/env node
import path from 'path'
import fs from 'fs';
import {Command} from 'commander';
import {grader} from './grading.mjs';

import myPack from "./package.json" assert {type: "json"};
let {name, version, description} = myPack
const program = new Command();
program
	.name(name)
	.description(description)
	.version(version)
	.argument('<command>', 'command to run the test on')
	.argument('<testcasefile_path>', 'view example in example.txt')
	.option('--reload <filepath>', 'run the test again when this file changed', '')
	.option('--timeout <timeout>', 'timeout per test', '5000')
	.action((command, testcasefile_path, options) => {
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
			grader(command, fs.readFileSync(testcasefile_path).toString(), +options.timeout)
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

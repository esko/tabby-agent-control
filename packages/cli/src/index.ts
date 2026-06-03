#!/usr/bin/env node
import { createDefaultDeps, runCli } from './cli.js';

const code = await runCli(process.argv.slice(2), createDefaultDeps(), {
  stdout: (text) => process.stdout.write(text.includes('\n') ? text : `${text}\n`),
  stderr: (text) => process.stderr.write(text.includes('\n') ? text : `${text}\n`),
});

process.exitCode = code;

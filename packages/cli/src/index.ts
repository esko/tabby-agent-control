#!/usr/bin/env node
import { createDefaultDeps, runCli } from './cli.js';

const code = await runCli(process.argv.slice(2), createDefaultDeps(), {
  stdout: (text) => console.log(text),
  stderr: (text) => console.error(text),
});

process.exitCode = code;

#!/usr/bin/env node

import program from 'commander';
import loader from '../src/index';
import { version, description } from '../package.json';

program
  .version(version, '-V, --version', 'output the version number')
  .description(description)
  .option('-O, --output [type]', 'the output directory')
  .arguments('<loadpage>')
  .action((link) => {
    const outputDir = program.output ? program.output : process.cwd();
    loader(link, outputDir).catch((error) => {
      process.exitCode = 1;
      console.error(`Request failed during load page from ${link}. Error: ${error.message}.`);
    });
  })
  .parse(process.argv);

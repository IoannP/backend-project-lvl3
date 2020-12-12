#!/usr/bin/env node

import program from 'commander';
import loader from '../index';
import { version, description } from '../../package.json';

program
  .version(version, '-V, --version', 'output the version number')
  .description(description)
  .option('-O, --output [type]', 'the output directory')
  .arguments('<loadpage>')
  .action((loadpage) => {
    const outputDir = program.output ? program.output : process.cwd();
    loader(loadpage, outputDir).catch((error) => {
      process.exitCode = 1;
      console.error(error.message);
    });
  })
  .parse(process.argv);

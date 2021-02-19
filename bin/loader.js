#!/usr/bin/env node

import fs from 'fs';
import program from 'commander';
import loader from '../src/index.js';

fs.promises
  .readFile('package.json', 'utf-8')
  .then((data) => JSON.parse(data))
  .then(({ version, description }) => program
    .version(version, '-v, --version', 'output the version number')
    .description(description)
    .option('-o, --output [type]', 'the output directory')
    .arguments('<loadpage>')
    .action((link) => {
      const outputDir = program.output ? program.output : process.cwd();
      return loader(link, outputDir)
        .then((pagePath) => console.log(`Page was successfully downloaded into '${pagePath}'`))
        .catch((error) => {
          process.exitCode = 1;
          throw new Error(`Request failed during load page from ${link}. Error: ${error.message}.`);
        });
    })
    .parse(process.argv))
  .catch(console.error);

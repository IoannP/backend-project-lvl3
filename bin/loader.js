import program from 'commander';
import loader from '../src/index.js';
import pkg from '../package.json';

program
  .version(pkg.version, '-V, --version', 'output the version number')
  .description(pkg.description)
  .option('-O, --output [type]', 'the output directory')
  .arguments('<loadpage>')
  .action((link) => {
    const outputDir = program.output ? program.output : process.cwd();
    loader(link, outputDir)
      .then((pagePath) => console.log(`Page was successfully downloaded into '${pagePath}'`))
      .catch((error) => {
        process.exitCode = 1;
        console.error(`Request failed during load page from ${link}. Error: ${error.message}.`);
      });
  })
  .parse(process.argv);

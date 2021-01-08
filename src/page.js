import fs from 'fs';
import prettier from 'prettier';
import { buildResourcePath, createResourceName } from './utils';
import log from './debug-loader';

export default (link, directory, html) => {
  const filename = createResourceName(link);
  const outputPath = buildResourcePath(directory, filename);
  const formatted = prettier.format(html, { parser: 'html' });
  log.pageLog(`Write html data to file ${outputPath}`);
  return fs.promises.writeFile(outputPath, formatted);
};

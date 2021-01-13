import fs from 'fs';
import { buildResourcePath, createResourceName } from './utils';
import log from './debug-loader';

export default (link, directory, html) => {
  const filename = createResourceName(link);
  const outputPath = buildResourcePath(directory, filename);

  log.pageLog(`Write html data to file ${outputPath}`);
  return fs.promises.writeFile(outputPath, html);
};

import axios from 'axios';
import cheerio from 'cheerio';
import debug from 'debug';
import {
  generateResourcesLinks,
  loadResources,
  formatHtml,
  createResourcesDir,
  writePage,
} from './helpers.js';

const debugLog = debug('page-loader');

export default (link, outputDir) => {
  debugLog('Load page from %s', link);

  return axios(link)
    .then(({ data }) => cheerio.load(data))
    .then((html) => {
      const resDir = createResourcesDir(link, outputDir);
      return { html, resDir };
    })
    .then(({ html, resDir }) => {
      const resLinks = generateResourcesLinks(link, resDir, html);
      const formattedHtml = formatHtml(html, resLinks);

      return { html: formattedHtml, resLinks };
    })
    .then(({ html, resLinks }) => loadResources(resLinks, debugLog).then(() => html))
    .then((html) => writePage(link, outputDir, html, debugLog));
};

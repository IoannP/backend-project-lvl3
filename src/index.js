import axios from 'axios';
import axiosDebug from 'axios-debug-log';
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
const axiosLog = debug('axios');

export default (link, outputDir) => {
  debugLog('Load page from %s', link);
  axiosDebug.addLogger(axios, axiosLog);
  // axios.defaults.timeout = 5000;

  return axios(link)
    .then(({ data }) => cheerio.load(data))
    .then((html) => createResourcesDir(link, outputDir).then((resDir) => ({ html, resDir })))
    .then(({ html, resDir }) => {
      const resLinks = generateResourcesLinks(link, resDir, html);
      const formattedHtml = formatHtml(html, resLinks);

      return { html: formattedHtml, resLinks };
    })
    .then(({ html, resLinks }) => loadResources(resLinks, debugLog).then(() => html))
    .then((html) => writePage(link, outputDir, html, debugLog));
};

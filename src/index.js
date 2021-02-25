import path from 'path';
import axios from 'axios';
import axiosDebug from 'axios-debug-log';
import cheerio from 'cheerio';
import debug from 'debug';
import {
  urlToDirname,
  urlToFilename,
  createFile,
  createDir,
  generateResourcesLinks,
  formatHtml,
  loadResources,
} from './helpers.js';

const debugLog = debug('page-loader');
const axiosLog = debug('axios');

export default (link, outputDir) => {
  debugLog('Load page from %s', link);
  axiosDebug.addLogger(axios, axiosLog);
  axios.defaults.validateStatus = (status) => status === 200;

  return axios(link)
    .then(({ data }) => cheerio.load(data))
    .then((html) => {
      const resDirname = urlToDirname(link, 'files');
      const resDirpath = path.join(outputDir, resDirname);

      return createDir(resDirpath).then(() => ({ html, resDirpath, resDirname }));
    })
    .then(({ html, resDirpath, resDirname }) => {
      const resLinks = generateResourcesLinks(link, resDirpath, resDirname, html);
      const formattedHtml = formatHtml(html, resLinks);

      return { html: formattedHtml, resLinks };
    })
    .then(({ html, resLinks }) => loadResources(resLinks, debugLog).then(() => html))
    .then((html) => {
      const filename = urlToFilename(link);
      const filepath = path.join(outputDir, filename);

      return createFile(filepath, html).then(() => filepath);
    });
};

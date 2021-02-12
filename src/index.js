import axios from 'axios';
import cheerio from 'cheerio';
import log from './debug-loader';
import writePage from './page';
import {
  generateResourcesLinks,
  loadResources,
  formatHtml,
  createResourcesDir,
} from './resources';

export default (link, outputDir) => {
  log.pageLog(`Load page from ${link}`);
  log.axiosLog(axios);

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
    .then(({ html, resLinks }) => {
      writePage(link, outputDir, html);
      return resLinks;
    })
    .then((resLinks) => loadResources(resLinks));
};

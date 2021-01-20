import axios from 'axios';
import cheerio from 'cheerio';
import log from './debug-loader';
import { getResourcesLinks, loadResources, formatHtml } from './resources';
import writePage from './page';

export default (link, outputDir) => {
  log.pageLog(`Load page from ${link}`);
  log.axiosLog(axios);

  return axios(link)
    .then(({ data }) => cheerio.load(data))
    .then((html) => {
      const linksData = getResourcesLinks(link, outputDir, html);
      const formattedHtml = formatHtml(html, linksData);

      return { html: formattedHtml, linksData };
    })
    .then(({ html, linksData }) => {
      writePage(link, outputDir, html);
      return linksData;
    })
    .then((linksData) => loadResources(linksData))
    .catch((error) => {
      throw error;
    });
};

import axios from 'axios';
import cheerio from 'cheerio';
import log from './debug-loader';
import { getResourcesLinks, loadResources, formatHtml } from './resources';
import writeData from './page';

export default (link, outputDir) => {
  log.pageLog(`Load page from ${link}`);
  log.axiosLog(axios);

  let page;

  return axios(link)
    .then(({ data }) => {
      page = cheerio.load(data);
      return page;
    })
    .then((html) => getResourcesLinks(link, outputDir, html))
    .then((linksData) => {
      formatHtml(page, linksData);
      return linksData;
    })
    .then((linksData) => loadResources(linksData))
    .then(() => {
      const html = page.html();
      return writeData(link, outputDir, html);
    })
    .catch((error) => {
      throw error;
    });
};

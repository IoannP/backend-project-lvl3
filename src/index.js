import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import prettier from 'prettier';
import log from './debug-loader';

const getName = (response, type) => {
  const [contentType] = response.headers['content-type'].split(';');
  const { config } = response;

  const url = new URL(config.url, config.baseURL);
  const [, identifier] = contentType.split('/');

  const hostname = url.hostname.split('.');
  const pathname = url.pathname.split('/');

  const name = [...hostname, ...pathname].filter((value) => value).join('-');

  if (type === 'dir') {
    return `${name}_file`;
  }
  return identifier === 'html' ? `${name}.${identifier}` : name;
};

export default (link, outputDir) => {
  log.pageLog(`Load page from ${link}`);
  const url = new URL(link);
  const { origin, pathname } = url;
  let pageData;
  const mapping = {
    img: 'src',
    link: 'href',
    script: 'src',
  };
  axios.defaults.baseURL = origin;
  log.axiosLog(axios);
  return axios(pathname)
    .then((response) => {
      pageData = response;
      const $ = cheerio.load(response.data);

      const resoursesDirName = getName(response, 'dir');
      const resoursesDirPath = path.join(outputDir, resoursesDirName);
      fs.mkdirSync(resoursesDirPath);

      const promises = Object.keys(mapping).reduce((acc, tag) => {
        $(tag).each((i, el) => {
          const attribute = mapping[tag];
          const attributeLink = $(el).attr(attribute);

          let attributeUrl;
          if (attributeLink) {
            attributeUrl = new URL(attributeLink, origin);
          }

          if (attributeUrl && attributeUrl.origin === origin) {
            acc.push(axios({
              method: 'get',
              url: attributeUrl.pathname,
              responseType: 'stream',
            }).then((resResponse) => {
              const resFileName = getName(resResponse);
              const resLink = path.join(resoursesDirName, resFileName);
              const resPath = path.join(outputDir, resoursesDirName, resFileName);
              log.pageLog(`Write resource data to file ${resPath}`);
              resResponse.data.pipe(fs.createWriteStream(resPath));
              $(el).attr(attribute, resLink);
            }));
          }
        });
        return acc;
      }, []);

      return Promise.all(promises).then(() => {
        pageData.data = $.html();
      });
    })
    .then(() => {
      const filename = getName(pageData);
      const outputPath = path.join(outputDir, filename);
      const formatted = prettier.format(pageData.data, { parser: 'html' });
      log.pageLog(`Write page data to file ${outputPath}`);
      return fs.promises.writeFile(outputPath, formatted);
    })
    .catch((error) => {
      process.exitCode = 1;
      if (error.response) {
        const errorLink = path.join(origin, error.config.url);
        throw new Error(`Error: ${error.message} from ${errorLink}.`);
      }
      throw new Error(`Request failed during load page from ${link}. Error: ${error.message}`);
    });
};

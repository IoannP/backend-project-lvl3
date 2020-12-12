import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Listr from 'listr';
import cheerio from 'cheerio';
import prettier from 'prettier';
import log from './debug-loader';

const getName = (link, type = 'file') => {
  const origin = axios.defaults.baseURL;
  const url = new URL(link, origin);

  const hostname = url.hostname.split('.');
  const pathname = url.pathname.split('/');

  const [, identifier] = pathname[pathname.length - 1].split('.');
  const name = [...hostname, ...pathname].filter((value) => value).join('-');
  if (type === 'dir') {
    return `${name}_file`;
  }
  return !identifier ? `${name}.html` : name;
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

      const resoursesDirName = getName(link, 'dir');
      const resoursesDirPath = path.join(outputDir, resoursesDirName);
      if (!fs.existsSync(resoursesDirPath)) {
        fs.mkdirSync(resoursesDirPath);
      }
      const promises = Object.keys(mapping).reduce((acc, tag) => {
        $(tag).each((i, el) => {
          const attribute = mapping[tag];
          const attributeLink = $(el).attr(attribute);
          const attributeUrl = new URL(attributeLink, origin);
          if (attributeUrl.origin === origin) {
            acc.push(axios({
              method: 'get',
              url: attributeUrl.href,
              responseType: 'stream',
            })
              .then((resResponse) => {
                const resFileName = getName(attributeLink);
                const resLink = path.join(resoursesDirName, resFileName);
                const resPath = path.join(outputDir, resoursesDirName, resFileName);
                $(el).attr(attribute, resLink);
                return {
                  title: attributeUrl.href,
                  task: () => {
                    log.pageLog(`Write resource data to file ${resPath}`);
                    resResponse.data.pipe(fs.createWriteStream(resPath));
                  },
                };
              })
              .catch((error) => console.error(`Request failed during load data from ${attributeUrl.href}. Error: ${error.message}.`)));
          }
        });
        return acc;
      }, []);

      return Promise.all(promises).then((data) => {
        pageData.data = $.html();
        return data;
      });
    })
    .then((data) => new Listr(data).run())
    .then(() => {
      const filename = getName(link);
      const outputPath = path.join(outputDir, filename);
      const formatted = prettier.format(pageData.data, { parser: 'html' });
      log.pageLog(`Write page data to file ${outputPath}`);
      return fs.promises.writeFile(outputPath, formatted);
    })
    .catch((error) => {
      process.exitCode = 1;
      throw new Error(`Request failed during load page from ${link}. Error: ${error.message}.`);
    });
};

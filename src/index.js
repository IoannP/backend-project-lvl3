import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Listr from 'listr';
import cheerio from 'cheerio';
import prettier from 'prettier';
import getName from './utils';
import log from './debug-loader';

const tagsMap = {
  img: 'src',
  link: 'href',
  script: 'src',
};

export default (link, outputDir) => {
  log.pageLog(`Load page from ${link}`);
  const url = new URL(link);
  const { origin, pathname } = url;
  let pageData;

  axios.defaults.baseURL = origin;
  log.axiosLog(axios);
  return axios(pathname)
    .then((response) => {
      pageData = response;
      const $ = cheerio.load(response.data);

      const resoursesDirName = getName(url, 'dir');
      const resoursesDirPath = path.join(outputDir, resoursesDirName);
      fs.mkdirSync(resoursesDirPath);

      const promises = Object.keys(tagsMap).reduce((acc, tag) => {
        $(tag).each((i, el) => {
          const attribute = tagsMap[tag];
          const attributeLink = $(el).attr(attribute);
          const attributeUrl = new URL(attributeLink, origin);
          if (attributeUrl.origin === origin) {
            const promise = axios({
              method: 'get',
              url: attributeUrl.href,
              responseType: 'stream',
            })
              .then((resResponse) => {
                const resFileName = getName(attributeUrl);
                const resLink = path.join(resoursesDirName, resFileName);
                const resPath = path.join(outputDir, resLink);
                $(el).attr(attribute, resLink);

                return new Listr([{
                  title: attributeUrl.href,
                  task: () => {
                    log.pageLog(`Write resource data to file ${resPath}`);
                    resResponse.data.pipe(fs.createWriteStream(resPath));
                  },
                }]).run();
              });
            acc.push(promise);
          }
        });
        return acc;
      }, []);

      return Promise.all(promises).then(() => {
        pageData.data = $.html();
      });
    })
    .then(() => {
      const filename = getName(url);
      const outputPath = path.join(outputDir, filename);
      const formatted = prettier.format(pageData.data, { parser: 'html' });
      log.pageLog(`Write page data to file ${outputPath}`);
      return fs.promises.writeFile(outputPath, formatted);
    })
    .catch((error) => {
      throw new Error(`Request failed during load page from ${link}. Error: ${error.message}.`);
    });
};

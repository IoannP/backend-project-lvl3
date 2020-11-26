import fs from 'fs';
import path from 'path';
import axios from 'axios';
import prettier from 'prettier';
import cheerio from 'cheerio';

const getName = (response, type) => {
  const [contentType] = response.headers['content-type'].split(';');
  const { config } = response;

  const responseUrl = config.url || config.baseURL;
  const url = new URL(responseUrl);
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
  const url = new URL(link);
  const { origin } = url;
  let pageData;
  const mapping = {
    img: 'src',
    link: 'href',
    script: 'src',
  };

  return axios(link)
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
              url: attributeUrl.href,
              responseType: 'stream',
            }).then((resResponse) => {
              const name = getName(resResponse);
              const newLink = path.join(resoursesDirName, name);
              const newPath = path.join(outputDir, resoursesDirName, name);
              resResponse.data.pipe(fs.createWriteStream(newPath));
              $(el).attr(attribute, newLink);
            }));
          }
        });
        return acc;
      }, []);

      return Promise.all(promises).then(() => {
        pageData.data = $.html();
      }).catch((error) => {
        throw error;
      });
    })
    .then(() => {
      const filename = getName(pageData);
      const outputPath = path.join(outputDir, filename);
      const formatted = prettier.format(pageData.data, { parser: 'html' });
      return fs.promises.writeFile(outputPath, formatted);
    })
    .catch((error) => {
      throw error;
    });
};

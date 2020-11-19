import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';

const getName = (response, type) => {
  const [contentType] = response.headers['content-type'].split(';');
  const { config } = response;

  const responseUrl = config.url || config.baseURL;
  const url = new URL(responseUrl);
  const [, identifier] = contentType.split('/');

  const hostname = url.hostname.split('.').filter((x) => x !== 'www');
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

  //axios.defaults.baseURL = url.href;
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
              console.log('create')
              const name = getName(resResponse);
              const resoursePath = path.join(outputDir, resoursesDirName, name);
              resResponse.data.pipe(fs.createWriteStream(resoursePath));
              $(el).attr(attribute, resoursePath);
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
      console.log('write')
      const filename = getName(pageData);
      const outputPath = path.join(outputDir, filename);
      return fs.promises.writeFile(outputPath, pageData.data);
    })
    .catch((error) => {
      throw error;
    });
};

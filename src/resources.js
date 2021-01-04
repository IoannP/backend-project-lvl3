import fs from 'fs';
import axios from 'axios';
import Listr from 'listr';
import { getName, getPath } from './utils';
import log from './debug-loader';

const tagsMap = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const isSameOrigin = (url1, url2) => url1.origin === url2.origin;

const getTags = (html) => Object.keys(tagsMap).flatMap((tag) => html(tag).get());

const createResDir = (link, dir) => {
  const name = getName(link, 'dir');
  const path = getPath(dir, name);
  fs.mkdirSync(path);
  return { name, path };
};

const getLinks = (tags) => tags.map((tag) => {
  const { name } = tag;
  const attribute = tagsMap[name];
  return tag.attribs[attribute];
});

const getResourcesLinks = (pageLink, outputDir, html) => {
  const pageURL = new URL(pageLink);

  const resDir = createResDir(pageLink, outputDir);
  const tags = getTags(html);
  const links = getLinks(tags);
  return links
    .reduce((acc, link) => {
      const resURL = new URL(link, pageLink);
      const isSame = isSameOrigin(pageURL, resURL);
      if (!isSame) {
        return acc;
      }

      const filename = getName(resURL.href);
      const filepath = getPath(resDir.path, filename);
      const newLink = getPath(resDir.name, filename);

      acc.push({
        oldLink: link,
        newLink,
        filepath,
        href: resURL.href,
      });
      return acc;
    }, []);
};

const formatHtml = (html, linksData) => Object.keys(tagsMap)
  .forEach((tag) => {
    html(tag).each((i, el) => {
      const attribute = tagsMap[tag];
      const link = html(el).attr(attribute);
      const linkData = linksData.find((value) => value.oldLink === link);
      if (linkData) {
        html(el).attr(attribute, linkData.newLink);
      }
    });
  });

const loadResources = (linksData) => {
  const tasks = linksData.map(({ href, filepath }) => ({
    title: href,
    task: (ctx, task) => {
      log.pageLog(`Write resource data to file ${filepath}`);
      return axios({
        method: 'GET',
        url: href,
        responseType: 'stream',
      })
        .then(({ data }) => new Promise((resolve, reject) => data
          .pipe(fs.createWriteStream(filepath))
          .on('error', (err) => reject(err))
          .on('finish', () => resolve()))
          .catch((error) => {
            throw error;
          }))
        .catch((error) => task.skip(error.message));
    },
  }));

  return new Listr(tasks, { concurrent: true, exitOnError: false }).run();
};

export { getResourcesLinks, loadResources, formatHtml };

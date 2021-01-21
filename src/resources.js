import fs from 'fs';
import axios from 'axios';
import Listr from 'listr';
import prettier from 'prettier';
import { buildResourcePath, createResourceName } from './utils';
import log from './debug-loader';

const tagsMap = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const isSameOrigin = (url1, url2) => url1.origin === url2.origin;

const getTags = (html) => Object.keys(tagsMap).flatMap((tag) => html(tag).get());

const createResourcesDir = (link, dir) => {
  const name = createResourceName(link, 'dir');
  const path = buildResourcePath(dir, name);
  fs.mkdirSync(path);
  return { name, path };
};

const getLinks = (tags) => tags.map((tag) => {
  const { name } = tag;
  const attribute = tagsMap[name];
  return tag.attribs[attribute];
});

const generateResourcesLinks = (pageLink, resDir, html) => {
  const pageURL = new URL(pageLink);

  const tags = getTags(html);
  const links = getLinks(tags);

  return links
    .map((link) => {
      const url = new URL(link, pageLink);
      return { link, url };
    })
    .filter(({ url }) => isSameOrigin(pageURL, url))
    .map(({ link, url }) => {
      const filename = createResourceName(url.href);
      const filepath = buildResourcePath(resDir.path, filename);
      const newLink = buildResourcePath(resDir.name, filename);

      return {
        oldLink: link,
        newLink,
        filepath,
        href: url.href,
      };
    });
};

const formatHtml = (html, linksData) => {
  const tags = Object.keys(tagsMap);
  tags.forEach((tag) => {
    html(tag).each((i, el) => {
      const attribute = tagsMap[tag];
      const link = html(el).attr(attribute);
      const linkData = linksData.find((value) => value.oldLink === link);
      if (linkData) {
        html(el).attr(attribute, linkData.newLink);
      }
    });
  });
  return prettier.format(html.html(), { parser: 'html' });
};

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

export {
  generateResourcesLinks,
  loadResources,
  formatHtml,
  createResourcesDir,
};

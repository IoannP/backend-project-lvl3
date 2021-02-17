import fs from 'fs';
import axios from 'axios';
import Listr from 'listr';
import path from 'path';
import _ from 'lodash';

const tagsMap = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const hasExtension = (pathname) => {
  const { ext } = path.parse(pathname);
  return ext.length > 0;
};

const unionLists = (list1, list2) => [...list1, ...list2].filter((value) => value.length > 0);

const buildResourcePath = (...paths) => path.join(...paths);

const createResourceName = (link, type = '') => {
  const { hostname, pathname } = new URL(link);

  const hostlist = hostname.split('.');
  const pathlist = pathname.split('/');

  const lists = unionLists(hostlist, pathlist);
  const name = _.join(lists, '-');

  if (type === 'dir') {
    return `${name}_files`;
  }
  return hasExtension(pathname) ? name : `${name}.html`;
};

const isSameOrigin = (url1, url2) => url1.origin === url2.origin;

const getTags = (html) => Object.keys(tagsMap).flatMap((tag) => html(tag).get());

const createResourcesDir = (link, dir) => {
  const name = createResourceName(link, 'dir');
  const dirpath = buildResourcePath(dir, name);

  return fs.promises.mkdir(dirpath).then(() => ({ name, path: dirpath }));
};

const getLinks = (tags) => tags
  .map((tag) => {
    const { name } = tag;
    const attribute = tagsMap[name];
    return tag.attribs[attribute];
  })
  .filter((link) => !!link);

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
  return html.html();
};

const loadResources = (linksData, log) => {
  const tasks = linksData.map(({ href, filepath }) => ({
    title: href,
    task: (ctx, task) => {
      log('Load data from %s', href);
      return axios({
        method: 'GET',
        url: href,
        responseType: 'arraybuffer',
      })
        .then(({ data }) => {
          log('Write data to file %s', filepath);
          return fs.promises.writeFile(filepath, data);
        })
        .catch((error) => {
          throw error;
        });
    },
  }));

  return new Listr(tasks, { concurrent: true, exitOnError: false }).run();
};

const writePage = (link, directory, html, log) => {
  const filename = createResourceName(link);
  const outputPath = buildResourcePath(directory, filename);

  log('Write html data to file %s', outputPath);
  return fs.promises.writeFile(outputPath, html).then(() => outputPath);
};

export {
  generateResourcesLinks,
  loadResources,
  formatHtml,
  createResourcesDir,
  writePage,
  buildResourcePath,
};

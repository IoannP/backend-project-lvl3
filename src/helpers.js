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

const processName = (name, replacer) => name.match(/(?<=\/|\.)[a-z_\-0-9]+/gi).join(replacer);

const urlToFilename = (link, defaultFormat = '.html') => {
  const { dir, ext, name } = path.parse(link);
  const fileName = processName(dir, '-');
  const fileExtention = ext || defaultFormat;

  return `${fileName}-${name}${fileExtention}`;
};

const urlToDirname = (link, postfix) => {
  const { dir } = path.parse(link);
  const dirName = processName(dir, '-');

  return `${dirName}${postfix}`;
};

const loadContent = (link) => axios({
  method: 'GET',
  url: link,
  responseType: 'arraybuffer',
})
  .then(({ data }) => data);

const createFile = (filepath, content) => fs.promises.writeFile(filepath, content);
const createDir = (dirpath) => fs.promises.mkdir(dirpath);
// const hasExtension = (pathname) => {
//   const { ext } = path.parse(pathname);
//   return ext.length > 0;
// };

// const unionLists = (list1, list2) => [...list1, ...list2].filter((value) => value.length > 0);

// const buildResourcePath = (...paths) => path.join(...paths);

// const createResourceName = (link, type = '') => {
//   const { hostname, pathname } = new URL(link);

//   const hostlist = hostname.split('.');
//   const pathlist = pathname.split('/');

//   const lists = unionLists(hostlist, pathlist);
//   const name = _.join(lists, '-');

//   if (type === 'dir') {
//     return `${name}_files`;
//   }
//   return hasExtension(pathname) ? name : `${name}.html`;
// };

// const isSameOrigin = (url1, url2) => url1.origin === url2.origin;

const getTags = (html) => Object.keys(tagsMap).flatMap((tag) => html(tag).get());

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
    task: (ctx, task) => loadContent(href)
      .then((content) => {
        log('Create file %s', href);
        createFile(filepath, content);
      })
      .catch((error) => task.skip(error.message)),
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
  urlToDirname,
  urlToFilename,
};

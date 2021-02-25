import fs from 'fs';
import axios from 'axios';
import Listr from 'listr';
import path from 'path';

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
  const { dir, name } = path.parse(link);
  const dirName = processName(dir, '-');

  return `${dirName}-${name}_${postfix}`;
};

const loadContent = (link) => axios({
  method: 'GET',
  url: link,
  responseType: 'arraybuffer',
}).then(({ data }) => data);

const createFile = (filepath, content) => fs.promises.writeFile(filepath, content);

const createDir = (dirpath) => fs.promises.mkdir(dirpath);

const isSameOrigin = (url1, url2) => url1.origin === url2.origin;

const getTags = (html) => Object.keys(tagsMap).flatMap((tag) => html(tag).get());

const getLinks = (tags) => tags
  .map((tag) => {
    const { name } = tag;
    const attribute = tagsMap[name];
    return tag.attribs[attribute];
  })
  .filter((link) => !!link);

const generateResourcesLinks = (pageLink, resDirpath, resDirname, html) => {
  const pageURL = new URL(pageLink);

  const tags = getTags(html);
  const links = getLinks(tags);

  return links
    .map((link) => {
      const url = new URL(link, pageLink);
      return { url, link };
    })
    .filter(({ url }) => isSameOrigin(pageURL, url))
    .map(({ link, url }) => {
      const filename = urlToFilename(url.href);
      const newLink = path.join(resDirname, filename);
      const filepath = path.join(resDirpath, filename);

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

export {
  urlToDirname,
  urlToFilename,
  createFile,
  createDir,
  generateResourcesLinks,
  formatHtml,
  loadResources,
};

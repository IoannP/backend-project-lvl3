import path from 'path';

const getLastElement = (array) => {
  const { length } = array;
  return array[length - 1];
};

const hasExtension = (value) => {
  const [, filenameExtension] = getLastElement(value).split('.');
  return !!filenameExtension;
};

const joinLists = (hostname, pathname) => [...hostname, ...pathname].filter((value) => value.length > 0).join('-');

const buildResourcePath = (...paths) => paths.reduce((acc, value) => path.join(acc, value), '');

const createResourceName = (link, type = '') => {
  const url = new URL(link);

  const hostname = url.hostname.split('.');
  const pathname = url.pathname.split('/');

  const name = joinLists(hostname, pathname);
  if (type === 'dir') {
    return `${name}_file`;
  }
  return hasExtension(pathname) ? name : `${name}.html`;
};

export { buildResourcePath, createResourceName };

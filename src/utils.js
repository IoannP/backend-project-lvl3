import path from 'path';

const getLast = (array) => {
  const { length } = array;
  return array[length - 1];
};

const isHasExtension = (value) => {
  const [, filenameExtension] = getLast(value).split('.');
  return !!filenameExtension;
};

const joinLists = (hostname, pathname) => [...hostname, ...pathname].filter((value) => value.length > 0).join('-');

const getPath = (...paths) => paths.reduce((acc, value) => path.join(acc, value), '');

const getName = (link, type = '') => {
  const url = new URL(link);

  const hostname = url.hostname.split('.');
  const pathname = url.pathname.split('/');

  const name = joinLists(hostname, pathname);
  if (type === 'dir') {
    return `${name}_file`;
  }
  return isHasExtension(pathname) ? name : `${name}.html`;
};

export { getName, getPath };

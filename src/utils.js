import path from 'path';
import _ from 'lodash';

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

export { buildResourcePath, createResourceName };

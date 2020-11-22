import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import cheerio from 'cheerio';
import loader from '../src/index';

nock.disableNetConnect();

const getPath = (filename, dirpath = '') => path.join('__test__', '__fixtures__', dirpath, filename);

let testDirectory;

beforeEach(async () => {
  await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-')).then((data) => {
    testDirectory = data;
  });
});

afterEach(async () => {
  await fs.rmdir(testDirectory, { recursive: true });
});

test.each([
  'https://www.docker.com/',
  'https://getbootstrap.com/',
  'https://nodejs.org/en/',
])('Load page', async (link) => {
  const url = new URL(link);
  nock(url.origin)
    .defaultReplyHeaders({
      'content-type': 'text/html',
    }).get(url.pathname).reply(200, 'TEST');

  await loader(url.href, testDirectory);
  expect(nock.isDone()).toBeTruthy();
});

test.each([
  ['https://www.docker.com/', 'docker-com.html'],
  ['https://getbootstrap.com/', 'getbootstrap-com.html'],
  ['https://nodejs.org/en/', 'nodejs-org-en.html'],
])('Load resourses', async (link, fileName) => {
  const url = new URL(link);
  const { origin } = url;

  const recievedPath = getPath(fileName);
  let recievedData;
  await fs.readFile(recievedPath, 'utf8').then((data) => {
    recievedData = data;
  });

  const $ = cheerio.load(recievedData);
  const mapping = {
    img: 'src',
    link: 'href',
    script: 'src',
  };
  const links = [];
  Object.keys(mapping).forEach(async (tag) => {
    $(tag).each(async (i, el) => {
      const attribute = mapping[tag];
      const attributeLink = $(el).attr(attribute);
      let attributeUrl;

      if (attributeLink) {
        attributeUrl = new URL(attributeLink, origin);
      }
      if (attributeUrl && attributeUrl.origin === origin) {
        links.push(attributeUrl.pathname);
      }
    });
  });

  links.forEach((pathname) => {
    nock(url.origin).defaultReplyHeaders({
      'content-type': 'text/html',
    }).get(pathname).reply(200, 'TEST');
  });
  await loader(link, testDirectory)
    .catch((error) => {
      throw error;
    });
  expect(nock.isDone()).toBe(true);
});

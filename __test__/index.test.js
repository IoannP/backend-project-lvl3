import nock from 'nock';
import path from 'path';
import fs from 'fs';
import os from 'os';
import loader from '../src/index';
import getName from '../src/utils';

nock.disableNetConnect();

let testDirectory;
beforeEach(async () => {
  await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-')).then((data) => {
    testDirectory = data;
  });
});

const getFixturesPath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);
const getLoadedPath = (filename, dirname = '') => path.join(testDirectory, dirname, filename);

const mapping = {
  url: new URL('https://nodejs.org/en/'),
  html: {
    before: getFixturesPath('before.html'),
    after: getFixturesPath('after.html'),
    contentType: { 'Content-Type': 'text/html' },
  },
  img: {
    link: '/static/images/logo.svg',
    expected: getFixturesPath('logo.svg'),
    contentType: { 'Content-Type': 'image/svg+xml' },
  },
  link: {
    link: '/static/css/styles.css',
    expected: getFixturesPath('styles.css'),
    contentType: { 'Content-Type': 'text/css' },
  },
  script: {
    link: '/static/js/main.js',
    expected: getFixturesPath('main.js'),
    contentType: { 'Content-Type': 'text/javascript ' },
  },
};

afterEach(() => {
  fs.rmdirSync(testDirectory, { recursive: true });
});

test('Load page', async () => {
  const imgURL = new URL(mapping.img.link, mapping.url.origin);
  const linkURL = new URL(mapping.link.link, mapping.url.origin);
  const scriptURL = new URL(mapping.script.link, mapping.url.origin);

  const htmlFileName = getName(mapping.url);
  const imgFileName = getName(imgURL);
  const linkFileName = getName(linkURL);
  const scriptFileName = getName(scriptURL);

  const resDir = getName(mapping.url, 'dir');

  const htmlPath = getLoadedPath(htmlFileName);
  const imgPath = getLoadedPath(imgFileName, resDir);
  const linkPath = getLoadedPath(linkFileName, resDir);
  const scriptPath = getLoadedPath(scriptFileName, resDir);

  let expectedHtml;
  let expectedImg;
  let expectedLink;
  let expectedScript;

  await fs.promises.readFile(mapping.html.after, 'utf-8').then((data) => {
    expectedHtml = data;
  });
  await fs.promises.readFile(mapping.img.expected, 'utf-8').then((data) => {
    expectedImg = data;
  });
  await fs.promises.readFile(mapping.link.expected, 'utf-8').then((data) => {
    expectedLink = data;
  });
  await fs.promises.readFile(mapping.script.expected, 'utf-8').then((data) => {
    expectedScript = data;
  });

  nock(mapping.url.origin)
    .get(mapping.url.pathname)
    .replyWithFile(200, mapping.html.before, mapping.html.contentType)
    .get(mapping.img.link)
    .replyWithFile(200, mapping.img.expected, mapping.img.contentType)
    .get(mapping.link.link)
    .replyWithFile(200, mapping.link.expected, mapping.link.contentType)
    .get(mapping.script.link)
    .replyWithFile(200, mapping.script.expected, mapping.script.contentType);

  await loader(mapping.url.href, testDirectory).catch((error) => {
    throw error;
  });

  let loadedHtml;
  let loadedImg;
  let loadedLink;
  let loadedScript;

  await fs.promises.readFile(htmlPath, 'utf-8').then((data) => {
    loadedHtml = data;
  });
  await fs.promises.readFile(imgPath, 'utf-8').then((data) => {
    loadedImg = data;
  });
  await fs.promises.readFile(linkPath, 'utf-8').then((data) => {
    loadedLink = data;
  });
  await fs.promises.readFile(scriptPath, 'utf-8').then((data) => {
    loadedScript = data;
  });

  expect(expectedHtml).toBe(loadedHtml);
  expect(expectedImg).toBe(loadedImg);
  expect(expectedLink).toBe(loadedLink);
  expect(expectedScript).toBe(loadedScript);
});

describe('errors', () => {
  test('status code 400', async () => {
    nock(mapping.url.origin)
      .get(mapping.url.pathname)
      .reply(400);
    await expect(loader(mapping.url.href, testDirectory)).rejects.toThrow('Request failed with status code 400');
  });

  test('No such file or directory', async () => {
    nock(mapping.url.origin)
      .get(mapping.url.pathname)
      .reply(200, mapping.html.before, mapping.html.contentType);
    await expect(loader(mapping.url.href, '/test')).rejects.toThrow('no such file or directory');
  });
});

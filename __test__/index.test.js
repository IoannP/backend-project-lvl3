import nock from 'nock';
import fs from 'fs';
import os from 'os';
import loader from '../src/index';
import { getName, getPath } from '../src/utils';

nock.disableNetConnect();

let testDirectory;
beforeEach(async () => {
  const dirPath = getPath(os.tmpdir(), 'page-loader-');
  await fs.promises.mkdtemp(dirPath).then((data) => {
    testDirectory = data;
  });
});

const getFixturesPath = (filename) => getPath(__dirname, '..', '__fixtures__', filename);
const getLoadedPath = (filename, dirname = '') => getPath(testDirectory, dirname, filename);

const tagsMap = {
  html: {
    url: new URL('https://nodejs.org/en/'),
    before: getFixturesPath('before.html'),
    after: getFixturesPath('after.html'),
    contentType: { 'Content-Type': 'text/html' },
  },
  img: {
    url: new URL('https://nodejs.org/static/images/logo.svg'),
    expected: getFixturesPath('logo.svg'),
    contentType: { 'Content-Type': 'image/svg+xml' },
  },
  link: {
    url: new URL('https://nodejs.org/static/css/styles.css'),
    expected: getFixturesPath('styles.css'),
    contentType: { 'Content-Type': 'text/css' },
  },
  script: {
    url: new URL('https://nodejs.org/static/js/main.js'),
    expected: getFixturesPath('main.js'),
    contentType: { 'Content-Type': 'text/javascript ' },
  },
};

afterEach(() => {
  fs.rmdirSync(testDirectory, { recursive: true });
});

test('Load page', async () => {
  const htmlFileName = getName(tagsMap.html.url.href);
  const imgFileName = getName(tagsMap.img.url.href);
  const linkFileName = getName(tagsMap.link.url.href);
  const scriptFileName = getName(tagsMap.script.url.href);

  const resDir = getName(tagsMap.html.url.href, 'dir');

  const htmlPath = getLoadedPath(htmlFileName);
  const imgPath = getLoadedPath(imgFileName, resDir);
  const linkPath = getLoadedPath(linkFileName, resDir);
  const scriptPath = getLoadedPath(scriptFileName, resDir);

  let expectedHtml;
  let expectedImg;
  let expectedLink;
  let expectedScript;

  await fs.promises.readFile(tagsMap.html.after, 'utf-8').then((data) => {
    expectedHtml = data;
  });
  await fs.promises.readFile(tagsMap.img.expected, 'utf-8').then((data) => {
    expectedImg = data;
  });
  await fs.promises.readFile(tagsMap.link.expected, 'utf-8').then((data) => {
    expectedLink = data;
  });
  await fs.promises.readFile(tagsMap.script.expected, 'utf-8').then((data) => {
    expectedScript = data;
  });

  nock(tagsMap.html.url.origin)
    .get(tagsMap.html.url.pathname)
    .replyWithFile(200, tagsMap.html.before, tagsMap.html.contentType)
    .get(tagsMap.img.url.pathname)
    .replyWithFile(200, tagsMap.img.expected, tagsMap.img.contentType)
    .get(tagsMap.link.url.pathname)
    .replyWithFile(200, tagsMap.link.expected, tagsMap.link.contentType)
    .get(tagsMap.script.url.pathname)
    .replyWithFile(200, tagsMap.script.expected, tagsMap.script.contentType);

  await loader(tagsMap.html.url.href, testDirectory).catch((error) => {
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
    nock(tagsMap.html.url.origin)
      .get(tagsMap.html.url.pathname)
      .reply(400);
    await expect(loader(tagsMap.html.url.href, testDirectory)).rejects.toThrow('Request failed with status code 400');
  });

  test('No such file or directory', async () => {
    nock(tagsMap.html.url.origin)
      .get(tagsMap.html.url.pathname)
      .reply(200, tagsMap.html.before, tagsMap.html.contentType);
    await expect(loader(tagsMap.html.url.href, '/test')).rejects.toThrow('no such file or directory');
  });
});

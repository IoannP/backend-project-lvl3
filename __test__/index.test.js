import nock from 'nock';
import fs from 'fs';
import path from 'path';
import os from 'os';
import loader from '../src/index';
import { buildResourcePath, createResourceName } from '../src/utils';

nock.disableNetConnect();

let testDirectory;
beforeEach(async () => {
  const dirPath = buildResourcePath(os.tmpdir(), 'page-loader-');
  await fs.promises.mkdtemp(dirPath).then((data) => {
    testDirectory = data;
  });
});

const getFixturesPath = (filename) => buildResourcePath(path.resolve(), '__fixtures__', filename);
const getLoadedPath = (filename, dirname = '') => buildResourcePath(testDirectory, dirname, filename);

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
  const htmlFileName = createResourceName(tagsMap.html.url.href);
  const imgFileName = createResourceName(tagsMap.img.url.href);
  const linkFileName = createResourceName(tagsMap.link.url.href);
  const scriptFileName = createResourceName(tagsMap.script.url.href);

  const resDir = createResourceName(tagsMap.html.url.href, 'dir');

  const htmlPath = getLoadedPath(htmlFileName);
  const imgPath = getLoadedPath(imgFileName, resDir);
  const linkPath = getLoadedPath(linkFileName, resDir);
  const scriptPath = getLoadedPath(scriptFileName, resDir);

  const expectedHtml = await fs.promises.readFile(tagsMap.html.after, 'utf-8');
  const expectedImg = await fs.promises.readFile(tagsMap.img.expected, 'utf-8');
  const expectedLink = await fs.promises.readFile(tagsMap.link.expected, 'utf-8');
  const expectedScript = await fs.promises.readFile(tagsMap.script.expected, 'utf-8');

  nock(tagsMap.html.url.origin)
    .get(tagsMap.html.url.pathname)
    .replyWithFile(200, tagsMap.html.before, tagsMap.html.contentType)
    .get(tagsMap.img.url.pathname)
    .replyWithFile(200, tagsMap.img.expected, tagsMap.img.contentType)
    .get(tagsMap.link.url.pathname)
    .replyWithFile(200, tagsMap.link.expected, tagsMap.link.contentType)
    .get(tagsMap.script.url.pathname)
    .replyWithFile(200, tagsMap.script.expected, tagsMap.script.contentType);

  await loader(tagsMap.html.url.href, testDirectory);

  const loadedHtml = await fs.promises.readFile(htmlPath, 'utf-8');
  const loadedImg = await fs.promises.readFile(imgPath, 'utf-8');
  const loadedLink = await fs.promises.readFile(linkPath, 'utf-8');
  const loadedScript = await fs.promises.readFile(scriptPath, 'utf-8');

  expect(loadedHtml).toBe(expectedHtml);
  expect(loadedImg).toBe(expectedImg);
  expect(loadedLink).toBe(expectedLink);
  expect(loadedScript).toBe(expectedScript);
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

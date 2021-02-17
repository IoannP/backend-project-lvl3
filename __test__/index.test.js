import nock from 'nock';
import fs from 'fs';
import os from 'os';
import { jest } from '@jest/globals';
import loader from '../index.js';
import { buildResourcePath } from '../src/helpers.js';

nock.disableNetConnect();
jest.setTimeout(10000);

let testDirectory;
beforeEach(async () => {
  const dirPath = buildResourcePath(os.tmpdir(), 'page-loader-');
  await fs.promises.mkdtemp(dirPath).then((data) => {
    testDirectory = data;
  });
});

const getFixturesPath = (filename) => buildResourcePath(process.cwd(), '__fixtures__', filename);
const getLoadedPath = (...paths) => buildResourcePath(testDirectory, ...paths);

const loadMap = {
  url: new URL('https://nodejs.org/en/'),
  resDir: 'nodejs-org-en_files',
  html: {
    filname: 'nodejs-org-en.html',
    after: getFixturesPath('after.html'),
    before: getFixturesPath('before.html'),
  },
  img: {
    link: '/static/images/logo.svg',
    filname: 'nodejs-org-static-images-logo.svg',
    expected: getFixturesPath('logo.svg'),
  },
  link: {
    link: '/static/css/styles.css',
    filname: 'nodejs-org-static-css-styles.css',
    expected: getFixturesPath('styles.css'),
  },
  script: {
    link: '/static/js/main.js',
    filname: 'nodejs-org-static-js-main.js',
    expected: getFixturesPath('main.js'),
  },
};

afterEach(async () => {
  await fs.promises.rmdir(testDirectory, { recursive: true });
});

test('Load page', async () => {
  const htmlPath = getLoadedPath(loadMap.html.filname);
  const imgPath = getLoadedPath(loadMap.resDir, loadMap.img.filname);
  const linkPath = getLoadedPath(loadMap.resDir, loadMap.link.filname);
  const scriptPath = getLoadedPath(loadMap.resDir, loadMap.script.filname);

  const expectedHtml = await fs.promises.readFile(loadMap.html.after, 'utf-8');
  const expectedImg = await fs.promises.readFile(loadMap.img.expected, 'utf-8');
  const expectedLink = await fs.promises.readFile(loadMap.link.expected, 'utf-8');
  const expectedScript = await fs.promises.readFile(loadMap.script.expected, 'utf-8');

  nock(loadMap.url.origin)
    .get(loadMap.url.pathname)
    .replyWithFile(200, loadMap.html.before)
    .get(loadMap.img.link)
    .replyWithFile(200, loadMap.img.expected)
    .get(loadMap.link.link)
    .replyWithFile(200, loadMap.link.expected)
    .get(loadMap.script.link)
    .replyWithFile(200, loadMap.script.expected);

  await loader(loadMap.url.href, testDirectory);

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
    nock(loadMap.url.origin)
      .get(loadMap.url.pathname)
      .reply(400);

    await expect(loader(loadMap.url.href, testDirectory)).rejects.toThrow('Request failed with status code 400');
  });

  test('No such file or directory', async () => {
    nock(loadMap.url.origin)
      .get(loadMap.url.pathname)
      .reply(200);

    await expect(loader(loadMap.url.href, '/test')).rejects.toThrow(/ENOENT/);
  });
});

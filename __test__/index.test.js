import process from 'process';
import debug from 'debug';
import nock from 'nock';
import path from 'path';
import fs from 'fs';
import os from 'os';
import loader from '../src/index';

nock.disableNetConnect();

let testDirectory;
beforeEach(async () => {
  await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-')).then((data) => {
    testDirectory = data;
  });
});

const getFixturesPath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);
const getLoadedPath = (filename, dirname = '') => path.join(testDirectory, dirname, filename);

const getName = (link, type = '') => {
  const url = new URL(link);
  const hostname = url.hostname.split('.');
  const pathname = url.pathname.split('/');
  const [, identifier] = pathname[pathname.length - 1].split('.');
  const name = [...hostname, ...pathname].filter((value) => value).join('-');
  if (type) {
    return `${name}${type}`;
  }
  return !identifier ? `${name}.html` : name;
};

// const readFile = (filename) => fs.createReadStream(filepath);

const mapping = {
  url: new URL('https://nodejs.org/en/'),
  html: {
    before: getFixturesPath('before.html'),
    after: getFixturesPath('after.html'),
    contentType: { 'Content-Type': 'text/html' },
  },
  // img: {
  //   link: '/static/images/logo.svg',
  //   before: getFixturesPath('logo.svg'),
  //   contentType: { 'Content-Type': 'image/svg+xml' },
  // },
  // link: {
  //   link: '/static/css/styles.css',
  //   before: getFixturesPath('styles.css'),
  //   contentType: { 'Content-Type': 'text/css' },
  // },
  // script: {
  //   link: '/static/js/main.js',
  //   before: getFixturesPath('main.js'),
  //   contentType: { 'Content-Type': 'text/javascript ' },
  // },
};

// afterEach(() => {
//   fs.rmdirSync(testDirectory, { recursive: true });
// });

it('Load page', async () => {
  const htmlFileName = getName(mapping.url.href);
  // const imgFileName = getName(path.join(mapping.url.origin, mapping.img.link));
  // const linkFileName = getName(path.join(mapping.url.origin, mapping.link.link));
  // const scriptFileName = getName(path.join(mapping.url.origin, mapping.script.link));

  // const loadedDir = getName(mapping.url.href, '_file');

  // const imgPath = path.join(testDirectory, loadedDir, imgFileName);
  // const linkPath = path.join(testDirectory, loadedDir, linkFileName);
  // const scriptPath = path.join(testDirectory, loadedDir, scriptFileName);

  // let expectedImg;
  // let expectedLink;
  // let expectedScript;

  nock(mapping.url.origin)
    .get(mapping.url.pathname)
    .replyWithFile(200, mapping.html.before, mapping.html.contentType)
    .get(mapping.img.link)
    .replyWithFile(200, mapping.img.before, mapping.img.contentType)
    .get(mapping.link.link)
    .replyWithFile(200, mapping.link.before, mapping.link.contentType)
    .get(mapping.script.link)
    .replyWithFile(200, mapping.script.before, mapping.script.contentType);

  return loader(mapping.url.href, testDirectory).then(async () => {
    const afterPath = getFixturesPath('after.html');
    const loadedPath = getLoadedPath(htmlFileName);

    let afterData;
    let loadedData;

    await fs.promises.readFile(afterPath, 'utf-8').then((data) => {
      afterData = data;
    });
    await fs.promises.readFile(loadedPath, 'utf-8').then((data) => {
      loadedData = data;
    });

    expect(afterData).toBe(loadedData);
  }).catch((error) => {
    throw error;
  });

  // await fs.promises.readFile(imgPath, 'utf-8').then((data) => {
  //   expectedImg = data;
  // });
  // await fs.promises.readFile(linkPath, 'utf-8').then((data) => {
  //   expectedLink = data;
  // });
  // await fs.promises.readFile(scriptPath, 'utf-8').then((data) => {
  //   expectedScript = data;
  // });

  // expect(expectedData).toBe(after);
  // expect(expectedData).toBe(after);
  // expect(expectedData).toBe(after);
});

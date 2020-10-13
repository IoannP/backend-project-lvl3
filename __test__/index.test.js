import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import loader from '../src/index';

nock.disableNetConnect();

let temproraryDirPath;
beforeEach(async () => {
  await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'))
    .then((data) => {
      temproraryDirPath = data;
    });
});

afterEach(async () => {
  await fs.rmdir(temproraryDirPath, { recursive: true });
});

test.each([
  'https://ru.hexlet.io/courses',
  'https://github.com/nock/nock#persist',
  'https://developer.mozilla.org/en-US/docs/Web/API/URL',
])('Load page', async (loadpath) => {
  const url = new URL(loadpath);
  const scope = nock(url.origin)
    .get(url.pathname)
    .reply(200);

  await loader(url.href, temproraryDirPath);
  expect(scope.isDone()).toBeTruthy();
});

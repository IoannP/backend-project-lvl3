import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';
import axios from 'axios';

const getFileName = (pagepath) => {
  const url = new URL(pagepath);
  const { hostname } = url;
  const { pathname } = url;
  const filename = [...hostname.split('.'), ...pathname.split('/')]
    .filter((value) => value)
    .join('-');
  return `${filename}.html`;
};

export default (pagepath, output = process.cwd()) => {
  const filename = getFileName(pagepath);
  const outputPath = path.join(output, filename);
  return axios(pagepath)
    .then((data) => {
      fs.writeFile(outputPath, data.data);
    })
    .catch((error) => console.log(error));
};

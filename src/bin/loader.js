import process from 'process';
import loader from '../index';

const [,, flag, outputDir, pagePath] = process.argv;
if (flag === '--output') {
  loader(pagePath, outputDir);
} else {
  loader(flag);
}

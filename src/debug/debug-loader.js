import axiosDebug from 'axios-debug-log';
import debug from 'debug';

export default {
  pageLog: debug('page-loader:log'),
  axiosLog: (instance) => {
    const axiosLog = debug('page-loader:axios');
    axiosDebug({
      request: (log, config) => {
        log(`Request with ${config.url}`);
      },
      response: (log, response) => {
        log(
          `Response with content-type ${response.headers['content-type']}`,
          `from ${response.config.url}`,
        );
      },
      error: (log, error) => {
        log('Error: ', error);
      },
    });
    axiosDebug.addLogger(instance, axiosLog);
  },
};

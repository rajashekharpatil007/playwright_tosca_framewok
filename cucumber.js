require('dotenv').config();
require('ts-node/register');

const { config } = require('./src/config');

module.exports = {
  default: {
    paths: ['src/test/features/**/*.feature'],
    requireModule: ['ts-node/register'],
    require: ['src/test/support/**/*.ts', 'src/test/steps/**/*.ts'],
    format: ['progress', 'html:reports/cucumber.html', 'allure-cucumberjs/reporter'],
    formatOptions: {
      resultsDir: 'allure-results'
    },
    parallel: config.parallel,
    retry: config.retries,
    strict: true,
    worldParameters: {
      baseUrl: config.baseUrl
    }
  }
};

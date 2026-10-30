import {
  After,
  Before,
  setDefaultTimeout,
  Status
} from '@cucumber/cucumber';
import { chromium, firefox, webkit } from 'playwright';
import { config } from '../../config';
import { PlaywrightWorld } from './world';

const browserTypes = { chromium, firefox, webkit };

setDefaultTimeout(config.stepTimeoutMs);

Before(async function (this: PlaywrightWorld) {
  this.browser = await browserTypes[config.browser].launch({
    headless: config.headless
  });
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(config.stepTimeoutMs);
  await this.parameter('endpoint', config.baseUrl);
  await this.attach(`Endpoint: ${config.baseUrl}`, 'text/plain');
});

After(async function (this: PlaywrightWorld, scenario) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, 'image/png');
  }

  if (this.context) {
    await this.context.close();
  }
  if (this.browser) {
    await this.browser.close();
  }
});

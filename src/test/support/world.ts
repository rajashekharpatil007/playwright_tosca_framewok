import {
  setWorldConstructor,
  type IWorldOptions
} from '@cucumber/cucumber';
import { AllureCucumberWorld } from 'allure-cucumberjs';
import type { Browser, BrowserContext, Page } from 'playwright';

export class PlaywrightWorld extends AllureCucumberWorld {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(PlaywrightWorld);

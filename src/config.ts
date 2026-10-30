import 'dotenv/config';

function readPositiveInteger(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function readNonNegativeInteger(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return parsed;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  if (/^(true|1|yes)$/i.test(value.trim())) {
    return true;
  }
  if (/^(false|0|no)$/i.test(value.trim())) {
    return false;
  }
  throw new Error(`${name} must be true or false.`);
}

const baseUrl = process.env.BASE_URL ?? 'https://sampleapp.tricentis.com/101/';
let parsedBaseUrl: URL;
try {
  parsedBaseUrl = new URL(baseUrl);
} catch {
  throw new Error('BASE_URL must be a valid absolute URL.');
}

if (parsedBaseUrl.protocol !== 'http:' && parsedBaseUrl.protocol !== 'https:') {
  throw new Error('BASE_URL must use HTTP or HTTPS.');
}

const browser = (process.env.BROWSER ?? 'chromium').toLowerCase();
if (!['chromium', 'firefox', 'webkit'].includes(browser)) {
  throw new Error('BROWSER must be chromium, firefox, or webkit.');
}

export const config = Object.freeze({
  baseUrl: parsedBaseUrl.toString(),
  browser: browser as 'chromium' | 'firefox' | 'webkit',
  headless: readBoolean('HEADLESS', false),
  stepTimeoutMs: readPositiveInteger('STEP_TIMEOUT_MS', 30_000),
  parallel: readPositiveInteger('PARALLEL_WORKERS', 1),
  retries: readNonNegativeInteger('CUCUMBER_RETRIES', 0)
});

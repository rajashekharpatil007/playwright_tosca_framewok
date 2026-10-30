# Tosca Cucumber + Playwright project

This project converts the Tosca Vehicle Insurance Application export into TypeScript
Cucumber scenarios and Playwright browser automation. The converted source data is
kept in `src/test/data/tosca-cases.json`; each executable feature retains its source
Tosca case name and its five page/module stages.

## Requirements

- Node.js 20 or later and npm
- Java 11 or later only when generating the standalone Allure HTML report
- Playwright browser binaries
- Access to the configured sample application endpoint

## Setup

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

`BASE_URL`, `BROWSER`, `HEADLESS`, timeouts, retries, and worker parallelism are
configured in `.env`. The default endpoint is the Tricentis sample vehicle insurance
application. Set `HEADLESS=false` to run with a visible browser; the checked-in
`.env.example` uses headed mode.

## Run and reports

```powershell
npm test
npm run test:headed
npm run validate:conversion
```

Every run creates `reports/cucumber.html` and raw Allure results in
`allure-results/`. The HTML report includes scenario/step status and durations.
Failed scenarios include a browser screenshot and the configured endpoint in the
report attachments.

To generate and open the standalone Allure report:

```powershell
npm run report:allure
npm run open:allure
```

The Allure CLI requires Java on `PATH`.

## Re-convert a Tosca export

The source `.tsu` is a gzip-compressed Tosca JSON export. Re-run the included
converter when the source changes:

```powershell
npm run convert:tosca -- "D:\PnV\tsu\Template one.tsu"
npm run validate:conversion
```

The converter keeps executable, instantiated test cases and stores the three
unresolved Tosca template definitions as metadata. Excel references left unresolved
in template definitions are intentionally not emitted as runnable scenarios.

import assert from 'node:assert/strict';
import {
  Given,
  Then,
  When
} from '@cucumber/cucumber';
import { config } from '../../config';
import { PlaywrightWorld } from '../support/world';
import caseData from '../data/tosca-cases.json';

interface ToscaField {
  name: string;
  value: string | null;
  actionMode: string;
}

interface ToscaStep {
  name: string;
  fields: ToscaField[];
}

interface ToscaCase {
  id: string;
  name: string;
  vehicle: string;
  steps: ToscaStep[];
}

const cases = caseData.cases as ToscaCase[];

function getCase(id: string): ToscaCase {
  const testCase = cases.find((item) => item.id === id);
  if (!testCase) {
    throw new Error(`No converted Tosca test case exists for "${id}".`);
  }
  return testCase;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fieldId(name: string): string {
  const normalized = normalizeName(name);
  const knownIds: Record<string, string> = {
    engineperformancekw: 'engineperformance',
    fueltype: 'fuel',
    listprice: 'listprice',
    annualmileagemi: 'annualmileage',
    insurancesum: 'insurancesum',
    meritrating: 'meritrating',
    damageinsurance: 'damageinsurance',
    europrotection: 'europrotection',
    legaldefenseinsurance: 'legaldefenseinsurance',
    courtesycar: 'courtesycar',
    startdate: 'startdate',
    dateofbirth: 'birthdate',
    sex: 'gender',
    streetaddress: 'streetaddress',
    zipcode: 'zipcode',
    firstname: 'firstname',
    lastname: 'lastname',
    righthanddrive: 'righthanddrive'
  };
  return knownIds[normalized] ?? normalized;
}

function resolveDate(value: string): string {
  let match = value.match(/^\{date\[\]\[([+-]?\d+)y\]\[MM'\/'dd'\/'yyyy\]\}$/i);
  const date = new Date();

  if (match) {
    date.setFullYear(date.getFullYear() + Number(match[1]));
    return formatDate(date);
  }

  match = value.match(/^\{date\[\]\[([+-]?\d+)M([+-]?\d+)d\]\[MM'\/'dd'\/'yyyy\]\}$/i);
  if (match) {
    date.setMonth(date.getMonth() + Number(match[1]));
    date.setDate(date.getDate() + Number(match[2]));
    return formatDate(date);
  }
  return value;
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}/${date.getFullYear()}`;
}

async function findControl(
  world: PlaywrightWorld,
  fieldName: string
) {
  const id = fieldId(fieldName);
  const byId = world.page.locator(`#${id}:visible`);
  if (await byId.count() > 0) {
    return byId.first();
  }

  const byLabel = world.page.getByLabel(fieldName, { exact: true });
  for (let index = 0; index < await byLabel.count(); index += 1) {
    const candidate = byLabel.nth(index);
    if (await candidate.isVisible()) {
      return candidate;
    }
  }

  throw new Error(`Could not locate the "${fieldName}" control on ${world.page.url()}.`);
}

async function clickChoiceLabel(
  world: PlaywrightWorld,
  control: Awaited<ReturnType<typeof findControl>>,
  choiceName: string
): Promise<void> {
  const id = await control.getAttribute('id');
  if (id) {
    const label = world.page.locator(`label[for="${id}"]:visible`);
    if (await label.count() > 0) {
      await label.first().click();
      return;
    }
  }

  const visibleName = choiceName.replace(/([a-z])([A-Z])/g, '$1 $2');
  const text = world.page.getByText(visibleName, { exact: true }).filter({ visible: true });
  if (await text.count() === 0) {
    throw new Error(`Could not find a visible label for option "${visibleName}".`);
  }
  await text.first().click();
}

async function fillField(
  world: PlaywrightWorld,
  field: ToscaField
): Promise<void> {
  if (field.value === null || field.value === '{NULL}') {
    return;
  }
  const normalizedName = normalizeName(field.name);
  if (normalizedName === 'sex' || normalizedName === 'righthanddrive') {
    const groupName = normalizedName === 'sex' ? 'Gender' : 'Right Hand Drive';
    const radio = world.page.locator(
      `input[type="radio"][name="${groupName}"][value="${field.value}"]:visible`
    );
    if (await radio.count() === 0) {
      throw new Error(`Could not find radio option "${field.value}" for "${field.name}".`);
    }
    const option = radio.first();
    if (!(await option.isChecked())) {
      await clickChoiceLabel(world, option, field.value);
    }
    return;
  }

  const control = await findControl(world, field.name);
  const tagName = await control.evaluate((element) => element.tagName.toLowerCase());
  const inputType = tagName === 'input'
    ? await control.getAttribute('type')
    : null;

  if (inputType === 'checkbox') {
    if (!/^(true|false)$/i.test(field.value)) {
      throw new Error(`Expected a boolean for checkbox "${field.name}", received "${field.value}".`);
    }
    const shouldCheck = /^true$/i.test(field.value);
    if ((await control.isChecked()) !== shouldCheck) {
      await clickChoiceLabel(world, control, field.name);
    }
    return;
  }

  if (inputType === 'radio') {
    const option = world.page.getByLabel(field.value, { exact: true });
    if (await option.count() > 0) {
      if (!(await option.first().isChecked())) {
        await clickChoiceLabel(world, option.first(), field.value);
      }
    } else {
      const byValue = world.page.locator(
        `input[type="radio"][name="${await control.getAttribute('name')}"][value="${field.value}"]`
      );
      if (await byValue.count() === 0) {
        throw new Error(`Could not find radio option "${field.value}" for "${field.name}".`);
      }
      if (!(await byValue.first().isChecked())) {
        await clickChoiceLabel(world, byValue.first(), field.value);
      }
    }
    return;
  }

  if (tagName === 'select') {
    try {
      await control.selectOption({ label: field.value });
    } catch (labelError) {
      try {
        await control.selectOption({ value: field.value });
      } catch (valueError) {
        throw new Error(
          `Could not select "${field.value}" for "${field.name}". ` +
          `Label error: ${String(labelError)}; value error: ${String(valueError)}`
        );
      }
    }
    return;
  }

  const value = resolveDate(field.value);
  if (inputType === 'checkbox' || inputType === 'radio') {
    throw new Error(`Unsupported control type "${inputType}" for "${field.name}".`);
  }
  await control.fill(value);
}

function getSourceStep(testCase: ToscaCase, name: string): ToscaStep {
  const step = testCase.steps.find((item) => item.name === name);
  if (!step) {
    throw new Error(`Tosca case "${testCase.name}" is missing source step "${name}".`);
  }
  return step;
}

async function clickButton(world: PlaywrightWorld, id: string, name: RegExp) {
  const byId = world.page.locator(`#${id}:visible`);
  if (await byId.count() > 0) {
    await byId.first().click();
    return;
  }

  const byRole = world.page.getByRole('button', { name });
  const visibleButton = byRole.filter({ visible: true });
  if (await visibleButton.count() > 0) {
    await visibleButton.first().click();
    return;
  }

  const visibleLink = world.page.getByRole('link', { name }).filter({ visible: true });
  if (await visibleLink.count() === 0) {
    throw new Error(`Could not locate button or link ${name} on ${world.page.url()}.`);
  }
  await visibleLink.first().click();
}

async function completeFormStep(
  world: PlaywrightWorld,
  testCase: ToscaCase,
  sourceStepName: string,
  nextButtonId: string,
  nextFieldSelector: string
): Promise<void> {
  const sourceStep = getSourceStep(testCase, sourceStepName);
  for (const field of sourceStep.fields) {
    if (normalizeName(field.name).startsWith('next')) {
      continue;
    }
    await fillField(world, field);
  }
  await world.attach(
    `${sourceStep.name}: ${sourceStep.fields.map((field) => `${field.name}=${field.value ?? ''}`).join('; ')}`,
    'text/plain'
  );
  await clickButton(world, nextButtonId, /^next\b/i);
  await world.page.locator(`${nextFieldSelector}:visible`).waitFor({
    state: 'visible'
  });
}

Given('I open the configured insurance application', async function (this: PlaywrightWorld) {
  await this.page.goto(config.baseUrl, { waitUntil: 'domcontentloaded' });
  await this.page.getByText(/Vehicle Insurance Application/i).first().waitFor({
    state: 'visible'
  });
});

When('I select the vehicle type for case {string}', async function (
  this: PlaywrightWorld,
  id: string
) {
  const testCase = getCase(id);
  const sourceStep = getSourceStep(testCase, 'Main Menu');
  const selectedVehicle = sourceStep.fields.find((field) => field.value === 'x');
  if (!selectedVehicle || selectedVehicle.name !== testCase.vehicle) {
    throw new Error(`Source case "${id}" does not have a valid vehicle selection.`);
  }

  const vehicleLink = this.page.getByRole('link', {
    name: testCase.vehicle,
    exact: true
  });
  if (await vehicleLink.count() > 0) {
    await vehicleLink.first().click();
  } else {
    const vehicleButton = this.page.getByRole('button', {
      name: testCase.vehicle,
      exact: true
    });
    if (await vehicleButton.count() === 0) {
      throw new Error(`Could not find vehicle selection "${testCase.vehicle}".`);
    }
    await vehicleButton.first().click();
  }
  await this.page.waitForURL((url) => url.pathname.endsWith('/app.php'));
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.locator('#make:visible').waitFor({ state: 'visible' });
  await this.attach(`Tosca case: ${testCase.name} (${testCase.id})`, 'text/plain');
});

When('I complete the Vehicle Data form for case {string}', async function (
  this: PlaywrightWorld,
  id: string
) {
  await completeFormStep(
    this,
    getCase(id),
    'Vehicle Data',
    'nextenterinsurantdata',
    '#firstname'
  );
});

When('I complete the Insurant Data form for case {string}', async function (
  this: PlaywrightWorld,
  id: string
) {
  await completeFormStep(
    this,
    getCase(id),
    'Insurant Data',
    'nextenterproductdata',
    '#startdate'
  );
});

When('I complete the Product Data form for case {string}', async function (
  this: PlaywrightWorld,
  id: string
) {
  await completeFormStep(
    this,
    getCase(id),
    'Product Data',
    'nextselectpriceoption',
    '#selectsilver'
  );
});

When('I choose the price option for case {string}', async function (
  this: PlaywrightWorld,
  id: string
) {
  const testCase = getCase(id);
  const sourceStep = getSourceStep(testCase, 'Price Option');
  const option = sourceStep.fields.find((field) => field.name === 'Options');
  if (!option?.value) {
    throw new Error(`Tosca case "${id}" does not specify a price option.`);
  }

  const priceRadio = this.page.locator(
    `input[type="radio"][name="Select Option"][value="${option.value}"]:visible`
  );
  if (await priceRadio.count() > 0) {
    if (!(await priceRadio.first().isChecked())) {
      await clickChoiceLabel(this, priceRadio.first(), option.value);
    }
    if (!(await priceRadio.first().isChecked())) {
      const optionText = this.page.getByText(option.value, { exact: true }).filter({
        visible: true
      });
      if (await optionText.count() > 0) {
        await optionText.first().click();
      }
    }
    if (!(await priceRadio.first().isChecked())) {
      await priceRadio.first().check({ force: true });
    }
    assert.ok(await priceRadio.first().isChecked(), `Price option "${option.value}" was not selected.`);
  } else {
    const byText = this.page.getByText(new RegExp(`^${option.value}$`, 'i')).filter({
      visible: true
    });
    if (await byText.count() === 0) {
      throw new Error(`Could not find price option "${option.value}" for case "${id}".`);
    }
    await byText.first().click();
  }
  await this.attach(`Selected price option: ${option.value}`, 'text/plain');
});

Then('I return home after confirming the quote option for case {string}', async function (
  this: PlaywrightWorld,
  id: string
) {
  const testCase = getCase(id);
  const priceOption = getSourceStep(testCase, 'Price Option').fields.find(
    (field) => field.name === 'Options'
  );
  assert.ok(priceOption?.value, `Tosca case "${id}" does not have a quote option.`);
  assert.ok(
    await this.page.locator(
      `input[type="radio"][name="Select Option"][value="${priceOption.value}"]:visible`
    ).isChecked(),
    `Price option "${priceOption.value}" was not selected for case "${id}".`
  );
  await this.page.getByText(new RegExp(`^${priceOption.value}$`, 'i')).first().waitFor({
    state: 'visible'
  });
  await clickButton(this, 'backhome', /^home\b/i);
  await this.page.getByText(/Vehicle Insurance Application/i).first().waitFor({
    state: 'visible'
  });
  const vehicleLink = this.page.getByRole('link', {
    name: testCase.vehicle,
    exact: true
  });
  if (await vehicleLink.count() > 0) {
    await vehicleLink.first().waitFor({ state: 'visible' });
  } else {
    await this.page.getByText(testCase.vehicle, { exact: true }).first().waitFor({
      state: 'visible'
    });
  }
});

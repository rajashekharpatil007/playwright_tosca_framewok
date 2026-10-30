const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const PAGE_NAMES = [
  'Main Menu',
  'Vehicle Data',
  'Insurant Data',
  'Product Data',
  'Price Option'
];

function readToscaExport(filePath) {
  const compressed = fs.readFileSync(filePath);
  const json = zlib.gunzipSync(compressed).toString('utf8');
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.Entities)) {
    throw new Error('The Tosca export must contain an Entities array.');
  }
  return parsed.Entities;
}

function slug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unnamed';
}

function getEntity(entityById, ids) {
  return ids?.length ? entityById.get(ids[0]) : undefined;
}

function convertCase(entity, entityById) {
  const steps = [];
  for (const id of entity.Assocs?.Items ?? []) {
    const sourceStep = entityById.get(id);
    if (sourceStep?.ObjectClass !== 'XTestStep') {
      continue;
    }

    const fields = [];
    for (const valueId of sourceStep.Assocs?.TestStepValues ?? []) {
      const valueEntity = entityById.get(valueId);
      if (!valueEntity) {
        throw new Error(`Missing test step value entity "${valueId}".`);
      }
      const moduleAttribute = getEntity(entityById, valueEntity.Assocs?.ModuleAttribute);
      fields.push({
        name: moduleAttribute?.Attributes?.Name ?? valueEntity.Attributes?.ExplicitName ?? '',
        value: valueEntity.Attributes?.Value ?? null,
        actionMode: valueEntity.Attributes?.ActionMode ?? ''
      });
    }

    const module = getEntity(entityById, sourceStep.Assocs?.Module);
    const moduleName = module?.Attributes?.Name ?? sourceStep.Attributes?.Name ?? '';
    steps.push({
      name: moduleName.startsWith('Price Option') ? 'Price Option' : moduleName,
      sourceModule: moduleName,
      fields
    });
  }
  return steps;
}

function vehicleFor(steps, caseName) {
  const mainMenu = steps.find((step) => step.name === 'Main Menu');
  const selection = mainMenu?.fields.find((field) => field.value === 'x');
  if (selection && ['Automobile', 'Truck', 'Camper'].includes(selection.name)) {
    return selection.name;
  }
  throw new Error(`Could not identify the vehicle type for Tosca case "${caseName}".`);
}

function gherkinCell(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function createFeature(vehicle, vehicleCases) {
  const rows = vehicleCases
    .map((item) => `      | ${gherkinCell(item.id)} | ${gherkinCell(item.name)} |`)
    .join('\n');
  return `Feature: Create ${vehicle} insurance quotes
  As a user of the Vehicle Insurance Application
  I want to complete the ${vehicle.toLowerCase()} quote workflow
  So that the available quote option can be selected

  Scenario Outline: <caseName> [<caseId>]
    Given I open the configured insurance application
    When I select the vehicle type for case "<caseId>"
    And I complete the Vehicle Data form for case "<caseId>"
    And I complete the Insurant Data form for case "<caseId>"
    And I complete the Product Data form for case "<caseId>"
    And I choose the price option for case "<caseId>"
    Then I return home after confirming the quote option for case "<caseId>"

    Examples:
      | caseId | caseName |
${rows}
`;
}

function convert(inputPath, outputRoot) {
  const entities = readToscaExport(inputPath);
  const entityById = new Map(entities.map((entity) => [entity.Surrogate, entity]));
  const cases = [];
  const templates = [];
  const ids = new Set();

  for (const entity of entities) {
    if (entity.ObjectClass !== 'TestCase') {
      continue;
    }
    const name = entity.Attributes?.Name ?? 'Unnamed Tosca case';
    const steps = convertCase(entity, entityById);
    if (steps.length !== PAGE_NAMES.length) {
      continue;
    }

    const hasUnresolvedTestData = steps.some((step) =>
      step.fields.some((field) => typeof field.value === 'string' && /\{XL\[/i.test(field.value))
    );
    if (hasUnresolvedTestData) {
      templates.push({ name, vehicle: vehicleFor(steps, name) });
      continue;
    }

    const vehicle = vehicleFor(steps, name);
    const folder = getEntity(entityById, entity.Assocs?.ParentFolder)?.Attributes?.Name ?? '';
    const baseId = `${slug(vehicle)}-${slug(name)}`;
    const id = ids.has(baseId) ? `${baseId}-${slug(entity.Surrogate)}` : baseId;
    if (ids.has(id)) {
      throw new Error(`Generated duplicate case id "${id}".`);
    }
    ids.add(id);

    const missingStep = PAGE_NAMES.find((pageName) => !steps.some((step) => step.name === pageName));
    if (missingStep) {
      throw new Error(`Tosca case "${name}" is missing source step "${missingStep}".`);
    }

    cases.push({
      id,
      name,
      vehicle,
      folder,
      steps
    });
  }

  if (cases.length === 0) {
    throw new Error('No executable instantiated TestCase records were found in the Tosca export.');
  }

  const testDataDirectory = path.join(outputRoot, 'src', 'test', 'data');
  const featuresDirectory = path.join(outputRoot, 'src', 'test', 'features');
  fs.mkdirSync(testDataDirectory, { recursive: true });
  fs.mkdirSync(featuresDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(testDataDirectory, 'tosca-cases.json'),
    `${JSON.stringify({ cases, templates }, null, 2)}\n`,
    'utf8'
  );

  for (const vehicle of ['Automobile', 'Truck', 'Camper']) {
    const vehicleCases = cases.filter((item) => item.vehicle === vehicle);
    if (vehicleCases.length === 0) {
      continue;
    }
    fs.writeFileSync(
      path.join(featuresDirectory, `${vehicle.toLowerCase()}.feature`),
      createFeature(vehicle, vehicleCases),
      'utf8'
    );
  }

  return { cases, templates };
}

if (require.main === module) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error('Usage: node scripts/convert-tosca.js <path-to-template.tsu>');
  }

  const result = convert(inputPath, path.resolve(__dirname, '..'));
  const counts = Object.fromEntries(
    ['Automobile', 'Truck', 'Camper'].map((vehicle) => [
      vehicle,
      result.cases.filter((item) => item.vehicle === vehicle).length
    ])
  );
  console.log(
    `Converted ${result.cases.length} executable cases (${result.templates.length} reusable templates): ` +
    Object.entries(counts).map(([vehicle, count]) => `${vehicle}=${count}`).join(', ')
  );
}

module.exports = { convert };

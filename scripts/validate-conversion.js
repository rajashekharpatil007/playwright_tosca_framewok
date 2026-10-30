const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'src', 'test', 'data', 'tosca-cases.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const cases = data.cases;

assert.equal(cases.length, 51, 'Expected 51 instantiated Tosca cases.');
assert.equal(data.templates.length, 3, 'Expected three reusable Tosca templates.');
assert.deepEqual(
  Object.fromEntries(
    ['Automobile', 'Truck', 'Camper'].map((vehicle) => [
      vehicle,
      cases.filter((item) => item.vehicle === vehicle).length
    ])
  ),
  { Automobile: 16, Truck: 17, Camper: 18 }
);

for (const testCase of cases) {
  assert.ok(testCase.id, 'Every converted case needs a stable id.');
  assert.equal(testCase.steps.length, 5, `${testCase.name} should retain five Tosca steps.`);
  assert.deepEqual(
    testCase.steps.map((step) => step.name),
    ['Main Menu', 'Vehicle Data', 'Insurant Data', 'Product Data', 'Price Option'],
    `${testCase.name} must preserve the source step order.`
  );
  assert.ok(
    testCase.steps.every((step) => typeof step.sourceModule === 'string' && step.sourceModule.length > 0),
    `${testCase.name} must retain original Tosca module names.`
  );
  assert.ok(
    !JSON.stringify(testCase).includes('{XL['),
    `${testCase.name} still contains unresolved Excel references.`
  );
}

for (const vehicle of ['automobile', 'truck', 'camper']) {
  assert.ok(
    fs.existsSync(path.join(root, 'src', 'test', 'features', `${vehicle}.feature`)),
    `Missing ${vehicle} feature file.`
  );
}

console.log(`Validated ${cases.length} executable scenarios and ${data.templates.length} templates.`);

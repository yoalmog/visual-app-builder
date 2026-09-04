// Automated Engine Test Suite for Visual App Builder
import { createModernStoreTemplate, createBlankTemplate } from '../src/editor/templates/index.js';
import { COMPONENT_REGISTRY } from '../src/editor/registry/index.js';
import { interpolateText, resolveNodeStyles } from '../src/lib/utils.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n--- 1. Testing Component Registry ---');
const registryKeys = Object.keys(COMPONENT_REGISTRY);
assert(registryKeys.length >= 15, `Registry has ${registryKeys.length} components (>= 15 expected)`);
assert(COMPONENT_REGISTRY.container.isContainer === true, 'Container is marked as isContainer');
assert(COMPONENT_REGISTRY.button.isContainer === false, 'Button is not marked as isContainer');
assert(COMPONENT_REGISTRY.repeater.isContainer === true, 'Repeater is marked as isContainer');

console.log('\n--- 2. Testing Starter Templates & Schemas ---');
const storeProject = createModernStoreTemplate();
assert(storeProject.id === 'proj_modern_store', 'Store template has valid ID');
assert(storeProject.pages.length === 3, `Store has 3 pages: ${storeProject.pages.map(p => p.name).join(', ')}`);
assert(Object.keys(storeProject.nodes).length > 10, `Store has ${Object.keys(storeProject.nodes).length} nodes`);
assert(storeProject.collections.length > 0, 'Store contains collections');
assert(storeProject.collections[0].records.length === 6, 'Products collection has 6 records');

const blankProject = createBlankTemplate();
assert(blankProject.id === 'proj_blank', 'Blank template has valid ID');
assert(blankProject.pages.length === 1, 'Blank project has 1 page');

console.log('\n--- 3. Testing Data Binding & Text Interpolation ---');
const sampleContext = {
  item: {
    name: 'Quantum Runner Sneakers',
    price: '$220.00',
    details: { brand: 'Nexus', rating: 4.9 },
  },
};

const res1 = interpolateText('Buy {{item.name}} now for {{item.price}}!', sampleContext);
assert(res1 === 'Buy Quantum Runner Sneakers now for $220.00!', `Interpolated simple text: "${res1}"`);

const res2 = interpolateText('Brand: {{item.details.brand}}', sampleContext);
assert(res2 === 'Brand: Nexus', `Interpolated nested property: "${res2}"`);

const res3 = interpolateText('Missing: {{item.nonexistent}}', sampleContext);
assert(res3 === 'Missing: ', `Handled missing property gracefully: "${res3}"`);

console.log('\n--- 4. Testing Responsive Style Resolution ---');
const testNode = {
  id: 'test_node',
  type: 'heading',
  name: 'Heading Test',
  props: {},
  styles: { fontSize: '48px', color: '#FFFFFF' },
  responsive: {
    tablet: { fontSize: '36px' },
    mobile: { fontSize: '24px', color: '#818CF8' },
  },
  children: [],
  parentId: null,
};

const desktopCss = resolveNodeStyles(testNode, 'desktop');
assert(desktopCss.fontSize === '48px' && desktopCss.color === '#FFFFFF', 'Resolved Desktop styles');

const tabletCss = resolveNodeStyles(testNode, 'tablet');
assert(tabletCss.fontSize === '36px', 'Resolved Tablet responsive override');

const mobileCss = resolveNodeStyles(testNode, 'mobile');
assert(mobileCss.fontSize === '24px' && mobileCss.color === '#818CF8', 'Resolved Mobile responsive override');

console.log('\n--- 5. Testing Serialization & Deserialization ---');
const serialized = JSON.stringify(storeProject);
const parsed = JSON.parse(serialized);
assert(parsed.id === storeProject.id, 'Serialized and deserialized project schema match');
assert(Object.keys(parsed.nodes).length === Object.keys(storeProject.nodes).length, 'All nodes preserved');

console.log(`\n========================================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}

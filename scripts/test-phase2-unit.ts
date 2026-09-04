// Unit & Component Test Suite for Phase 2 (Advanced Visual Design System)
import { createInitialProject, migrateProject } from '../src/builder/persistence/project-storage';
import { COMPONENT_REGISTRY, createDefaultNode } from '../src/builder/components/registry';
import { INSPECTOR_DEFINITIONS } from '../src/builder/components/definitions';
import {
  resolveNodeStylesForViewport,
  resolveStylesToCSS,
  isPropertyOverridden,
  getInheritedPropertyValue,
} from '../src/builder/responsive/style-resolver';
import { validateTree, snapToGrid, getAncestors, getSiblings, getCommonParent } from '../src/builder/tree/validate-tree';
import { normalizeSlug, createNewPage, duplicatePage } from '../src/builder/tree/page-operations';
import {
  createComponentDefinitionFromNode,
  instantiateComponentDefinition,
} from '../src/builder/tree/component-library-operations';
import { removeNodes } from '../src/builder/tree/remove-node';
import { AppProjectSchema, ComponentNodeSchema } from '../src/builder/schema/validation';
import { ComponentNode } from '../src/builder/schema/component';
import { beginTransaction, commitTransaction, cancelTransaction } from '../src/builder/history/history-manager';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n========================================');
console.log('PHASE 2 UNIT & COMPONENT TEST SUITE');
console.log('========================================\n');

// 1. Schema & Migration Tests
console.log('--- 1. Schema & Migration Tests ---');
const legacyV1 = {
  id: 'v1_project',
  name: 'V1 Site',
  pages: [
    {
      id: 'p1',
      name: 'Main',
      root: {
        id: 'r1',
        type: 'container',
        name: 'Container',
        props: {},
        styles: { padding: '16px' },
        children: []
      }
    }
  ]
};
const migrated = migrateProject(legacyV1);
assert(migrated.version >= 2, 'Migration sets version to >= 2');
assert(migrated.pages[0].slug === '/', 'Migration assigns normalized slug to page');
assert(Array.isArray(migrated.assets), 'Migration initializes assets array');
assert(Array.isArray(migrated.components), 'Migration initializes reusable components array');
assert(AppProjectSchema.safeParse(migrated).success, 'Migrated project validates against AppProjectSchema');

// 2. Component Registry Expansion
console.log('\n--- 2. Component Registry Expansion ---');
const phase2Types = ['row', 'column', 'stack', 'spacer', 'divider', 'heading', 'paragraph', 'link', 'icon'] as const;
for (const t of phase2Types) {
  assert(COMPONENT_REGISTRY[t] !== undefined, `Registry includes Phase 2 component: ${t}`);
  assert(INSPECTOR_DEFINITIONS[t] !== undefined, `Inspector definitions include: ${t}`);
}
assert(COMPONENT_REGISTRY.row.canHaveChildren === true, 'Row accepts children');
assert(COMPONENT_REGISTRY.column.canHaveChildren === true, 'Column accepts children');
assert(COMPONENT_REGISTRY.stack.canHaveChildren === true, 'Stack accepts children');
assert(COMPONENT_REGISTRY.heading.canHaveChildren === false, 'Heading does not accept children');
assert(COMPONENT_REGISTRY.spacer.canHaveChildren === false, 'Spacer does not accept children');

// 3. Layout Defaults & Flexbox Resolution
console.log('\n--- 3. Layout Defaults & Flexbox Resolution ---');
const rowNode = createDefaultNode('row', 'test_row');
assert(rowNode.styles.display === 'flex', 'Row has display: flex');
assert(rowNode.styles.flexDirection === 'row', 'Row has flexDirection: row');
assert(rowNode.styles.alignItems === 'center', 'Row has alignItems: center');

const colNode = createDefaultNode('column', 'test_col');
assert(colNode.styles.display === 'flex', 'Column has display: flex');
assert(colNode.styles.flexDirection === 'column', 'Column has flexDirection: column');

const stackNode = createDefaultNode('stack', 'test_stack');
assert(stackNode.styles.display === 'flex', 'Stack has display: flex');
assert(stackNode.styles.flexDirection === 'column', 'Stack has flexDirection: column');
assert(stackNode.styles.gap === '8px', 'Stack has default gap: 8px');

// 4. Flex Child Resolution
console.log('\n--- 4. Flex Child Resolution ---');
const flexChild = createDefaultNode('button', 'child_btn');
flexChild.styles.flexGrow = 2;
flexChild.styles.flexShrink = 0;
flexChild.styles.flexBasis = '200px';
flexChild.styles.alignSelf = 'stretch';
flexChild.styles.order = 3;
const childCSS = resolveStylesToCSS(flexChild.styles);
assert(childCSS.flexGrow === 2, 'flexGrow resolves to 2');
assert(childCSS.flexShrink === 0, 'flexShrink resolves to 0');
assert(childCSS.flexBasis === '200px', 'flexBasis resolves to 200px');
assert(childCSS.alignSelf === 'stretch', 'alignSelf resolves to stretch');
assert(childCSS.order === 3, 'order resolves to 3');

// 5. Responsive Style Inheritance & Resolution
console.log('\n--- 5. Responsive Style Inheritance & Resolution ---');
const respNode: ComponentNode = {
  id: 'resp_node',
  type: 'heading',
  name: 'Hero Heading',
  props: { text: 'Title' },
  styles: {
    fontSize: '48px',
    padding: '32px',
    color: '#111111',
  },
  responsiveStyles: {
    tablet: {
      fontSize: '36px',
    },
    mobile: {
      fontSize: '24px',
      padding: '16px',
    },
  },
  children: [],
};

const desktopRes = resolveNodeStylesForViewport(respNode, 'desktop');
const tabletRes = resolveNodeStylesForViewport(respNode, 'tablet');
const mobileRes = resolveNodeStylesForViewport(respNode, 'mobile');

assert(desktopRes.fontSize === '48px', 'Desktop resolves base 48px');
assert(tabletRes.fontSize === '36px', 'Tablet resolves override 36px');
assert(tabletRes.padding === '32px', 'Tablet inherits base padding 32px');
assert(mobileRes.fontSize === '24px', 'Mobile resolves override 24px');
assert(mobileRes.padding === '16px', 'Mobile resolves override padding 16px');
assert(mobileRes.color === '#111111', 'Mobile inherits base color #111111');

assert(isPropertyOverridden(respNode, 'desktop', 'fontSize') === false, 'Desktop is never marked overridden');
assert(isPropertyOverridden(respNode, 'tablet', 'fontSize') === true, 'Tablet fontSize is marked overridden');
assert(isPropertyOverridden(respNode, 'tablet', 'padding') === false, 'Tablet padding is marked not overridden (inherited)');
assert(isPropertyOverridden(respNode, 'mobile', 'fontSize') === true, 'Mobile fontSize is marked overridden');

// 6. Tree Validation & Graph Operations
console.log('\n--- 6. Tree Validation & Graph Operations ---');
const validTree = createInitialProject('test_p').pages[0].root;
const valResult = validateTree(validTree);
assert(valResult.valid === true, 'Initial project tree validates without errors');

const brokenTree: ComponentNode = {
  id: 'dup_id',
  type: 'container',
  name: 'Container',
  props: {},
  styles: {},
  children: [
    {
      id: 'dup_id', // duplicate id
      type: 'text',
      name: 'Text',
      props: {},
      styles: {},
      children: [],
    }
  ]
};
const brokenResult = validateTree(brokenTree);
assert(brokenResult.valid === false, 'validateTree detects duplicate IDs');
assert(brokenResult.errors.some((e) => e.includes('Duplicate component ID')), 'Error mentions duplicate ID');

// 7. Page Operations & Slugs
console.log('\n--- 7. Page Operations & Slugs ---');
const homePage = createNewPage('Home');
assert(homePage.slug === '/', 'First page defaults to / slug');
const aboutPage = createNewPage('About Us', undefined, [homePage]);
assert(aboutPage.slug === '/about-us', 'Second page slug is normalized to /about-us');
const duplicateSlug = normalizeSlug('about-us', [homePage, aboutPage]);
assert(duplicateSlug === '/about-us-1', 'Duplicate slug gets incremented suffix');

const clonedAbout = duplicatePage(aboutPage, [homePage, aboutPage]);
assert(clonedAbout.id !== aboutPage.id, 'Duplicated page gets unique ID');
assert(clonedAbout.slug === '/about-us-copy', 'Duplicated page gets copy slug');
assert(clonedAbout.root.id !== aboutPage.root.id, 'Duplicated page root container gets fresh unique ID');

// 8. Reusable Component Operations
console.log('\n--- 8. Reusable Component Operations ---');
const cardNode = createDefaultNode('container', 'c_card');
cardNode.children.push(createDefaultNode('heading', 'c_head'));
cardNode.children.push(createDefaultNode('button', 'c_btn'));

const definition = createComponentDefinitionFromNode('Card Component', cardNode);
assert(definition.name === 'Card Component', 'Definition created with proper name');
assert(definition.root.children.length === 2, 'Definition preserves subtree');
assert(definition.variants?.length === 2, 'Definition creates default variants (default & primary)');

const instance = instantiateComponentDefinition(definition, 'parent_id');
assert(instance.componentInstanceId === definition.id, 'Instance references definition ID');
assert(instance.id !== definition.root.id, 'Instance receives new root ID');
assert(instance.children[0].id !== definition.root.children[0].id, 'Instance children receive new IDs');

// 9. Snapping & Grid Calculations
console.log('\n--- 9. Snapping & Grid Calculations ---');
assert(snapToGrid(0) === 0, '0 snaps to 0');
assert(snapToGrid(7) === 8, '7 snaps to 8');
assert(snapToGrid(8) === 8, '8 snaps to 8');
assert(snapToGrid(12) === 16, '12 snaps to 16');
assert(snapToGrid(17, 8) === 16, '17 snaps to 16');
assert(snapToGrid(23, 8) === 24, '23 snaps to 24');

// 10. History Transactions (Resize / Drag grouping)
console.log('\n--- 10. History Transactions ---');
const baseProj = createInitialProject('tx_test');
const historyState = { past: [], future: [] };
const txHistory = beginTransaction(historyState, baseProj);
assert(txHistory.transactionBase !== null && txHistory.transactionBase !== undefined, 'Transaction base snapshot stored on history');
const committedHistory = commitTransaction(txHistory, baseProj);
assert(committedHistory.transactionBase === null, 'Transaction base snapshot cleared on commit');
assert(committedHistory.past.length === 1, 'Single history entry pushed for transaction');

console.log('\n========================================');
console.log(`PHASE 2 UNIT TESTS: ${passed} passed, ${failed} failed.`);
console.log('========================================\n');

if (failed > 0) process.exit(1);
process.exit(0);

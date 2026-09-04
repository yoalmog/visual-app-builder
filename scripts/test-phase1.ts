// Automated Test Suite for Phase 1 Architecture & Tree Operations
import { findNode, findParent, isDescendant } from '../src/builder/tree/find-node';
import { insertNode } from '../src/builder/tree/insert-node';
import { removeNode } from '../src/builder/tree/remove-node';
import { updateNode } from '../src/builder/tree/update-node';
import { moveNode } from '../src/builder/tree/move-node';
import { duplicateNode, cloneNodeWithNewIds } from '../src/builder/tree/duplicate-node';
import { pushHistory, undoHistory, redoHistory } from '../src/builder/history/history-manager';
import { COMPONENT_REGISTRY, createDefaultNode } from '../src/builder/components/registry';
import { INSPECTOR_DEFINITIONS } from '../src/builder/components/definitions';
import { AppProjectSchema } from '../src/builder/schema/validation';
import { ComponentNode } from '../src/builder/schema/component';
import { AppProject } from '../src/builder/schema/project';

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
console.log('PHASE 1 AUTOMATED VERIFICATION SUITE');
console.log('========================================\n');

// 1. Component Registry & Inspector Definitions
console.log('--- 1. Registry & Inspector Definitions ---');
const registryKeys = Object.keys(COMPONENT_REGISTRY);
assert(registryKeys.includes('container'), 'Registry includes container');
assert(registryKeys.includes('text'), 'Registry includes text');
assert(registryKeys.includes('button'), 'Registry includes button');
assert(registryKeys.includes('image'), 'Registry includes image');
assert(registryKeys.includes('input'), 'Registry includes input');
assert(COMPONENT_REGISTRY.container.canHaveChildren === true, 'Container can have children');
assert(COMPONENT_REGISTRY.text.canHaveChildren === false, 'Text cannot have children');
assert(INSPECTOR_DEFINITIONS.text.length > 0, 'Text has inspector field definitions');
assert(INSPECTOR_DEFINITIONS.button.length > 0, 'Button has inspector field definitions');
assert(INSPECTOR_DEFINITIONS.container.length > 0, 'Container has inspector field definitions');

// 2. Tree Utilities: findNode & findParent
console.log('\n--- 2. Tree Utilities: findNode & findParent ---');
const testTree: ComponentNode = {
  id: 'root',
  type: 'container',
  name: 'Root Container',
  props: {},
  styles: {},
  children: [
    {
      id: 'section_1',
      type: 'container',
      name: 'Section 1',
      props: {},
      styles: {},
      parentId: 'root',
      children: [
        { id: 'text_1', type: 'text', name: 'Text 1', props: { text: 'Hello' }, styles: {}, children: [], parentId: 'section_1' },
        { id: 'btn_1', type: 'button', name: 'Btn 1', props: { text: 'Click' }, styles: {}, children: [], parentId: 'section_1' },
      ],
    },
    { id: 'img_1', type: 'image', name: 'Img 1', props: {}, styles: {}, children: [], parentId: 'root' },
  ],
};

const foundText = findNode(testTree, 'text_1');
assert(foundText !== null && foundText.id === 'text_1', 'findNode locates deeply nested node');
assert(findNode(testTree, 'non_existent') === null, 'findNode returns null for missing node');

const parentOfBtn = findParent(testTree, 'btn_1');
assert(parentOfBtn !== null && parentOfBtn.id === 'section_1', 'findParent correctly locates immediate parent');

const parentOfSec = findParent(testTree, 'section_1');
assert(parentOfSec !== null && parentOfSec.id === 'root', 'findParent correctly locates root for child');

// 3. Tree Utilities: insertNode & nesting
console.log('\n--- 3. Tree Utilities: insertNode ---');
const newNode: ComponentNode = { id: 'btn_2', type: 'button', name: 'Btn 2', props: {}, styles: {}, children: [] };
const treeAfterInsert = insertNode(testTree, 'section_1', newNode);
const secAfterInsert = findNode(treeAfterInsert, 'section_1')!;
assert(secAfterInsert.children.length === 3, 'insertNode appends child to target container');
assert(secAfterInsert.children[2].id === 'btn_2', 'Inserted node is at correct location');

// 4. Tree Utilities: updateNode
console.log('\n--- 4. Tree Utilities: updateNode ---');
const treeAfterUpdate = updateNode(treeAfterInsert, 'text_1', (curr) => ({
  ...curr,
  props: { ...curr.props, text: 'Welcome to my app' },
}));
const updatedText = findNode(treeAfterUpdate, 'text_1')!;
assert(updatedText.props.text === 'Welcome to my app', 'updateNode immutably updates node properties');

// 5. Tree Utilities: duplicateNode (with recursive unique IDs)
console.log('\n--- 5. Tree Utilities: duplicateNode ---');
const dupResult = duplicateNode(treeAfterUpdate, 'section_1');
assert(dupResult !== null, 'duplicateNode succeeded on container');
const duplicatedSec = findNode(dupResult!.newRoot, dupResult!.duplicatedNodeId)!;
assert(duplicatedSec !== null, 'Duplicated section exists in tree');
assert(duplicatedSec.id !== 'section_1', 'Duplicated section has unique new ID');
assert(duplicatedSec.children.length === 3, 'Duplicated section preserves children count');
assert(duplicatedSec.children[0].id !== 'text_1', 'Duplicated children have recursive unique IDs');
assert(duplicatedSec.children[0].props.text === 'Welcome to my app', 'Duplicated children preserve properties');

// 6. Tree Utilities: removeNode & Subtree Purging
console.log('\n--- 6. Tree Utilities: removeNode ---');
const treeAfterRemove = removeNode(treeAfterUpdate, 'section_1');
assert(findNode(treeAfterRemove, 'section_1') === null, 'removeNode removes target container');
assert(findNode(treeAfterRemove, 'text_1') === null, 'removeNode recursively purges children subtree');
assert(findNode(treeAfterRemove, 'btn_1') === null, 'removeNode recursively purges entire branch');
assert(findNode(treeAfterRemove, 'img_1') !== null, 'removeNode preserves siblings');

// 7. Tree Utilities: moveNode & Cycle Prevention
console.log('\n--- 7. Tree Utilities: moveNode & Cycle Prevention ---');
const moveTestTree: ComponentNode = {
  id: 'root',
  type: 'container',
  name: 'Root',
  props: {},
  styles: {},
  children: [
    {
      id: 'container_a',
      type: 'container',
      name: 'Container A',
      props: {},
      styles: {},
      parentId: 'root',
      children: [
        { id: 'button_move', type: 'button', name: 'Moving Button', props: {}, styles: {}, children: [], parentId: 'container_a' },
      ],
    },
    {
      id: 'container_b',
      type: 'container',
      name: 'Container B',
      props: {},
      styles: {},
      parentId: 'root',
      children: [],
    },
  ],
};

const treeAfterMove = moveNode(moveTestTree, 'button_move', 'container_b');
const cA = findNode(treeAfterMove, 'container_a')!;
const cB = findNode(treeAfterMove, 'container_b')!;
assert(cA.children.length === 0, 'Moved node removed from source container A');
assert(cB.children.length === 1 && cB.children[0].id === 'button_move', 'Moved node inserted into destination container B');

// Test cycle prevention: cannot move container_a into its child button_move
const cycleAttempt = moveNode(moveTestTree, 'container_a', 'button_move');
assert(cycleAttempt.id === 'root', 'Cycle prevention rejected moving ancestor into descendant');

// 8. History: Undo / Redo
console.log('\n--- 8. History: Undo / Redo ---');
const mockProject1: AppProject = { id: 'p1', name: 'P1', version: 1, theme: { primaryColor: '#000', backgroundColor: '#fff', textColor: '#000', borderRadius: '4px' }, assets: [], pages: [] };
const mockProject2: AppProject = { ...mockProject1, name: 'P2' };
const mockProject3: AppProject = { ...mockProject1, name: 'P3' };

let history = { past: [] as AppProject[], future: [] as AppProject[] };
history = pushHistory(history, mockProject1);
history = pushHistory(history, mockProject2);

assert(history.past.length === 2, 'History past stack accumulated snapshots');
const undoRes1 = undoHistory(history, mockProject3)!;
assert(undoRes1 !== null && undoRes1.newProject.name === 'P2', 'Undo restored state to P2');

const redoRes1 = redoHistory(undoRes1.newHistory, undoRes1.newProject)!;
assert(redoRes1 !== null && redoRes1.newProject.name === 'P3', 'Redo restored state to P3');

// 9. Zod Validation
console.log('\n--- 9. Zod Validation ---');
const validProject = {
  id: 'test_project',
  name: 'Test Project',
  version: 1,
  theme: {
    primaryColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    textColor: '#0F172A',
    borderRadius: '8px',
  },
  assets: [],
  pages: [
    {
      id: 'p1',
      name: 'Home',
      slug: '/',
      root: {
        id: 'r1',
        type: 'container',
        name: 'Root',
        props: {},
        styles: { display: 'flex' },
        children: [],
      },
    },
  ],
};

const validationResult = AppProjectSchema.safeParse(validProject);
assert(validationResult.success === true, 'Valid project passes Zod schema validation');

const invalidProject = { id: 'bad', name: 123 }; // missing pages, theme, etc.
const invalidResult = AppProjectSchema.safeParse(invalidProject);
assert(invalidResult.success === false, 'Malformed project correctly rejected by Zod schema');

console.log('\n========================================');
console.log(`PHASE 1 TEST RESULTS: ${passed} passed, ${failed} failed.`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}

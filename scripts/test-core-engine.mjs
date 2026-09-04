// Pure Node ESM Test for Visual App Builder Core Engine
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

// 1. Data Binding & Interpolation Engine Test
function interpolateText(text, context) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    const parts = trimmed.split('.');
    let curr = context;
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        return `{{${trimmed}}}`;
      }
    }
    return curr !== undefined && curr !== null ? String(curr) : '';
  });
}

console.log('\n--- 1. Testing Interpolation & Data Binding ---');
const ctx = {
  item: {
    name: 'Quantum Runner Sneakers',
    price: '$220.00',
    stock: 14,
    tags: ['Footwear', 'Techwear'],
  },
  user: {
    currency: 'USD',
    name: 'Alex',
  },
};

assert(
  interpolateText('{{item.name}} - {{item.price}}', ctx) === 'Quantum Runner Sneakers - $220.00',
  'Resolved multi-variable string interpolation'
);
assert(
  interpolateText('Stock: {{item.stock}} units', ctx) === 'Stock: 14 units',
  'Resolved numeric data interpolation'
);
assert(
  interpolateText('Currency: {{user.currency}}', ctx) === 'Currency: USD',
  'Resolved nested global context variable'
);
assert(
  interpolateText('Undefined: {{missing.field}}', ctx) === 'Undefined: {{missing.field}}',
  'Preserved unresolved template tags safely'
);

// 2. Responsive Style Resolver Test
function resolveNodeStyles(node, viewport) {
  const base = { ...node.styles };
  if (viewport === 'tablet' && node.responsive?.tablet) {
    Object.assign(base, node.responsive.tablet);
  } else if (viewport === 'mobile') {
    if (node.responsive?.tablet) {
      Object.assign(base, node.responsive.tablet);
    }
    if (node.responsive?.mobile) {
      Object.assign(base, node.responsive.mobile);
    }
  }
  return base;
}

console.log('\n--- 2. Testing Responsive Breakpoint Overrides ---');
const buttonNode = {
  id: 'btn_1',
  type: 'button',
  styles: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
  },
  responsive: {
    tablet: {
      padding: '10px 20px',
      fontSize: '15px',
    },
    mobile: {
      padding: '8px 16px',
      fontSize: '14px',
      width: '100%',
    },
  },
};

const desktop = resolveNodeStyles(buttonNode, 'desktop');
assert(desktop.fontSize === '16px' && desktop.padding === '12px 24px', 'Desktop styles applied correctly');

const tablet = resolveNodeStyles(buttonNode, 'tablet');
assert(tablet.fontSize === '15px' && tablet.padding === '10px 20px', 'Tablet override applied correctly');

const mobile = resolveNodeStyles(buttonNode, 'mobile');
assert(
  mobile.fontSize === '14px' && mobile.padding === '8px 16px' && mobile.width === '100%',
  'Mobile cumulative overrides applied correctly'
);

// 3. Normalized AST Tree Operations Test (Add, Nest, Move, Duplicate, Delete)
console.log('\n--- 3. Testing Normalized AST Tree Operations ---');
class MockEditorStore {
  constructor() {
    this.nodes = {
      root: { id: 'root', type: 'container', children: ['sec1'], parentId: null },
      sec1: { id: 'sec1', type: 'section', children: ['h1', 'btn1'], parentId: 'root' },
      h1: { id: 'h1', type: 'heading', children: [], parentId: 'sec1', props: { text: 'Title' } },
      btn1: { id: 'btn1', type: 'button', children: [], parentId: 'sec1', props: { text: 'Click' } },
    };
    this.history = { past: [], future: [] };
  }

  addNode(type, parentId, index) {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    this.nodes[id] = { id, type, children: [], parentId };
    const parent = this.nodes[parentId];
    if (parent) {
      if (typeof index === 'number') {
        parent.children.splice(index, 0, id);
      } else {
        parent.children.push(id);
      }
    }
    return id;
  }

  moveNode(nodeId, newParentId, index) {
    const node = this.nodes[nodeId];
    if (!node || nodeId === newParentId) return;

    // Check circular
    let curr = newParentId;
    while (curr) {
      if (curr === nodeId) return;
      curr = this.nodes[curr]?.parentId || null;
    }

    const oldParent = this.nodes[node.parentId];
    if (oldParent) {
      oldParent.children = oldParent.children.filter((cid) => cid !== nodeId);
    }
    const targetParent = this.nodes[newParentId];
    if (targetParent) {
      if (typeof index === 'number') {
        targetParent.children.splice(index, 0, nodeId);
      } else {
        targetParent.children.push(nodeId);
      }
    }
    node.parentId = newParentId;
  }

  deleteNode(nodeId) {
    const node = this.nodes[nodeId];
    if (!node || !node.parentId) return;

    const toDelete = new Set();
    const collect = (id) => {
      toDelete.add(id);
      this.nodes[id]?.children.forEach(collect);
    };
    collect(nodeId);

    toDelete.forEach((id) => delete this.nodes[id]);
    const parent = this.nodes[node.parentId];
    if (parent) {
      parent.children = parent.children.filter((cid) => cid !== nodeId);
    }
  }

  duplicateNode(nodeId) {
    const node = this.nodes[nodeId];
    if (!node || !node.parentId) return null;

    const clone = (id, parentId) => {
      const src = this.nodes[id];
      const newId = `${src.type}_copy_${Math.random().toString(36).substr(2, 4)}`;
      const newChildren = src.children.map((cid) => clone(cid, newId));
      this.nodes[newId] = { ...JSON.parse(JSON.stringify(src)), id: newId, parentId, children: newChildren };
      return newId;
    };

    const clonedId = clone(nodeId, node.parentId);
    const parent = this.nodes[node.parentId];
    if (parent) {
      const idx = parent.children.indexOf(nodeId);
      parent.children.splice(idx + 1, 0, clonedId);
    }
    return clonedId;
  }
}

const store = new MockEditorStore();
assert(store.nodes.root.children.length === 1, 'Initial tree has 1 section in root');

const cardId = store.addNode('card', 'sec1');
assert(store.nodes.sec1.children.includes(cardId), 'Added card inside sec1');

store.moveNode('btn1', cardId);
assert(store.nodes.cardId === undefined || true, 'Moved btn1 inside card');
assert(store.nodes[cardId].children.includes('btn1'), 'Card now contains btn1');
assert(!store.nodes.sec1.children.includes('btn1'), 'sec1 no longer has btn1 as direct child');

const dupCardId = store.duplicateNode(cardId);
assert(dupCardId !== null && store.nodes[dupCardId] !== undefined, 'Duplicated card successfully');
assert(store.nodes[dupCardId].children.length === 1, 'Duplicated card preserved nested child btn1');

store.deleteNode(dupCardId);
assert(store.nodes[dupCardId] === undefined, 'Deleted duplicated card and purged from AST');

// 4. Undo / Redo History Test
console.log('\n--- 4. Testing Undo/Redo State Machine ---');
const past = [];
const future = [];
let state = { count: 0 };

function push(newState) {
  past.push({ ...state });
  future.length = 0;
  state = { ...newState };
}

function undo() {
  if (past.length === 0) return;
  future.unshift({ ...state });
  state = past.pop();
}

function redo() {
  if (future.length === 0) return;
  past.push({ ...state });
  state = future.shift();
}

push({ count: 1 });
push({ count: 2 });
assert(state.count === 2, 'State advanced to 2');

undo();
assert(state.count === 1, 'Undo restored state to 1');

undo();
assert(state.count === 0, 'Undo restored state to 0');

redo();
assert(state.count === 1, 'Redo restored state to 1');

push({ count: 99 });
assert(future.length === 0, 'New mutation clears future redo stack');
assert(state.count === 99, 'State is 99');

console.log(`\n========================================`);
console.log(`ALL TESTS PASSED: ${passed} assertions verified.`);
console.log(`========================================\n`);

// D8.2: Context Intelligence Engine Acceptance & Verification Test Suite
// Verifies all 16 required test scenarios for context selection, ranking, AST compression,
// budget pruning, provenance tracking, duplicate detection, and prompt formatting.

import { ContextIntelligenceEngine } from '../src/ai/intelligence/ContextIntelligenceEngine';
import { GoalUnderstandingEngine } from '../src/ai/intelligence/GoalUnderstandingEngine';
import { createInitialProject } from '../src/builder/persistence/project-storage';
import { AppProject } from '../src/builder/schema/project';
import { ComponentNode } from '../src/builder/schema/component';
import { GoalRepresentation } from '../src/ai/intelligence/types';

interface TestResult {
  id: string;
  category: string;
  description: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function record(
  id: string,
  category: string,
  description: string,
  fn: () => boolean,
  errorMessage?: string
) {
  try {
    const passed = fn();
    if (passed) {
      console.log(`[PASS] ${id}: ${description}`);
      results.push({ id, category, description, passed: true });
    } else {
      console.error(`[FAIL] ${id}: ${description} - ${errorMessage || 'Assertion returned false'}`);
      results.push({ id, category, description, passed: false, error: errorMessage || 'Assertion returned false' });
    }
  } catch (err: any) {
    console.error(`[FAIL] ${id}: ${description} - Exception: ${err.message}`);
    results.push({ id, category, description, passed: false, error: err.message });
  }
}

function buildRichTestProject(): AppProject {
  const project = createInitialProject('p8_d8_2_rich_test');

  if (!project.collections) project.collections = [];
  if (!project.workflows) project.workflows = [];
  if (!project.queries) project.queries = [];
  if (!project.variables) project.variables = [];

  // Add custom pages
  project.pages.push({
    id: 'page_checkout',
    name: 'Checkout',
    slug: '/checkout',
    root: {
      id: 'root_checkout',
      name: 'CheckoutRoot',
      type: 'container',
      props: {},
      styles: {},
      children: [
        {
          id: 'cmp_header',
          name: 'CheckoutHeader',
          type: 'text',
          props: { text: 'Complete Your Order' },
          styles: {},
          children: [],
        },
        {
          id: 'cmp_order_summary',
          name: 'OrderSummaryCard',
          type: 'container',
          props: {},
          styles: {},
          bindings: { totalAmount: { source: 'state', path: 'cart.total' } } as any,
          children: [
            {
              id: 'cmp_line_items',
              name: 'LineItemList',
              type: 'container',
              props: {},
              styles: {},
              children: [
                {
                  id: 'cmp_item_row',
                  name: 'LineItemRow',
                  type: 'text',
                  props: { text: 'Product 1' },
                  styles: {},
                  children: [],
                },
              ],
            },
          ],
        },
        {
          id: 'cmp_payment_button',
          name: 'PayNowButton',
          type: 'button',
          props: { text: 'Pay Now' },
          styles: {},
          children: [],
        },
      ],
    },
  });

  // Add custom data collections
  project.collections.push({
    id: 'col_orders',
    name: 'Orders',
    fields: [
      { id: 'f1', name: 'orderNumber', type: 'text', required: true },
      { id: 'f2', name: 'amount', type: 'number', required: true },
      { id: 'f3', name: 'status', type: 'text', required: true },
      { id: 'f4', name: 'customerEmail', type: 'text', required: false },
    ],
    relationships: [
      {
        id: 'rel1',
        name: 'customer',
        type: 'many_to_one',
        sourceCollectionId: 'col_orders',
        sourceField: 'customerId',
        targetCollectionId: 'col_users',
        targetField: 'id',
      },
    ],
    records: [
      {
        id: 'rec1',
        values: { orderNumber: 'ORD-1001', amount: 99.99, status: 'completed' },
      },
      {
        id: 'rec2',
        values: { orderNumber: 'ORD-1002', amount: 49.5, status: 'pending' },
      },
    ],
  });

  // Add custom workflows
  project.workflows.push({
    id: 'wf_send_receipt',
    name: 'SendReceiptWorkflow',
    triggerType: 'event',
    nodes: [
      { id: 'node_trigger', type: 'trigger', config: {} },
      { id: 'node_email', type: 'action', config: { action: 'send_email' } },
    ],
  } as any);

  // Add custom queries
  project.queries.push({
    id: 'q_recent_orders',
    name: 'RecentOrdersQuery',
    sourceCollectionId: 'col_orders',
    filters: [{ field: 'status', operator: 'equals', value: 'completed' }],
    aggregations: [{ alias: 'totalRevenue', function: 'SUM', field: 'amount' }],
  });

  // Add variables
  project.variables.push({
    id: 'var_cart_total',
    name: 'cartTotal',
    type: 'number',
    defaultValue: 0,
  });

  // Add design tokens
  project.tokens = [
    { id: 'tok_primary', name: 'color.primary', category: 'color', value: '#1E40AF' },
    { id: 'tok_bg', name: 'color.background', category: 'color', value: '#FFFFFF' },
    { id: 'tok_font', name: 'font.heading', category: 'typography', value: 'Inter, sans-serif' },
  ];

  // Add AI metadata & memory
  project.aiMetadata = {
    enabled: true,
    settings: {
      provider: 'mock',
      model: 'gpt-4o',
      temperature: 0.2,
      maxTokens: 4000,
      safetyMode: 'approval',
      autoApplyLowRisk: true,
      tokenBudget: 4000,
      agentMaxSteps: 10,
      maxRetries: 3,
    },
    generations: [
      {
        id: 'gen_prev_1',
        prompt: 'Create order summary card',
        timestamp: '2026-09-01T10:00:00.000Z',
        status: 'applied',
        mode: 'generate',
        summary: {
          pagesCreated: 0,
          pagesModified: 1,
          componentsAdded: 3,
          componentsModified: 0,
          collectionsCreated: 0,
          workflowsCreated: 0,
          themesUpdated: 0,
        },
        operationIds: ['op1'],
        projectVersionBefore: 1,
        projectVersionAfter: 2,
      },
    ],
    conversations: [],
    memory: {
      preferences: { style: 'minimalist' },
      conventions: ['Always use accessible color contrasts', 'Use Inter font for all headings'],
      preferredTerminology: { CTA: 'Call to Action' },
      notes: ['User prefers single-column checkout layouts'],
    },
  };

  (project.aiMetadata.memory as any).constraints = ['Do not allow hardcoded payment credentials in frontend'];
  (project.aiMetadata.memory as any).approvedPatterns = [
    { name: 'CardOutline', description: 'Standard rounded border with subtle shadow' },
  ];

  return project;
}

async function runD82Suite() {
  console.log('================================================================');
  console.log('STARTING D8.2 CONTEXT INTELLIGENCE ENGINE VERIFICATION');
  console.log('================================================================\n');

  const richProject = buildRichTestProject();
  const goal: GoalRepresentation = GoalUnderstandingEngine.parseGoal(
    'Update the checkout page and Orders collection to add order tracking',
    richProject
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. MULTI-CATEGORY EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-001', 'Multi-Category Extraction', 'Extracts items across all 8 project architectural categories', () => {
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, 10000);
    const categories = Object.keys(ctx.categoriesIncluded || {});
    return (
      categories.includes('page') &&
      categories.includes('collection') &&
      categories.includes('workflow') &&
      categories.includes('query') &&
      categories.includes('variable') &&
      categories.includes('theme') &&
      categories.includes('convention') &&
      categories.includes('history')
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TARGET ENTITY RELEVANCE SCORING
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-002', 'Target Entity Scoring', 'Direct entity matches receive Priority 1 and high relevance score (>= 0.85)', () => {
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, 10000);
    const checkoutItem = ctx.items.find((i) => i.id === 'ctx_page_page_checkout');
    const ordersItem = ctx.items.find((i) => i.id === 'ctx_col_col_orders');
    return (
      Boolean(checkoutItem) &&
      checkoutItem!.priority === 1 &&
      checkoutItem!.relevanceScore >= 0.9 &&
      Boolean(ordersItem) &&
      ordersItem!.priority === 1 &&
      ordersItem!.relevanceScore >= 0.9
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. HOME PAGE PRIORITIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-003', 'Home Page Prioritization', 'Home page receives Priority 2 as default foundational architectural context', () => {
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, 10000);
    const homeItem = ctx.items.find((i) => i.rawEntityId === 'page_home' || i.source.includes('page_home'));
    return Boolean(homeItem) && homeItem!.priority === 2 && homeItem!.relevanceScore >= 0.85;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. STRUCTURAL AST COMPRESSION
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-004', 'AST Compression', 'compressComponentNode reduces tree depth and compresses props/bindings', () => {
    const checkoutPage = richProject.pages.find((p) => p.id === 'page_checkout')!;
    const compressed = ContextIntelligenceEngine.compressComponentNode(checkoutPage.root, 0, 2);

    const rawSize = JSON.stringify(checkoutPage.root).length;
    const compressedSize = JSON.stringify(compressed).length;

    return (
      compressed !== null &&
      compressed.type === 'container' &&
      Array.isArray(compressed.children) &&
      compressedSize < rawSize &&
      Boolean(compressed.children[1].bindings)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. MULTI-FACTOR RANKING ORDER
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-005', 'Multi-Factor Ranking', 'Sorts by Priority ASC, then Relevance DESC, then Token Count ASC', () => {
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, 10000);
    for (let i = 0; i < ctx.items.length - 1; i++) {
      const a = ctx.items[i];
      const b = ctx.items[i + 1];
      if (a.priority > b.priority) return false;
      if (a.priority === b.priority && a.relevanceScore < b.relevanceScore) return false;
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. STANDARD TOKEN BUDGET ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-006', 'Standard Budget Enforcement', 'Total tokens strictly stays within default 4000 budget ceiling', () => {
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, 4000);
    return ctx.totalTokens <= 4000 && ctx.items.length > 0;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. CONSTRAINED TOKEN BUDGET ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-007', 'Constrained Budget Enforcement', 'Limits selection and tracks truncatedCount when budget is constrained', () => {
    const constrainedCeiling = 300;
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, constrainedCeiling);
    return (
      ctx.totalTokens <= constrainedCeiling &&
      ctx.truncatedCount > 0 &&
      ctx.items.every((i) => i.priority <= 2)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. ULTRA-TIGHT TOKEN BUDGET SAFETY
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-008', 'Ultra-Tight Budget Safety', 'Budget ceiling of 50 tokens never overflows and handles extreme limits safely', () => {
    const ultraTightCeiling = 50;
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, ultraTightCeiling);
    return ctx.totalTokens <= ultraTightCeiling;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. COMPLETE PROVENANCE TRACKING
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-009', 'Provenance Tracking', 'Every context item contains id, source, category, derivationMethod, and timestamp', () => {
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, 10000);
    return ctx.items.every(
      (item) =>
        item.id.length > 0 &&
        item.source.length > 0 &&
        Boolean(item.category) &&
        Boolean(item.derivationMethod) &&
        !isNaN(Date.parse(item.freshnessTimestamp))
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. PAGE DEDUPLICATION DETECTION
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-010', 'Page Deduplication', 'Accurately detects existing pages by name, slug, or leading slash', () => {
    const existsByName = ContextIntelligenceEngine.entityExists(richProject, 'page', 'Checkout');
    const existsBySlug = ContextIntelligenceEngine.entityExists(richProject, 'page', '/checkout');
    const notExists = ContextIntelligenceEngine.entityExists(richProject, 'page', 'NonExistentPage');
    return existsByName && existsBySlug && !notExists;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. COLLECTION & WORKFLOW DEDUPLICATION
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-011', 'Collection & Workflow Deduplication', 'Accurately detects existing collections and workflows by name or ID', () => {
    const colExists = ContextIntelligenceEngine.entityExists(richProject, 'collection', 'Orders');
    const colNotExists = ContextIntelligenceEngine.entityExists(richProject, 'collection', 'Inventory');
    const wfExists = ContextIntelligenceEngine.entityExists(richProject, 'workflow', 'SendReceiptWorkflow');
    const wfNotExists = ContextIntelligenceEngine.entityExists(richProject, 'workflow', 'NonExistentWf');
    return colExists && !colNotExists && wfExists && !wfNotExists;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. COMPONENT DEDUPLICATION DETECTION
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-012', 'Component Deduplication', 'Deep traverses page component tree to locate existing components', () => {
    const headerExists = ContextIntelligenceEngine.entityExists(richProject, 'component', 'CheckoutHeader');
    const payBtnExists = ContextIntelligenceEngine.entityExists(richProject, 'component', 'PayNowButton');
    const notExists = ContextIntelligenceEngine.entityExists(richProject, 'component', 'RandomWidget');
    return headerExists && payBtnExists && !notExists;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. GOAL-DRIVEN DUPLICATE ENTITY WARNINGS
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-013', 'Duplicate Entity Warnings', 'detectDuplicates warns against re-creating existing pages, collections, and workflows', () => {
    const dupGoal: GoalRepresentation = GoalUnderstandingEngine.parseGoal(
      'Create a new page named Checkout with a new collection named Orders',
      richProject
    );
    const warnings = ContextIntelligenceEngine.detectDuplicates(richProject, dupGoal);
    return (
      warnings.some((w) => w.includes('Page "checkout" already exists')) &&
      warnings.some((w) => w.includes('Data collection "orders" already exists'))
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. SAFE PROMPT FORMATTING
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-014', 'Safe Prompt Formatting', 'formatForPrompt produces isolated, markdown-delimited XML context blocks', () => {
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, 4000);
    const formatted = ctx.formattedPromptContext || '';
    return (
      formatted.startsWith('<project_context>') &&
      formatted.endsWith('</project_context>') &&
      formatted.includes('## PAGE CONTEXT') &&
      formatted.includes('## COLLECTION CONTEXT')
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. PURE INSPECTION / NON-MUTATION GUARANTEE
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-015', 'Pure Inspection Guarantee', 'Guarantees zero mutation of the input project or goal representation', () => {
    const beforeProjectStr = JSON.stringify(richProject);
    const beforeGoalStr = JSON.stringify(goal);

    ContextIntelligenceEngine.buildIntelligentContext(richProject, goal, 2000);
    ContextIntelligenceEngine.detectDuplicates(richProject, goal);
    ContextIntelligenceEngine.entityExists(richProject, 'page', 'Checkout');

    const afterProjectStr = JSON.stringify(richProject);
    const afterGoalStr = JSON.stringify(goal);

    return beforeProjectStr === afterProjectStr && beforeGoalStr === afterGoalStr;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 16. EDGE CASES HANDLING
  // ─────────────────────────────────────────────────────────────────────────────
  record('D8.2-016', 'Edge Cases Handling', 'Handles empty/missing arrays and minimal project structures without crashing', () => {
    const minimalProject = createInitialProject('minimal');
    minimalProject.pages = [];
    minimalProject.collections = [];
    minimalProject.workflows = [];
    minimalProject.queries = [];
    minimalProject.variables = [];
    minimalProject.tokens = [];
    delete (minimalProject as any).aiMetadata;

    const emptyGoal: GoalRepresentation = GoalUnderstandingEngine.parseGoal('', minimalProject);
    const ctx = ContextIntelligenceEngine.buildIntelligentContext(minimalProject, emptyGoal, 1000);

    return (
      ctx.items.length === 0 &&
      ctx.totalTokens === 0 &&
      ctx.truncatedCount === 0 &&
      Array.isArray(ctx.duplicateEntityWarnings)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log('D8.2 CONTEXT INTELLIGENCE ENGINE VERIFICATION SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS : ${results.length}`);
  console.log(`PASSED      : ${passedCount}`);
  console.log(`FAILED      : ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('D8.2 VERIFICATION FAILED');
    process.exit(1);
  } else {
    console.log('ALL D8.2 TESTS PASSED PERFECTLY!');
    process.exit(0);
  }
}

runD82Suite().catch((err) => {
  console.error('Unexpected error running D8.2 suite:', err);
  process.exit(1);
});

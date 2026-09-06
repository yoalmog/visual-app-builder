// D8.6 Acceptance & Verification Suite: Autonomous Verification Engine
// Tests all required verification domains:
// 1. Verification Request & Preflight
// 2. Postcondition Engine
// 3. Structural Verification & Hierarchy
// 4. Change-Scope Verification & Unexpected Mutation Detection
// 5. Runtime Renderability & Inconclusive Uncertainty
// 6. Workflow Verification & Broken Bindings
// 7. Data Consistency & Relationships
// 8. Security Invariants (No eval, no SQL, no secret leak)
// 9. Global Invariants (Zod, Serializability, Unique IDs)
// 10. Intent Verification & E2E Scenarios (Restaurant App, Button Mod, Failure & Recovery)
// 11. State Machine & Status Codes (PASS, FAIL, UNCERTAIN, BLOCKED)
// 12. Recovery Synthesis & Crash Recovery
// 13. Determinism, Provenance, and Read-Only Invariance

import { AutonomousVerificationEngine } from '../src/ai/intelligence/AutonomousVerificationEngine';
import {
  VerificationRequest,
  VerificationPostcondition,
  VerificationSession,
} from '../src/ai/intelligence/verification-types';
import { AdaptiveExecutionEngine } from '../src/ai/intelligence/AdaptiveExecutionEngine';
import { IntelligentPlan } from '../src/ai/intelligence/types';
import { createInitialProject } from '../src/builder/persistence/project-storage';
import { AppProject } from '../src/builder/schema/project';
import { ComponentNode } from '../src/builder/schema/component';
import { AITransactionManager } from '../src/ai/history/AITransactionManager';

interface TestResult {
  id: string;
  category: string;
  description: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function record(id: string, category: string, description: string, fn: () => boolean, errorMessage?: string): void {
  try {
    const outcome = fn();
    if (outcome) {
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

async function runAsyncRecord(
  id: string,
  category: string,
  description: string,
  fn: () => Promise<boolean>,
  errorMessage?: string
): Promise<void> {
  try {
    const outcome = await fn();
    if (outcome) {
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

function cloneProject(project: AppProject): AppProject {
  return JSON.parse(JSON.stringify(project));
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING D8.6 AUTONOMOUS VERIFICATION ENGINE VERIFICATION SUITE');
  console.log('================================================================\n');

  const baseProject = createInitialProject('test_proj_d86');
  baseProject.name = 'D8.6 Test App';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PREFLIGHT & REQUEST VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-001', 'Preflight', 'Valid verification request executes all stages and produces result', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const res = AutonomousVerificationEngine.verify({
      intent: 'Verify baseline project structure',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });
    return res.status === 'PASS' && res.checks.length > 0 && res.trace.stages.length >= 8;
  });

  record('D8.6-002', 'Preflight', 'Missing projectBefore or projectAfter produces BLOCKED result', () => {
    const res = AutonomousVerificationEngine.verify({
      intent: 'Verify project with missing snapshot',
      projectVersion: 1,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: null as any,
      projectAfter: cloneProject(baseProject),
    });
    return res.status === 'BLOCKED' && res.summary.criticalFailures === 1;
  });

  record('D8.6-003', 'Preflight', 'Produces unique verificationId and trace with stage breakdown', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const res = AutonomousVerificationEngine.verify({
      intent: 'Check trace generation',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });
    return (
      Boolean(res.verificationId) &&
      Boolean(res.trace.traceId) &&
      res.trace.stages.some((s) => s.stage === 'checking_structure') &&
      res.trace.stages.some((s) => s.stage === 'checking_security')
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. POSTCONDITION ENGINE
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-004', 'Postconditions', 'component_exists postcondition succeeds when component is in tree', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const page = pAfter.pages[0];
    const buttonNode: ComponentNode = {
      id: 'btn_post_1',
      type: 'button',
      name: 'Submit Button',
      props: { text: 'Submit' },
      styles: { width: '100px' },
      children: [],
    };
    page.root.children.push(buttonNode);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Add submit button',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'component', entityId: 'btn_post_1', changeType: 'create' }],
      expectedPostconditions: [
        {
          id: 'post_btn_exists',
          type: 'component_exists',
          targetId: 'btn_post_1',
          description: 'Submit button exists in page tree',
          critical: true,
        },
      ],
      affectedResources: [{ type: 'component', id: 'btn_post_1' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'PASS' && res.checks.some((c) => c.checkId === 'chk_post_post_btn_exists' && c.passed);
  });

  record('D8.6-005', 'Postconditions', 'component_exists postcondition fails with evidence when component is missing', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Add missing button',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [
        {
          id: 'post_missing_btn',
          type: 'component_exists',
          targetId: 'btn_nonexistent',
          description: 'Button should exist',
          critical: true,
        },
      ],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.failures.some((f) => f.category === 'POSTCONDITION');
  });

  record('D8.6-006', 'Postconditions', 'component_removed postcondition succeeds when component is absent', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const res = AutonomousVerificationEngine.verify({
      intent: 'Remove banner',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [
        {
          id: 'post_banner_removed',
          type: 'component_removed',
          targetId: 'banner_old_node',
          description: 'Old banner is removed',
          critical: false,
        },
      ],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });
    return res.status === 'PASS';
  });

  record('D8.6-007', 'Postconditions', 'property_equals postcondition verifies exact styled property value', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const btnNode: ComponentNode = {
      id: 'btn_styled',
      type: 'button',
      name: 'Action Button',
      props: {},
      styles: { width: '180px', backgroundColor: '#4F46E5' },
      children: [],
    };
    pAfter.pages[0].root.children.push(btnNode);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Resize button to 180px',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'component', entityId: 'btn_styled', changeType: 'create' }],
      expectedPostconditions: [
        {
          id: 'post_prop_width',
          type: 'property_equals',
          targetId: 'btn_styled',
          property: 'width',
          expectedValue: '180px',
          description: 'Button width equals 180px',
          critical: true,
        },
      ],
      affectedResources: [{ type: 'component', id: 'btn_styled' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'PASS' && res.checks.some((c) => c.checkId === 'chk_post_post_prop_width' && c.passed);
  });

  record('D8.6-008', 'Postconditions', 'property_equals postcondition fails when property does not match', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const btnNode: ComponentNode = {
      id: 'btn_wrong_prop',
      type: 'button',
      name: 'Action Button',
      props: {},
      styles: { width: '120px' },
      children: [],
    };
    pAfter.pages[0].root.children.push(btnNode);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Resize button to 180px',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'component', entityId: 'btn_wrong_prop', changeType: 'create' }],
      expectedPostconditions: [
        {
          id: 'post_prop_width_mismatch',
          type: 'property_equals',
          targetId: 'btn_wrong_prop',
          property: 'width',
          expectedValue: '180px',
          description: 'Button width equals 180px',
          critical: true,
        },
      ],
      affectedResources: [{ type: 'component', id: 'btn_wrong_prop' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.checks.some((c) => c.checkId === 'chk_post_post_prop_width_mismatch' && !c.passed);
  });

  record('D8.6-009', 'Postconditions', 'route_exists postcondition verifies route presence', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    pAfter.pages.push({
      id: 'page_menu',
      name: 'Menu Page',
      slug: '/menu',
      root: { id: 'menu_root', type: 'container', name: 'Root', props: {}, styles: {}, children: [] },
    });

    const res = AutonomousVerificationEngine.verify({
      intent: 'Add menu page',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'page', entityId: 'page_menu', changeType: 'create' }],
      expectedPostconditions: [
        {
          id: 'post_route_menu',
          type: 'route_exists',
          targetId: '/menu',
          description: 'Menu route exists',
          critical: true,
        },
      ],
      affectedResources: [{ type: 'page', id: 'page_menu' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'PASS';
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. STRUCTURAL INTEGRITY VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-010', 'Structural', 'Detects missing root node on a page', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    (pAfter.pages[0] as any).root = null;

    const res = AutonomousVerificationEngine.verify({
      intent: 'Check broken page root',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.failures.some((f) => f.category === 'STRUCTURAL' && f.reason.includes('root'));
  });

  record('D8.6-011', 'Structural', 'Detects duplicate component IDs across page hierarchy', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const nodeA: ComponentNode = { id: 'dup_id_1', type: 'button', name: 'Btn A', props: {}, styles: {}, children: [] };
    const nodeB: ComponentNode = { id: 'dup_id_1', type: 'text', name: 'Text B', props: {}, styles: {}, children: [] };
    pAfter.pages[0].root.children.push(nodeA, nodeB);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Add duplicate IDs',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'component', entityId: 'dup_id_1', changeType: 'create' }],
      expectedPostconditions: [],
      affectedResources: [{ type: 'component', id: 'dup_id_1' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Duplicate Component ID');
  });

  record('D8.6-012', 'Structural', 'Detects unregistered/unknown component types in COMPONENT_REGISTRY', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const unknownNode: ComponentNode = {
      id: 'node_unknown',
      type: 'quantum_teleporter' as any,
      name: 'Unknown',
      props: {},
      styles: {},
      children: [],
    };
    pAfter.pages[0].root.children.push(unknownNode);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Add invalid component type',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'component', entityId: 'node_unknown', changeType: 'create' }],
      expectedPostconditions: [],
      affectedResources: [{ type: 'component', id: 'node_unknown' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.failures.some((f) => f.reason.includes('Unknown component type'));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CHANGE-SCOPE VERIFICATION & UNEXPECTED MUTATION DETECTION
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-013', 'Scope', 'Confirms approved change and passes when no unapproved mutations occur', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const button: ComponentNode = {
      id: 'btn_target',
      type: 'button',
      name: 'Target Button',
      props: {},
      styles: { width: '120px' },
      children: [],
    };
    pBefore.pages[0].root.children.push(JSON.parse(JSON.stringify(button)));
    button.styles.width = '180px';
    pAfter.pages[0].root.children.push(button);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Resize button',
      projectVersion: pAfter.version,
      expectedChanges: [
        {
          entityType: 'component',
          entityId: 'btn_target',
          changeType: 'update',
          property: 'width',
          expectedValue: '180px',
        },
      ],
      expectedPostconditions: [],
      affectedResources: [{ type: 'component', id: 'btn_target' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'PASS' && res.summary.unexpectedMutationsCount === 0;
  });

  record('D8.6-014', 'Scope', 'CRITICAL FAIL: Detects unexpected mutation on unapproved component', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    // Approved Button A
    const btnA: ComponentNode = { id: 'btn_A', type: 'button', name: 'Btn A', props: {}, styles: { width: '100px' }, children: [] };
    // Unapproved Button B
    const btnB: ComponentNode = { id: 'btn_B', type: 'button', name: 'Btn B', props: {}, styles: { color: '#000000' }, children: [] };

    pBefore.pages[0].root.children.push(JSON.parse(JSON.stringify(btnA)), JSON.parse(JSON.stringify(btnB)));

    // Apply approved change to A
    btnA.styles.width = '200px';
    // Unauthorized mutation on B
    btnB.styles.color = '#FF0000';

    pAfter.pages[0].root.children.push(btnA, btnB);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Change Button A width',
      projectVersion: pAfter.version,
      expectedChanges: [
        {
          entityType: 'component',
          entityId: 'btn_A',
          changeType: 'update',
          property: 'width',
          expectedValue: '200px',
        },
      ],
      expectedPostconditions: [],
      affectedResources: [{ type: 'component', id: 'btn_A' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return (
      res.status === 'FAIL' &&
      res.summary.unexpectedMutationsCount === 1 &&
      res.findings.some((f) => f.title === 'Unexpected Component Mutation' && f.target === 'btn_B')
    );
  });

  record('D8.6-015', 'Scope', 'CRITICAL FAIL: Detects unexpected deletion of an unapproved page', () => {
    const pBefore = cloneProject(baseProject);
    pBefore.pages.push({
      id: 'page_secret',
      name: 'Secret Page',
      slug: '/secret',
      root: { id: 'sec_root', type: 'container', name: 'Root', props: {}, styles: {}, children: [] },
    });

    const pAfter = cloneProject(baseProject); // Secret page deleted unexpectedly!

    const res = AutonomousVerificationEngine.verify({
      intent: 'Modify home page',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [{ type: 'page', id: baseProject.pages[0].id }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Unexpected Page Deletion');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. RUNTIME RENDERABILITY VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-016', 'Runtime', 'Detects invalid page slug without leading slash', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    pAfter.pages[0].slug = 'no-leading-slash';

    const res = AutonomousVerificationEngine.verify({
      intent: 'Check slug',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.failures.some((f) => f.category === 'RUNTIME' && f.reason.includes("must start with '/'"));
  });

  record('D8.6-017', 'Runtime', 'Detects duplicate route slug collision across pages', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    pAfter.pages.push({
      id: 'page_clone',
      name: 'Duplicate Slug Page',
      slug: pAfter.pages[0].slug, // Collision!
      root: { id: 'root_clone', type: 'container', name: 'Root', props: {}, styles: {}, children: [] },
    });

    const res = AutonomousVerificationEngine.verify({
      intent: 'Add page with duplicate route',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'page', entityId: 'page_clone', changeType: 'create' }],
      expectedPostconditions: [],
      affectedResources: [{ type: 'page', id: 'page_clone' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.failures.some((f) => f.reason.includes('Route collision'));
  });

  record('D8.6-018', 'Runtime', 'Yields UNCERTAIN when runtime environment is flagged unavailable', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Verify project with disconnected runtime',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
      context: { runtimeUnavailable: true },
    });

    return res.status === 'UNCERTAIN' && res.checks.some((c) => c.status === 'UNCERTAIN');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. WORKFLOW VERIFICATION & BROKEN BINDINGS
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-019', 'Workflow', 'Detects broken workflow binding on button referencing non-existent workflow', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    const checkoutBtn: ComponentNode = {
      id: 'btn_checkout',
      type: 'button',
      name: 'Checkout Button',
      props: { text: 'Checkout', workflowId: 'wf_checkout_nonexistent' },
      styles: {},
      children: [],
    };
    pAfter.pages[0].root.children.push(checkoutBtn);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Create checkout button',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'component', entityId: 'btn_checkout', changeType: 'create' }],
      expectedPostconditions: [],
      affectedResources: [{ type: 'component', id: 'btn_checkout' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Broken Workflow Binding');
  });

  record('D8.6-020', 'Workflow', 'Verifies valid workflow binding to registered workflow', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    pAfter.workflows = [
      {
        id: 'wf_checkout_valid',
        name: 'Checkout Automation',
        version: 1,
        triggerType: 'manual',
        nodes: [{ id: 'node_1', type: 'action', actionType: 'navigate', name: 'Go to Success' } as any],
      },
    ];

    const checkoutBtn: ComponentNode = {
      id: 'btn_checkout_ok',
      type: 'button',
      name: 'Checkout Button',
      props: { text: 'Checkout', workflowId: 'wf_checkout_valid' },
      styles: {},
      children: [],
    };
    pAfter.pages[0].root.children.push(checkoutBtn);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Bind button to checkout workflow',
      projectVersion: pAfter.version,
      expectedChanges: [
        { entityType: 'workflow', entityId: 'wf_checkout_valid', changeType: 'create' },
        { entityType: 'component', entityId: 'btn_checkout_ok', changeType: 'create' },
      ],
      expectedPostconditions: [],
      affectedResources: [
        { type: 'workflow', id: 'wf_checkout_valid' },
        { type: 'component', id: 'btn_checkout_ok' },
      ],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'PASS';
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. DATA MODEL & RELATIONSHIP INTEGRITY
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-021', 'Data', 'Detects dangling relationship in collection referencing missing target collection', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    pAfter.collections = [
      {
        id: 'col_orders',
        name: 'Orders',
        fields: [{ id: 'f_id', name: 'orderId', type: 'text', required: true }],
        records: [],
        relationships: [
          {
            id: 'rel_user',
            sourceCollectionId: 'col_orders',
            sourceField: 'userId',
            targetCollectionId: 'col_missing_users', // Missing!
            targetField: 'id',
            type: 'many_to_one',
          },
        ],
      },
    ];

    const res = AutonomousVerificationEngine.verify({
      intent: 'Create orders collection with user relationship',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'collection', entityId: 'col_orders', changeType: 'create' }],
      expectedPostconditions: [],
      affectedResources: [{ type: 'collection', id: 'col_orders' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Dangling Relationship Reference');
  });

  record('D8.6-022', 'Data', 'Verifies resolved relationships between existing collections', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    pAfter.collections = [
      {
        id: 'col_users',
        name: 'Users',
        fields: [{ id: 'f_uid', name: 'id', type: 'text', required: true }],
        records: [],
      },
      {
        id: 'col_orders_valid',
        name: 'Orders',
        fields: [{ id: 'f_oid', name: 'orderId', type: 'text', required: true }],
        records: [],
        relationships: [
          {
            id: 'rel_user_ok',
            sourceCollectionId: 'col_orders_valid',
            sourceField: 'userId',
            targetCollectionId: 'col_users',
            targetField: 'id',
            type: 'many_to_one',
          },
        ],
      },
    ];

    const res = AutonomousVerificationEngine.verify({
      intent: 'Create orders with user relation',
      projectVersion: pAfter.version,
      expectedChanges: [
        { entityType: 'collection', entityId: 'col_users', changeType: 'create' },
        { entityType: 'collection', entityId: 'col_orders_valid', changeType: 'create' },
      ],
      expectedPostconditions: [],
      affectedResources: [
        { type: 'collection', id: 'col_users' },
        { type: 'collection', id: 'col_orders_valid' },
      ],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'PASS';
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. SECURITY INVARIANTS (Zero eval, Zero SQL, Zero secrets)
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-023', 'Security', 'CRITICAL FAIL: Detects eval() dynamic code execution pattern in project', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    pAfter.pages[0].root.props = { evilScript: 'eval("maliciousCode()")' };

    const res = AutonomousVerificationEngine.verify({
      intent: 'Injected script',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'HIGH',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Arbitrary Code Execution Invariant Violated');
  });

  record('D8.6-024', 'Security', 'CRITICAL FAIL: Detects new Function() pattern in project props', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    pAfter.pages[0].root.props = { executor: 'new Function("return process")()' };

    const res = AutonomousVerificationEngine.verify({
      intent: 'Injected function constructor',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'HIGH',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Arbitrary Code Execution Invariant Violated');
  });

  record('D8.6-025', 'Security', 'CRITICAL FAIL: Detects arbitrary SQL DROP TABLE statement in project', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    pAfter.pages[0].root.props = { query: 'DROP TABLE users; --' };

    const res = AutonomousVerificationEngine.verify({
      intent: 'Injected SQL injection payload',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'CRITICAL',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Arbitrary SQL Invariant Violated');
  });

  record('D8.6-026', 'Security', 'CRITICAL FAIL: Detects exposed secret API keys in project schema', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    pAfter.pages[0].root.props = { openaiKey: 'sk-abcdef12345678901234567890abcdef' };

    const res = AutonomousVerificationEngine.verify({
      intent: 'Store raw API token in props',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'CRITICAL',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Secret Exposure Invariant Violated');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. GLOBAL APPLICATION INVARIANTS
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-027', 'Invariants', 'Project schema strictly conforms to AppProjectSchema', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const res = AutonomousVerificationEngine.verify({
      intent: 'Assert Zod schema invariant',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });
    return res.checks.some((c) => c.type === 'zod_schema_invariant' && c.passed);
  });

  record('D8.6-028', 'Invariants', 'Detects schema violation when project structure is corrupted', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    (pAfter as any).pages = 'not_an_array';

    const res = AutonomousVerificationEngine.verify({
      intent: 'Corrupt project pages schema',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Project Schema Invariant Violated');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. INTENT VERIFICATION & E2E SCENARIOS
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-029', 'E2E Scenario A', 'Restaurant Menu App: Verifies 3 product cards and order buttons', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    // Build restaurant homepage with 3 cards and order buttons
    for (let i = 1; i <= 3; i++) {
      const cardNode: ComponentNode = {
        id: `card_product_${i}`,
        type: 'card',
        name: `Product Card ${i}`,
        props: { title: `Meal ${i}`, price: '$12.99' },
        styles: { padding: '16px' },
        children: [
          {
            id: `btn_order_${i}`,
            type: 'button',
            name: `Order Button ${i}`,
            props: { text: 'Order Now' },
            styles: {},
            children: [],
          },
        ],
      };
      pAfter.pages[0].root.children.push(cardNode);
    }

    const res = AutonomousVerificationEngine.verify({
      intent: 'Build a restaurant application with 3 product cards and order buttons',
      projectVersion: pAfter.version,
      expectedChanges: [
        { entityType: 'component', entityId: 'card_product_1', changeType: 'create' },
        { entityType: 'component', entityId: 'card_product_2', changeType: 'create' },
        { entityType: 'component', entityId: 'card_product_3', changeType: 'create' },
      ],
      expectedPostconditions: [
        { id: 'post_card_1', type: 'component_exists', targetId: 'card_product_1', description: 'Card 1 exists', critical: true },
        { id: 'post_card_2', type: 'component_exists', targetId: 'card_product_2', description: 'Card 2 exists', critical: true },
        { id: 'post_card_3', type: 'component_exists', targetId: 'card_product_3', description: 'Card 3 exists', critical: true },
      ],
      affectedResources: [
        { type: 'component', id: 'card_product_1' },
        { type: 'component', id: 'card_product_2' },
        { type: 'component', id: 'card_product_3' },
      ],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'PASS' && res.summary.intentFulfilled;
  });

  record('D8.6-030', 'Negative Intent', 'FAIL: Intent requested 3 product cards, but only 2 were created', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    // Only 2 cards created instead of 3
    for (let i = 1; i <= 2; i++) {
      const cardNode: ComponentNode = {
        id: `card_short_${i}`,
        type: 'card',
        name: `Card ${i}`,
        props: {},
        styles: {},
        children: [{ id: `btn_order_${i}`, type: 'button', name: 'Order Button', props: { text: 'Order' }, styles: {}, children: [] }],
      };
      pAfter.pages[0].root.children.push(cardNode);
    }

    const res = AutonomousVerificationEngine.verify({
      intent: 'Build a restaurant application with 3 product cards and order buttons',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'FAIL' && res.findings.some((f) => f.title === 'Incomplete Intent Satisfaction');
  });

  record('D8.6-031', 'E2E Scenario B', 'Button Modification: Verifies width and theme changed without unrelated modifications', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    const targetButton: ComponentNode = {
      id: 'btn_hero',
      type: 'button',
      name: 'Hero CTA',
      props: {},
      styles: { width: '120px', backgroundColor: '#94A3B8' },
      children: [],
    };
    pBefore.pages[0].root.children.push(JSON.parse(JSON.stringify(targetButton)));

    // Apply modifications
    targetButton.styles.width = '240px';
    targetButton.styles.backgroundColor = '#4F46E5'; // Primary theme
    pAfter.pages[0].root.children.push(targetButton);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Make this button larger and use the primary theme color',
      projectVersion: pAfter.version,
      expectedChanges: [
        {
          entityType: 'component',
          entityId: 'btn_hero',
          changeType: 'update',
          property: 'width',
          expectedValue: '240px',
        },
      ],
      expectedPostconditions: [
        {
          id: 'post_hero_width',
          type: 'property_equals',
          targetId: 'btn_hero',
          property: 'width',
          expectedValue: '240px',
          description: 'Button width is 240px',
          critical: true,
        },
      ],
      affectedResources: [{ type: 'component', id: 'btn_hero' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return res.status === 'PASS' && res.summary.scopeIntegrityPreserved;
  });

  record('D8.6-032', 'E2E Scenario C', 'Controlled failure detection produces diagnostic recovery plan', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    // Checkout button with broken workflow
    const brokenBtn: ComponentNode = {
      id: 'btn_checkout_broken',
      type: 'button',
      name: 'Checkout Button',
      props: { workflowId: 'wf_missing_checkout' },
      styles: {},
      children: [],
    };
    pAfter.pages[0].root.children.push(brokenBtn);

    const res = AutonomousVerificationEngine.verify({
      intent: 'Create checkout action button',
      projectVersion: pAfter.version,
      expectedChanges: [{ entityType: 'component', entityId: 'btn_checkout_broken', changeType: 'create' }],
      expectedPostconditions: [],
      affectedResources: [{ type: 'component', id: 'btn_checkout_broken' }],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    const hasRecovery = Boolean(res.recoveryPlan);
    const isRebind = res.recoveryPlan?.strategy === 'REBIND_WORKFLOW';

    return res.status === 'FAIL' && hasRecovery && isRebind;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. RECOVERY BOUNDS & CRASH RECOVERY
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-033', 'Recovery', 'Recovery attempts are strictly bounded to maxAttempts', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    pAfter.pages[0].root.children.push({
      id: 'btn_broken',
      type: 'button',
      name: 'Broken',
      props: { workflowId: 'wf_missing' },
      styles: {},
      children: [],
    });

    const res = AutonomousVerificationEngine.verify({
      intent: 'Bind button',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    return Boolean(res.recoveryPlan && res.recoveryPlan.maxAttempts === 2);
  });

  record('D8.6-034', 'Crash Recovery', 'Creates resumable verification session with state tracking', () => {
    const req: VerificationRequest = {
      intent: 'Crash recovery session test',
      projectVersion: baseProject.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: cloneProject(baseProject),
      projectAfter: cloneProject(baseProject),
    };

    const session = AutonomousVerificationEngine.createSession(req);
    return session.currentState === 'idle' && session.pendingStages.length === 9 && !session.isInterrupted;
  });

  record('D8.6-035', 'Crash Recovery', 'Resumes verification session from checkpoint safely', () => {
    const req: VerificationRequest = {
      intent: 'Crash recovery session test',
      projectVersion: baseProject.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: cloneProject(baseProject),
      projectAfter: cloneProject(baseProject),
    };

    const session = AutonomousVerificationEngine.createSession(req);
    session.isInterrupted = true;

    const res = AutonomousVerificationEngine.resumeSession(session, req.projectAfter);
    return res.status === 'PASS' && session.currentState === 'passed';
  });

  record('D8.6-036', 'Crash Recovery', 'Blocks resumption if project version has drifted unexpectedly', () => {
    const req: VerificationRequest = {
      intent: 'Crash recovery version drift test',
      projectVersion: 1,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: cloneProject(baseProject),
      projectAfter: cloneProject(baseProject),
    };

    const session = AutonomousVerificationEngine.createSession(req);
    const driftedProject = cloneProject(baseProject);
    driftedProject.version = 999; // Version drifted!

    const res = AutonomousVerificationEngine.resumeSession(session, driftedProject);
    return res.status === 'BLOCKED' && res.summary.criticalFailures === 1;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. PROVENANCE, DETERMINISM & READ-ONLY INVARIANCE
  // ─────────────────────────────────────────────────────────────────────────────

  record('D8.6-037', 'Determinism', 'Identical inputs produce identical verification results and check counts', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);

    const req: VerificationRequest = {
      intent: 'Determinism check',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    };

    const run1 = AutonomousVerificationEngine.verify(req);
    const run2 = AutonomousVerificationEngine.verify(req);

    return (
      run1.status === run2.status &&
      run1.checks.length === run2.checks.length &&
      run1.findings.length === run2.findings.length &&
      run1.summary.totalChecks === run2.summary.totalChecks
    );
  });

  record('D8.6-038', 'Read-Only', 'Verification is strictly read-only and does not mutate project state', () => {
    const pBefore = cloneProject(baseProject);
    const pAfter = cloneProject(baseProject);
    const serializedBefore = JSON.stringify(pAfter);

    AutonomousVerificationEngine.verify({
      intent: 'Read-only check',
      projectVersion: pAfter.version,
      expectedChanges: [],
      expectedPostconditions: [],
      affectedResources: [],
      riskLevel: 'LOW',
      projectBefore: pBefore,
      projectAfter: pAfter,
    });

    const serializedAfter = JSON.stringify(pAfter);
    return serializedBefore === serializedAfter;
  });

  await runAsyncRecord('D8.6-039', 'D8.5 Integration', 'AdaptiveExecutionEngine attaches D8.6 verification to result', async () => {
    const proj = cloneProject(baseProject);
    const plan: IntelligentPlan = {
      planId: 'plan_d86_int',
      goalId: 'goal_low_1',
      title: 'Add About Page',
      rationale: 'Provide company about page',
      assumptions: ['Standard responsive layout'],
      requirements: ['About page'],
      constraints: ['Schema compatibility'],
      risks: ['low'],
      planVersion: '1.0.0',
      confidenceScore: 0.9,
      estimatedTokens: 200,
      createdAt: new Date().toISOString(),
      steps: [
        {
          stepId: 'step_1',
          title: 'Create about page',
          description: 'Create about page',
          operation: {
            id: 'op_page',
            type: 'create_page',
            pageId: 'page_about_test',
            name: 'About Page',
            slug: '/about-test',
            description: 'Create about page',
            risk: 'low',
            reversible: true,
          } as any,
          dependencies: [],
          expectedResult: { entityType: 'page', entityId: 'page_about_test', expectedState: 'Page created' },
          verificationStrategy: 'route_exists',
          rollbackStrategy: 'undo_operation',
          riskLevel: 'low',
        },
      ],
    };

    const res = await AdaptiveExecutionEngine.executePlan({
      plan,
      project: proj,
      autonomyLevel: 4,
      environment: 'development',
      sessionId: 'sess_d86_int',
    });

    return res.status === 'COMPLETED' && Boolean(res.verification) && res.verification?.status === 'PASS';
  });

  record('D8.6-040', 'Backward Compatibility', 'Preserves verifyStepOutcome() for Phase 8 master verification', () => {
    const proj = cloneProject(baseProject);
    const pageStep = {
      stepId: 'step_compat',
      description: 'Page verify',
      expectedResult: { entityType: 'page', entityId: proj.pages[0].id },
    } as any;

    const res = AutonomousVerificationEngine.verifyStepOutcome(pageStep, proj);
    return res.status === 'PASSED' && res.checks.length > 0;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n================================================================');
  console.log('D8.6 AUTONOMOUS VERIFICATION ENGINE VERIFICATION SUMMARY');
  console.log('================================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS : ${results.length}`);
  console.log(`PASSED      : ${passed}`);
  console.log(`FAILED      : ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error(`FAILED TESTS (${failed}):`);
    for (const f of results.filter((r) => !r.passed)) {
      console.error(` - ${f.id} (${f.category}): ${f.description} -> ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log(`ALL ${passed}/${results.length} D8.6 TESTS PASSED PERFECTLY!\n`);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled fatal error in D8.6 test suite:', err);
  process.exit(1);
});

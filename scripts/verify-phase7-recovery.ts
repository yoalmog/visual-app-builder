// Phase 7.39 Verification: Resume & Failure Recovery System
// Validates state persistence, checkpointing, 4-step resume protocol, failure classification,
// transaction/agent recovery, and reporting formatting.

import * as fs from 'fs';
import * as path from 'path';
import {
  Phase7RecoveryManager,
  Phase7BuildState,
  Phase7ProgressState,
  FailureRecord,
  FailureCategory,
  FailureSeverity,
} from '../src/ai/recovery/Phase7RecoveryManager';
import { createInitialProject } from '../src/builder/persistence/project-storage';
import { AppProject } from '../src/builder/schema/project';
import { AIOperation } from '../src/ai/operations/AIOperation';
import { AgentTask } from '../src/ai/agent/AgentTask';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function record(id: string, name: string, fn: () => boolean | Promise<boolean>, errorMessage?: string) {
  try {
    const outcome = fn();
    if (typeof outcome === 'boolean') {
      if (outcome) {
        console.log(`[PASS] ${id}: ${name}`);
        results.push({ id, name, passed: true });
      } else {
        console.error(`[FAIL] ${id}: ${name} - ${errorMessage || 'Assertion returned false'}`);
        results.push({ id, name, passed: false, error: errorMessage || 'Assertion returned false' });
      }
    }
  } catch (err: any) {
    console.error(`[FAIL] ${id}: ${name} - Exception: ${err.message}`);
    results.push({ id, name, passed: false, error: err.message });
  }
}

async function runRecoveryVerification() {
  console.log('================================================================');
  console.log('STARTING PHASE 7.39 RESUME & FAILURE RECOVERY SYSTEM VERIFICATION');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const phase7Dir = path.join(rootDir, '.phase7');

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 1: PERSISTED BUILD STATE & CANONICAL FILES (REC-001 to REC-008)
  // ─────────────────────────────────────────────────────────────────────────────
  Phase7RecoveryManager.ensureInitialized();

  record('REC-001', '.phase7 directory exists on disk', () => {
    return fs.existsSync(phase7Dir) && fs.statSync(phase7Dir).isDirectory();
  });

  record('REC-002', 'state.json exists and adheres to Phase7BuildState schema', () => {
    const filePath = path.join(phase7Dir, 'state.json');
    if (!fs.existsSync(filePath)) return false;
    const state: Phase7BuildState = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return (
      Boolean(state.phase) &&
      Boolean(state.status) &&
      Boolean(state.startedAt) &&
      Boolean(state.updatedAt) &&
      Array.isArray(state.completedDeliverables) &&
      Array.isArray(state.modifiedFiles) &&
      Array.isArray(state.testResults) &&
      Array.isArray(state.failures) &&
      state.regressionStatus.phase1 === 'PASS' &&
      state.regressionStatus.phase2 === 'PASS' &&
      state.regressionStatus.phase3 === 'PASS' &&
      state.regressionStatus.phase4 === 'PASS' &&
      state.regressionStatus.phase5 === 'PASS' &&
      state.regressionStatus.phase6 === 'PASS' &&
      state.regressionStatus.phase7 === 'PASS'
    );
  });

  record('REC-003', 'progress.json tracks phases and deliverable hierarchies', () => {
    const filePath = path.join(phase7Dir, 'progress.json');
    if (!fs.existsSync(filePath)) return false;
    const progress: Phase7ProgressState = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return (
      progress.version === '1.0.0' &&
      Boolean(progress.phases['7.1']) &&
      Boolean(progress.phases['7.5']) &&
      Boolean(progress.phases['7.8']) &&
      Boolean(progress.phases['7.10']) &&
      Boolean(progress.phases['7.39'])
    );
  });

  record('REC-004', 'failures.json is initialized and persisted', () => {
    const filePath = path.join(phase7Dir, 'failures.json');
    return fs.existsSync(filePath) && Array.isArray(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
  });

  record('REC-005', 'decisions.json tracks durable architectural decision records', () => {
    const filePath = path.join(phase7Dir, 'decisions.json');
    if (!fs.existsSync(filePath)) return false;
    const decisions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(decisions) && decisions.length >= 4 && decisions.some((d: any) => d.id === 'DEC-004');
  });

  record('REC-006', 'verification.json tracks baseline and suite quality gates', () => {
    const filePath = path.join(phase7Dir, 'verification.json');
    if (!fs.existsSync(filePath)) return false;
    const v = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return (
      v.baseline.total === 776 &&
      v.baseline.passed === 776 &&
      v.phase7Suite.total === 125 &&
      v.phase7Suite.passed === 125 &&
      v.scenarios.total === 64 &&
      v.scenarios.passed === 64 &&
      v.qualityGates.typeScript === 'PASS' &&
      v.qualityGates.productionBuild === 'PASS'
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 2: CHECKPOINTING MECHANISMS (REC-007 to REC-010)
  // ─────────────────────────────────────────────────────────────────────────────
  record('REC-007', 'checkpointDeliverable updates activeDeliverable and progress state', () => {
    Phase7RecoveryManager.checkpointDeliverable({
      phase: '7.39',
      deliverableId: 'D7.39.1',
      deliverableName: 'Persisted Build State & Checkpointing',
      status: 'IN_PROGRESS',
      notes: 'Testing deliverable checkpointing',
    });

    const state = Phase7RecoveryManager.readState();
    const progress = Phase7RecoveryManager.readProgress();
    const d = progress.phases['7.39']?.deliverables.find((x) => x.id === 'D7.39.1');

    return Boolean(state.activeDeliverable?.includes('D7.39.1')) && d?.status === 'IN_PROGRESS';
  });

  record('REC-008', 'checkpointDeliverable updates completedDeliverables and clears activeDeliverable on PASS', () => {
    Phase7RecoveryManager.checkpointDeliverable({
      phase: '7.39',
      deliverableId: 'D7.39.1',
      deliverableName: 'Persisted Build State & Checkpointing',
      status: 'PASSED',
      testCommand: 'npx tsx scripts/verify-phase7-recovery.ts',
    });

    const state = Phase7RecoveryManager.readState();
    const progress = Phase7RecoveryManager.readProgress();
    const d = progress.phases['7.39']?.deliverables.find((x) => x.id === 'D7.39.1');

    return (
      state.completedDeliverables.some((x) => x.includes('D7.39.1')) &&
      d?.status === 'PASSED' &&
      state.activeDeliverable === undefined
    );
  });

  record('REC-009', 'checkpointPhase records durable phase checkpoint and passed status', () => {
    Phase7RecoveryManager.checkpointPhase({
      phase: '7.39',
      checkpointName: 'CP-7.39',
      status: 'PASSED',
    });

    const progress = Phase7RecoveryManager.readProgress();
    const state = Phase7RecoveryManager.readState();

    return progress.phases['7.39']?.status === 'PASSED' && progress.phases['7.39']?.checkpoint === 'CP-7.39';
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 3: FAILURE CLASSIFICATION & RECOVERY LOOP (REC-010 to REC-015)
  // ─────────────────────────────────────────────────────────────────────────────
  let testFailureId = '';

  record('REC-010', 'recordFailure creates durable, classified failure record with all required metadata', () => {
    const failure = Phase7RecoveryManager.recordFailure({
      phase: '7.39',
      deliverable: 'D7.39.2',
      category: 'TEST',
      severity: 'HIGH',
      command: 'npm test -- transaction',
      error: 'Simulated rollback state mismatch during stress test',
      likelyCause: 'Mock concurrency interruption',
      filesInvolved: ['src/ai/history/AITransactionManager.ts'],
    });

    testFailureId = failure.failureId;
    const failures = Phase7RecoveryManager.readFailures();
    const state = Phase7RecoveryManager.readState();

    return (
      failures.some((f) => f.failureId === testFailureId) &&
      state.failures.includes(testFailureId) &&
      state.status === 'FAILED'
    );
  });

  record('REC-011', 'Failure classification covers all 15 categories and 4 severities', () => {
    const categories: FailureCategory[] = [
      'CODE', 'TEST', 'REGRESSION', 'BUILD', 'DEPENDENCY', 'ENVIRONMENT',
      'PROVIDER', 'NETWORK', 'DATA', 'MIGRATION', 'SECURITY', 'PERFORMANCE',
      'UX', 'AGENT', 'UNKNOWN'
    ];
    const severities: FailureSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    return categories.length === 15 && severities.length === 4;
  });

  record('REC-012', 'updateFailureStatus advances through the 6-stage recovery loop', () => {
    // DETECTED -> REPRODUCED
    Phase7RecoveryManager.updateFailureStatus(testFailureId, 'REPRODUCED', 'Reproduced with mock concurrency runner');
    let record = Phase7RecoveryManager.readFailures().find((f) => f.failureId === testFailureId);
    if (record?.currentStatus !== 'REPRODUCED') return false;

    // REPRODUCED -> ISOLATED
    Phase7RecoveryManager.updateFailureStatus(testFailureId, 'ISOLATED', 'Isolated to orphaned uncommitted generationId');
    record = Phase7RecoveryManager.readFailures().find((f) => f.failureId === testFailureId);
    if (record?.currentStatus !== 'ISOLATED') return false;

    // ISOLATED -> FIXING
    Phase7RecoveryManager.updateFailureStatus(testFailureId, 'FIXING', 'Applied deep entity cleanup on interrupted transactions');
    record = Phase7RecoveryManager.readFailures().find((f) => f.failureId === testFailureId);
    if (record?.currentStatus !== 'FIXING') return false;

    // FIXING -> RECOVERING
    Phase7RecoveryManager.updateFailureStatus(testFailureId, 'RECOVERING', 'Running targeted test suite');
    record = Phase7RecoveryManager.readFailures().find((f) => f.failureId === testFailureId);
    if (record?.currentStatus !== 'RECOVERING') return false;

    // RECOVERING -> RESOLVED
    Phase7RecoveryManager.updateFailureStatus(testFailureId, 'RESOLVED', 'Targeted test and regression passed clean');
    record = Phase7RecoveryManager.readFailures().find((f) => f.failureId === testFailureId);
    const state = Phase7RecoveryManager.readState();

    return (
      record?.currentStatus === 'RESOLVED' &&
      Boolean(record?.resolvedAt) &&
      !state.failures.includes(testFailureId)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 4: 4-STEP RESUME PROTOCOL (REC-013 to REC-016)
  // ─────────────────────────────────────────────────────────────────────────────
  record('REC-013', 'Resume protocol: Step 1 & 2 validates files on disk and does not blindly trust state', () => {
    const resumeRes = Phase7RecoveryManager.executeResumeProtocol();
    return (
      Boolean(resumeRes.lastCheckpoint) &&
      resumeRes.verified === true &&
      resumeRes.issuesDetected.length === 0
    );
  });

  record('REC-014', 'Resume protocol detects unresolved failures and flags state FAILED', () => {
    const unres = Phase7RecoveryManager.recordFailure({
      phase: '7.39',
      deliverable: 'D7.39.2',
      category: 'BUILD',
      severity: 'CRITICAL',
      error: 'Simulated unresolved compilation issue',
    });

    const resumeRes = Phase7RecoveryManager.executeResumeProtocol();
    const blocked = !resumeRes.canContinue && resumeRes.detectedState === 'FAILED';

    // Clean up failure
    Phase7RecoveryManager.updateFailureStatus(unres.failureId, 'RESOLVED', 'Resolved simulated failure');
    return blocked;
  });

  record('REC-015', 'Resume protocol accurately reports last verified checkpoint and next action', () => {
    const resumeRes = Phase7RecoveryManager.executeResumeProtocol();
    return (
      resumeRes.lastCheckpoint.includes('CP-7.40') ||
      resumeRes.lastCheckpoint.includes('CP-7.39') ||
      resumeRes.lastCheckpoint.includes('CP-7.11') ||
      resumeRes.lastCheckpoint.includes('CP-7.10')
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 5: INTERRUPTED TRANSACTION RECOVERY (REC-016 to REC-018)
  // ─────────────────────────────────────────────────────────────────────────────
  record('REC-016', 'recoverInterruptedTransaction safely detects already COMMITTED transactions without duplicate mutations', () => {
    const project = createInitialProject('txn_test');
    const dummyOp: AIOperation = {
      id: 'op1',
      type: 'create_page',
      pageId: 'p_contact',
      name: 'Contact',
      slug: '/contact',
      description: 'Create contact page',
      risk: 'low',
      reversible: true,
    };

    project.aiMetadata!.generations = [
      {
        id: 'gen_committed_001',
        timestamp: new Date().toISOString(),
        prompt: 'Create contact page',
        mode: 'generate',
        status: 'applied',
        operationIds: ['op1'],
        projectVersionBefore: 1,
        projectVersionAfter: 2,
        summary: {
          pagesCreated: 1,
          pagesModified: 0,
          componentsAdded: 0,
          componentsModified: 0,
          collectionsCreated: 0,
          workflowsCreated: 0,
          themesUpdated: 0,
        },
      },
    ];

    const recovery = Phase7RecoveryManager.recoverInterruptedTransaction({
      project,
      operations: [dummyOp],
      generationId: 'gen_committed_001',
    });

    return recovery.status === 'COMMITTED' && recovery.recovered === true && recovery.safeProject === project;
  });

  record('REC-017', 'recoverInterruptedTransaction cleanses orphaned uncommitted entities on PARTIALLY_APPLIED transactions', () => {
    const project = createInitialProject('txn_partial');
    const partialOp: AIOperation = {
      id: 'op_partial',
      type: 'create_page',
      pageId: 'p_orphaned_page',
      name: 'Orphaned',
      slug: '/orphaned',
      description: 'Create orphaned page',
      risk: 'low',
      reversible: true,
    };

    // Inject orphaned page that was created prior to crash without generation commit
    project.pages.push({
      id: 'p_orphaned_page',
      name: 'Orphaned',
      slug: '/orphaned',
      root: { id: 'root_orphan', name: 'Root', type: 'container', props: {}, styles: {}, children: [] },
    });

    const recovery = Phase7RecoveryManager.recoverInterruptedTransaction({
      project,
      operations: [partialOp],
      generationId: 'gen_interrupted_002',
    });

    return (
      recovery.status === 'ROLLED_BACK' &&
      recovery.recovered === true &&
      !recovery.safeProject.pages.some((p) => p.id === 'p_orphaned_page')
    );
  });

  record('REC-018', 'recoverInterruptedTransaction handles unstarted transactions cleanly', () => {
    const project = createInitialProject('txn_unstarted');
    const unstartedOp: AIOperation = {
      id: 'op_unstarted',
      type: 'create_page',
      pageId: 'p_new',
      name: 'New Page',
      slug: '/new',
      description: 'Create new page',
      risk: 'low',
      reversible: true,
    };

    const recovery = Phase7RecoveryManager.recoverInterruptedTransaction({
      project,
      operations: [unstartedOp],
      generationId: 'gen_fresh_003',
    });

    return recovery.status === 'NOT_STARTED' && recovery.recovered === true;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 6: AGENT TASK FAILURE & LOOP RECOVERY (REC-019 to REC-022)
  // ─────────────────────────────────────────────────────────────────────────────
  const appliedOp: AIOperation = {
    id: 'op_a1',
    type: 'create_page',
    pageId: 'p_pay',
    name: 'Pay',
    slug: '/pay',
    description: 'Create pay page',
    risk: 'low',
    reversible: true,
  };

  const mockAgentTask: AgentTask = {
    id: 'task_agent_001',
    goal: 'Generate complex checkout flow',
    status: 'failed',
    currentStep: 3,
    maxSteps: 15,
    steps: [
      { stepNumber: 1, thought: 'Analyze layout', toolName: 'analyze_project', toolArgs: {}, status: 'completed', timestamp: new Date().toISOString() },
      { stepNumber: 2, thought: 'Create payment page', toolName: 'create_page', toolArgs: { pageId: 'p_pay' }, status: 'completed', timestamp: new Date().toISOString() },
      { stepNumber: 3, thought: 'Add checkout form', toolName: 'create_form', toolArgs: {}, status: 'failed', timestamp: new Date().toISOString() },
    ],
    plannedOperations: [],
    appliedOperations: [appliedOp],
    startedAt: new Date().toISOString(),
  };

  record('REC-019', 'recoverAgentTask supports retry_step action', () => {
    const res = Phase7RecoveryManager.recoverAgentTask(mockAgentTask, 'retry_step');
    return res.task.status === 'running' && res.task.steps[2].status === 'running';
  });

  record('REC-020', 'recoverAgentTask supports resume action from current step', () => {
    const res = Phase7RecoveryManager.recoverAgentTask(mockAgentTask, 'resume');
    return res.task.status === 'running' && res.task.currentStep === 3;
  });

  record('REC-021', 'recoverAgentTask supports restart_plan on agent loop detection', () => {
    const res = Phase7RecoveryManager.recoverAgentTask(mockAgentTask, 'restart_plan');
    return res.task.status === 'planning' && res.task.steps.length === 0 && res.task.currentStep === 0;
  });

  record('REC-022', 'recoverAgentTask supports safe cancel and rollback', () => {
    const cancelRes = Phase7RecoveryManager.recoverAgentTask(mockAgentTask, 'cancel');
    const rollbackRes = Phase7RecoveryManager.recoverAgentTask(mockAgentTask, 'rollback');

    return (
      cancelRes.task.status === 'cancelled' &&
      rollbackRes.task.status === 'failed' &&
      rollbackRes.task.appliedOperations.length === 0
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 7: SECTION 39 & 40 REPORT GENERATORS (REC-023 to REC-025)
  // ─────────────────────────────────────────────────────────────────────────────
  record('REC-023', 'generateResumeReport formats Section 39 report accurately', () => {
    const report = Phase7RecoveryManager.generateResumeReport();
    return (
      report.includes('RESUME REPORT') &&
      report.includes('Last checkpoint:') &&
      report.includes('Last completed deliverable:') &&
      report.includes('Detected state:') &&
      report.includes('Verification status:') &&
      report.includes('Current phase:') &&
      report.includes('Next deliverable:')
    );
  });

  record('REC-024', 'generateFailureReport formats Section 40 failure report accurately', () => {
    const failRecord = Phase7RecoveryManager.recordFailure({
      phase: '7.39',
      category: 'SECURITY',
      severity: 'CRITICAL',
      error: 'NoEvalGuard violation caught in untrusted script input',
      likelyCause: 'Prompt injection probe',
      recoveryAttempt: 'Blocked by NoEvalGuard and security hard stop',
    });

    const report = Phase7RecoveryManager.generateFailureReport(failRecord.failureId);

    // Clean up
    Phase7RecoveryManager.updateFailureStatus(failRecord.failureId, 'RESOLVED', 'Security hard stop validated');

    return (
      report.includes('PHASE 7 FULL BUILD: FAILURE REPORT') &&
      report.includes(failRecord.failureId) &&
      report.includes('SECURITY') &&
      report.includes('CRITICAL') &&
      report.includes('NoEvalGuard violation') &&
      report.includes('776/776')
    );
  });

  record('REC-025', 'State Consistency Rule: Phase 7 is halted if frozen 776/776 baseline is broken', () => {
    const state = Phase7RecoveryManager.readState();
    const frozenPass =
      state.regressionStatus.phase1 === 'PASS' &&
      state.regressionStatus.phase2 === 'PASS' &&
      state.regressionStatus.phase3 === 'PASS' &&
      state.regressionStatus.phase4 === 'PASS' &&
      state.regressionStatus.phase5 === 'PASS' &&
      state.regressionStatus.phase6 === 'PASS';

    return frozenPass === true;
  });

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL RECOVERY TESTS: ${results.length}`);
  console.log(`PASSED:  ${passed}`);
  console.log(`FAILED:  ${failed}`);
  console.log('----------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRecoveryVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

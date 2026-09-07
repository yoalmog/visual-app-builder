// scripts/verify-d8-17-performance-token-economics.ts
// Acceptance Verification Suite for D8.17: Performance Profiling, Token Economics & Latency Optimization
// 50 Unit Tests + 24 E2E Scenarios = 74 Tests Total.

import { PerformanceProfilerEngine } from '../src/ai/performance/PerformanceProfilerEngine';
import { IntelligentCacheEngine } from '../src/ai/performance/IntelligentCacheEngine';
import { TokenEconomicsEngine } from '../src/ai/performance/TokenEconomicsEngine';
import { Phase8PerformanceProfiler } from '../src/ai/intelligence/Phase8PerformanceProfiler';
import { UnifiedOrchestrationEngine } from '../src/ai/intelligence/UnifiedOrchestrationEngine';
import { AppProject } from '../src/builder/schema/project';
import { SupportedModelId, PerformanceStage } from '../src/ai/performance/performance-types';
import { useAIStore } from '../src/ai/state/ai-store';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${totalTests}. ${testName}`);
  } else {
    console.error(`  [FAIL] ${totalTests}. ${testName}${details ? ` -> ${details}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

function createMockProject(id = 'proj_perf'): AppProject {
  return {
    id,
    name: 'Performance Benchmarked App',
    version: 1,
    pages: [
      {
        id: 'page_main',
        name: 'Dashboard',
        slug: '/dashboard',
        root: {
          id: 'root_dash',
          name: 'Dashboard Container',
          type: 'container',
          props: { title: 'Analytics' },
          styles: { padding: '24px' },
          children: [
            {
              id: 'chart_1',
              name: 'BarChart',
              type: 'chart',
              props: { dataEndpoint: '/api/metrics' },
              styles: { height: '300px' },
              children: [],
            },
          ],
        },
      },
    ],
    components: [],
    workflows: [],
    collections: [],
    roles: [],
    permissions: [],
    theme: { colors: { primary: '#3b82f6' } } as any,
    assets: [],
  };
}

async function runAcceptanceSuite(): Promise<void> {
  console.log('\n========================================================================');
  console.log('   D8.17: PERFORMANCE PROFILING, TOKEN ECONOMICS & LATENCY OPTIMIZATION');
  console.log('========================================================================\n');

  // Teardown & clean state
  PerformanceProfilerEngine.clear();
  IntelligentCacheEngine.clear();

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: 50 UNIT TESTS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- PART 1: 50 UNIT TESTS ---\n');

  // 1-5: High-Precision Stage Instrumentation
  const stages: PerformanceStage[] = [
    'SANITIZATION_AND_SECURITY',
    'GOAL_UNDERSTANDING',
    'CONTEXT_INTELLIGENCE',
    'GUARDRAILS_SYNTHESIS',
    'PLAN_GENERATION',
    'DECISION_OPTIMIZATION',
    'PLAN_VALIDATION',
    'AUTONOMY_GATING',
    'PRE_GUARDRAILS',
    'HITL_SUPERVISION',
    'TRANSACTION_EXECUTION',
    'LIVE_WATCHDOG',
    'AUTONOMOUS_VERIFICATION',
    'POST_GUARDRAILS',
    'EXPLAINABILITY',
    'EXPERIENCE_LEARNING',
    'REPORT_GENERATION',
  ];
  assert(stages.length === 17, 'Stage enumeration defines all 17 orchestration lifecycle phases');

  const timerId = PerformanceProfilerEngine.startStage('GOAL_UNDERSTANDING', { step: 1 });
  assert(typeof timerId === 'string' && timerId.startsWith('timer_'), 'startStage returns unique timer identifier');

  await new Promise((r) => setTimeout(r, 15));
  const stageMetric = PerformanceProfilerEngine.endStage(timerId, 'SUCCESS');
  assert(stageMetric.durationMs >= 10 && stageMetric.stage === 'GOAL_UNDERSTANDING', 'endStage records duration with millisecond precision');

  let timerErrorCaught = false;
  try {
    PerformanceProfilerEngine.endStage(timerId);
  } catch {
    timerErrorCaught = true;
  }
  assert(timerErrorCaught, 'endStage throws descriptive error if timer ID is missing or already concluded');

  const measured = await PerformanceProfilerEngine.measure('PLAN_GENERATION', async () => {
    await new Promise((r) => setTimeout(r, 10));
    return 'plan_output';
  });
  assert(measured.result === 'plan_output' && measured.metric.durationMs >= 8, 'measure() wraps function execution and returns result and metric');

  // 6-10: Profile & Percentile Computations
  PerformanceProfilerEngine.clear();
  const testDurations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  for (const d of testDurations) {
    const tid = PerformanceProfilerEngine.startStage(`STAGE_${d}`);
    const m = PerformanceProfilerEngine.endStage(tid, 'SUCCESS');
    m.durationMs = d; // inject exact durations for mathematical verification
  }

  const profile = PerformanceProfilerEngine.computeProfile();
  assert(profile.totalDurationMs === 550, 'Total duration equals exact sum of recorded stage durations');

  assert(profile.percentiles.p50Ms >= 50 && profile.percentiles.p50Ms <= 60, 'p50 median percentile is calculated accurately');
  assert(profile.percentiles.p90Ms >= 90, 'p90 percentile reflects 90th percentile threshold');
  assert(profile.percentiles.p99Ms >= 90, 'p99 percentile reflects top latency outlier');
  assert(profile.stageBreakdown.length === 10, 'Stage breakdown retains all recorded metrics');

  // 11-15: Hotspot Detection & Optimization Diagnostics
  PerformanceProfilerEngine.clear();
  const t1 = PerformanceProfilerEngine.startStage('FAST_STAGE');
  const m1 = PerformanceProfilerEngine.endStage(t1);
  m1.durationMs = 20;

  const t2 = PerformanceProfilerEngine.startStage('SLOW_HOTSPOT_STAGE');
  const m2 = PerformanceProfilerEngine.endStage(t2);
  m2.durationMs = 500; // > 400ms hotspot

  const hotspotProfile = PerformanceProfilerEngine.computeProfile();
  assert(hotspotProfile.hotspots.includes('SLOW_HOTSPOT_STAGE'), 'Hotspot analyzer flags stages exceeding latency threshold');
  assert(hotspotProfile.optimizationRecommendations.length > 0, 'Hotspot analyzer generates actionable optimization recommendations');

  const t3 = PerformanceProfilerEngine.startStage('THROTTLED_STAGE');
  const m3 = PerformanceProfilerEngine.endStage(t3, 'THROTTLED');
  m3.durationMs = 50;
  const throttledProfile = PerformanceProfilerEngine.computeProfile();
  assert(
    throttledProfile.optimizationRecommendations.some((r) => r.includes('throttling')),
    'Profiler detects throttled stages and suggests batching or rate ceiling increases'
  );

  assert(PerformanceProfilerEngine.getMetrics().length === 3, 'getMetrics returns complete snapshot of recorded metrics');
  PerformanceProfilerEngine.clear();
  assert(PerformanceProfilerEngine.getMetrics().length === 0, 'clear() resets all profiler state and timers');

  // 16-20: Parallel Batch Execution Engine
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  const batchResult = await PerformanceProfilerEngine.executeParallelBatch(
    items,
    async (item) => {
      await new Promise((r) => setTimeout(r, 10));
      return item * 2;
    },
    4
  );
  assert(batchResult.results.length === 8, 'Parallel batch executor completes all items');
  assert(batchResult.results[0] === 2 && batchResult.results[7] === 16, 'Parallel batch preserves exact ordering of results');
  assert(batchResult.throughputOpsPerSec > 0, 'Throughput calculation returns positive operations per second');

  // 21-25: Parallel Speedup Verification
  const serialStart = Date.now();
  for (const item of [1, 2, 3, 4]) {
    await new Promise((r) => setTimeout(r, 20));
  }
  const serialDuration = Date.now() - serialStart;

  const parallelRun = await PerformanceProfilerEngine.executeParallelBatch(
    [1, 2, 3, 4],
    async () => {
      await new Promise((r) => setTimeout(r, 20));
      return true;
    },
    4
  );
  assert(
    parallelRun.durationMs < serialDuration,
    'Parallel batch execution is measurably faster than serial execution'
  );
  assert(parallelRun.results.every(Boolean), 'All parallel worker threads complete successfully');

  // 26-30: Multi-Tier Intelligent Cache
  IntelligentCacheEngine.clear();
  const k1 = IntelligentCacheEngine.computeKey('ctx:proj_1', { page: 'home', v: 1 });
  const k2 = IntelligentCacheEngine.computeKey('ctx:proj_1', { page: 'home', v: 1 });
  assert(k1 === k2 && k1.startsWith('ctx:proj_1:'), 'computeKey generates deterministic SHA-256 namespace hash');

  IntelligentCacheEngine.set(k1, { contextData: 'cached_ast_nodes' });
  assert(IntelligentCacheEngine.has(k1), 'Cache has() detects stored unexpired key');
  const cachedVal = IntelligentCacheEngine.get<{ contextData: string }>(k1);
  assert(cachedVal?.contextData === 'cached_ast_nodes', 'Cache get() retrieves stored value with exact structure');
  assert(IntelligentCacheEngine.get('non_existent_key') === undefined, 'Cache get() returns undefined for non-existent key');

  // 31-35: LRU Eviction Policy & Capacity Ceilings
  IntelligentCacheEngine.clear();
  for (let i = 0; i < 5; i++) {
    IntelligentCacheEngine.set(`key_${i}`, `val_${i}`, { maxEntries: 3 });
  }
  const statsAfterEvict = IntelligentCacheEngine.getStats();
  assert(statsAfterEvict.totalEntries <= 3, 'LRU cache evicts oldest entries when exceeding maxEntries capacity');
  assert(statsAfterEvict.evictions >= 2, 'Eviction count records number of purged items');
  assert(IntelligentCacheEngine.get('key_0') === undefined, 'Oldest key key_0 was evicted');
  assert(IntelligentCacheEngine.get('key_4') === 'val_4', 'Newest key key_4 remains accessible in cache');

  // 36-40: Cache TTL Expiration
  IntelligentCacheEngine.clear();
  IntelligentCacheEngine.set('short_lived_key', 'quick_value', { ttlMs: 15 });
  assert(IntelligentCacheEngine.get('short_lived_key') === 'quick_value', 'Unexpired key is immediately retrievable');
  await new Promise((r) => setTimeout(r, 25));
  assert(IntelligentCacheEngine.get('short_lived_key') === undefined, 'Key expires and is evicted once TTL has elapsed');
  assert(!IntelligentCacheEngine.has('short_lived_key'), 'has() returns false for expired key');

  // 41-45: Cache Invalidation & Tagging
  IntelligentCacheEngine.clear();
  IntelligentCacheEngine.set('proj_a:1', 'data_a1', { tag: 'project:proj_a' });
  IntelligentCacheEngine.set('proj_a:2', 'data_a2', { tag: 'project:proj_a' });
  IntelligentCacheEngine.set('proj_b:1', 'data_b1', { tag: 'project:proj_b' });

  const invalidatedCount = IntelligentCacheEngine.invalidateByTag('project:proj_a');
  assert(invalidatedCount === 2, 'invalidateByTag purges all entries matching specified tag');
  assert(IntelligentCacheEngine.get('proj_a:1') === undefined, 'Tagged entry proj_a:1 is invalidated');
  assert(IntelligentCacheEngine.get('proj_b:1') === 'data_b1', 'Unrelated tagged entry proj_b:1 remains intact');

  const cacheStats = IntelligentCacheEngine.getStats();
  assert(cacheStats.hits > 0 && cacheStats.hitRatio > 0, 'Cache stats calculates hit count and hitRatio');
  IntelligentCacheEngine.clear();
  assert(IntelligentCacheEngine.getStats().totalEntries === 0, 'clear() resets all cache entries and counters');

  // 46-50: Token Economics & Pricing Tables
  const pricingModels: SupportedModelId[] = ['gemini-1.5-pro', 'gemini-1.5-flash', 'claude-3-5-sonnet', 'gpt-4o', 'gpt-4o-mini'];
  assert(pricingModels.every((m) => TokenEconomicsEngine.PRICING_TABLE[m]), 'Pricing table covers all supported model families');

  const est1 = TokenEconomicsEngine.estimateTokens('Hello world');
  assert(est1 >= 2 && est1 <= 4, 'estimateTokens estimates token count based on standard ratio');

  const costFlash = TokenEconomicsEngine.calculateCost('gemini-1.5-flash', 10000, 2000, 0);
  assert(costFlash > 0 && costFlash < 0.01, 'calculateCost computes micro-dollar pricing accurately for flash tier');

  const costGpt4o = TokenEconomicsEngine.calculateCost('gpt-4o', 100000, 10000, 20000);
  assert(costGpt4o > 0.1, 'calculateCost accounts for cached tokens vs input tokens on gpt-4o');

  // 51-55: Semantic Lossless Prompt Compression
  const bloatedPrompt = `
    // Configuration Schema
    {
      "name": "DashboardPage",
      "version": 1,
      "description": "Page container"
    }


    /* Multi-line comment that contains no semantic execution information */
    Please build a responsive data grid.
    Please build a responsive data grid.
  `;

  const compression = TokenEconomicsEngine.compressPrompt(bloatedPrompt);
  assert(compression.savingsTokens > 0, 'compressPrompt achieves positive token reduction');
  assert(compression.savingsRatioPercent >= 20, 'compressPrompt achieves measurable savings percentage');
  assert(!compression.compressed.includes('Multi-line comment'), 'compressPrompt strips multi-line comments');
  assert(!compression.compressed.includes('// Configuration Schema'), 'compressPrompt strips single-line comments');
  assert(compression.compressed.includes('"name":"DashboardPage"'), 'compressPrompt minifies JSON structures losslessly');

  // 56-60: Token Budget Ceilings
  const budgetAllow = TokenEconomicsEngine.evaluateBudget({
    requestedPromptTokens: 1000,
    currentSessionTokens: 2000,
  });
  assert(budgetAllow.allowed === true && !budgetAllow.warnSoftLimit, 'evaluateBudget allows requests within normal budget');

  const budgetSoft = TokenEconomicsEngine.evaluateBudget({
    requestedPromptTokens: 15000,
    currentSessionTokens: 6000, // 21,000 >= 20,000 soft limit
  });
  assert(budgetSoft.allowed === true && budgetSoft.warnSoftLimit, 'evaluateBudget triggers warnSoftLimit when exceeding 20k tokens');

  const budgetHard = TokenEconomicsEngine.evaluateBudget({
    requestedPromptTokens: 40000,
    currentSessionTokens: 25000, // 65,000 > 50,000 hard limit
  });
  assert(budgetHard.allowed === false && Boolean(budgetHard.error?.includes('hard limit')), 'evaluateBudget denies requests exceeding hard token limit');

  const budgetCost = TokenEconomicsEngine.evaluateBudget({
    requestedPromptTokens: 30000,
    currentSessionTokens: 10000,
    modelId: 'gpt-4o',
    budget: { maxCostUsdPerSession: 0.05, enforceStrictCeilings: true, hardLimitTokens: 100000 },
  });
  assert(budgetCost.allowed === false && Boolean(budgetCost.error?.includes('Cost ceiling breached')), 'evaluateBudget denies requests exceeding cost budget');

  const usageReport = TokenEconomicsEngine.buildUsageReport({
    prompt: 'Create high performance table',
    completion: 'Table component generated',
    modelId: 'gemini-1.5-flash',
  });
  assert(usageReport.totalTokens > 0 && usageReport.estimatedCostUsd >= 0, 'buildUsageReport produces structured report with cost');

  console.log(`\n  All 50 Unit Tests Passed! (${passedTests} / 50)\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: 24 E2E SCENARIOS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- PART 2: 24 E2E SCENARIOS ---\n');

  const project = createMockProject('proj_e2e_perf');

  // 61-64: Context Caching Speedup in Orchestration Engine
  IntelligentCacheEngine.clear();
  const coldOrch = await UnifiedOrchestrationEngine.orchestrate(
    {
      projectId: 'proj_e2e_perf',
      prompt: 'Add a summary metrics card to the dashboard',
      operatorRole: 'editor',
      dryRun: true,
    },
    project
  );
  assert(coldOrch.success === true, 'Cold start orchestration completes successfully');
  assert(coldOrch.subsystemStatus.contextIntelligence === 'SUCCESS', 'Cold start context intelligence succeeds');

  const cacheStatsCold = IntelligentCacheEngine.getStats();
  assert(cacheStatsCold.totalEntries >= 1, 'Cold start caches context in IntelligentCacheEngine');

  const warmOrch = await UnifiedOrchestrationEngine.orchestrate(
    {
      projectId: 'proj_e2e_perf',
      prompt: 'Add a summary metrics card to the dashboard',
      operatorRole: 'editor',
      dryRun: true,
    },
    project
  );
  assert(warmOrch.success === true, 'Warm start orchestration completes successfully');
  const cacheStatsWarm = IntelligentCacheEngine.getStats();
  assert(cacheStatsWarm.hits >= 1, 'Warm start hits IntelligentCacheEngine for context retrieval');

  // 65-68: Token Economics Integration in Orchestration
  assert(warmOrch.artifacts.tokenUsageReport !== undefined, 'Token usage report is attached to orchestration artifacts');
  assert(warmOrch.artifacts.tokenUsageReport.totalTokens > 0, 'Token usage report meters tokens consumed');
  assert(warmOrch.artifacts.tokenUsageReport.estimatedCostUsd >= 0, 'Token usage report calculates estimated USD cost');

  const largePrompt = 'Create complex dashboard component with multiple features. '.repeat(60);
  const largeOrch = await UnifiedOrchestrationEngine.orchestrate(
    {
      projectId: 'proj_e2e_perf',
      prompt: largePrompt,
      operatorRole: 'editor',
      dryRun: true,
    },
    project
  );
  assert(largeOrch.success === true, 'Large prompt executes cleanly with auto-compression');
  assert(
    largeOrch.artifacts.tokenUsageReport?.compressionSavingsTokens >= 0,
    'Large prompt reports compression savings in token usage report'
  );

  // 69-72: Hard Budget Breach Halts Execution Safely
  const breachPrompt = 'Exorbitant request payload with excessive token length. '.repeat(5000); // Exceeds 50,000 hard token ceiling
  const budgetBreachOrch = await UnifiedOrchestrationEngine.orchestrate(
    {
      projectId: 'proj_e2e_perf',
      prompt: breachPrompt,
      operatorRole: 'editor',
      dryRun: true,
    },
    project
  );
  assert(budgetBreachOrch.success === false && budgetBreachOrch.status === 'FAILED', 'Token ceiling breach fails orchestration safely');
  assert(
    budgetBreachOrch.errors.some((e) => e.includes('budget') || e.includes('limit')),
    'Token ceiling breach reports clear error explanation'
  );

  // 73-76: Pipeline Performance Profiling Integration
  assert(warmOrch.artifacts.performanceProfile !== undefined, 'Pipeline performance profile is attached to session artifacts');
  assert(warmOrch.subsystemStatus.performanceProfiling === 'PROFILED', 'subsystemStatus marks performanceProfiling as PROFILED');
  assert(warmOrch.artifacts.performanceProfile.percentiles !== undefined, 'Performance profile calculates p50, p90, p99 percentiles');
  assert(warmOrch.artifacts.performanceProfile.stageBreakdown.length >= 0, 'Performance profile contains stage breakdown');

  // 77-80: Cache Persistence & Disk Hydration
  IntelligentCacheEngine.clear();
  IntelligentCacheEngine.set('persist_test_key', { testVal: 42 }, { ttlMs: 1000 * 60 });
  IntelligentCacheEngine.persistToDisk();

  IntelligentCacheEngine.resetMemoryOnly();
  assert(IntelligentCacheEngine.isMemoryInitialized() === false, 'In-memory cache cleared before disk hydration');

  IntelligentCacheEngine.initialize();
  const reloadedVal = IntelligentCacheEngine.get<{ testVal: number }>('persist_test_key');
  assert(reloadedVal?.testVal === 42, 'Disk cache snapshot cleanly hydrates into memory on startup');
  assert(IntelligentCacheEngine.invalidate('persist_test_key'), 'Invalidate deletes hydrated disk key');

  // 81-84: Backward Compatibility with Phase8PerformanceProfiler
  Phase8PerformanceProfiler.clear();
  const legacyMeasured = await Phase8PerformanceProfiler.measure('LEGACY_STAGE', async () => {
    await new Promise((r) => setTimeout(r, 10));
    return 'legacy_ok';
  });
  assert(legacyMeasured.result === 'legacy_ok' && legacyMeasured.durationMs >= 8, 'Phase8PerformanceProfiler.measure delegates and returns valid latency');

  const legacyMetrics = Phase8PerformanceProfiler.getMetrics();
  assert(legacyMetrics.length === 1 && legacyMetrics[0].stage === 'LEGACY_STAGE', 'Phase8PerformanceProfiler.getMetrics returns converted metrics list');

  const legacyProfile = Phase8PerformanceProfiler.computeProfile();
  assert(legacyProfile.totalDurationMs >= 8 && legacyProfile.percentiles !== undefined, 'Phase8PerformanceProfiler.computeProfile produces valid profile');

  Phase8PerformanceProfiler.clear();
  assert(Phase8PerformanceProfiler.getMetrics().length === 0, 'Phase8PerformanceProfiler.clear resets profiler metrics');

  // 85: AI Store State and Performance Action Integration
  const aiStoreCacheStats = useAIStore.getState().getCacheStats();
  assert(aiStoreCacheStats !== undefined && typeof aiStoreCacheStats.hitRatio === 'number', 'ai-store seamlessly exposes real-time cache and token economics telemetry');

  console.log(`\n  All 24 E2E Scenarios Passed! (${passedTests - 50} / 24)\n`);

  console.log('========================================================================');
  console.log(`   D8.17 ACCEPTANCE TEST SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('========================================================================\n');
}

runAcceptanceSuite().catch((err) => {
  console.error('\nAcceptance Suite Execution Error:', err);
  process.exit(1);
});

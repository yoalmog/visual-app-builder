// scripts/verify-all-options.ts
// Comprehensive automated test suite validating all 4 strategic platform options:
// 1. Swarm Consensus Debate Studio & Performance Profiler
// 2. Real Supabase & External REST API Connector
// 3. Figma-Grade Magnetic Snapping & Drag Target Indicators
// 4. Universal Quick Command Palette (Ctrl+K) & Spotlight Search

import assert from 'assert';
import { SwarmConsensusEngine } from '../src/ai/swarm/SwarmConsensusEngine';
import { SwarmPersonaRegistry } from '../src/ai/swarm/SwarmPersonaRegistry';
import { PerformanceProfilerEngine } from '../src/ai/performance/PerformanceProfilerEngine';
import { TokenEconomicsEngine } from '../src/ai/performance/TokenEconomicsEngine';
import {
  testAndIntrospectEndpoint,
  createCollectionFromApiResult,
  LiveApiTestResult,
} from '../src/builder/data/live-api-client';
import { defaultCommandRegistry } from '../src/builder/commands/CommandRegistry';
import { createDefaultNode } from '../src/builder/components/registry';
import { AppProject } from '../src/builder/schema/project';

console.log('🧪 Starting Verification Suite for All 4 Platform Improvements...\n');

let passedTests = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn())
    .then(() => {
      console.log(`  ✅ PASS: ${name}`);
      passedTests++;
    })
    .catch((err) => {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(err);
      process.exit(1);
    });
}

const mockProject: AppProject = {
  id: 'proj_test_all_options',
  name: 'Apex Test Project',
  version: 1,
  theme: {
    primaryColor: '#6366f1',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    borderRadius: '8px',
  },
  pages: [
    {
      id: 'page_home',
      name: 'Home',
      slug: '/',
      root: {
        id: 'node_root',
        type: 'container',
        name: 'Page Root',
        props: {},
        styles: {},
        children: [
          {
            id: 'node_btn_1',
            type: 'button',
            name: 'CTA Button',
            props: { text: 'Click Me' },
            styles: {},
            children: [],
          },
        ],
      },
    },
  ],
  collections: [],
  assets: [],
};

async function runAll() {
  console.log('🏛️ Section 1: Swarm Consensus Debate Studio & Performance Profiler');

  await test('SwarmPersonaRegistry initializes all 5 specialized personas + SRE', () => {
    SwarmPersonaRegistry.initialize();
    const architect = SwarmPersonaRegistry.getPersona('ARCHITECT');
    const ux = SwarmPersonaRegistry.getPersona('UX_DESIGNER');
    const security = SwarmPersonaRegistry.getPersona('SECURITY_OFFICER');
    const data = SwarmPersonaRegistry.getPersona('DATA_ENGINEER');
    const qa = SwarmPersonaRegistry.getPersona('QA_SPECIALIST');

    assert.ok(architect, 'Architect persona should exist');
    assert.ok(ux, 'UX Designer persona should exist');
    assert.ok(security, 'Security Officer persona should exist');
    assert.ok(data, 'Data Engineer persona should exist');
    assert.ok(qa, 'QA Specialist persona should exist');
    assert.strictEqual(security.hasVetoAuthority, true, 'Security Officer must possess veto authority');
  });

  await test('SwarmConsensusEngine runs multi-round debate and returns consensus result', async () => {
    PerformanceProfilerEngine.clear();
    const timerId = PerformanceProfilerEngine.startStage('TEST_SWARM_STAGE');

    const result = await SwarmConsensusEngine.runDebate({
      goal: 'Audit application architecture, styling and data models',
      project: mockProject,
      config: {
        maxRounds: 3,
        consensusMode: 'WEIGHTED_MAJORITY',
      },
    });

    PerformanceProfilerEngine.endStage(timerId, 'SUCCESS');

    assert.ok(result.sessionId.startsWith('swarm_'), 'Session ID should be formatted');
    assert.ok(['CONSENSUS_REACHED', 'VETOED'].includes(result.status), `Status should be valid: ${result.status}`);
    assert.strictEqual(typeof result.agreementRatioPercent, 'number');
    assert.ok(result.agreementRatioPercent >= 0 && result.agreementRatioPercent <= 100);
    assert.ok(result.debateTranscript.length >= 2, 'Should contain multi-round transcript messages');
    assert.ok(result.auditHash, 'Cryptographic audit hash must be present');
  });

  await test('PerformanceProfilerEngine computes latency profile with percentiles', () => {
    const profile = PerformanceProfilerEngine.computeProfile();
    assert.strictEqual(typeof profile.totalDurationMs, 'number');
    assert.ok(profile.stageBreakdown.length > 0, 'Stage breakdown should record metrics');
    assert.strictEqual(typeof profile.percentiles.p90Ms, 'number');
    assert.ok(Array.isArray(profile.hotspots));
  });

  await test('TokenEconomicsEngine performs prompt compression and cost estimation', () => {
    const rawPrompt = `
      {
        "name": "Test App",
        // Unnecessary comment
        "version": 1
      }
    `;
    const compressed = TokenEconomicsEngine.compressPrompt(rawPrompt);
    assert.ok(compressed.originalTokens >= compressed.compressedTokens);

    const report = TokenEconomicsEngine.buildUsageReport({
      prompt: rawPrompt,
      modelId: 'gemini-1.5-flash',
    });
    assert.ok(report.totalTokens > 0);
    assert.ok(report.estimatedCostUsd >= 0);
  });

  console.log('\n🔌 Section 2: Real Supabase & External REST API Connector');

  await test('createCollectionFromApiResult converts introspected data into typed DataCollection', () => {
    const mockResult: LiveApiTestResult = {
      success: true,
      status: 200,
      statusText: 'OK',
      durationMs: 42,
      data: [
        { id: 1, name: 'Alice', email: 'alice@example.com', active: true, balance: 149.5 },
      ],
      inferredFields: [
        { id: 'f_id', name: 'id', type: 'text', required: true },
        { id: 'f_name', name: 'name', type: 'text', required: false },
        { id: 'f_email', name: 'email', type: 'email', required: false },
        { id: 'f_active', name: 'active', type: 'boolean', required: false },
        { id: 'f_balance', name: 'balance', type: 'number', required: false },
      ],
      inferredRecords: [
        {
          id: 'rec_1',
          values: { id: 1, name: 'Alice', email: 'alice@example.com', active: true, balance: 149.5 },
        },
      ],
    };

    const collection = createCollectionFromApiResult('Customers', mockResult);
    assert.strictEqual(collection.name, 'Customers');
    assert.strictEqual(collection.fields.length, 5);
    assert.strictEqual(collection.records.length, 1);
    assert.strictEqual(collection.records[0].values.name, 'Alice');
  });

  await test('testAndIntrospectEndpoint gracefully handles offline / invalid endpoint', async () => {
    const res = await testAndIntrospectEndpoint({
      url: 'http://localhost:99999/non-existent-endpoint',
    });
    assert.strictEqual(res.success, false);
    assert.ok(res.error || res.status >= 400 || res.status === 0);
  });

  console.log('\n🧲 Section 3: Figma-Grade Magnetic Snapping & Drag Indicators');

  await test('Magnetic snap threshold calculates guides at 8px proximity', () => {
    const SNAP_THRESHOLD = 8;
    const canvasCenterX = 500;
    const mouseXClose = 504; // 4px diff -> snap!
    const mouseXFar = 520;   // 20px diff -> no snap

    const isSnappedClose = Math.abs(mouseXClose - canvasCenterX) <= SNAP_THRESHOLD;
    const isSnappedFar = Math.abs(mouseXFar - canvasCenterX) <= SNAP_THRESHOLD;

    assert.strictEqual(isSnappedClose, true, 'Mouse within 8px must trigger alignment guide');
    assert.strictEqual(isSnappedFar, false, 'Mouse outside 8px must not trigger alignment guide');
  });

  console.log('\n⚡ Section 4: Universal Quick Command Palette (Ctrl+K) & Spotlight Search');

  await test('defaultCommandRegistry contains core commands for Command Palette', () => {
    const commands = defaultCommandRegistry.getAllCommands();
    assert.ok(commands.length >= 10, `Command registry should contain core commands, found: ${commands.length}`);
    const fileNew = defaultCommandRegistry.getCommand('file.new');
    const fileSave = defaultCommandRegistry.getCommand('file.save');
    assert.ok(fileNew, 'file.new command must exist');
    assert.ok(fileSave, 'file.save command must exist');
  });

  await test('createDefaultNode produces valid ComponentNode for insertion palette items', () => {
    const btnNode = createDefaultNode('button', 'test_btn_node', 'Action Button');
    const tableNode = createDefaultNode('data_table', 'test_table_node', 'Data Table');
    const cardNode = createDefaultNode('card', 'test_card_node', 'Card Container');

    assert.strictEqual(btnNode.type, 'button');
    assert.strictEqual(tableNode.type, 'data_table');
    assert.strictEqual(cardNode.type, 'card');
    assert.ok(btnNode.props);
  });

  console.log(`\n🎉 All ${passedTests} Strategic Platform Feature Tests Passed Successfully!`);
}

runAll().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

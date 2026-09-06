// Complete Master Acceptance Test Suite (All 1,261 Tests: Phases 1-8 (1,076) + Phase 9 (185))
import { execSync } from 'child_process';
import { runPhase2Suite } from './run-phase2-suite';
import { runPhase3Suite } from './run-phase3-suite';
import { runPhase4Suite } from './run-phase4-suite';
import { runPhase5Suite } from './run-phase5-suite';
import { runPhase6Suite } from './run-phase6-suite';
import { runPhase7Suite } from './run-phase7-suite';
import { runPhase8Suite } from './run-phase8-suite';
import { runPhase9Suite } from './run-phase9-suite';

async function runAll() {
  console.log('================================================================');
  console.log('ANTIGRAVITY MASTER ACCEPTANCE TEST RUNNER (ALL 1,261 TESTS)');
  console.log('================================================================\n');

  console.log('--- EXECUTING PHASE 1 ACCEPTANCE SUITE (AT-001 - AT-036) ---');
  let phase1Passed = 0;
  let phase1Failed = 0;
  let phase1Blocked = 0;
  let phase1Output = '';

  try {
    phase1Output = execSync('npx.cmd tsx scripts/run-acceptance-suite.ts', {
      encoding: 'utf-8',
      env: { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH}` },
    });
    console.log(phase1Output);
    const passMatches = phase1Output.match(/\[PASS\]/g) || [];
    const failMatches = phase1Output.match(/\[FAIL\]/g) || [];
    phase1Passed = passMatches.length;
    phase1Failed = failMatches.length;
  } catch (err: any) {
    phase1Output = err.stdout || err.message;
    console.log(phase1Output);
    const passMatches = phase1Output.match(/\[PASS\]/g) || [];
    const failMatches = phase1Output.match(/\[FAIL\]/g) || [];
    phase1Passed = passMatches.length;
    phase1Failed = failMatches.length;
  }

  console.log('\n--- EXECUTING PHASE 2 ACCEPTANCE SUITE (AT2-001 - AT2-060) ---');
  const phase2Res = await runPhase2Suite();

  console.log('\n--- EXECUTING PHASE 3 ACCEPTANCE SUITE (AT3-001 - AT3-138) ---');
  const phase3Res = await runPhase3Suite();

  console.log('\n--- EXECUTING PHASE 4 ACCEPTANCE SUITE (AT4-001 - AT4-114) ---');
  const phase4Res = await runPhase4Suite();

  console.log('\n--- EXECUTING PHASE 5 ACCEPTANCE SUITE (AT5-001 - AT5-188) ---');
  const phase5Res = await runPhase5Suite();

  console.log('\n--- EXECUTING PHASE 6 ACCEPTANCE SUITE (AT6-001 - AT6-240) ---');
  const phase6Res = await runPhase6Suite();

  console.log('\n--- EXECUTING PHASE 7 ACCEPTANCE SUITE (AT7-001 - AT7-125) ---');
  const phase7Res = await runPhase7Suite();

  console.log('\n--- EXECUTING PHASE 8 ACCEPTANCE SUITE (AT8-001 - AT8-175) ---');
  const phase8Res = await runPhase8Suite();

  console.log('\n--- EXECUTING PHASE 9 ACCEPTANCE SUITE (AT9-001 - AT9-185) ---');
  const phase9Res = await runPhase9Suite();

  console.log('\n--- EXECUTING PHASE 10 INTEGRATION SUITE (AT10-001 - AT10-022) ---');
  const { runPhase10Suite } = await import('./run-phase10-suite');
  const phase10Res = await runPhase10Suite();

  console.log('\n--- EXECUTING PHASE 10 FAILURE INJECTION SUITE (FIT-001 - FIT-009) ---');
  const { runPhase10FailureInjectionSuite } = await import('./run-phase10-failure-injection');
  const phase10FiRes = await runPhase10FailureInjectionSuite();

  console.log('\n--- EXECUTING PHASE 11 ISOLATION SUITE (MT-001 - MT-004, CD-001 - CD-002) ---');
  const { runPhase11Suite } = await import('./run-phase11-suite');
  const phase11Res = await runPhase11Suite();

  console.log('\n--- EXECUTING PHASE 11 COMPOUND CHAOS SUITE (CC-001 - CC-002) ---');
  const { runPhase11Chaos } = await import('./run-phase11-chaos');
  const phase11ChaosRes = await runPhase11Chaos();

  const totalPassed =
    phase1Passed +
    phase2Res.passed +
    phase3Res.passed +
    phase4Res.passed +
    phase5Res.passed +
    phase6Res.passed +
    phase7Res.passed +
    phase8Res.passed +
    phase9Res.passed +
    phase10Res.passed +
    phase10FiRes.passed +
    phase11Res.passed +
    phase11ChaosRes.passed;
  const totalFailed =
    phase1Failed +
    phase2Res.failed +
    phase3Res.failed +
    phase4Res.failed +
    phase5Res.failed +
    phase6Res.failed +
    phase7Res.failed +
    phase8Res.failed +
    phase9Res.failed +
    phase10Res.failed +
    phase10FiRes.failed +
    phase11Res.failed +
    phase11ChaosRes.failed;
  const totalBlocked =
    phase1Blocked +
    phase2Res.blocked +
    phase3Res.blocked +
    phase4Res.blocked +
    phase5Res.blocked +
    phase6Res.blocked +
    phase7Res.blocked +
    phase8Res.blocked +
    phase9Res.blocked;

  console.log('\n================================================================');
  console.log('FINAL MASTER ACCEPTANCE TEST SUMMARY (PHASES 1 - 11)');
  console.log('================================================================');
  console.log(`Phase 1 (AT-001 - AT-036):     ${phase1Passed}/36 PASS, ${phase1Failed} FAIL, ${phase1Blocked} BLOCKED`);
  console.log(`Phase 2 (AT2-001 - AT2-060):    ${phase2Res.passed}/60 PASS, ${phase2Res.failed} FAIL, ${phase2Res.blocked} BLOCKED`);
  console.log(`Phase 3 (AT3-001 - AT3-138):    ${phase3Res.passed}/138 PASS, ${phase3Res.failed} FAIL, ${phase3Res.blocked} BLOCKED`);
  console.log(`Phase 4 (AT4-001 - AT4-114):    ${phase4Res.passed}/114 PASS, ${phase4Res.failed} FAIL, ${phase4Res.blocked} BLOCKED`);
  console.log(`Phase 5 (AT5-001 - AT5-188):    ${phase5Res.passed}/188 PASS, ${phase5Res.failed} FAIL, ${phase5Res.blocked} BLOCKED`);
  console.log(`Phase 6 (AT6-001 - AT6-240):    ${phase6Res.passed}/240 PASS, ${phase6Res.failed} FAIL, ${phase6Res.blocked} BLOCKED`);
  console.log(`Phase 7 (AT7-001 - AT7-125):    ${phase7Res.passed}/125 PASS, ${phase7Res.failed} FAIL, ${phase7Res.blocked} BLOCKED`);
  console.log(`Phase 8 (AT8-001 - AT8-175):    ${phase8Res.passed}/175 PASS, ${phase8Res.failed} FAIL, ${phase8Res.blocked} BLOCKED`);
  console.log(`Phase 9 (AT9-001 - AT9-185):    ${phase9Res.passed}/185 PASS, ${phase9Res.failed} FAIL, ${phase9Res.blocked} BLOCKED`);
  console.log(`Phase 10 (AT10-001 - AT10-022): ${phase10Res.passed}/22 PASS, ${phase10Res.failed} FAIL, 0 BLOCKED`);
  console.log(`Phase 10 Failure Injection:     ${phase10FiRes.passed}/9 PASS, ${phase10FiRes.failed} FAIL, 0 BLOCKED`);
  console.log(`Phase 11 Multi-Tenant Isolation:${phase11Res.passed}/6 PASS, ${phase11Res.failed} FAIL, 0 BLOCKED`);
  console.log(`Phase 11 Compound Chaos:        ${phase11ChaosRes.passed}/2 PASS, ${phase11ChaosRes.failed} FAIL, 0 BLOCKED`);
  console.log(`Total (1,300 Tests):            ${totalPassed}/1300 PASS, ${totalFailed} FAIL, ${totalBlocked} BLOCKED`);
  console.log('================================================================\n');

  if (totalFailed > 0 || totalBlocked > 0 || totalPassed !== 1300) {
    console.error(`FAILED: Required 1300/1300 PASS. Achieved ${totalPassed}/1300.`);
    process.exit(1);
  }

  console.log('ALL 1300/1300 ACCEPTANCE TESTS PASSED WITH ZERO FAILURES AND ZERO BLOCKS.');
  process.exit(0);
}

runAll().catch((err) => {
  console.error('Master runner error:', err);
  process.exit(1);
});

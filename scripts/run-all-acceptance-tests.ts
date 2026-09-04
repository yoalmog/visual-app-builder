// Complete Master Acceptance Test Suite (All 901 Tests: Phase 1 (36) + Phase 2 (60) + Phase 3 (138) + Phase 4 (114) + Phase 5 (188) + Phase 6 (240) + Phase 7 (125))
import { execSync } from 'child_process';
import { runPhase2Suite } from './run-phase2-suite';
import { runPhase3Suite } from './run-phase3-suite';
import { runPhase4Suite } from './run-phase4-suite';
import { runPhase5Suite } from './run-phase5-suite';
import { runPhase6Suite } from './run-phase6-suite';
import { runPhase7Suite } from './run-phase7-suite';

async function runAll() {
  console.log('================================================================');
  console.log('ANTIGRAVITY MASTER ACCEPTANCE TEST RUNNER (ALL 901 TESTS)');
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

  const totalPassed =
    phase1Passed +
    phase2Res.passed +
    phase3Res.passed +
    phase4Res.passed +
    phase5Res.passed +
    phase6Res.passed +
    phase7Res.passed;
  const totalFailed =
    phase1Failed +
    phase2Res.failed +
    phase3Res.failed +
    phase4Res.failed +
    phase5Res.failed +
    phase6Res.failed +
    phase7Res.failed;
  const totalBlocked =
    phase1Blocked +
    phase2Res.blocked +
    phase3Res.blocked +
    phase4Res.blocked +
    phase5Res.blocked +
    phase6Res.blocked +
    phase7Res.blocked;

  console.log('\n================================================================');
  console.log('FINAL MASTER ACCEPTANCE TEST SUMMARY (PHASES 1 - 7)');
  console.log('================================================================');
  console.log(`Phase 1 (AT-001 - AT-036):   ${phase1Passed}/36 PASS, ${phase1Failed} FAIL, ${phase1Blocked} BLOCKED`);
  console.log(`Phase 2 (AT2-001 - AT2-060):  ${phase2Res.passed}/60 PASS, ${phase2Res.failed} FAIL, ${phase2Res.blocked} BLOCKED`);
  console.log(`Phase 3 (AT3-001 - AT3-138):  ${phase3Res.passed}/138 PASS, ${phase3Res.failed} FAIL, ${phase3Res.blocked} BLOCKED`);
  console.log(`Phase 4 (AT4-001 - AT4-114):  ${phase4Res.passed}/114 PASS, ${phase4Res.failed} FAIL, ${phase4Res.blocked} BLOCKED`);
  console.log(`Phase 5 (AT5-001 - AT5-188):  ${phase5Res.passed}/188 PASS, ${phase5Res.failed} FAIL, ${phase5Res.blocked} BLOCKED`);
  console.log(`Phase 6 (AT6-001 - AT6-240):  ${phase6Res.passed}/240 PASS, ${phase6Res.failed} FAIL, ${phase6Res.blocked} BLOCKED`);
  console.log(`Phase 7 (AT7-001 - AT7-125):  ${phase7Res.passed}/125 PASS, ${phase7Res.failed} FAIL, ${phase7Res.blocked} BLOCKED`);
  console.log(`Total (901 Tests):            ${totalPassed}/901 PASS, ${totalFailed} FAIL, ${totalBlocked} BLOCKED`);
  console.log('================================================================\n');

  if (totalFailed > 0 || totalBlocked > 0 || totalPassed !== 901) {
    console.error(`FAILED: Required 901/901 PASS. Achieved ${totalPassed}/901.`);
    process.exit(1);
  }

  console.log('ALL 901/901 ACCEPTANCE TESTS PASSED WITH ZERO FAILURES AND ZERO BLOCKS.');
  process.exit(0);
}

runAll().catch((err) => {
  console.error('Master runner error:', err);
  process.exit(1);
});
